import { test, expect, Page, Route } from "@playwright/test";

/**
 * Telas do CMS com `analysis`, `bemSizing`, catálogos e `upload` atendidos pela v2
 * (specs/022-fase4-dominio-arquivos, contracts/consumers.md §2). A API é simulada (page.route) com a
 * forma dos contratos; as regras (escopo, campos, permissões) ficam nos e2e da v2.
 */

const page1 = <T,>(items: T[]) => ({ success: true, items, total: items.length, skip: 0, take: 100 });

const PHASE4 = ["analysis", "bemSizing", "culture", "nutrient", "microgeoPrice", "bioStation", "upload"];

async function enablePhase4(page: Page) {
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
            producer: "v2",
            consultant: "v2",
            ...Object.fromEntries(modules.map((m) => [m, "v2"])),
          },
          minAppVersion: "0.0.0",
        },
        etag: null,
        fetchedAt: Date.now(),
      })
    );
  }, PHASE4);
  await page.route("**/auth/me", (route: Route) =>
    route.fulfill({
      json: { success: true, user: { id: 1, name: "QA", email: "qa@tmf.test", roleId: 1 } },
    })
  );
  await page.route("**/admin/users**", (route: Route) => route.fulfill({ json: page1([]) }));
  await page.route("**/producer**", (route: Route) =>
    route.fulfill({
      json: page1([
        {
          id: 10,
          name: "Fazenda QA",
          cpf: "***.***.666-09",
          userId: 7,
          state: { id: 1, name: "São Paulo" },
          city: { id: 1, name: "Campinas" },
        },
      ]),
    })
  );
  await page.route("**/consultant**", (route: Route) =>
    route.fulfill({ json: page1([{ id: 3, userId: 7, user: { id: 7, name: "Consultor A" } }]) })
  );
}

const analysis = {
  id: 21,
  active: true,
  startDate: "2026-10-01T00:00:00.000Z",
  endDate: "2026-10-01T00:00:00.000Z",
  plot: "Talhão 1",
  application: "CONSTRUÇÃO DE PERFIL DE SOLO",
  consultantId: 3,
  producerId: 10,
  cultureId: 1,
  productId: 1,
  pdfExported: true,
  createdAt: "2026-10-16T10:00:00.000Z",
  updatedAt: "2026-10-16T10:00:00.000Z",
  // Mesmo formato do motor (fixture `analysisRich` do app): as telas leem estes campos no CSV.
  report: {
    Dosage: [{ value: 100, description: "a lanço" }],
    AditionalInformation: ["Ca", "Si", "Mg", "B", "S", "N"].map((label) => ({ label, value: 1 })),
    NutritionalRequirement: Object.fromEntries(
      ["nitrogenio", "fosforo", "potassio", "calcio", "magnesio", "enxofre"].map((k) => [
        k,
        { extracao: 1, exportacao: 1 },
      ])
    ),
    resultSoil: {
      productRecommended: { dosage: 120, recommendedKCL: 10 },
      measureResult: { Ca: 40, Mg: 10, K: 3, V: 50 },
      expectativeResult: { Ca: 45, Mg: 12, K: 4 },
      aditionalInformation: ["Ca", "Si", "Mg", "B", "S", "N"].map((label) => ({ label, value: 1 })),
    },
    realResult: { realMeasureResult: { Ca: 41, Mg: 11 }, realDosage: 118 },
    resultPlant: {
      Dosage: [{ value: 90 }],
      NutritionalRequirement: Object.fromEntries(
        ["nitrogenio", "fosforo", "potassio", "calcio", "magnesio", "enxofre"].map((k) => [
          k,
          { extracao: 1, exportacao: 1 },
        ])
      ),
    },
  },
  culture: { id: 1, name: "Soja", slug: "soja" },
  product: { id: 1, name: "Calsite", slug: "calsite", minerals: "{}", parameter: 1, categoryId: 1 },
  producer: { id: 10, name: "Fazenda QA", cpf: "***.***.666-09", telephone: "*******4321" },
  consultant: {
    id: 3,
    userId: 7,
    user: { id: 7, name: "Consultor A", phone: "11999990000", email: "a@tmf.test" },
  },
};

test.describe("Fase 4 na v2", () => {
  test("análises: lista sem laudo, Mostrar carrega o laudo por id, status envia só { active }", async ({
    page,
  }) => {
    const detailCalls: string[] = [];
    const patches: any[] = [];
    await enablePhase4(page);
    await page.route("**/analysis**", async (route: Route) => {
      const request = route.request();
      if (request.method() === "PATCH") {
        patches.push(request.postDataJSON());
        return route.fulfill({ json: { success: true, analysis } });
      }
      if (/\/analysis\/21$/.test(new URL(request.url()).pathname)) {
        detailCalls.push(request.url());
        return route.fulfill({
          json: { success: true, analysis: { ...analysis, pdf: "<html><body>Laudo QA</body></html>" } },
        });
      }
      return route.fulfill({ json: page1([analysis]) });
    });

    await page.goto("/construcao-e-manutencao-de-perfil-de-solo", { waitUntil: "networkidle" });
    await expect(page.getByText("Fazenda QA").first()).toBeVisible();
    expect(detailCalls).toHaveLength(0);

    await page.getByRole("button", { name: "Mostrar" }).first().click();
    await expect.poll(() => detailCalls.length).toBe(1);
    await expect(page.frameLocator("iframe").first().getByText("Laudo QA")).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Desativar" }).first().click();
    await expect.poll(() => patches.length).toBe(1);
    expect(patches[0]).toEqual({ active: false });
  });

  test("dimensionamento BEM: lista paginada da v2", async ({ page }) => {
    const urls: string[] = [];
    await enablePhase4(page);
    await page.route("**/bemSizing**", (route: Route) => {
      urls.push(route.request().url());
      return route.fulfill({
        json: page1([
          {
            id: 4,
            mode: "daily",
            producerId: 10,
            consultantId: 3,
            inputs: {},
            result: {},
            pdfExported: false,
            createdAt: "2026-10-16T10:00:00.000Z",
          },
        ]),
      });
    });
    await page.goto("/dimensionamento-bem", { waitUntil: "networkidle" });
    expect(urls.some((url) => /take=100/.test(url))).toBe(true);
    await expect(page.getByText("Fazenda QA").first()).toBeVisible();
  });

  test("culturas: lista da v2 e status envia só { active }", async ({ page }) => {
    const patches: any[] = [];
    await enablePhase4(page);
    await page.route("**/nutrient**", (route: Route) => route.fulfill({ json: page1([]) }));
    await page.route("**/culture**", async (route: Route) => {
      if (route.request().method() === "PATCH") {
        patches.push(route.request().postDataJSON());
        return route.fulfill({ json: { success: true, culture: {} } });
      }
      return route.fulfill({
        json: page1([
          { id: 1, name: "Soja", slug: "soja", lang: "pt-BR", active: true, createdAt: "2026-10-16T10:00:00.000Z" },
        ]),
      });
    });
    await page.goto("/culturas", { waitUntil: "networkidle" });
    await expect(page.getByText("Soja").first()).toBeVisible();
    await page.getByRole("button", { name: "Desativar" }).first().click();
    await expect.poll(() => patches.length).toBe(1);
    expect(patches[0]).toEqual({ active: false });
  });

  test("preços Microgeo: exclusão com vínculo mostra a mensagem da v2", async ({ page }) => {
    const deletes: string[] = [];
    await enablePhase4(page);
    await page.route("**/microgeoPrice**", async (route: Route) => {
      if (route.request().method() === "DELETE") {
        deletes.push(new URL(route.request().url()).pathname);
        return route.fulfill({
          status: 409,
          json: { success: false, message: "Registro possui vínculos e não pode ser excluído" },
        });
      }
      return route.fulfill({
        json: page1([
          { id: 2, name: "Microgeo Start", role: "start", custoPorKg: 10, createdAt: "2026-10-16T10:00:00.000Z" },
        ]),
      });
    });
    page.on("dialog", (dialog) => dialog.accept());
    await page.goto("/precos-microgeo", { waitUntil: "networkidle" });
    await expect(page.getByText("Microgeo Start").first()).toBeVisible();
    await page.getByRole("button", { name: "Remover" }).first().click();
    const confirm = page.getByRole("button", { name: /Confirmar|Sim|Excluir/ });
    if (await confirm.count()) await confirm.first().click();
    await expect.poll(() => deletes.length).toBe(1);
    expect(deletes[0]).toMatch(/\/microgeoPrice\/2$/);
    await expect(page.getByText("Registro possui vínculos e não pode ser excluído")).toBeVisible();
  });

  test("materiais: upload recusado (413) mostra o limite", async ({ page }) => {
    await enablePhase4(page);
    await page.route("**/materialCategory**", (route: Route) =>
      route.fulfill({ json: { success: true, categories: [] } })
    );
    await page.route("**/state**", (route: Route) => route.fulfill({ json: { success: true, states: [] } }));
    await page.route("**/culture**", (route: Route) => route.fulfill({ json: page1([]) }));
    await page.route("**/material", (route: Route) => route.fulfill({ json: { success: true, materials: [] } }));
    await page.route("**/upload", (route: Route) =>
      route.fulfill({ status: 413, json: { success: false, message: "Requisição muito grande" } })
    );
    await page.goto("/materiais", { waitUntil: "networkidle" });
    await page.getByText("Adicionar Material").first().click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "grande.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4"),
    });
    await expect(page.getByText(/Arquivo acima do limite/)).toBeVisible();
  });
});
