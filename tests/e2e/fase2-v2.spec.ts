import { test, expect, Page, Route } from "@playwright/test";

/**
 * Telas do CMS com `core`, `producer`, `product` e `consultant` atendidos pela v2
 * (specs/020-fase2-exposicao-dados, contracts/consumers.md §2). A API é simulada (page.route) com a
 * forma dos contratos; as regras (escopo, máscara, permissões) ficam nos e2e da v2.
 */

const page1 = <T,>(items: T[]) => ({ success: true, items, total: items.length, skip: 0, take: 100 });

async function enablePhase2(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "tmf:client-config",
      JSON.stringify({
        config: {
          default: "v1",
          modules: {
            auth: "v2",
            user: "v2",
            preferences: "v2",
            core: "v2",
            producer: "v2",
            product: "v2",
            consultant: "v2",
          },
          minAppVersion: "0.0.0",
        },
        etag: null,
        fetchedAt: Date.now(),
      })
    );
  });
  await page.route("**/auth/me", (route: Route) =>
    route.fulfill({
      json: { success: true, user: { id: 1, name: "QA", email: "qa@tmf.test", roleId: 1 } },
    })
  );
  await page.route("**/admin/users**", (route: Route) =>
    route.fulfill({
      json: page1([{ id: 7, name: "Consultor A", email: "a@tmf.test", status: "approved" }]),
    })
  );
}

const producer = {
  id: 10,
  name: "Fazenda Mascarada",
  cpf: "***.***.666-09",
  telephone: "*******4321",
  active: true,
  area: "100",
  technology: null,
  stateId: null,
  cityId: null,
  cultureId: null,
  userId: 7,
  owner: { id: 7, name: "Consultor A" },
};

const consultant = {
  id: 3,
  userId: 7,
  active: true,
  betaTester: false,
  regionId: null,
  resaleId: null,
  deletedAt: null,
  region: null,
  resale: { id: 1, name: "Revenda" },
  user: {
    id: 7,
    name: "Consultor A",
    email: "a@tmf.test",
    phone: "11999990000",
    identification: "123",
    status: "approved",
    active: true,
    stateId: null,
    cityId: null,
    createdAt: "2026-10-01T00:00:00.000Z",
  },
};

test.describe("Fase 2 na v2", () => {
  test("produtores: lista mascarada, Mostrar busca o detalhe completo, status envia só active", async ({
    page,
  }) => {
    const patches: any[] = [];
    await enablePhase2(page);
    await page.route("**/consultant**", (route: Route) => route.fulfill({ json: page1([consultant]) }));
    await page.route("**/producer**", async (route: Route) => {
      const request = route.request();
      if (request.method() === "PATCH") {
        patches.push(request.postDataJSON());
        return route.fulfill({ json: { success: true, producer } });
      }
      if (/\/producer\/10$/.test(request.url())) {
        return route.fulfill({
          json: { success: true, producer: { ...producer, cpf: "12345666609", telephone: "11987654321" } },
        });
      }
      return route.fulfill({ json: page1([producer]) });
    });

    await page.goto("/produtores", { waitUntil: "networkidle" });
    await expect(page.getByText("***.***.666-09")).toBeVisible();
    await expect(page.getByText("12345666609")).toHaveCount(0);

    await page.getByRole("button", { name: "Mostrar" }).first().click();
    await expect(page.getByText("12345666609")).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Desativar" }).first().click();
    await expect.poll(() => patches.length).toBe(1);
    expect(patches[0]).toEqual({ active: false });
  });

  test("custo de produção: lista da v2 por tipo; status envia só { active }", async ({ page }) => {
    const patches: any[] = [];
    const listUrls: string[] = [];
    await enablePhase2(page);
    await page.route("**/core**", async (route: Route) => {
      const request = route.request();
      if (request.method() === "PATCH") {
        patches.push(request.postDataJSON());
        return route.fulfill({ json: { success: true, core: {} } });
      }
      listUrls.push(request.url());
      return route.fulfill({
        json: page1([
          {
            id: 5,
            userId: 7,
            author: { id: 7, name: "Consultor A" },
            active: true,
            date: "16/10/2026",
            producerId: null,
            producer: null,
            costProductionRequest: JSON.stringify({ bagPrice: "120", totalArea: "50" }),
            costProductionResult: JSON.stringify({ profitPerArea: 1, costTotal: 2 }),
            costCompetingRequest: null,
            costCompetingResult: null,
            pdf: "<html><body>Relatório</body></html>",
            pdfExported: true,
            createdAt: "2026-10-16T10:00:00.000Z",
            updatedAt: "2026-10-16T10:00:00.000Z",
            pdfLink: [],
          },
        ]),
      });
    });

    await page.goto("/custo-de-producao", { waitUntil: "networkidle" });
    expect(listUrls.some((url) => /type=production/.test(url))).toBe(true);
    await page.getByRole("button", { name: "Desativar" }).first().click();
    await expect.poll(() => patches.length).toBe(1);
    expect(patches[0]).toEqual({ active: false });
  });

  test("consultores: lista da v2 e lixeira em DELETE /consultant/:id", async ({ page }) => {
    const deletes: string[] = [];
    await enablePhase2(page);
    await page.route("**/region**", (route: Route) => route.fulfill({ json: { success: true, regions: [] } }));
    await page.route("**/resale**", (route: Route) => route.fulfill({ json: { success: true, resales: [] } }));
    await page.route("**/consultant**", async (route: Route) => {
      if (route.request().method() === "DELETE") {
        deletes.push(new URL(route.request().url()).pathname);
        return route.fulfill({ json: { success: true, message: "Consultor excluído" } });
      }
      return route.fulfill({ json: page1([consultant]) });
    });

    await page.goto("/consultores", { waitUntil: "networkidle" });
    await expect(page.getByText("Consultor A").first()).toBeVisible();
    await page.locator("button .fe-trash").first().click();
    await page.getByRole("button", { name: /Confirmar|Sim|Excluir/ }).click();
    await expect.poll(() => deletes.length).toBe(1);
    expect(deletes[0]).toMatch(/\/consultant\/3$/);
  });

  test("registro de consultores: relatório com o mesmo formato", async ({ page }) => {
    await enablePhase2(page);
    await page.route("**/consultant/report**", (route: Route) =>
      route.fulfill({
        json: {
          success: true,
          consultants: [
            {
              id: 3,
              userId: 7,
              name: "Consultor A",
              resale: "Revenda",
              registered: { producers: 2, plant_nutrition: 1, solo_construct: 0, production_cost: 3, tmf_cost: 4 },
            },
          ],
        },
      })
    );
    await page.goto("/registro-de-consultores", { waitUntil: "networkidle" });
    await expect(page.getByText("Consultor A")).toBeVisible();
  });
});
