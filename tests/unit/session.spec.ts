/**
 * Unidade: sessão do CMS com a identidade da v2 (lib/session.ts — specs/016, research R19).
 * Funções puras: credencial por destino, destino da URL, expiração do JWT; acoplamento/aliases.
 */
import { expect, test } from "@playwright/test";
import { __setClientConfigForTests, apiVersion, resolveBaseUrl, resolveModule } from "../../lib/clientConfig";
import { COOKIE, destinationOf, isV2Session, jwtExpiresAt, tokenFor } from "../../lib/session";

const V1 = "https://v1.test/api/v1";
const V2 = "https://v2.test/api/v2";

const jwt = (payload: object) =>
  `e30.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.assinatura`;

test.beforeEach(() => {
  process.env.API_URL = V1;
  process.env.API_URL_V2 = V2;
  __setClientConfigForTests(null);
});

test.describe("tokenFor", () => {
  const v2Cookies = { [COOKIE.token]: "ponte", [COOKIE.access]: "access", [COOKIE.refresh]: "refresh" };

  test("sessão v2: access para a v2, ponte para a v1", () => {
    expect(isV2Session(v2Cookies)).toBe(true);
    expect(tokenFor("v2", v2Cookies)).toBe("access");
    expect(tokenFor("v1", v2Cookies)).toBe("ponte");
  });

  test("sessão legada: token legado só para a v1, nunca para a v2 (FR-005)", () => {
    const legacy = { [COOKIE.token]: "legado" };
    expect(isV2Session(legacy)).toBe(false);
    expect(tokenFor("v1", legacy)).toBe("legado");
    expect(tokenFor("v2", legacy)).toBeUndefined();
  });

  test("sem cookies: nenhuma credencial", () => {
    expect(tokenFor("v1", {})).toBeUndefined();
    expect(tokenFor("v2", {})).toBeUndefined();
  });
});

test.describe("destinationOf", () => {
  test("pela base configurada", () => {
    expect(destinationOf(`${V2}/admin/users`)).toBe("v2");
    expect(destinationOf(`${V1}/consultant`)).toBe("v1");
    expect(destinationOf("https://outro.site/x")).toBeNull();
  });
});

test.describe("jwtExpiresAt", () => {
  test("lê exp em ms; token inválido → undefined", () => {
    expect(jwtExpiresAt(jwt({ exp: 1_800_000_000 }))).toBe(1_800_000_000_000);
    expect(jwtExpiresAt("lixo")).toBeUndefined();
    expect(jwtExpiresAt(undefined)).toBeUndefined();
  });
});

test.describe("identidade no roteamento do CMS (R2/R3)", () => {
  test("aliases admin/users → user", () => {
    expect(resolveModule("/admin/users/1")).toBe("user");
    expect(resolveModule("/users/me")).toBe("user");
  });

  test("identidade em v2: /admin/users vai para a v2; /consultant segue na v1", () => {
    __setClientConfigForTests({
      default: "v1",
      modules: { auth: "v2", user: "v2", preferences: "v2" },
      minAppVersion: "0.0.0",
    });
    expect(resolveBaseUrl("/admin/users")).toBe(V2);
    expect(resolveBaseUrl("/consultant")).toBe(V1);
  });

  test("acoplamento: user em v2 sem auth em v2 → v1", () => {
    __setClientConfigForTests({ default: "v1", modules: { user: "v2" }, minAppVersion: "0.0.0" });
    expect(apiVersion("user")).toBe("v1");
    expect(resolveBaseUrl("/admin/users")).toBe(V1);
  });
});
