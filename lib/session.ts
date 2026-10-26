import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig as InternalAxiosRequestConfig,
} from "axios";
import { destroyCookie, parseCookies, setCookie } from "nookies";
import { apiBases, resolveBaseUrl } from "./clientConfig";

/**
 * Sessão do CMS com a identidade da v2 (specs/016-fase1-identidade-v2, research R19 e
 * contracts/consumer-session.md §1–2, §4).
 *
 * Cookies (todos `Secure` em HTTPS + `SameSite=Strict`, como na Fase 0 — #15):
 *   USER_TOKEN   sessão v1: token do legado · sessão v2: token-PONTE (as 31 telas que chamam a v1
 *                continuam lendo este cookie sem mudança)
 *   USER_ACCESS  access token da v2 (15 min)
 *   USER_REFRESH credencial de renovação da v2 (rotativa; 12 h sem uso, teto de 7 dias)
 *   user         resposta de /auth/me (como hoje)
 *
 * Os interceptores reescrevem `Authorization` conforme o DESTINO de cada requisição — o token
 * que a tela passou é ignorado — e renovam a sessão antes de vencer, uma vez por vez, inclusive
 * entre abas (navigator.locks).
 */

export const COOKIE = {
  token: "USER_TOKEN",
  access: "USER_ACCESS",
  refresh: "USER_REFRESH",
  user: "user",
} as const;

/** Renova quando faltar menos que isto para o token do destino vencer. */
export const REFRESH_MARGIN_MS = 60_000;
/** Teto absoluto da sessão do CMS (FR-003b): o cookie de renovação não precisa durar mais. */
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

type Destination = "v1" | "v2";
export type RefreshOutcome = "ok" | "ended" | "offline";

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  bridgeToken?: string;
  user: unknown;
}

export const sessionCookieOptions = (maxAge = 30 * 24 * 60 * 60) => ({
  maxAge,
  path: "/",
  sameSite: "strict" as const,
  secure: typeof window !== "undefined" && window.location.protocol === "https:",
});

/** `exp` do JWT em ms (sem verificar assinatura — só para decidir quando renovar). */
export function jwtExpiresAt(token: string | undefined): number | undefined {
  if (!token) return undefined;
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" ? json.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

const DEVICE_KEY = "tmf:device-id";

/** Identificador do navegador (não é credencial): conta para o limite de 5 sessões da v2. */
export function getDeviceId(): string {
  const fallback = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
  try {
    let id = window.localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = fallback();
      window.localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return fallback();
  }
}

export function isV2Session(cookies = parseCookies()): boolean {
  return Boolean(cookies[COOKIE.refresh]);
}

/** Credencial para o destino: v2 → access; v1 → ponte (v2) ou token legado (v1). */
export function tokenFor(destination: Destination, cookies = parseCookies()): string | undefined {
  if (isV2Session(cookies)) {
    return destination === "v2" ? cookies[COOKIE.access] : cookies[COOKIE.token] || undefined;
  }
  // Sessão legada: nunca enviar o token legado para a v2 (FR-005).
  return destination === "v1" ? cookies[COOKIE.token] || undefined : undefined;
}

/** Grava a sessão v2 recebida no login/renovação. */
export function applySession(tokens: SessionTokens): void {
  setCookie(null, COOKIE.token, tokens.bridgeToken ?? "", sessionCookieOptions());
  setCookie(null, COOKIE.access, tokens.accessToken, sessionCookieOptions());
  setCookie(null, COOKIE.refresh, tokens.refreshToken, sessionCookieOptions(REFRESH_COOKIE_MAX_AGE));
  setCookie(null, COOKIE.user, JSON.stringify(tokens.user), sessionCookieOptions());
}

export function clearSessionCookies(): void {
  for (const name of Object.values(COOKIE)) destroyCookie(null, name, { path: "/" });
}

/** Sessão recusada pelo servidor: limpa e leva ao login com aviso. */
export function endSession(): void {
  clearSessionCookies();
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login?expired=1";
  }
}

/** Destino da URL absoluta pela base configurada; outra origem → null (não mexe). */
export function destinationOf(url: string): Destination | null {
  const { v1, v2 } = apiBases();
  if (v2 && url.startsWith(v2)) return "v2";
  if (v1 && url.startsWith(v1)) return "v1";
  return null;
}

// Instância crua para a renovação (sem interceptores: evita recursão).
const refreshHttp = axios.create({ timeout: 10_000, validateStatus: () => true });
let inflight: Promise<RefreshOutcome> | null = null;

async function doRefresh(): Promise<RefreshOutcome> {
  const cookies = parseCookies();
  const refreshToken = cookies[COOKIE.refresh];
  if (!refreshToken) return "ended";
  // Outra aba pode ter renovado enquanto esperávamos o lock: relê os cookies antes.
  const accessExpiry = jwtExpiresAt(cookies[COOKIE.access]);
  if (accessExpiry && accessExpiry - Date.now() > REFRESH_MARGIN_MS) return "ok";

  const base = apiBases().v2;
  if (!base) return "offline";
  try {
    const response = await refreshHttp.post(`${base}/auth/refresh`, { refreshToken });
    if (response.status === 200) {
      applySession(response.data as SessionTokens);
      return "ok";
    }
    if (response.status === 409) return "ok";
    if (response.status === 401) {
      endSession();
      return "ended";
    }
    return "offline";
  } catch {
    return "offline";
  }
}

/** Uma renovação por vez na aba e entre abas (navigator.locks quando disponível). */
export function refreshOnce(): Promise<RefreshOutcome> {
  if (inflight) return inflight;
  const locks = typeof navigator !== "undefined" ? (navigator as any).locks : undefined;
  const run = locks?.request
    ? (locks.request("tmf-refresh", doRefresh) as Promise<RefreshOutcome>)
    : doRefresh();
  inflight = run.finally(() => {
    inflight = null;
  });
  return inflight;
}

async function ensureFresh(destination: Destination): Promise<void> {
  const cookies = parseCookies();
  if (!isV2Session(cookies)) return;
  const token = destination === "v2" ? cookies[COOKIE.access] : cookies[COOKIE.token] || cookies[COOKIE.access];
  const expiry = jwtExpiresAt(token);
  if (!expiry || expiry - Date.now() < REFRESH_MARGIN_MS) await refreshOnce();
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

function absoluteUrl(config: InternalAxiosRequestConfig): string {
  const url = config.url ?? "";
  if (/^https?:\/\//i.test(url)) return url;
  const base = config.baseURL ?? resolveBaseUrl(url) ?? "";
  return `${base.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
}

const installed = new WeakSet<AxiosInstance>();

/** Instala a escolha de credencial por destino e a renovação numa instância axios. */
export function installSessionInterceptors(instance: AxiosInstance): void {
  if (installed.has(instance)) return;
  installed.add(instance);

  instance.interceptors.request.use(async (config) => {
    const destination = destinationOf(absoluteUrl(config));
    if (!destination || typeof window === "undefined") return config;
    await ensureFresh(destination);
    const token = tokenFor(destination);
    const headers: any = config.headers ?? {};
    if (token) headers.Authorization = `Bearer ${token}`;
    else delete headers.Authorization;
    config.headers = headers;
    return config;
  });

  instance.interceptors.response.use(undefined, async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    if (
      error.response?.status === 401 &&
      config &&
      !config._retried &&
      destinationOf(absoluteUrl(config)) &&
      isV2Session()
    ) {
      config._retried = true;
      if ((await refreshOnce()) === "ok") return instance(config);
    }
    return Promise.reject(error);
  });
}
