import axios from "axios";
import { apiUrl } from "./api";
import { apiVersion } from "./clientConfig";
import { fetchAllPages } from "./pagination";

/**
 * Registros de custo (`core`) no CMS, com a mesma forma nas duas versões
 * (specs/020-fase2-exposicao-dados/contracts/consumers.md §2). Na v2: listagem paginada já filtrada por
 * tipo, sem `userData` nem links de PDF (o relatório vem da coluna `pdf`, como o modal já exibe).
 */

export type CostType = "production" | "competing";

const REQUEST_FIELD: Record<CostType, string> = {
  production: "costProductionRequest",
  competing: "costCompetingRequest",
};

export const isCoreV2 = () => apiVersion("core") === "v2";

/** Registros do tipo (JSONs ainda como texto, como o legado devolvia). */
export async function fetchCostRecords(type: CostType): Promise<any[]> {
  if (isCoreV2()) return fetchAllPages("/core", { type });
  const response = await axios.get(apiUrl(`/core`));
  const records: any[] = response.data?.cores?.data ?? [];
  return records.filter((record) => record[REQUEST_FIELD[type]] != null);
}

/** Botão de status das telas de custo. v2: só `{ active }` (o corpo do legado levava o `id`). */
export async function setCostRecordActive(id: number, active: boolean) {
  if (isCoreV2()) return axios.patch(apiUrl(`/core/${id}`), { active });
  return axios.patch(apiUrl(`/core/${id}`), { id, active });
}
