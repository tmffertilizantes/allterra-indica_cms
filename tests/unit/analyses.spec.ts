/** Unidade: lib/analyses.ts (specs/022 contracts/consumers.md §2) em v1 e v2. Adaptador axios falso. */
import { expect, test } from "@playwright/test";
import axios from "axios";
import { __setClientConfigForTests } from "../../lib/clientConfig";
import { fetchAllAnalyses, getAnalysis, setAnalysisActive } from "../../lib/analyses";

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
    modules: { auth: "v2", analysis: "v2" },
    minAppVersion: "0.0.0",
  });

test("v2: lista paginada, laudo carregado por id e status só com active", async () => {
  v2();
  respond = (call) =>
    call.url.endsWith("/analysis/7")
      ? { analysis: { id: 7, pdf: "<html/>" } }
      : { items: [{ id: 7 }], total: 1 };
  expect(await fetchAllAnalyses()).toEqual([{ id: 7 }]);
  expect(calls[0]).toMatchObject({ url: `${V2}/analysis`, params: { skip: 0, take: 100 } });
  expect(await getAnalysis(7, { id: 7, producer: { name: "P" } })).toEqual({
    id: 7,
    producer: { name: "P" },
    pdf: "<html/>",
  });
  await setAnalysisActive(7, false);
  expect(calls[2]).toMatchObject({ method: "patch", url: `${V2}/analysis/7`, data: { active: false } });
});

test("v1: rota legada com includes; laudo já está na lista; status como o postType", async () => {
  respond = () => ({ analysiss: [{ id: 1, pdf: "<p/>" }] });
  expect(await fetchAllAnalyses()).toEqual([{ id: 1, pdf: "<p/>" }]);
  expect(calls[0].url).toBe(`${V1}/analysis?includes=consultant,producer,culture,investment,product`);
  const item = { id: 1, pdf: "<p/>" };
  expect(await getAnalysis(1, item)).toBe(item);
  expect(calls).toHaveLength(1);
  await setAnalysisActive(1, true);
  expect(calls[1]).toMatchObject({ url: `${V1}/analysis/1`, data: { id: 1, active: true } });
});
