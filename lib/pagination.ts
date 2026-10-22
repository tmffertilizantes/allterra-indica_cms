import axios from "axios";
import { apiUrl } from "./api";

/** Teto da v2 por página (achado 8.8). */
export const PAGE_SIZE = 100;
/** Proteção contra laço infinito (total inconsistente): 200 páginas = 20.000 itens. */
export const MAX_PAGES = 200;

/** Páginas pedidas ao mesmo tempo depois da primeira (specs/022: lista de análises do CMS, SC-003). */
export const CONCURRENCY = 4;

/**
 * Lê todas as páginas de uma listagem da v2 (`{ items, total, skip, take }`) com `take = 100` (specs/020
 * research R15). A primeira página informa o `total`; as demais são pedidas em paralelo (até
 * `CONCURRENCY` por vez) e concatenadas na ordem. As telas continuam recebendo a lista completa.
 */
export async function fetchAllPages<T = any>(
  path: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  const get = async (page: number): Promise<{ items: T[]; total: number }> => {
    const { data } = await axios.get(apiUrl(path), {
      params: { ...params, skip: page * PAGE_SIZE, take: PAGE_SIZE },
    });
    return { items: data?.items ?? [], total: data?.total ?? 0 };
  };
  const first = await get(0);
  const pageCount = Math.ceil(first.total / PAGE_SIZE);
  if (pageCount > MAX_PAGES) {
    throw new Error(`fetchAllPages(${path}): mais de ${MAX_PAGES} páginas`);
  }
  if (!first.items.length || first.items.length >= first.total) return first.items;

  const pages: T[][] = [first.items];
  let next = 1;
  const worker = async () => {
    while (next < pageCount) {
      const page = next++;
      pages[page] = (await get(page)).items;
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pageCount - 1) }, worker));
  return pages.flat();
}
