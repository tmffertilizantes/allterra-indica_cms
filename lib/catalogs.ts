import axios from "axios";
import { apiUrl } from "./api";
import { apiVersion } from "./clientConfig";
import { fetchAllPages } from "./pagination";

/**
 * Catálogos do cálculo e BEM no CMS (specs/022-fase4-dominio-arquivos/contracts/consumers.md §2) e
 * catálogos/conteúdo da Fase 5 (specs/023 contracts/consumers.md §2).
 * v1 = chamadas atuais; v2 = listagem paginada e corpo só com os campos do DTO (o `post` do formulário
 * leva `id`, datas e relações, que a v2 recusaria com 400).
 */

export type CatalogModule =
  | "culture"
  | "nutrient"
  | "microgeoPrice"
  | "bioStation"
  | "category"
  | "region"
  | "resale"
  | "materialCategory"
  | "material";

/** Chave da lista na resposta do legado. */
export const LEGACY_CATALOG_KEY: Record<CatalogModule, string> = {
  culture: "cultures",
  nutrient: "nutrients",
  microgeoPrice: "microgeoPrices",
  bioStation: "bioStations",
  category: "categorys",
  region: "regions",
  resale: "resales",
  materialCategory: "categories",
  material: "materials",
};

/** Campos que a v2 aceita na escrita (data-model §3 da 022 e §1 da 023). */
const EDITABLE: Record<CatalogModule, readonly string[]> = {
  culture: ["name", "slug", "lang", "active"],
  nutrient: ["name", "export", "extract", "active", "lang", "cultureId"],
  microgeoPrice: ["name", "role", "custoPorKg", "image"],
  bioStation: ["name", "description", "image", "capacidadeLitros"],
  category: ["name", "slug", "lang", "active"],
  region: ["name", "active"],
  resale: ["name", "type", "active"],
  materialCategory: ["name", "slug", "lang", "active", "filters"],
  material: ["name", "slug", "file", "lang", "active", "categoryId", "cultureId", "stateId", "year"],
};

/**
 * Caminho da lista na v2: regiões e revendas têm a lista pública (só ativas) em `/<módulo>` e a
 * administrativa, com todas, em `/<módulo>/all` (specs/023 contracts/content-api.md §2).
 */
const V2_LIST_PATH: Partial<Record<CatalogModule, string>> = {
  region: "/region/all",
  resale: "/resale/all",
};

export const isCatalogV2 = (module: CatalogModule) => apiVersion(module) === "v2";

function body(module: CatalogModule, post: Record<string, any>) {
  return Object.fromEntries(
    EDITABLE[module].filter((key) => post[key] !== undefined).map((key) => [key, post[key]]),
  );
}

export async function fetchAllCatalog<T = any>(
  module: CatalogModule,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  if (isCatalogV2(module)) return fetchAllPages<T>(V2_LIST_PATH[module] ?? `/${module}`, params);
  const response = await axios.get(apiUrl(`/${module}`));
  return response.data?.[LEGACY_CATALOG_KEY[module]] ?? [];
}

export async function createCatalogItem(module: CatalogModule, post: Record<string, any>) {
  return axios.post(apiUrl(`/${module}`), isCatalogV2(module) ? body(module, post) : post);
}

export async function saveCatalogItem(module: CatalogModule, post: Record<string, any>) {
  return axios.patch(
    apiUrl(`/${module}/${post.id}`),
    isCatalogV2(module) ? body(module, post) : post,
  );
}

export async function removeCatalogItem(module: CatalogModule, id: number | string) {
  return axios.delete(apiUrl(`/${module}/${id}`));
}

/** Cultura por id (modal do produtor). Mesmo caminho nas duas versões. */
export async function getCulture(id: number | string) {
  const response = await axios.get(apiUrl(`/culture/id/${id}`));
  return response.data?.culture;
}

/** Mensagem para os erros que o administrador pode resolver. */
export function catalogErrorMessage(error: any): string {
  const status = error?.response?.status;
  if (status === 413) return "Imagem acima do limite. Reduza a imagem e tente de novo.";
  if (status === 409)
    return error?.response?.data?.message || "Registro possui vínculos e não pode ser excluído";
  if (status === 403) return "Acesso negado";
  return error?.response?.data?.message || "Não foi possível salvar";
}

/** Dimensionamentos BEM (tela `dimensionamento-bem`): v2 paginada; v1 `GET bemSizing`. */
export async function fetchAllBemSizings(): Promise<any[]> {
  if (apiVersion("bemSizing") === "v2") return fetchAllPages("/bemSizing");
  const response = await axios.get(apiUrl(`/bemSizing`));
  return response.data?.bemSizings ?? [];
}
