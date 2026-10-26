import axios from "axios";
import { apiUrl } from "./api";
import { apiVersion } from "./clientConfig";
import { fetchAllPages } from "./pagination";

/**
 * Análises no CMS (specs/022-fase4-dominio-arquivos/contracts/consumers.md §2). Na v2 a lista vem
 * paginada e SEM o laudo (`pdf`), que é carregado só ao abrir o modal; o status muda só `active`.
 */

export const isAnalysisV2 = () => apiVersion("analysis") === "v2";

const LEGACY_INCLUDES = "includes=consultant,producer,culture,investment,product";

/** Todas as análises exportadas, no formato que as telas já consomem. */
export async function fetchAllAnalyses(): Promise<any[]> {
  if (isAnalysisV2()) return fetchAllPages("/analysis");
  const response = await axios.get(apiUrl(`/analysis?${LEGACY_INCLUDES}`));
  return response.data?.analysiss ?? [];
}

/** Análise com o laudo (modal "Mostrar"). Na v1 o laudo já vem na lista: devolve `fallback`. */
export async function getAnalysis(id: number | string, fallback?: any): Promise<any> {
  if (!isAnalysisV2()) return fallback;
  const response = await axios.get(apiUrl(`/analysis/${id}`));
  return { ...fallback, ...response.data?.analysis };
}

/** Botão de status: v1 = `PATCH analysis/:id` com `{ id, active }` (como o postType); v2 = `{ active }`. */
export async function setAnalysisActive(id: number | string, active: boolean) {
  return axios.patch(
    apiUrl(`/analysis/${id}`),
    isAnalysisV2() ? { active } : { id: Number(id), active },
  );
}
