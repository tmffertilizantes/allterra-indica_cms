import { test, expect, Page, Route } from "@playwright/test";

/**
 * Personalização de resultados atendida pela v2 (specs/019-analise-ia-relatorios, US4): aba Posição
 * Microgeo e seção "Análise IA". A API é simulada (page.route) com a forma do contrato
 * (contracts/result-section-order-v2.md); as regras ficam no e2e da v2.
 */
const MICROGEO = [
  "summary",
  "recommendedDose",
  "splitOptions",
  "applicationMode",
  "compatibility",
  "warnings",
  "aiAnalysis",
];

const rows = [
  {
    id: 1,
    analysisType: "nutrition",
    sectionOrder: [
      "guarantees",
      "summary",
      "nutrientsDelivered",
      "nutritionalRequirement",
      "productDescription",
      "aiAnalysis",
    ],
    hiddenSections: [],
    createdAt: "2026-10-16T10:00:00.000Z",
    updatedAt: "2026-10-16T10:00:00.000Z",
  },
  {
    id: 6,
    analysisType: "microgeoPosition",
    sectionOrder: MICROGEO,
    hiddenSections: [],
    createdAt: "2026-10-16T10:00:00.000Z",
    updatedAt: "2026-10-16T10:00:00.000Z",
  },
];

async function mockApi(page: Page, patches: any[]) {
  await page.route("**/auth/me", (route: Route) =>
    route.fulfill({
      json: {
        success: true,
        user: { id: 1, name: "QA", email: "qa@tmf.test", roleId: 1 },
      },
    }),
  );
  await page.route("**/resultSectionOrder**", async (route: Route) => {
    const request = route.request();
    if (request.method() === "PATCH") {
      const body = request.postDataJSON();
      const id = Number(request.url().split("/").pop());
      patches.push({ id, ...body });
      const row = rows.find((r) => r.id === id)!;
      return route.fulfill({
        json: { success: true, resultSectionOrder: { ...row, ...body } },
      });
    }
    return route.fulfill({
      json: { success: true, resultSectionOrders: rows },
    });
  });
}

test.describe("personalizacao-resultados (v2)", () => {
  test("aba Posição Microgeo com Análise IA; ocultar Compatibilidade envia o PATCH", async ({
    page,
  }) => {
    const patches: any[] = [];
    await mockApi(page, patches);
    await page.goto("/personalizacao-resultados", { waitUntil: "networkidle" });

    // Só as abas que a API devolve.
    await expect(page.getByRole("tab")).toHaveCount(2);
    await page.getByRole("tab", { name: "Posição Microgeo" }).click();
    const pane = page.locator(".tab-pane.active");
    await expect(pane.getByText("Análise IA")).toBeVisible();
    await expect(pane.getByText("Avisos de aplicação")).toBeVisible();

    await pane.locator("#toggle-compatibility").click();
    await pane.getByRole("button", { name: "Salvar" }).click();
    await expect.poll(() => patches.length).toBe(1);
    expect(patches[0]).toEqual({
      id: 6,
      sectionOrder: MICROGEO,
      hiddenSections: ["compatibility"],
    });
  });

  test("Nutrição lista a seção Análise IA", async ({ page }) => {
    await mockApi(page, []);
    await page.goto("/personalizacao-resultados", { waitUntil: "networkidle" });
    await expect(
      page.locator(".tab-pane.active").getByText("Análise IA"),
    ).toBeVisible();
  });
});
