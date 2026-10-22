/**
 * Unidade: lib/catalogs.ts (specs/022-fase4-dominio-arquivos, contracts/consumers.md §2) — catálogos do
 * cálculo e BEM em v1 e v2. Adaptador axios falso.
 */
import { expect, test } from "@playwright/test";
import axios from "axios";
import { __setClientConfigForTests } from "../../lib/clientConfig";
import {
  catalogErrorMessage,
  createCatalogItem,
  fetchAllBemSizings,
  fetchAllCatalog,
  removeCatalogItem,
  saveCatalogItem,
} from "../../lib/catalogs";

const V1 = "https://v1.test/api/v1";
const V2 = "https://v2.test/api/v2";

type Call = { method: string; url: string; params?: any; data?: any };
let calls: Call[] = [];
let respond: (call: Call) => any = () => ({});
const originalAdapter = axios.defaults.adapter;

test.beforeEach(() => {
  process.env.API_URL = V1;
  process.env.API_URL_V2 = V2;
  calls = [];
  respond = () => ({});
  axios.defaults.adapter = async (config: any) => {
    const call = {
      method: config.method,
      url: config.url,
      params: config.params,
      data: config.data ? JSON.parse(config.data) : undefined,
    };
    calls.push(call);
    return { data: respond(call), status: 200, statusText: "OK", headers: {}, config };
  };
});

test.afterEach(() => {
  axios.defaults.adapter = originalAdapter;
  __setClientConfigForTests(null);
});

const MODULES = ["culture", "nutrient", "microgeoPrice", "bioStation", "bemSizing"];
const v2 = () =>
  __setClientConfigForTests({
    default: "v1",
    modules: { auth: "v2", ...Object.fromEntries(MODULES.map((m) => [m, "v2"])) },
    minAppVersion: "0.0.0",
  });

test("v2: listas paginadas (com filtro de cultura nos nutrientes)", async () => {
  v2();
  respond = () => ({ items: [{ id: 1 }], total: 1 });
  expect(await fetchAllCatalog("culture")).toEqual([{ id: 1 }]);
  expect(calls[0]).toMatchObject({ url: `${V2}/culture`, params: { skip: 0, take: 100 } });
  await fetchAllCatalog("nutrient", { cultureId: 3 });
  expect(calls[1].params).toEqual({ cultureId: 3, skip: 0, take: 100 });
  expect(await fetchAllBemSizings()).toEqual([{ id: 1 }]);
  expect(calls[2].url).toBe(`${V2}/bemSizing`);
});

test("v2: escrita só com os campos do DTO", async () => {
  v2();
  await createCatalogItem("culture", { name: "Soja", slug: "soja", lang: "pt-BR", id: 9, createdAt: "x" });
  expect(calls[0]).toMatchObject({ method: "post", url: `${V2}/culture` });
  expect(calls[0].data).toEqual({ name: "Soja", slug: "soja", lang: "pt-BR" });
  // botão de status do postType: { id, active }
  await saveCatalogItem("culture", { id: 9, active: false });
  expect(calls[1]).toMatchObject({ method: "patch", url: `${V2}/culture/9`, data: { active: false } });
  await saveCatalogItem("nutrient", { id: 5, extract: 1.5, export: "2", culture: {}, updatedAt: "y" });
  expect(calls[2].data).toEqual({ extract: 1.5, export: "2" });
  await saveCatalogItem("microgeoPrice", {
    id: 2,
    name: "Start",
    role: "start",
    custoPorKg: 10,
    image: "data:image/png;base64,AAA=",
    createdAt: "x",
  });
  expect(calls[3].data).toEqual({
    name: "Start",
    role: "start",
    custoPorKg: 10,
    image: "data:image/png;base64,AAA=",
  });
  await removeCatalogItem("bioStation", 4);
  expect(calls[4]).toMatchObject({ method: "delete", url: `${V2}/bioStation/4` });
});

test("v1: rotas legadas e corpo inteiro", async () => {
  respond = () => ({ cultures: [{ id: 1 }], bemSizings: [{ id: 2 }], nutrients: [{ id: 3 }] });
  expect(await fetchAllCatalog("culture")).toEqual([{ id: 1 }]);
  expect(await fetchAllCatalog("nutrient", { cultureId: 1 })).toEqual([{ id: 3 }]);
  expect(calls[1].params).toBeUndefined();
  expect(await fetchAllBemSizings()).toEqual([{ id: 2 }]);
  await saveCatalogItem("culture", { id: 1, name: "X", createdAt: "x" });
  expect(calls[3]).toMatchObject({ url: `${V1}/culture/1`, data: { id: 1, name: "X", createdAt: "x" } });
});

test("mensagens de erro", () => {
  expect(catalogErrorMessage({ response: { status: 413 } })).toMatch(/Imagem acima do limite/);
  expect(
    catalogErrorMessage({ response: { status: 409, data: { message: "Registro possui vínculos" } } }),
  ).toBe("Registro possui vínculos");
  expect(catalogErrorMessage({ response: { status: 403 } })).toBe("Acesso negado");
  expect(catalogErrorMessage({})).toBe("Não foi possível salvar");
});

// ---------- Fase 5 (specs/023 contracts/consumers.md §2; tasks T016) ----------
const PHASE5 = ["category", "region", "resale", "materialCategory", "material"] as const;
const v2Phase5 = () =>
  __setClientConfigForTests({
    default: "v1",
    modules: { auth: "v2", ...Object.fromEntries(PHASE5.map((m) => [m, "v2"])) },
    minAppVersion: "0.0.0",
  });

test("Fase 5 v2: região e revenda pela lista administrativa (/all); demais em /<módulo>", async () => {
  v2Phase5();
  respond = () => ({ items: [{ id: 1 }], total: 1 });
  for (const module of PHASE5) await fetchAllCatalog(module);
  expect(calls.map((c) => c.url)).toEqual([
    `${V2}/category`,
    `${V2}/region/all`,
    `${V2}/resale/all`,
    `${V2}/materialCategory`,
    `${V2}/material`,
  ]);
});

test("Fase 5 v2: corpo só com os campos do DTO", async () => {
  v2Phase5();
  await createCatalogItem("material", {
    name: "Flyer",
    slug: "flyer",
    file: "https://x.test/api/v2/file/a.pdf",
    lang: "pt-BR",
    active: true,
    categoryId: 3,
    cultureId: 1,
    stateId: 2,
    year: "2026",
    materialCategory: { id: 3 },
    id: 9,
  });
  expect(calls[0].data).toEqual({
    name: "Flyer",
    slug: "flyer",
    file: "https://x.test/api/v2/file/a.pdf",
    lang: "pt-BR",
    active: true,
    categoryId: 3,
    cultureId: 1,
    stateId: 2,
    year: "2026",
  });
  await saveCatalogItem("resale", { id: 4, name: "R", type: "revenda", createdAt: "x", consultant: [] });
  expect(calls[1]).toMatchObject({ method: "patch", url: `${V2}/resale/4`, data: { name: "R", type: "revenda" } });
  await saveCatalogItem("materialCategory", { id: 5, filters: true, lang: "pt-BR", updatedAt: "y" });
  expect(calls[2].data).toEqual({ filters: true, lang: "pt-BR" });
  await removeCatalogItem("region", 7);
  expect(calls[3]).toMatchObject({ method: "delete", url: `${V2}/region/7` });
});

test("Fase 5 v1: rotas e chaves do legado", async () => {
  respond = (call) =>
    ({
      [`${V1}/category`]: { categorys: [{ id: 1 }] },
      [`${V1}/region`]: { regions: [{ id: 2 }] },
      [`${V1}/resale`]: { resales: [{ id: 3 }] },
      [`${V1}/materialCategory`]: { categories: [{ id: 4 }] },
      [`${V1}/material`]: { materials: [{ id: 5 }] },
    })[call.url];
  const lists = [];
  for (const module of PHASE5) lists.push(await fetchAllCatalog(module));
  expect(lists).toEqual([[{ id: 1 }], [{ id: 2 }], [{ id: 3 }], [{ id: 4 }], [{ id: 5 }]]);
  await saveCatalogItem("material", { id: 5, name: "X", materialCategory: {} });
  expect(calls[5].data).toEqual({ id: 5, name: "X", materialCategory: {} });
});
