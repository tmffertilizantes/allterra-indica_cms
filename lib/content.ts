import axios from "axios";
import { apiUrl } from "./api";
import { apiVersion } from "./clientConfig";

/**
 * Conteúdo de linha única no CMS — termos de uso e contato (specs/023 contracts/consumers.md §2). Mesmo
 * caminho e formato nas duas versões; na v2 o corpo leva só o campo do DTO e a escrita exige a sessão
 * v2 (garantida pelo acoplamento com `auth` em `lib/clientConfig.ts`).
 */

export type SingleContentModule = "terms" | "contact";

export const isContentV2 = (module: SingleContentModule) => apiVersion(module) === "v2";

export async function fetchTerms(): Promise<{ description: string }[]> {
  const response = await axios.get(apiUrl(`/terms`));
  return response.data?.terms ?? [];
}

export async function saveTerms(description: string) {
  return axios.post(apiUrl(`/terms`), { description });
}

export async function fetchContacts(): Promise<{ section: string }[]> {
  const response = await axios.get(apiUrl(`/contact`));
  return response.data?.contacts ?? [];
}

export async function saveContact(section: string) {
  return axios.post(apiUrl(`/contact`), { section });
}
