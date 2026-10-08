/**
 * Unidade: lib/users.ts (specs/016, contracts/consumer-session.md §5). As chamadas HTTP passam por
 * um adaptador axios falso que registra método, URL e corpo.
 */
import { expect, test } from "@playwright/test";
import axios from "axios";
import { __setClientConfigForTests } from "../../lib/clientConfig";
import { fetchAllUsers, setActive, setApproval, updateUser } from "../../lib/users";

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
    modules: { auth: "v2", user: "v2", preferences: "v2" },
    minAppVersion: "0.0.0",
  });

test("fetchAllUsers (v2): 250 usuários → 3 páginas de 100 e o array completo", async () => {
  v2();
  const all = Array.from({ length: 250 }, (_, i) => ({ id: i + 1 }));
  respond = (call) => ({
    items: all.slice(call.params.skip, call.params.skip + call.params.take),
    total: all.length,
  });
  const users = await fetchAllUsers();
  expect(users).toHaveLength(250);
  expect(calls.map((c) => c.params.skip)).toEqual([0, 100, 200]);
  expect(calls.every((c) => c.url === `${V2}/admin/users` && c.params.take === 100)).toBe(true);
});

test("fetchAllUsers (v1): GET /user do legado", async () => {
  respond = () => ({ users: [{ id: 1 }] });
  expect(await fetchAllUsers()).toEqual([{ id: 1 }]);
  expect(calls[0]).toMatchObject({ method: "get", url: `${V1}/user` });
});

test("setApproval/setActive (v2): endpoints próprios", async () => {
  v2();
  await setApproval(5, true);
  await setApproval(5, false);
  await setActive(5, false);
  expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
    `post ${V2}/admin/users/5/approve`,
    `post ${V2}/admin/users/5/disapprove`,
    `patch ${V2}/admin/users/5/active`,
  ]);
  expect(calls[2].data).toEqual({ active: false });
});

test("updateUser (v2): só os 6 campos pessoais (FR-022)", async () => {
  v2();
  await updateUser(5, { name: "Ana", email: "a@b.com", status: "approved", roleId: 1, active: true } as any);
  expect(calls[0]).toMatchObject({ method: "patch", url: `${V2}/admin/users/5` });
  expect(calls[0].data).toEqual({ name: "Ana", email: "a@b.com" });
});

test("setApproval (v1): PATCH /user/:id com status, como hoje", async () => {
  await setApproval(5, true);
  expect(calls[0]).toMatchObject({ method: "patch", url: `${V1}/user/5`, data: { status: "approved" } });
});
