import type { AxiosResponse } from "axios";
import Swal from "sweetalert2";
import { AlertItemCreated, AlertItemEdited, AlertItemRemoved } from "@components/Alerts/Alerts";
import {
  catalogErrorMessage,
  createCatalogItem,
  fetchAllCatalog,
  LEGACY_CATALOG_KEY,
  removeCatalogItem,
  saveCatalogItem,
  type CatalogModule,
} from "../../lib/catalogs";

const showError = (error: unknown) =>
  Swal.fire({ icon: "error", title: "Erro", text: catalogErrorMessage(error) });

/**
 * `dataConfig` do `PostType` para um catálogo: lista, inclusão, edição/status e exclusão pelos
 * helpers acima, devolvendo a lista no formato que as páginas já consomem (`response.data.<chave>`).
 */
export function catalogDataConfig(module: CatalogModule) {
  const key = LEGACY_CATALOG_KEY[module];
  const reload = async (fetcherDataFn: (r: AxiosResponse) => any) =>
    fetcherDataFn({ data: { [key]: await fetchAllCatalog(module) } } as AxiosResponse);
  return {
    fetcherFn: (fetcherDataFn: (r: AxiosResponse) => any = (r) => r.data) => reload(fetcherDataFn),
    insertFn: async (
      _insertUrl = "",
      _url = "",
      _options = {},
      post: any = {},
      fetcherDataFn: (r: AxiosResponse) => any = (r) => r.data,
    ) => {
      try {
        await createCatalogItem(module, post);
        AlertItemCreated();
      } catch (error) {
        showError(error);
      }
      return reload(fetcherDataFn);
    },
    updateFn: async (
      _updateUrl = "",
      _url = "",
      _options = {},
      post: any = {},
      fetcherDataFn: (r: AxiosResponse) => any = (r) => r.data,
    ) => {
      try {
        await saveCatalogItem(module, post);
        AlertItemEdited();
      } catch (error) {
        showError(error);
      }
      return reload(fetcherDataFn);
    },
    removeFn: async (
      removeUrl = "",
      _url = "",
      _options = {},
      fetcherDataFn: (r: AxiosResponse) => any = (r) => r.data,
    ) => {
      try {
        await removeCatalogItem(module, String(removeUrl).split("/").pop() ?? "");
        AlertItemRemoved();
      } catch (error) {
        showError(error);
      }
      return reload(fetcherDataFn);
    },
  };
}

