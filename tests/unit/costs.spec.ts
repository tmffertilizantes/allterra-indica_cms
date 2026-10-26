/**
 * Unidade: lib/costs.ts (specs/020-fase2-exposicao-dados, contracts/consumers.md §2). Adaptador axios falso.
 */
import { expect, test } from "@playwright/test";
import axios from "axios";
import { __setClientConfigForTests } from "../../lib/clientConfig";
import { fetchCostRecords, setCostRecordActive } from "../../lib/costs";

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
  axios.defaults.adapter = async (config: any) => {
    const call = {
      method: config.method,
      url: config.url,
      params: config.params,
      data: config.data ? JSON.parse(config.data) : undefined,
    };
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

const v2 = () =>
  __setClientConfigForTests({
    default: "v1",
    modules: { auth: "v2", core: "v2" },
    minAppVersion: "0.0.0",
  });

test("fetchCostRecords (v2): páginas de /core filtradas por tipo", async () => {
  v2();
  respond = () => ({ items: [{ id: 1 }, { id: 2 }], total: 2 });
  expect(await fetchCostRecords("competing")).toEqual([{ id: 1 }, { id: 2 }]);
  expect(calls[0]).toMatchObject({
    method: "get",
    url: `${V2}/core`,
    params: { type: "competing", skip: 0, take: 100 },
  });
});

test("fetchCostRecords (v1): GET /core e filtro pelo tipo no cliente", async () => {
  respond = () => ({
    cores: {
      data: [
        { id: 1, costProductionRequest: "{}", costCompetingRequest: null },
        { id: 2, costProductionRequest: null, costCompetingRequest: "{}" },
      ],
    },
  });
  expect((await fetchCostRecords("production")).map((r) => r.id)).toEqual([1]);
  expect(calls[0]).toMatchObject({ method: "get", url: `${V1}/core` });
});

test("setCostRecordActive: v2 manda só { active }; v1 mantém { id, active }", async () => {
  v2();
  await setCostRecordActive(5, false);
  expect(calls[0]).toMatchObject({
    method: "patch",
    url: `${V2}/core/5`,
    data: { active: false },
  });
  __setClientConfigForTests(null);
  await setCostRecordActive(5, true);
  expect(calls[1]).toMatchObject({
    method: "patch",
    url: `${V1}/core/5`,
    data: { id: 5, active: true },
  });
});
