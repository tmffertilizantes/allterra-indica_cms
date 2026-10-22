import axios from "axios";
import { apiUrl } from "./api";
import { apiVersion } from "./clientConfig";
import { fetchAllPages } from "./pagination";

/**
 * Produtores no CMS, com a mesma forma nas duas versões
 * (specs/020-fase2-exposicao-dados/contracts/consumers.md §2). Na v2 a listagem traz CPF e telefone
 * MASCARADOS (esclarecimento Q2); o dado completo só vem do detalhe (`getProducer`).
 */

export const isProducerV2 = () => apiVersion("producer") === "v2";

/** Campos editáveis pelo CMS na v2 (o corpo do PostType leva `id`, `owner`, `city`...). */
const EDITABLE = [
  "name",
  "cpf",
  "telephone",
  "stateId",
  "cityId",
  "cultureId",
  "area",
  "technology",
  "type",
  "active",
  "userId",
] as const;

const isMasked = (value: unknown) =>
  typeof value === "string" && value.includes("*");

/** Todos os produtores (v2 percorre as páginas de 100) — mesmo array que `GET /producer` devolvia. */
export async function fetchAllProducers(): Promise<any[]> {
  if (isProducerV2()) return fetchAllPages("/producer");
  const response = await axios.get(apiUrl(`/producer`));
  return response.data?.producers ?? [];
}

/** Detalhe com CPF e telefone completos (v2). Na v1 a listagem já é completa: usa o item recebido. */
export async function getProducer(id: number, fallback?: any): Promise<any> {
  if (!isProducerV2()) return fallback;
  const response = await axios.get(apiUrl(`/producer/${id}`));
  return response.data.producer;
}

/**
 * Edição (inclui o botão de status). Na v2: só os campos editáveis e nunca um valor mascarado — o
 * formulário abre com os valores da listagem (mascarados); CPF/telefone só vão se forem digitados.
 */
export async function saveProducer(post: Record<string, any>) {
  if (!isProducerV2()) return axios.patch(apiUrl(`/producer/${post.id}`), post);
  const body = Object.fromEntries(
    EDITABLE.filter(
      (key) => post[key] !== undefined && !isMasked(post[key]),
    ).map((key) => [
      key,
      ["stateId", "cityId", "cultureId", "userId"].includes(key) &&
      post[key] !== null
        ? Number(post[key])
        : post[key],
    ]),
  );
  return axios.patch(apiUrl(`/producer/${post.id}`), body);
}
