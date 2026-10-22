/**
 * Unidade: lib/content.ts (specs/023 contracts/consumers.md §2; tasks T016) — termos de uso e contato
 * em v1 e v2: mesmo caminho e formato; a base muda com o módulo.
 */
import { expect, test } from "@playwright/test";
import axios from "axios";
import { __setClientConfigForTests } from "../../lib/clientConfig";
import { fetchContacts, fetchTerms, isContentV2, saveContact, saveTerms } from "../../lib/content";

const V1 = "https://v1.test/api/v1";
const V2 = "https://v2.test/api/v2";

type Call = { method: string; url: string; data?: any };
let calls: Call[] = [];
const originalAdapter = axios.defaults.adapter;

test.beforeEach(() => {
  process.env.API_URL = V1;
  process.env.API_URL_V2 = V2;
  calls = [];
  axios.defaults.adapter = async (config: any) => {
    const call = {
      method: config.method,
      url: config.url,
      data: config.data ? JSON.parse(config.data) : undefined,
    };
    calls.push(call);
    const data = call.url.endsWith("/terms")
      ? { terms: [{ description: "<p>T</p>" }] }
      : { contacts: [{ section: "<h2>C</h2>" }] };
    return { data, status: 200, statusText: "OK", headers: {}, config };
  };
});

test.afterEach(() => {
  axios.defaults.adapter = originalAdapter;
  __setClientConfigForTests(null);
});

for (const version of ["v1", "v2"] as const) {
  test(`${version}: lê e grava termos e contato no mesmo caminho`, async () => {
    if (version === "v2") {
      __setClientConfigForTests({
        default: "v1",
        modules: { auth: "v2", terms: "v2", contact: "v2" },
        minAppVersion: "0.0.0",
      });
    }
    const base = version === "v2" ? V2 : V1;
    expect(isContentV2("terms")).toBe(version === "v2");
    expect(await fetchTerms()).toEqual([{ description: "<p>T</p>" }]);
    expect(await fetchContacts()).toEqual([{ section: "<h2>C</h2>" }]);
    await saveTerms("<p>novo</p>");
    await saveContact("<h2>novo</h2>");
    expect(calls).toEqual([
      { method: "get", url: `${base}/terms`, data: undefined },
      { method: "get", url: `${base}/contact`, data: undefined },
      { method: "post", url: `${base}/terms`, data: { description: "<p>novo</p>" } },
      { method: "post", url: `${base}/contact`, data: { section: "<h2>novo</h2>" } },
    ]);
  });
}

test("v2 sem auth em v2: tratado como v1 (a v2 nunca aceita token legado)", () => {
  __setClientConfigForTests({ default: "v1", modules: { terms: "v2" }, minAppVersion: "0.0.0" });
  expect(isContentV2("terms")).toBe(false);
});
