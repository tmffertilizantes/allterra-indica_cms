/**
 * Unidade: validação da URL do Webchat IA no CMS (specs/018-webchat-ia, research R5).
 */
import { expect, test } from "@playwright/test";
import { isValidWebchatUrl } from "../../lib/webchat";

const DEFAULT_URL =
  "https://copilotstudio.microsoft.com/environments/Default-185b8529-70b3-47e6-ba61-1a51f0e45cdd/bots/crce4_agentewhatsapp_s8JMLE/webchat?__version__=2&enableFileAttachment=false&cliAgent=true";

test("aceita https absoluta com domínio, inclusive a URL padrão", () => {
  expect(isValidWebchatUrl(DEFAULT_URL)).toBe(true);
  expect(isValidWebchatUrl("https://exemplo.com/chat?x=1")).toBe(true);
  expect(isValidWebchatUrl("  https://exemplo.com.br  ")).toBe(true);
});

test("recusa http, relativa, vazia, javascript:, localhost e longa demais", () => {
  for (const value of [
    "http://exemplo.com",
    "/chat",
    "",
    "   ",
    "javascript:alert(1)",
    "data:text/html,x",
    "https://localhost",
    "exemplo.com",
    `https://a.com/${"x".repeat(2048)}`,
  ]) {
    expect(isValidWebchatUrl(value), value).toBe(false);
  }
});
