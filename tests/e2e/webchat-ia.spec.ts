import { test, expect, Page, Route } from "@playwright/test";

/**
 * Smoke da tela Configurações → Webchat IA (specs/018-webchat-ia, US2).
 * A API da v2 é simulada (page.route): o foco é a tela — carrega o estado, valida a URL no
 * cliente, envia o PUT certo e restaura a URL padrão. Regras da API: e2e da v2 (webchat.e2e-spec).
 */
const DEFAULT_URL =
  "https://copilotstudio.microsoft.com/environments/Default-185b8529-70b3-47e6-ba61-1a51f0e45cdd/bots/crce4_agentewhatsapp_s8JMLE/webchat?__version__=2&enableFileAttachment=false&cliAgent=true";

const initial = {
  enabled: true,
  url: "https://exemplo.com/chat",
  isDefaultUrl: false,
  defaultUrl: DEFAULT_URL,
  updatedAt: "2026-10-14T13:05:00.000Z",
  updatedByName: "Maria Souza",
};

/** Liga `webchat` (com `auth` em v2) na configuração persistida que o CMS lê ao abrir. */
async function enableWebchatModule(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "tmf:client-config",
      JSON.stringify({
        config: {
          default: "v1",
          modules: { auth: "v2", user: "v2", preferences: "v2", webchat: "v2" },
          minAppVersion: "0.0.0",
        },
        etag: null,
        fetchedAt: Date.now(),
      })
    );
  });
}

/** Sessão simulada: o layout manda ao login quando /auth/me falha (independe da API legada). */
async function mockSession(page: Page) {
  await page.route("**/auth/me", (route: Route) =>
    route.fulfill({
      json: { success: true, user: { id: 1, name: "QA", email: "qa@tmf.test", roleId: 1 } },
    })
  );
}

async function mockApi(page: Page, puts: unknown[]) {
  await mockSession(page);
  await page.route("**/webchat/settings/admin", (route: Route) =>
    route.fulfill({ json: { success: true, settings: initial } })
  );
  await page.route("**/webchat/settings", async (route: Route) => {
    if (route.request().method() !== "PUT") return route.fallback();
    const body = route.request().postDataJSON();
    puts.push(body);
    return route.fulfill({
      json: {
        success: true,
        settings: {
          ...body,
          isDefaultUrl: body.url === DEFAULT_URL,
          defaultUrl: DEFAULT_URL,
          updatedAt: "2026-10-14T14:00:00.000Z",
          updatedByName: "QA",
        },
      },
    });
  });
}

test.describe("webchat-ia", () => {
  test("carrega, valida, salva e restaura a URL padrão", async ({ page }) => {
    const puts: unknown[] = [];
    await enableWebchatModule(page);
    await mockApi(page, puts);

    await page.goto("/webchat-ia", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Webchat IA" })).toBeVisible();

    const toggle = page.locator("#webchat-enabled");
    const url = page.locator("#webchat-url");
    await expect(toggle).toBeChecked();
    await expect(url).toHaveValue(initial.url);
    await expect(page.getByTestId("webchat-last-update")).toContainText("Maria Souza");

    // URL inválida: mensagem e nenhum PUT.
    await url.fill("http://x.com");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Informe uma URL https válida.")).toBeVisible();
    expect(puts).toHaveLength(0);

    // Restaurar URL padrão preenche sem salvar.
    await page.getByRole("button", { name: "Restaurar URL padrão" }).click();
    await expect(url).toHaveValue(DEFAULT_URL);
    expect(puts).toHaveLength(0);

    // Desabilitar e salvar envia o corpo certo.
    await toggle.uncheck();
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect.poll(() => puts.length).toBe(1);
    expect(puts[0]).toEqual({ enabled: false, url: DEFAULT_URL });
    await expect(page.getByTestId("webchat-last-update")).toContainText("QA");
  });

  test("sem o módulo webchat: funcionalidade indisponível", async ({ page }) => {
    await mockSession(page);
    await page.goto("/webchat-ia", { waitUntil: "networkidle" });
    await expect(page.getByText("Funcionalidade indisponível.")).toBeVisible();
  });
});
