/**
 * Unidade: lib/pagination.ts (specs/020-fase2-exposicao-dados research R15). Adaptador axios falso.
 */
import { expect, test } from "@playwright/test";
import axios from "axios";
import { __setClientConfigForTests } from "../../lib/clientConfig";
import { CONCURRENCY, MAX_PAGES, fetchAllPages } from "../../lib/pagination";

const V1 = "https://v1.test/api/v1";
const V2 = "https://v2.test/api/v2";

let calls: { url: string; params: any }[] = [];
let respond: (call: { url: string; params: any }) => any = () => ({});
const originalAdapter = axios.defaults.adapter;

test.beforeEach(() => {
  process.env.API_URL = V1;
  process.env.API_URL_V2 = V2;
  calls = [];
  __setClientConfigForTests({
    default: "v1",
    modules: { auth: "v2", producer: "v2" },
    minAppVersion: "0.0.0",
  });
  axios.defaults.adapter = async (config: any) => {
    const call = { url: config.url, params: config.params };
    calls.push(call);
    return {
      data: respond(call),
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };
});

test.afterEach(() => {
  axios.defaults.adapter = originalAdapter;
  __setClientConfigForTests(null);
});

const all = Array.from({ length: 250 }, (_, i) => ({ id: i }));
const paged = (call: { params: any }) => ({
  items: all.slice(call.params.skip, call.params.skip + call.params.take),
  total: all.length,
});

test("percorre as páginas de 100 com os filtros e na base v2 do módulo", async () => {
  respond = paged;
  const items = await fetchAllPages("/producer", { name: "Faz" });
  expect(items).toHaveLength(250);
  expect(calls.map((c) => c.params.skip).sort((a, b) => a - b)).toEqual([0, 100, 200]);
  expect(items.map((i: any) => i.id)).toEqual(all.map((i) => i.id));
  expect(
    calls.every((c) => c.url === `${V2}/producer` && c.params.take === 100),
  ).toBe(true);
  expect(calls.every((c) => c.params.name === "Faz")).toBe(true);
});

test("lista vazia: uma chamada", async () => {
  respond = () => ({ items: [], total: 0 });
  expect(await fetchAllPages("/producer")).toEqual([]);
  expect(calls).toHaveLength(1);
});

test("total acima do teto de páginas: falha logo na primeira resposta", async () => {
  respond = () => ({ items: [{ id: 1 }], total: 1e9 });
  await expect(fetchAllPages("/producer")).rejects.toThrow(`${MAX_PAGES} páginas`);
  expect(calls).toHaveLength(1);
});

test("páginas seguintes em paralelo (no máximo CONCURRENCY), na ordem certa", async () => {
  const many = Array.from({ length: 1050 }, (_, i) => ({ id: i }));
  let inFlight = 0;
  let peak = 0;
  axios.defaults.adapter = async (config: any) => {
    calls.push({ url: config.url, params: config.params });
    inFlight++;
    peak = Math.max(peak, inFlight);
    // páginas com atraso decrescente: respostas chegam fora de ordem
    await new Promise((r) => setTimeout(r, 20 - config.params.skip / 100));
    inFlight--;
    return {
      data: { items: many.slice(config.params.skip, config.params.skip + 100), total: many.length },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    };
  };
  const items = await fetchAllPages("/analysis");
  expect(items.map((i: any) => i.id)).toEqual(many.map((i) => i.id));
  expect(calls).toHaveLength(11);
  expect(peak).toBe(CONCURRENCY);
});
