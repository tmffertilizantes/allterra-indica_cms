import { test, expect, Page, Route } from "@playwright/test";

/**
 * Telas do CMS com os catálogos e o conteúdo da Fase 5 atendidos pela v2 (specs/023, contracts/consumers.md
 * §2; tasks T029). A API é simulada (page.route) com a forma de contracts/content-api.md; as regras
 * (permissões, 409) ficam nos e2e da v2. Com `API_URL_V2` definido, falha se alguma chamada for à v1.
 */

const page1 = <T,>(items: T[]) => ({ success: true, items, total: items.length, skip: 0, take: 100 });
const at = "2026-10-19T10:00:00.000Z";

const PHASE5 = ["category", "region", "resale", "material", "materialCategory", "contact", "terms", "state"];

/** Requisições feitas à base v1 (só faz sentido com API_URL_V2 definido no servidor do CMS). */
function trackV1(page: Page): string[] {
  const v1: string[] = [];
  page.on("request", (request) => {
    if (process.env.API_URL_V2 && /\/api\/v1\//.test(request.url())) v1.push(request.url());
  });
  return v1;
}

async function enablePhase5(page: Page) {
  await page.addInitScript((modules: string[]) => {
    window.localStorage.setItem(
      "tmf:client-config",
      JSON.stringify({
        config: {
          default: "v1",
          modules: {
            auth: "v2",
            user: "v2",
            preferences: "v2",
            culture: "v2",
            upload: "v2",
            ...Object.fromEntries(modules.map((m) => [m, "v2"])),
          },
          minAppVersion: "0.0.0",
        },
        etag: null,
        fetchedAt: Date.now(),
      })
    );
  }, PHASE5);
  await page.route("**/auth/me", (route: Route) =>
    route.fulfill({
      json: { success: true, user: { id: 1, name: "QA", email: "qa@tmf.test", roleId: 1 } },
    })
  );
}

test.describe("Fase 5 na v2", () => {
  test("regiões: lista administrativa (/region/all) e status envia só { active }", async ({ page }) => {
    const v1 = trackV1(page);
    const patches: any[] = [];
    const lists: string[] = [];
    await enablePhase5(page);
    await page.route("**/region**", async (route: Route) => {
      const request = route.request();
      if (request.method() === "PATCH") {
        patches.push({ path: new URL(request.url()).pathname, body: request.postDataJSON() });
        return route.fulfill({ json: { success: true, region: {} } });
      }
      lists.push(new URL(request.url()).pathname);
      if (process.env.API_URL_V2) expect(request.url().startsWith(process.env.API_URL_V2)).toBe(true);
      return route.fulfill({
        json: page1([{ id: 4, name: "Região QA", active: true, createdAt: at, updatedAt: at }]),
      });
    });
    await page.goto("/regioes", { waitUntil: "networkidle" });
    await expect(page.getByText("Região QA").first()).toBeVisible();
    expect(lists.every((p) => p.endsWith("/region/all"))).toBe(true);
    await page.getByRole("button", { name: "Desativar" }).first().click();
    await expect.poll(() => patches.length).toBe(1);
    expect(patches[0]).toEqual({ path: expect.stringMatching(/\/region\/4$/), body: { active: false } });
    expect(v1).toEqual([]);
  });

  test("revendas: status pela v2; recusa da v2 mostra a mensagem dela", async ({ page }) => {
    // A tela não tem exclusão (colunas padrão: Editar/Desativar). A recusa simulada aqui é a do
    // administrador sem permissão; o texto vem da v2 (lib/catalogs.ts → catalogErrorMessage).
    const patches: string[] = [];
    await enablePhase5(page);
    await page.route("**/resale**", async (route: Route) => {
      if (route.request().method() === "PATCH") {
        patches.push(new URL(route.request().url()).pathname);
        return route.fulfill({ status: 403, json: { success: false, message: "Acesso negado" } });
      }
      return route.fulfill({
        json: page1([{ id: 6, name: "Revenda QA", type: "revenda", active: true, createdAt: at }]),
      });
    });
    await page.goto("/revendas", { waitUntil: "networkidle" });
    await expect(page.getByText("Revenda QA").first()).toBeVisible();
    await page.getByRole("button", { name: "Desativar" }).first().click();
    await expect.poll(() => patches.length).toBe(1);
    expect(patches[0]).toMatch(/\/resale\/6$/);
    await expect(page.getByText("Acesso negado").first()).toBeVisible();
  });

  test("categorias de produto e de material: listas paginadas da v2", async ({ page }) => {
    await enablePhase5(page);
    await page.route("**/category**", (route: Route) =>
      route.fulfill({
        json: page1([{ id: 1, name: "Remineralizadores", slug: "r", lang: "pt-BR", active: true, createdAt: at }]),
      })
    );
    await page.route("**/materialCategory**", (route: Route) =>
      route.fulfill({
        json: page1([
          { id: 2, name: "Folder Técnico", slug: "f", lang: "pt-BR", active: true, filters: true, createdAt: at },
        ]),
      })
    );
    await page.goto("/categorias", { waitUntil: "networkidle" });
    await expect(page.getByText("Remineralizadores").first()).toBeVisible();
    await page.goto("/categorias-de-materiais", { waitUntil: "networkidle" });
    await expect(page.getByText("Folder Técnico").first()).toBeVisible();
  });

  test("materiais: lista da v2 e status envia só { active }", async ({ page }) => {
    const patches: any[] = [];
    await enablePhase5(page);
    await page.route("**/materialCategory**", (route: Route) =>
      route.fulfill({ json: page1([{ id: 2, name: "Folder", active: true }]) })
    );
    await page.route("**/culture**", (route: Route) => route.fulfill({ json: page1([]) }));
    await page.route("**/state**", (route: Route) => route.fulfill({ json: { success: true, states: [] } }));
    await page.route(/\/material(\/\d+)?(\?.*)?$/, async (route: Route) => {
      if (route.request().method() === "PATCH") {
        patches.push(route.request().postDataJSON());
        return route.fulfill({ json: { success: true, material: {} } });
      }
      return route.fulfill({
        json: page1([
          {
            id: 9,
            name: "Flyer Produtos",
            slug: "flyer_produtos",
            file: "https://x.test/api/v1/file/1-FLYER.pdf",
            lang: "pt-BR",
            active: true,
            categoryId: 2,
            createdAt: at,
            materialCategory: { id: 2, name: "Folder", slug: "f", filters: false },
          },
        ]),
      });
    });
    await page.goto("/materiais", { waitUntil: "networkidle" });
    await expect(page.getByText("Flyer Produtos").first()).toBeVisible();
    await page.getByRole("button", { name: "Desativar" }).first().click();
    await expect.poll(() => patches.length).toBe(1);
    expect(patches[0]).toEqual({ active: false });
  });

  test("termos: carrega o texto e grava { description }", async ({ page }) => {
    const posts: any[] = [];
    await enablePhase5(page);
    await page.route("**/terms", async (route: Route) => {
      if (route.request().method() === "POST") {
        posts.push(route.request().postDataJSON());
        return route.fulfill({ json: { success: true, terms: { id: 1, description: "x" } } });
      }
      return route.fulfill({ json: { success: true, terms: [{ id: 1, description: "<p>Termos QA</p>" }] } });
    });
    await page.goto("/termos", { waitUntil: "networkidle" });
    await expect(page.getByText("Termos QA").first()).toBeVisible();
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect.poll(() => posts.length).toBe(1);
    expect(Object.keys(posts[0])).toEqual(["description"]);
    expect(posts[0].description).toContain("Termos QA");
  });
});
