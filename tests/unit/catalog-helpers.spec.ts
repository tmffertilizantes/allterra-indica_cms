/**
 * Unidade: lib/producers.ts, lib/products.ts e lib/consultants.ts
 * (specs/020-fase2-exposicao-dados, contracts/consumers.md §2). Adaptador axios falso.
 */
import { expect, test } from "@playwright/test";
import axios from "axios";
import { __setClientConfigForTests } from "../../lib/clientConfig";
import {
  deleteConsultant,
  fetchAllConsultants,
  fetchConsultantReport,
  updateConsultant,
} from "../../lib/consultants";
import { fetchAllProducers, getProducer, saveProducer } from "../../lib/producers";
import { createProduct, productErrorMessage, saveProduct } from "../../lib/products";

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

const v2 = () =>
  __setClientConfigForTests({
    default: "v1",
    modules: { auth: "v2", producer: "v2", product: "v2", consultant: "v2" },
    minAppVersion: "0.0.0",
  });

test("produtores (v2): lista paginada, detalhe completo e edição sem valores mascarados", async () => {
  v2();
  respond = (call) =>
    call.url.endsWith("/producer/7")
      ? { producer: { id: 7, cpf: "12345666609" } }
      : { items: [{ id: 7, cpf: "***.***.666-09" }], total: 1 };
  expect(await fetchAllProducers()).toEqual([{ id: 7, cpf: "***.***.666-09" }]);
  expect((await getProducer(7)).cpf).toBe("12345666609");
  await saveProducer({
    id: 7,
    name: "Faz",
    cpf: "***.***.666-09",
    telephone: "11999998888",
    stateId: "1",
    owner: { id: 1 },
    city: {},
    active: false,
  });
  const patch = calls.find((c) => c.method === "patch")!;
  expect(patch.url).toBe(`${V2}/producer/7`);
  expect(patch.data).toEqual({ name: "Faz", telephone: "11999998888", stateId: 1, active: false });
});

test("produtores (v1): GET /producer, detalhe = item da lista, PATCH com o post inteiro", async () => {
  respond = () => ({ producers: [{ id: 1 }] });
  expect(await fetchAllProducers()).toEqual([{ id: 1 }]);
  expect(await getProducer(1, { id: 1, cpf: "x" })).toEqual({ id: 1, cpf: "x" });
  await saveProducer({ id: 1, active: true });
  expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
    `get ${V1}/producer`,
    `patch ${V1}/producer/1`,
  ]);
  expect(calls[1].data).toEqual({ id: 1, active: true });
});

test("produtos (v2): só campos do DTO; números convertidos; mensagens de 413/409", async () => {
  v2();
  await createProduct({
    id: 3,
    name: "P",
    slug: "p",
    minerals: { ca: "1" },
    parameter: "2",
    categoryId: "1",
    category: { id: 1 },
    createdAt: "x",
  });
  await saveProduct({ id: 3, active: false, category: {} });
  expect(calls[0]).toMatchObject({
    method: "post",
    url: `${V2}/product`,
    data: { name: "P", slug: "p", minerals: '{"ca":"1"}', parameter: 2, categoryId: 1 },
  });
  expect(calls[1]).toMatchObject({ method: "patch", url: `${V2}/product/3`, data: { active: false } });
  expect(productErrorMessage({ response: { status: 413 } })).toMatch(/Imagem acima do limite/);
  expect(productErrorMessage({ response: { status: 409 } })).toMatch(/análises vinculadas/);
});

test("consultores (v2): lista paginada, relatório, edição sem userId e lixeira = DELETE /consultant/:id", async () => {
  v2();
  respond = (call) =>
    call.url.endsWith("/report") ? { consultants: [{ id: 1 }] } : { items: [{ id: 1 }], total: 1 };
  expect(await fetchAllConsultants()).toEqual([{ id: 1 }]);
  expect(await fetchConsultantReport("2026-01-01", "2026-12-31")).toEqual([{ id: 1 }]);
  await updateConsultant(4, { regionId: 2, betaTester: true, userId: 9 } as any);
  await deleteConsultant(4);
  expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
    `get ${V2}/consultant`,
    `get ${V2}/consultant/report`,
    `patch ${V2}/consultant/4`,
    `delete ${V2}/consultant/4`,
  ]);
  expect(calls[1].params).toEqual({ start_date: "2026-01-01", end_date: "2026-12-31" });
  expect(calls[2].data).toEqual({ regionId: 2, betaTester: true });
});

test("consultores (v1): lixeira continua em DELETE /consultant/soft/:id", async () => {
  await deleteConsultant(4);
  expect(calls[0]).toMatchObject({ method: "delete", url: `${V1}/consultant/soft/4` });
});
