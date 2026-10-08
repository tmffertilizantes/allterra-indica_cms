import axios from "axios";

/**
 * Switch de back-end por módulo (docs/MAPEAMENTO_MIGRACAO_NESTJS_FASES.md §5).
 * Mesmas regras do app (allterra-indica_app/lib/clientConfig.ts).
 * Contrato: specs/013-fase0-consumidores-borda/contracts/consumer-routing.md
 */

export type ApiVersion = "v1" | "v2";

export type ClientConfig = {
  default: ApiVersion;
  modules: Record<string, ApiVersion>;
  minAppVersion: string;
};

type PersistedClientConfig = {
  config: ClientConfig;
  etag: string | null;
  fetchedAt: number;
};

export const DEFAULT_CLIENT_CONFIG: ClientConfig = {
  default: "v1",
  modules: {},
  minAppVersion: "0.0.0",
};

const STORAGE_KEY = "tmf:client-config";
/** Releitura em primeiro plano; com o max-age=60 da v2, uma mudança chega em até ~5 min. */
const REFRESH_INTERVAL_MS = 4 * 60 * 1000;
const VERSIONS: readonly string[] = ["v1", "v2"];
const MIN_APP_VERSION_REGEX = /^\d+\.\d+\.\d+$/;

const isApiVersion = (value: unknown): value is ApiVersion =>
  typeof value === "string" && VERSIONS.includes(value);

/** Valida a configuração; qualquer violação descarta tudo e retorna `null`. */
export function parseClientConfig(raw: unknown): ClientConfig | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;

  if ("success" in value && value.success !== true) return null;
  if (!isApiVersion(value.default)) return null;
  if (
    typeof value.minAppVersion !== "string" ||
    !MIN_APP_VERSION_REGEX.test(value.minAppVersion)
  )
    return null;

  const modules = value.modules;
  if (!modules || typeof modules !== "object" || Array.isArray(modules)) return null;
  const entries = Object.entries(modules as Record<string, unknown>);
  if (!entries.every(([, version]) => isApiVersion(version))) return null;

  return {
    default: value.default,
    modules: Object.fromEntries(entries) as Record<string, ApiVersion>,
    minAppVersion: value.minAppVersion,
  };
}

/** Configuração embutida no build; usada enquanto nenhuma remota válida foi lida. */
export function embeddedClientConfig(): ClientConfig {
  const raw = process.env.CLIENT_CONFIG_DEFAULT;
  if (!raw) return DEFAULT_CLIENT_CONFIG;
  try {
    return parseClientConfig(JSON.parse(raw)) ?? DEFAULT_CLIENT_CONFIG;
  } catch {
    return DEFAULT_CLIENT_CONFIG;
  }
}

function readPersisted(): PersistedClientConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as PersistedClientConfig;
    const config = parseClientConfig(stored?.config);
    return config ? { config, etag: stored.etag ?? null, fetchedAt: stored.fetchedAt ?? 0 } : null;
  } catch {
    return null;
  }
}

function writePersisted(value: PersistedClientConfig) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Armazenamento indisponível (aba privada, bloqueio): segue só com a cópia em memória.
  }
}

// Cópia em memória para leitura síncrona: última válida → embutida → padrão.
let current: PersistedClientConfig | null = readPersisted();

export function getActiveClientConfig(): ClientConfig {
  return current?.config ?? embeddedClientConfig();
}

/** Bases de cada versão. As variáveis são fixadas no build (next.config.js). */
export function apiBases(): Record<ApiVersion, string | undefined> {
  return {
    v1: process.env.API_URL,
    v2: process.env.API_URL_V2 || undefined,
  };
}

/**
 * Rotas da v2 cujo 1º segmento não é módulo do legado (specs/016, research R3): `users/me` e
 * `admin/*` pertencem ao módulo `user` e ligam junto com ele.
 */
const MODULE_ALIASES: Record<string, string> = { users: "user", admin: "user" };

/** Primeiro segmento do caminho = nome do módulo legado (com aliases). URL absoluta → `null`. */
export function resolveModule(path: string): string | null {
  if (!path || /^https?:\/\//i.test(path)) return null;
  const segment = path.replace(/^\/+/, "").split(/[/?#]/)[0];
  if (!segment) return null;
  return MODULE_ALIASES[segment] ?? segment;
}

/** Versão que atende o módulo; usar quando o contrato da v2 diferir do legado (Fase 1+). */
export function apiVersion(moduleName: string): ApiVersion {
  const config = getActiveClientConfig();
  const version = config.modules[moduleName] ?? config.default;
  // A v2 nunca aceita token legado: sem `auth` em v2, user/preferences ficam na v1 (R2).
  if ((moduleName === "user" || moduleName === "preferences") && version === "v2") {
    return (config.modules.auth ?? config.default) === "v2" ? "v2" : "v1";
  }
  return version;
}

/** Versão do CMS enviada ao /client-config (`targets.cms.minVersion` — research R1 da 016). */
export function cmsVersion(): string {
  return (process.env.NEXT_PUBLIC_CMS_VERSION || "").replace(/^v/, "");
}

let warnedMissingV2 = false;

/** Base URL para o caminho; sem base v2 configurada, a v1 é usada. */
export function resolveBaseUrl(path: string): string | undefined {
  const bases = apiBases();
  const moduleName = resolveModule(path);
  if (!moduleName || apiVersion(moduleName) === "v1") return bases.v1;
  if (bases.v2) return bases.v2;

  if (!warnedMissingV2) {
    warnedMissingV2 = true;
    console.warn(`[clientConfig] módulo "${moduleName}" em v2 sem API_URL_V2; usando v1`);
  }
  return bases.v1;
}

// Instância própria: sem resolução por módulo e sem Authorization.
const clientConfigHttp = axios.create({
  timeout: 5000,
  validateStatus: (status) => status === 200 || status === 304,
});

/** Lê GET {API_URL_V2}/client-config; falha ou resposta inválida mantêm a última válida. */
export async function loadClientConfig(): Promise<void> {
  const baseURL = apiBases().v2;
  if (!baseURL || typeof window === "undefined") return;

  try {
    const response = await clientConfigHttp.get("/client-config", {
      baseURL,
      params: { client: "cms", version: cmsVersion() },
      headers: current?.etag ? { "If-None-Match": current.etag } : undefined,
    });

    if (response.status === 304 && current) {
      current = { ...current, fetchedAt: Date.now() };
      writePersisted(current);
      return;
    }

    const config = parseClientConfig(response.data);
    if (!config) {
      console.warn("[clientConfig] configuração remota inválida; mantendo a última válida");
      return;
    }
    current = { config, etag: response.headers["etag"] ?? null, fetchedAt: Date.now() };
    writePersisted(current);
  } catch {
    // Sem rede ou v2 fora do ar: segue com a última configuração válida.
  }
}

/** Releitura periódica e ao voltar para a aba. Retorna a função de limpeza. */
export function startClientConfigRefresh(): () => void {
  if (typeof window === "undefined") return () => {};

  const interval = window.setInterval(loadClientConfig, REFRESH_INTERVAL_MS);
  const onVisibility = () => {
    if (document.visibilityState === "visible") loadClientConfig();
  };
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

/** Só para testes: substitui a cópia em memória. */
export function __setClientConfigForTests(config: ClientConfig | null) {
  current = config ? { config, etag: null, fetchedAt: Date.now() } : null;
}
