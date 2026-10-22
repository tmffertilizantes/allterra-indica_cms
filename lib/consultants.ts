import axios from "axios";
import { apiUrl } from "./api";
import { apiVersion } from "./clientConfig";
import { fetchAllPages } from "./pagination";

/**
 * Consultores no CMS (specs/020-fase2-exposicao-dados/contracts/consumers.md §2). Na v2 o módulo é só
 * do CMS (sessão do CMS + permissão); os dados pessoais e a aprovação seguem por lib/users.ts (Fase 1).
 */

export const isConsultantV2 = () => apiVersion("consultant") === "v2";

/** Todos os consultores ativos (mesmo array que `GET /consultant?includes=region,resale` devolvia). */
export async function fetchAllConsultants(): Promise<any[]> {
  if (isConsultantV2()) return fetchAllPages("/consultant");
  const response = await axios.get(
    apiUrl(`/consultant?includes=region,resale`),
  );
  return response.data?.consultants ?? [];
}

export async function fetchConsultantReport(
  startDate: string,
  endDate: string,
): Promise<any[]> {
  const response = await axios.get(apiUrl(`/consultant/report`), {
    params: { start_date: startDate, end_date: endDate },
  });
  return response.data?.consultants ?? [];
}

export interface ConsultantFields {
  regionId?: number | null;
  resaleId?: number | null;
  betaTester?: boolean;
}

/** Região, revenda e acesso beta. O usuário ligado ao consultor nunca é enviado. */
export async function updateConsultant(id: number, fields: ConsultantFields) {
  const { regionId, resaleId, betaTester } = fields;
  const body = Object.fromEntries(
    Object.entries({ regionId, resaleId, betaTester }).filter(
      ([, value]) => value !== undefined,
    ),
  );
  return axios.patch(apiUrl(`/consultant/${id}`), body);
}

/** Lixeira: exclusão lógica (v1: `DELETE consultant/soft/:id`; v2: `DELETE consultant/:id`). */
export async function deleteConsultant(id: number) {
  if (!isConsultantV2()) return axios.delete(apiUrl(`/consultant/soft/${id}`));
  return axios.delete(apiUrl(`/consultant/${id}`));
}
