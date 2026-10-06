/**
 * Unidade: switch de back-end por módulo no CMS (lib/clientConfig.ts + lib/api.ts).
 * Contrato: specs/013-fase0-consumidores-borda/contracts/consumer-routing.md
 */
import { expect, test } from "@playwright/test";
import {
  DEFAULT_CLIENT_CONFIG,
  __setClientConfigForTests,
  apiVersion,
  parseClientConfig,
  resolveBaseUrl,
  resolveModule,
} from "../../lib/clientConfig";
import { apiUrl } from "../../lib/api";

const V1 = "https://v1.test/api/v1";
const V2 = "https://v2.test/api/v2";

/** Módulos chamados pelo CMS (varredura de `process.env.API_URL` antes da centralização). */
const CMS_MODULES = [
  "analysis", "auth", "bemSizing", "bioStation", "category", "consultant", "contact", "core",
  "culture", "email_template", "material", "materialCategory", "microgeoPrice", "nutrient",
  "producer", "product", "region", "resale", "resultSectionOrder", "role", "state", "terms",
  "upload", "user",
];

test.beforeEach(() => {
  process.env.API_URL = V1;
  process.env.API_URL_V2 = V2;
  delete process.env.CLIENT_CONFIG_DEFAULT;
  __setClientConfigForTests(null);
});

test.describe("parseClientConfig", () => {
  const valid = { success: true, default: "v1", modules: { user: "v2" }, minAppVersion: "2.0.19" };

  test("aceita a resposta da v2 e descarta o envelope", () => {
    expect(parseClientConfig(valid)).toEqual({
      default: "v1",
      modules: { user: "v2" },
      minAppVersion: "2.0.19",
    });
  });

  test("rejeita configurações inválidas", () => {
    for (const raw of [
      { ...valid, success: false },
      { ...valid, default: "v3" },
      { ...valid, modules: { user: "v3" } },
      { ...valid, modules: ["v1"] },
      { ...valid, minAppVersion: "2.0" },
      null,
      "v1",
    ]) {
      expect(parseClientConfig(raw)).toBeNull();
    }
  });
});

test("resolveModule usa o primeiro segmento do caminho", () => {
  expect(resolveModule("/core/12/pdf")).toBe("core");
  expect(resolveModule("/product?includes=category,analysis")).toBe("product");
  expect(resolveModule("state/3?includes=city")).toBe("state");
  expect(resolveModule("https://example.com/api/v1/core")).toBeNull();
  expect(resolveModule("")).toBeNull();
});

test("invariante: tudo em v1 → apiUrl idêntica à URL de antes para todos os módulos", () => {
  for (const name of CMS_MODULES) {
    expect(apiUrl(`/${name}/x?y=1`)).toBe(`${V1}/${name}/x?y=1`);
    expect(apiVersion(name)).toBe("v1");
  }
  expect(apiUrl("/auth/me")).toBe(`${V1}/auth/me`);
  expect(apiUrl("upload")).toBe(`${V1}/upload`);
});

test("módulo em v2 desvia só aquele módulo", () => {
  __setClientConfigForTests({ default: "v1", modules: { producer: "v2" }, minAppVersion: "0.0.0" });
  expect(apiUrl("/producer/search")).toBe(`${V2}/producer/search`);
  expect(apiUrl("/core")).toBe(`${V1}/core`);
});

test("módulo ausente do mapa usa default", () => {
  __setClientConfigForTests({ default: "v2", modules: { core: "v1" }, minAppVersion: "0.0.0" });
  expect(resolveBaseUrl("/terms")).toBe(V2);
  expect(resolveBaseUrl("/core")).toBe(V1);
});

test("v2 sem API_URL_V2 → v1", () => {
  process.env.API_URL_V2 = "";
  __setClientConfigForTests({ default: "v2", modules: {}, minAppVersion: "0.0.0" });
  expect(apiUrl("/terms")).toBe(`${V1}/terms`);
});

test("valor embutido (CLIENT_CONFIG_DEFAULT) vale sem configuração remota; inválido → padrão", () => {
  process.env.CLIENT_CONFIG_DEFAULT = JSON.stringify({
    default: "v1",
    modules: { region: "v2" },
    minAppVersion: "0.0.0",
  });
  expect(apiUrl("/region")).toBe(`${V2}/region`);

  process.env.CLIENT_CONFIG_DEFAULT = '{"default":"v9"}';
  expect(apiUrl("/region")).toBe(`${V1}/region`);
  expect(parseClientConfig({ ...DEFAULT_CLIENT_CONFIG })).toEqual(DEFAULT_CLIENT_CONFIG);
});
