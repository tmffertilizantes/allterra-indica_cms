import axios from "axios";
import { apiUrl } from "./api";

/**
 * Upload de arquivos de materiais (specs/022-fase4-dominio-arquivos/contracts/files-api.md §1). Mesmo
 * caminho e resposta (`{ file }`) nas duas versões; a v2 aceita só PDF, PNG, JPEG e WebP até 10 MB.
 */

/** Tipos aceitos (atributo `accept` do campo). */
export const UPLOAD_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp";
export const UPLOAD_HINT = "PDF, PNG, JPEG ou WebP, até 10 MB.";

/** Envia o arquivo e devolve o endereço gravado no material. */
export async function uploadFile(file: Blob & { name?: string }): Promise<string> {
  const formData = new FormData();
  formData.append("file", file, file.name);
  const response = await axios.post(apiUrl(`/upload`), formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.file;
}

export function uploadErrorMessage(error: any): string {
  const status = error?.response?.status;
  if (status === 413) return `Arquivo acima do limite. ${UPLOAD_HINT}`;
  if (status === 400) {
    const message = error?.response?.data?.message;
    return message ? `${message}. ${UPLOAD_HINT}` : `Arquivo inválido. ${UPLOAD_HINT}`;
  }
  return "Ocorreu um erro ao enviar o arquivo, tente novamente.";
}
