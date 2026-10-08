import axios from "axios";
import { apiUrl } from "./api";
import { apiVersion } from "./clientConfig";

/**
 * Ações sobre usuários no CMS com a mesma assinatura nas duas versões
 * (specs/016-fase1-identidade-v2/contracts/consumer-session.md §5). Com `user` em v2, usam os
 * endpoints administrativos da v2 (/admin/users*), que só aceitam sessão do CMS + permissão.
 * O Authorization é escolhido pelos interceptores de lib/session.ts.
 */

const PAGE_SIZE = 100;

export const isUserV2 = () => apiVersion("user") === "v2";

/** Todos os usuários (v2 percorre as páginas de 100) — mesmo array que `GET /user` devolvia. */
export async function fetchAllUsers(): Promise<any[]> {
  if (!isUserV2()) {
    const response = await axios.get(apiUrl(`/user`));
    return response.data.users ?? [];
  }
  const items: any[] = [];
  let skip = 0;
  for (;;) {
    const response = await axios.get(apiUrl(`/admin/users`), {
      params: { skip, take: PAGE_SIZE },
    });
    const page = response.data;
    items.push(...(page.items ?? []));
    skip += PAGE_SIZE;
    if (skip >= (page.total ?? 0) || !(page.items ?? []).length) break;
  }
  return items;
}

export interface UserFields {
  name?: string;
  identification?: string;
  email?: string;
  phone?: string;
  stateId?: number;
  cityId?: number;
}

/** Edição comum: na v2 só os 6 campos pessoais (FR-022). */
export async function updateUser(id: number, fields: UserFields & Record<string, unknown>) {
  if (!isUserV2()) return axios.patch(apiUrl(`/user/${id}`), fields);
  const { name, identification, email, phone, stateId, cityId } = fields;
  const body = Object.fromEntries(
    Object.entries({ name, identification, email, phone, stateId, cityId }).filter(
      ([, value]) => value !== undefined && value !== null
    )
  );
  return axios.patch(apiUrl(`/admin/users/${id}`), body);
}

/** Aprovação: v2 tem endpoints próprios (aviso por e-mail/WhatsApp só na transição). */
export async function setApproval(id: number, approved: boolean) {
  if (!isUserV2()) return axios.patch(apiUrl(`/user/${id}`), { status: approved ? "approved" : "" });
  return axios.post(apiUrl(`/admin/users/${id}/${approved ? "approve" : "disapprove"}`));
}

export async function setActive(id: number, active: boolean) {
  if (!isUserV2()) return axios.patch(apiUrl(`/user/${id}`), { active });
  return axios.patch(apiUrl(`/admin/users/${id}/active`), { active });
}

export interface NewAdmin {
  name: string;
  email: string;
  password: string;
  phone?: string;
  identification?: string;
}

/** Novo administrador. v1: cadastro com roleId 2 (legado); v2: POST /admin/users. */
export async function createAdmin(data: NewAdmin) {
  if (!isUserV2()) {
    return axios.post(apiUrl(`/auth/register`), {
      ...data,
      roleId: 2,
      status: "approved",
      active: true,
    });
  }
  const { name, email, password, phone, identification } = data;
  return axios.post(apiUrl(`/admin/users`), { name, email, password, phone, identification });
}

export async function deleteUser(id: number) {
  if (!isUserV2()) return axios.delete(apiUrl(`/user/${id}`));
  return axios.delete(apiUrl(`/admin/users/${id}`));
}

/** Só v2: gera senha temporária e envia ao usuário (nunca devolvida ao administrador). */
export async function resetUserPassword(id: number) {
  return axios.post(apiUrl(`/admin/users/${id}/reset-password`));
}

export async function fetchRoles(): Promise<Array<{ id: number; name: string }>> {
  if (!isUserV2()) {
    const response = await axios.get(apiUrl(`/role`));
    return response.data.roles ?? [];
  }
  const response = await axios.get(apiUrl(`/admin/roles`));
  return response.data.items ?? [];
}

/** Mensagem do servidor para alertas (409 de e-mail/telefone, política de senha etc.). */
export function serverMessage(error: any, fallback: string): string {
  const data = error?.response?.data;
  const errors: string[] = data?.errors ?? [];
  if (errors.some((e) => e.includes("senha muito comum"))) return "Essa senha é muito comum. Escolha outra.";
  if (errors.some((e) => e.includes("igual ao e-mail ou nome"))) return "A senha não pode ser igual ao e-mail ou ao nome.";
  if (errors.some((e) => e.startsWith("password"))) return "A senha deve ter de 8 a 72 caracteres.";
  return data?.message && data.message !== "Dados inválidos" ? data.message : fallback;
}
