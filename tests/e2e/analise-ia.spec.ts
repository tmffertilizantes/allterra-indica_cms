import { test, expect, Page, Route } from "@playwright/test";

/**
 * Smoke da tela Configurações → Análise IA (specs/019-analise-ia-relatorios, US3).
 * A API da v2 é simulada (page.route): o foco é a tela. Regras da API: e2e da v2
 * (ai-analysis.e2e-spec).
 */
const TYPES = [
  "nutrition",
  "fertility",
  "tmfVsCompetitor",
  "productionCost",
  "bemSizing",
  "microgeoPosition",
];

const initial = {
  provider: "openai",
  hasApiKey: true,
  apiKeyLast4: "x9Qa",
  encryptionConfigured: true,
  model: "gpt-5-mini",
  maxOutputTokens: 2000,
  defaults: {
    provider: "openai",
    maxOutputTokens: 2000,
    providers: [
      {
        provider: "openai",
        label: "OpenAI",
        model: "gpt-5-mini",
        modelSuggestions: ["gpt-5-mini"],
      },
      {
        provider: "anthropic",
        label: "Anthropic (Claude)",
        model: "claude-opus-5-5",
        modelSuggestions: ["claude-opus-5-5", "claude-haiku-5-5"],
      },
    ],
  },
  updatedAt: "2026-10-16T13:05:00.000Z",
  updatedByName: "Maria Souza",
  prompts: TYPES.map((analysisType) => ({
    analysisType,
    enabled: false,
    prompt: `Prompt ${analysisType}`,
    defaultPrompt: `Prompt ${analysisType}`,
    updatedAt: null,
    updatedByName: null,
  })),
  recentFailures: [{ errorCode: "INVALID_KEY", count: 3 }],
};

async function enableModule(page: Page) {
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
            aiAnalysis: "v2",
          },
          minAppVersion: "0.0.0",
        },
        etag: null,
        fetchedAt: Date.now(),
      }),
    );
  });
}

async function mockApi(
  page: Page,
  puts: any[],
  testCode: string | null = "INVALID_KEY",
  tests: any[] = [],
) {
  await page.route("**/auth/me", (route: Route) =>
    route.fulfill({
      json: {
        success: true,
        user: { id: 1, name: "QA", email: "qa@tmf.test", roleId: 1 },
      },
    }),
  );
  await page.route("**/ai-analysis/admin/settings", async (route: Route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON();
      puts.push(body);
      return route.fulfill({ json: { success: true, settings: initial } });
    }
    return route.fulfill({ json: { success: true, settings: initial } });
  });
  await page.route("**/ai-analysis/admin/test", (route: Route) => {
    tests.push(route.request().postDataJSON());
    return route.fulfill({
      json: {
        success: true,
        test: { ok: testCode === null, errorCode: testCode },
      },
    });
  });
}

test.describe("analise-ia", () => {
  test("carrega com o token mascarado, testa, valida e salva sem reenviar o token", async ({
    page,
  }) => {
    const puts: any[] = [];
    await enableModule(page);
    await mockApi(page, puts);

    await page.goto("/analise-ia", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("heading", { name: "Análise IA" }),
    ).toBeVisible();
    await expect(page.getByPlaceholder("•••• x9Qa")).toBeVisible();
    await expect(page.getByTestId("ai-recent-failures")).toContainText(
      "Token inválido (3)",
    );

    await page.getByRole("button", { name: "Testar" }).click();
    await expect(page.getByTestId("ai-test-result")).toHaveText(
      "Token inválido",
    );

    // Habilita Nutrição sem prompt → bloqueado no cliente.
    await page
      .getByRole("button", { name: /Manutenção e Nutrição de Plantas/ })
      .click();
    await page.getByLabel("Habilitar IA nesta análise").first().check();
    await page.locator("#ai-prompt-nutrition").fill("");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByTestId("ai-form-errors")).toContainText(
      "Informe o prompt de Manutenção e Nutrição de Plantas para habilitá-la",
    );
    expect(puts).toHaveLength(0);

    await page.locator("#ai-prompt-nutrition").fill("Analise a nutrição.");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect.poll(() => puts.length).toBe(1);
    expect(puts[0].apiKey).toBeUndefined();
    expect(puts[0].provider).toBe("openai");
    expect(puts[0].prompts).toContainEqual({
      analysisType: "nutrition",
      enabled: true,
      prompt: "Analise a nutrição.",
    });
  });

  test("trocar para Anthropic sugere o modelo e exige o token novo", async ({
    page,
  }) => {
    const puts: any[] = [];
    const tests: any[] = [];
    await enableModule(page);
    await mockApi(page, puts, null, tests);

    await page.goto("/analise-ia", { waitUntil: "networkidle" });
    await page.getByLabel("Provedor").selectOption("anthropic");
    await expect(page.getByLabel("Modelo")).toHaveValue("claude-opus-5-5");
    await expect(
      page.getByLabel("Token da Anthropic (Claude)"),
    ).toHaveAttribute("placeholder", "Informe o token");
    // O token salvo é da OpenAI: sem token novo, nem "Testar" nem "Salvar".
    await expect(page.getByRole("button", { name: "Testar" })).toBeDisabled();
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByTestId("ai-form-errors")).toContainText(
      "Informe o token do provedor escolhido ou remova o token atual",
    );
    expect(puts).toHaveLength(0);

    await page
      .getByLabel("Token da Anthropic (Claude)")
      .fill("sk-ant-api03-0123456789abcdef");
    await page.getByRole("button", { name: "Testar" }).click();
    await expect(page.getByTestId("ai-test-result")).toHaveText("Conexão OK");
    expect(tests[0]).toEqual({
      provider: "anthropic",
      apiKey: "sk-ant-api03-0123456789abcdef",
      model: "claude-opus-5-5",
    });

    await page.getByRole("button", { name: "Salvar" }).click();
    await expect.poll(() => puts.length).toBe(1);
    expect(puts[0]).toMatchObject({
      provider: "anthropic",
      apiKey: "sk-ant-api03-0123456789abcdef",
      model: "claude-opus-5-5",
    });
  });

  test("sem o módulo: funcionalidade indisponível", async ({ page }) => {
    await mockApi(page, []);
    await page.goto("/analise-ia", { waitUntil: "networkidle" });
    await expect(page.getByText("Funcionalidade indisponível.")).toBeVisible();
  });
});
