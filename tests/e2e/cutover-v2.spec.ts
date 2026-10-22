import fs from "fs";
import path from "path";
import { test, expect, Route } from "@playwright/test";

/**
 * Virada (specs/023 US4, SC-001; tasks T042): com o CLIENT_CONFIG da virada (base `default: "v2"`), toda
 * página do CMS abre sem nenhuma requisição à base v1. A API v2 é simulada com respostas vazias no formato
 * dos contratos (listas paginadas e chaves do legado); o conteúdo das telas é coberto por fase2/fase4/fase5.
 * Rodar com `API_URL_V2` definido (senão a base v2 cai para a v1 e o teste não distingue as duas).
 */

const PAGES_DIR = path.resolve(__dirname, "../../pages");
const PUBLIC_PAGES = new Set(["login", "esqueci-minha-senha", "editar-senha", "registro-de-consultores"]);

/** Todas as páginas de `pages/` (sem `_app`, `_document` e `api/`). */
const pages = fs
  .readdirSync(PAGES_DIR)
  .filter((file) => /\.tsx$/.test(file) && !file.startsWith("_"))
  .map((file) => file.replace(/\.tsx$/, ""));

/** Resposta vazia que serve às telas na v2: lista paginada + as chaves de lista do legado. */
const EMPTY = {
  success: true,
  items: [],
  total: 0,
  skip: 0,
  take: 100,
  states: [],
  terms: [],
  contacts: [],
  regions: [],
  resales: [],
  roles: [],
  orders: [],
  settings: {},
};

test.skip(!process.env.API_URL_V2, "defina API_URL_V2 para distinguir as bases v1 e v2");

for (const name of pages) {
  test(`${name}: nenhuma chamada à v1 com a configuração da virada`, async ({ page }) => {
    const v1: string[] = [];
    page.on("request", (request) => {
      if (/\/api\/v1\//.test(request.url())) v1.push(`${request.method()} ${request.url()}`);
    });
    page.on("pageerror", (error) => {
      // Erro de renderização com a resposta vazia não é o objeto deste teste; só registra.
      console.warn(`[${name}] ${error.message}`);
    });

    await page.addInitScript(() => {
      window.localStorage.setItem(
        "tmf:client-config",
        JSON.stringify({
          config: {
            default: "v2",
            modules: { microgeoPosition: "v2", webchat: "v2", aiAnalysis: "v2" },
            minAppVersion: "2.2.0",
          },
          etag: null,
          fetchedAt: Date.now(),
        })
      );
    });
    await page.route("**/api/v1/**", (route: Route) => route.abort());
    await page.route("**/api/v2/**", (route: Route) => {
      const url = route.request().url();
      if (/\/auth\/me$/.test(url) || /\/users\/me$/.test(url)) {
        return route.fulfill({
          json: { success: true, user: { id: 1, name: "QA", email: "qa@tmf.test", roleId: 1 } },
        });
      }
      return route.fulfill({ json: EMPTY });
    });

    await page.goto(`/${name === "index" ? "" : name}`, { waitUntil: "networkidle" });
    if (!PUBLIC_PAGES.has(name)) await page.waitForTimeout(500);
    expect(v1, `chamadas à v1 em /${name}`).toEqual([]);
  });
}
