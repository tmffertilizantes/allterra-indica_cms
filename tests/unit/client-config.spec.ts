/**
 * Unidade: switch de back-end por módulo no CMS (lib/clientConfig.ts + lib/api.ts).
 * Contrato: specs/013-fase0-consumidores-borda/contracts/consumer-routing.md
 */
import { expect, test } from "@playwright/test";
import {
  DEFAULT_CLIENT_CONFIG,
  __setClientConfigForTests,
  apiVersion,
  isFeatureEnabled,
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
  __setClientConfigForTests({
    default: "v1",
    modules: { auth: "v2", producer: "v2" },
    minAppVersion: "0.0.0",
  });
  expect(apiUrl("/producer/search")).toBe(`${V2}/producer/search`);
  expect(apiUrl("/core")).toBe(`${V1}/core`);
});

test("módulos da Fase 2 em v2 sem auth em v2 ficam na v1 (specs/020 R2)", () => {
  for (const name of ["core", "producer", "product", "consultant"]) {
    __setClientConfigForTests({ default: "v1", modules: { [name]: "v2" }, minAppVersion: "0.0.0" });
    expect(apiVersion(name)).toBe("v1");
    __setClientConfigForTests({
      default: "v1",
      modules: { auth: "v2", [name]: "v2" },
      minAppVersion: "0.0.0",
    });
    expect(apiVersion(name)).toBe("v2");
  }
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
    modules: { state: "v2" },
    minAppVersion: "0.0.0",
  });
  expect(apiUrl("/state")).toBe(`${V2}/state`);

  process.env.CLIENT_CONFIG_DEFAULT = '{"default":"v9"}';
  expect(apiUrl("/state")).toBe(`${V1}/state`);
  expect(parseClientConfig({ ...DEFAULT_CLIENT_CONFIG })).toEqual(DEFAULT_CLIENT_CONFIG);
});

test.describe("módulo nativo da v2: Posição Microgeo (specs/017)", () => {
  const identity = { auth: "v2", user: "v2", preferences: "v2" } as const;

  test("alias: microgeo-position → microgeoPosition", () => {
    expect(resolveModule("/microgeo-position?take=100")).toBe("microgeoPosition");
  });

  test("sem a chave → desligado e na base v1", () => {
    __setClientConfigForTests({ default: "v1", modules: { ...identity }, minAppVersion: "0.0.0" });
    expect(isFeatureEnabled("microgeoPosition")).toBe(false);
    expect(resolveBaseUrl("/microgeo-position")).toBe(V1);
  });

  test("com a chave e auth em v1 → desligado", () => {
    __setClientConfigForTests({ default: "v1", modules: { microgeoPosition: "v2" }, minAppVersion: "0.0.0" });
    expect(apiVersion("microgeoPosition")).toBe("v1");
    expect(isFeatureEnabled("microgeoPosition")).toBe(false);
  });

  test("com a chave e auth em v2 → ligado e na base v2", () => {
    __setClientConfigForTests({
      default: "v1",
      modules: { ...identity, microgeoPosition: "v2" },
      minAppVersion: "0.0.0",
    });
    expect(isFeatureEnabled("microgeoPosition")).toBe(true);
    expect(apiUrl("/microgeo-position?take=100&skip=0")).toBe(`${V2}/microgeo-position?take=100&skip=0`);
  });
});

test("Fase 5 (specs/023): região, revenda, categorias, materiais, termos e contato exigem auth em v2; state não", () => {
  const phase5 = ["category", "region", "resale", "material", "materialCategory", "contact", "terms"];
  const modules = Object.fromEntries(phase5.map((m) => [m, "v2"]));
  __setClientConfigForTests({ default: "v1", modules: { ...modules, state: "v2" }, minAppVersion: "0.0.0" });
  for (const m of phase5) expect(apiUrl(`/${m}`)).toBe(`${V1}/${m}`);
  expect(apiUrl("/state")).toBe(`${V2}/state`);
  __setClientConfigForTests({ default: "v1", modules: { auth: "v2", ...modules }, minAppVersion: "0.0.0" });
  for (const m of phase5) expect(apiUrl(`/${m}`)).toBe(`${V2}/${m}`);
});

test("virada (specs/023 R12): base em v2 → toda rota na v2", () => {
  __setClientConfigForTests({
    default: "v2",
    modules: { microgeoPosition: "v2", webchat: "v2", aiAnalysis: "v2" },
    minAppVersion: "2.2.0",
  });
  for (const path of ["/auth/login", "/admin/users/1", "/core", "/analysis", "/region/all", "/terms", "/state"]) {
    expect(apiUrl(path)).toBe(`${V2}${path}`);
  }
});
