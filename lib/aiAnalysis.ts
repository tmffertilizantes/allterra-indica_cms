/**
 * Análise IA dos relatórios (specs/019-analise-ia-relatorios). Mesmas chaves da v2
 * (`src/ai-analysis/analysis-types.ts`) e do app; paridade conferida pelo teste de contrato da v2.
 * As regras do formulário repetem as da v2 (FR-018) só para dar retorno imediato: a v2 é a fonte da
 * verdade.
 */
export const ANALYSIS_TYPES = [
  "nutrition",
  "fertility",
  "tmfVsCompetitor",
  "productionCost",
  "bemSizing",
  "microgeoPosition",
] as const;

export type AnalysisType = (typeof ANALYSIS_TYPES)[number];

export const ANALYSIS_TYPE_LABELS: Record<AnalysisType, string> = {
  nutrition: "Manutenção e Nutrição de Plantas",
  fertility: "Fertilidade e Construção de Perfil de Solo",
  tmfVsCompetitor: "Investimento TMF x Concorrente",
  productionCost: "Custo de Produção",
  bemSizing: "Dimensionamento de Bio Estação (BEM)",
  microgeoPosition: "Posição Microgeo",
};

/** Provedores aceitos pela v2 (`src/ai-analysis/analysis-types.ts`); o token é de um provedor. */
export const AI_PROVIDERS = ["openai", "anthropic"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const PROMPT_MAX_LENGTH = 8000;
export const MIN_MAX_OUTPUT_TOKENS = 256;
export const MAX_MAX_OUTPUT_TOKENS = 8000;
export const AI_MODEL_PATTERN = /^[A-Za-z0-9._:-]{1,80}$/;

export interface AiPromptSetting {
  analysisType: AnalysisType;
  enabled: boolean;
  prompt: string;
  defaultPrompt: string;
  updatedAt: string | null;
  updatedByName: string | null;
}

export interface AiProviderDefaults {
  provider: AiProvider;
  label: string;
  model: string;
  modelSuggestions: string[];
}

export interface AiAdminSettings {
  provider: AiProvider;
  hasApiKey: boolean;
  apiKeyLast4: string | null;
  encryptionConfigured: boolean;
  model: string;
  maxOutputTokens: number;
  defaults: {
    provider: AiProvider;
    maxOutputTokens: number;
    providers: AiProviderDefaults[];
  };
  updatedAt: string | null;
  updatedByName: string | null;
  prompts: AiPromptSetting[];
  recentFailures: { errorCode: string; count: number }[];
}

export interface AiTestResult {
  ok: boolean;
  errorCode: string | null;
}

export const AI_ERROR_MESSAGES: Record<string, string> = {
  INVALID_KEY: "Token inválido",
  MODEL_NOT_FOUND: "Modelo não encontrado para este token",
  QUOTA: "Cota do serviço de IA esgotada",
  RATE_LIMIT: "Limite de requisições do serviço de IA atingido",
  TIMEOUT: "O serviço de IA demorou demais para responder",
  EMPTY_RESPONSE: "O serviço de IA devolveu uma resposta vazia",
  NOT_CONFIGURED: "IA não configurada",
  STALE: "Geração interrompida",
  PROVIDER_ERROR: "Não foi possível falar com o serviço de IA",
};

export function aiErrorMessage(code: string | null | undefined): string {
  return (code && AI_ERROR_MESSAGES[code]) || AI_ERROR_MESSAGES.PROVIDER_ERROR;
}

export interface AiSettingsForm {
  provider: AiProvider;
  /** Provedor do token salvo: o token só continua valendo se o provedor não mudar. */
  savedProvider: AiProvider;
  /** Token digitado; vazio = mantém o atual. */
  apiKey: string;
  hasApiKey: boolean;
  clearApiKey: boolean;
  model: string;
  maxOutputTokens: number;
  prompts: { analysisType: AnalysisType; enabled: boolean; prompt: string }[];
}

/** Regras do FR-018 e limites da v2. Devolve a lista de problemas (vazia = válido). */
export function validateAiSettingsForm(form: AiSettingsForm): string[] {
  const errors: string[] = [];
  const typedKey = form.apiKey.trim().length > 0;
  const keepsSavedKey = form.hasApiKey && form.provider === form.savedProvider;
  const willHaveKey = !form.clearApiKey && (keepsSavedKey || typedKey);

  // O token salvo é do provedor anterior: trocar pede o token novo ou a remoção do atual.
  const providerKeyMissing =
    form.provider !== form.savedProvider &&
    form.hasApiKey &&
    !typedKey &&
    !form.clearApiKey;

  if (!AI_MODEL_PATTERN.test(form.model.trim()))
    errors.push("Informe um modelo válido");
  if (
    !Number.isInteger(form.maxOutputTokens) ||
    form.maxOutputTokens < MIN_MAX_OUTPUT_TOKENS ||
    form.maxOutputTokens > MAX_MAX_OUTPUT_TOKENS
  ) {
    errors.push(
      `O limite de tamanho da resposta deve ficar entre ${MIN_MAX_OUTPUT_TOKENS} e ${MAX_MAX_OUTPUT_TOKENS}`,
    );
  }
  for (const item of form.prompts) {
    const label = ANALYSIS_TYPE_LABELS[item.analysisType];
    if (item.prompt.length > PROMPT_MAX_LENGTH) {
      errors.push(
        `O prompt de ${label} passa de ${PROMPT_MAX_LENGTH} caracteres`,
      );
    }
    if (item.enabled && !item.prompt.trim()) {
      errors.push(`Informe o prompt de ${label} para habilitá-la`);
    }
  }
  if (form.prompts.some((item) => item.enabled)) {
    if (form.clearApiKey)
      errors.push("Desabilite as análises antes de remover o token");
    else if (!willHaveKey && !providerKeyMissing)
      errors.push("Cadastre o token da IA para habilitar uma análise");
  }
  if (providerKeyMissing)
    errors.push(
      "Informe o token do provedor escolhido ou remova o token atual",
    );
  return errors;
}
