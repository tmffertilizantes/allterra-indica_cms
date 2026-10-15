/**
 * Unidade: validação do formulário da Análise IA no CMS (specs/019-analise-ia-relatorios, FR-018).
 * A v2 é a fonte da verdade; aqui é só o retorno imediato.
 */
import { expect, test } from "@playwright/test";
import {
  ANALYSIS_TYPES,
  aiErrorMessage,
  validateAiSettingsForm,
  type AiSettingsForm,
} from "../../lib/aiAnalysis";

const form = (
  over: Partial<AiSettingsForm> = {},
  enabled: string[] = [],
): AiSettingsForm => ({
  provider: "openai",
  savedProvider: "openai",
  apiKey: "",
  hasApiKey: true,
  clearApiKey: false,
  model: "gpt-5-mini",
  maxOutputTokens: 2000,
  prompts: ANALYSIS_TYPES.map((analysisType) => ({
    analysisType,
    enabled: enabled.includes(analysisType),
    prompt: "Analise o relatório.",
  })),
  ...over,
});

test("válido: token salvo e análise habilitada com prompt", () => {
  expect(validateAiSettingsForm(form({}, ["nutrition"]))).toEqual([]);
});

test("análise habilitada exige prompt", () => {
  const f = form({}, ["fertility"]);
  f.prompts[1].prompt = "   ";
  expect(validateAiSettingsForm(f)).toEqual([
    "Informe o prompt de Fertilidade e Construção de Perfil de Solo para habilitá-la",
  ]);
});

test("análise habilitada exige token (atual ou digitado)", () => {
  expect(
    validateAiSettingsForm(form({ hasApiKey: false }, ["bemSizing"])),
  ).toEqual(["Cadastre o token da IA para habilitar uma análise"]);
  expect(
    validateAiSettingsForm(
      form({ hasApiKey: false, apiKey: "sk-novo-0123456789abc" }, [
        "bemSizing",
      ]),
    ),
  ).toEqual([]);
});

test("remover token com análise habilitada é recusado", () => {
  expect(
    validateAiSettingsForm(form({ clearApiKey: true }, ["nutrition"])),
  ).toEqual(["Desabilite as análises antes de remover o token"]);
  expect(validateAiSettingsForm(form({ clearApiKey: true }))).toEqual([]);
});

test("trocar de provedor pede o token novo ou a remoção do atual", () => {
  const MESSAGE =
    "Informe o token do provedor escolhido ou remova o token atual";
  expect(
    validateAiSettingsForm(
      form({ provider: "anthropic", model: "claude-opus-5-5" }, ["nutrition"]),
    ),
  ).toEqual([MESSAGE]);
  expect(
    validateAiSettingsForm(
      form(
        {
          provider: "anthropic",
          model: "claude-opus-5-5",
          apiKey: "sk-ant-api03-0123456789abc",
        },
        ["nutrition"],
      ),
    ),
  ).toEqual([]);
  expect(
    validateAiSettingsForm(
      form({
        provider: "anthropic",
        model: "claude-opus-5-5",
        clearApiKey: true,
      }),
    ),
  ).toEqual([]);
  // Sem token salvo, trocar de provedor é livre.
  expect(
    validateAiSettingsForm(
      form({
        provider: "anthropic",
        model: "claude-opus-5-5",
        hasApiKey: false,
      }),
    ),
  ).toEqual([]);
});

test("limite e modelo fora do padrão", () => {
  expect(validateAiSettingsForm(form({ maxOutputTokens: 100 }))).toHaveLength(
    1,
  );
  expect(validateAiSettingsForm(form({ maxOutputTokens: 9000 }))).toHaveLength(
    1,
  );
  expect(validateAiSettingsForm(form({ model: "gpt 5 mini" }))).toEqual([
    "Informe um modelo válido",
  ]);
});

test("prompt acima de 8000 caracteres", () => {
  const f = form();
  f.prompts[0].prompt = "a".repeat(8001);
  expect(validateAiSettingsForm(f)[0]).toMatch(/passa de 8000 caracteres/);
});

test("mensagens dos códigos de erro", () => {
  expect(aiErrorMessage("INVALID_KEY")).toBe("Token inválido");
  expect(aiErrorMessage("MODEL_NOT_FOUND")).toBe(
    "Modelo não encontrado para este token",
  );
  expect(aiErrorMessage("XYZ")).toBe(
    "Não foi possível falar com o serviço de IA",
  );
});
