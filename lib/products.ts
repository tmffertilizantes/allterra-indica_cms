import axios from "axios";
import { apiUrl } from "./api";
import { apiVersion } from "./clientConfig";
import { fetchAllPages } from "./pagination";

/**
 * Produtos no CMS (specs/020-fase2-exposicao-dados/contracts/consumers.md §2). Na v2 a listagem traz a
 * categoria e nunca as análises.
 */

export const isProductV2 = () => apiVersion("product") === "v2";

const EDITABLE = [
  "name",
  "slug",
  "minerals",
  "parameter",
  "lang",
  "active",
  "categoryId",
  "image",
  "enabledOnNutrition",
  "enabledOnFertility",
  "description",
  "guarantees",
] as const;

/** Corpo da v2: só os campos do DTO (o post do formulário leva `id`, `category`, datas...). */
function body(post: Record<string, any>) {
  return Object.fromEntries(
    EDITABLE.filter((key) => post[key] !== undefined).map((key) => [
      key,
      key === "minerals" && post[key] && typeof post[key] === "object"
        ? JSON.stringify(post[key])
        : ["parameter", "categoryId"].includes(key) && post[key] !== null
          ? Number(post[key])
          : post[key],
    ]),
  );
}

export async function fetchAllProducts(): Promise<any[]> {
  if (isProductV2()) return fetchAllPages("/product");
  const response = await axios.get(
    apiUrl(`/product?includes=category,analysis`),
  );
  return response.data?.products ?? [];
}

export async function createProduct(post: Record<string, any>) {
  if (!isProductV2()) return axios.post(apiUrl(`/product`), post);
  return axios.post(apiUrl(`/product`), body(post));
}

export async function saveProduct(post: Record<string, any>) {
  if (!isProductV2()) return axios.patch(apiUrl(`/product/${post.id}`), post);
  return axios.patch(apiUrl(`/product/${post.id}`), body(post));
}

/** Mensagem para os erros que o administrador pode resolver (imagem grande, vínculos). */
export function productErrorMessage(error: any): string {
  const status = error?.response?.status;
  if (status === 413)
    return "Imagem acima do limite. Reduza a imagem e tente de novo.";
  if (status === 409) return "Produto com análises vinculadas.";
  return error?.response?.data?.message || "Não foi possível salvar o produto";
}
