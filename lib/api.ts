import axios from "axios";
import { parseCookies } from "nookies";
import { resolveBaseUrl } from "./clientConfig";

/**
 * Ponto único de chamadas do CMS à API. Nunca use `process.env.API_URL` direto nas telas:
 * a base (v1 ou v2) é resolvida por módulo, conforme /client-config.
 */

/** URL absoluta para o caminho (`/core/123`), resolvida no momento da chamada. */
export function apiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${resolveBaseUrl(normalized) ?? ""}${normalized}`;
}

/** Instância axios para caminhos relativos; anexa o token do cookie quando não informado. */
export const api = axios.create();

api.interceptors.request.use((config) => {
  if (config.url && !/^https?:\/\//i.test(config.url)) {
    config.baseURL = resolveBaseUrl(config.url);
  }

  const headers = config.headers ?? {};
  if (!headers.Authorization && typeof window !== "undefined") {
    const token = parseCookies()["USER_TOKEN"];
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  config.headers = headers;
  return config;
});

/** Fetcher do SWR 1.x para chaves `[url, token]` (o SWR 1 passa a chave espalhada). */
export const swrFetcher = (url = "", token = "") =>
  axios
    .get(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((res) => res.data);
