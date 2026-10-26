import { api } from "../lib/api";
import { isFeatureEnabled } from "../lib/clientConfig";
import {
  AiAdminSettings,
  aiErrorMessage,
  AiProvider,
  AnalysisType,
  ANALYSIS_TYPE_LABELS,
  MAX_MAX_OUTPUT_TOKENS,
  MIN_MAX_OUTPUT_TOKENS,
  PROMPT_MAX_LENGTH,
  validateAiSettingsForm,
} from "../lib/aiAnalysis";
import LayoutDefault from "@components/Layouts/default";
import { AlertError, AlertItemEdited } from "@components/Alerts/Alerts";
import { useEffect, useState } from "react";
import { Accordion, Form, Spinner } from "react-bootstrap";
import Swal from "sweetalert2";

/**
 * Configurações → Análise IA (specs/019-analise-ia-relatorios, US3; contracts/app-cms-ui.md).
 * Provedor (OpenAI ou Anthropic), token da IA (nunca exibido, só os 4 últimos caracteres), modelo,
 * limite de tamanho da resposta e, por análise, prompt e habilitação. O token é do provedor: trocar
 * de provedor pede o token novo. Módulo nativo da v2: só aparece com `aiAnalysis` ligado no
 * /client-config; a v2 exige `ver|atualizar aiAnalysis` (admin e super-admin).
 */

type LoadState = "loading" | "ready" | "forbidden" | "error";
type PromptForm = {
  analysisType: AnalysisType;
  enabled: boolean;
  prompt: string;
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

const lastUpdate = (at: string | null, by: string | null) =>
  at ? `${by ?? "—"} em ${formatDateTime(at)}` : "—";

const statusOf = (error: unknown) =>
  (error as { response?: { status?: number } })?.response?.status;
const messageOf = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data
    ?.message;

export default function AnaliseIa() {
  const [featureEnabled, setFeatureEnabled] = useState<boolean | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [settings, setSettings] = useState<AiAdminSettings | null>(null);
  const [provider, setProvider] = useState<AiProvider>("openai");
  const [apiKey, setApiKey] = useState("");
  const [clearApiKey, setClearApiKey] = useState(false);
  const [model, setModel] = useState("");
  const [maxOutputTokens, setMaxOutputTokens] = useState(2000);
  const [prompts, setPrompts] = useState<PromptForm[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => setFeatureEnabled(isFeatureEnabled("aiAnalysis")), []);

  const apply = (value: AiAdminSettings) => {
    setSettings(value);
    setProvider(value.provider);
    setApiKey("");
    setClearApiKey(false);
    setModel(value.model);
    setMaxOutputTokens(value.maxOutputTokens);
    setPrompts(
      value.prompts.map((p) => ({
        analysisType: p.analysisType,
        enabled: p.enabled,
        prompt: p.prompt,
      })),
    );
    setErrors([]);
  };

  useEffect(() => {
    if (!featureEnabled) return;
    api
      .get("/ai-analysis/admin/settings")
      .then((res) => {
        apply(res.data.settings);
        setState("ready");
      })
      .catch((error) =>
        setState(statusOf(error) === 403 ? "forbidden" : "error"),
      );
  }, [featureEnabled]);

  const updatePrompt = (type: AnalysisType, patch: Partial<PromptForm>) =>
    setPrompts((current) =>
      current.map((p) => (p.analysisType === type ? { ...p, ...patch } : p)),
    );

  async function save() {
    if (!settings) return;
    const problems = validateAiSettingsForm({
      provider,
      savedProvider: settings.provider,
      apiKey,
      hasApiKey: settings.hasApiKey,
      clearApiKey,
      model,
      maxOutputTokens,
      prompts,
    });
    setErrors(problems);
    if (problems.length) return;
    setIsSaving(true);
    try {
      const res = await api.put("/ai-analysis/admin/settings", {
        provider,
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        ...(clearApiKey ? { clearApiKey: true } : {}),
        model: model.trim(),
        maxOutputTokens,
        prompts,
      });
      apply(res.data.settings);
      AlertItemEdited();
    } catch (error) {
      if (statusOf(error) === 403) setState("forbidden");
      AlertError(messageOf(error));
    }
    setIsSaving(false);
  }

  async function testConnection() {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.post("/ai-analysis/admin/test", {
        provider,
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
        model: model.trim(),
      });
      const { ok, errorCode } = res.data.test;
      setTestResult({
        ok,
        text: ok ? "Conexão OK" : aiErrorMessage(errorCode),
      });
    } catch (error) {
      setTestResult({
        ok: false,
        text: messageOf(error) || aiErrorMessage(null),
      });
    }
    setIsTesting(false);
  }

  /** Troca o provedor e sugere o modelo padrão dele. */
  function changeProvider(next: AiProvider) {
    if (!settings) return;
    setProvider(next);
    setTestResult(null);
    const defaults = settings.defaults.providers.find(
      (p) => p.provider === next,
    );
    setModel(
      next === settings.provider ? settings.model : (defaults?.model ?? ""),
    );
  }

  async function confirmClearKey() {
    const result = await Swal.fire({
      title: "Remover o token da IA?",
      text: "As análises precisam estar desabilitadas. A remoção vale ao salvar.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Remover",
      cancelButtonText: "Cancelar",
    });
    if (result.isConfirmed) {
      setClearApiKey(true);
      setApiKey("");
    }
  }

  const providerDefaults = settings?.defaults.providers.find(
    (p) => p.provider === provider,
  );
  const providerLabel = providerDefaults?.label ?? provider;
  /** O token salvo só vale para o provedor salvo. */
  const savedKeyApplies =
    !!settings?.hasApiKey && provider === settings.provider;

  if (featureEnabled === false || state === "forbidden") {
    return (
      <LayoutDefault>
        <div className="container-fluid p-4">
          <h1 className="mb-4">Análise IA</h1>
          <div className="alert alert-secondary">
            {featureEnabled === false
              ? "Funcionalidade indisponível."
              : "Acesso negado."}
          </div>
        </div>
      </LayoutDefault>
    );
  }

  return (
    <LayoutDefault>
      <div className="container-fluid p-4">
        <h1>Análise IA</h1>
        <hr />

        {state === "loading" && (
          <Spinner animation="border" variant="primary" />
        )}
        {state === "error" && (
          <div className="alert alert-danger">
            Não foi possível carregar a configuração.
          </div>
        )}

        {state === "ready" && settings && (
          <Form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <div className="card shadow mb-4">
              <div className="card-body">
                <h4 className="mb-3">Conexão com a IA</h4>
                {!settings.encryptionConfigured && (
                  <div
                    className="alert alert-warning"
                    data-testid="ai-encryption-warning"
                  >
                    Criptografia não configurada no servidor; não é possível
                    salvar o token.
                  </div>
                )}

                <Form.Group className="mb-3" controlId="ai-provider">
                  <Form.Label>Provedor</Form.Label>
                  <Form.Select
                    value={provider}
                    onChange={(event) =>
                      changeProvider(event.target.value as AiProvider)
                    }
                  >
                    {settings.defaults.providers.map((p) => (
                      <option key={p.provider} value={p.provider}>
                        {p.label}
                      </option>
                    ))}
                  </Form.Select>
                  {settings.hasApiKey && !savedKeyApplies && (
                    <Form.Text className="text-warning d-block">
                      O token salvo é de outro provedor. Informe o token da{" "}
                      {providerLabel} ou remova o atual.
                    </Form.Text>
                  )}
                </Form.Group>

                <Form.Group className="mb-3" controlId="ai-api-key">
                  <Form.Label>Token da {providerLabel}</Form.Label>
                  <Form.Control
                    type="password"
                    autoComplete="off"
                    value={apiKey}
                    disabled={!settings.encryptionConfigured}
                    placeholder={
                      clearApiKey
                        ? "Token será removido ao salvar"
                        : savedKeyApplies
                          ? `•••• ${settings.apiKeyLast4 ?? ""}`
                          : "Informe o token"
                    }
                    onChange={(event) => {
                      setApiKey(event.target.value);
                      setClearApiKey(false);
                    }}
                  />
                  <Form.Text muted>
                    Em branco, mantém o token atual. O token nunca é exibido.
                  </Form.Text>
                  {settings.hasApiKey && !clearApiKey && (
                    <div className="mt-2">
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={confirmClearKey}
                      >
                        Remover token
                      </button>
                    </div>
                  )}
                </Form.Group>

                <div className="row">
                  <Form.Group className="mb-3 col-md-6" controlId="ai-model">
                    <Form.Label>Modelo</Form.Label>
                    <Form.Control
                      type="text"
                      list="ai-model-suggestions"
                      value={model}
                      onChange={(event) => setModel(event.target.value)}
                    />
                    <datalist id="ai-model-suggestions">
                      {(providerDefaults?.modelSuggestions ?? []).map((m) => (
                        <option key={m} value={m} />
                      ))}
                    </datalist>
                  </Form.Group>

                  <Form.Group
                    className="mb-3 col-md-6"
                    controlId="ai-max-output"
                  >
                    <Form.Label>
                      Limite de tamanho da resposta (tokens)
                    </Form.Label>
                    <Form.Control
                      type="number"
                      min={MIN_MAX_OUTPUT_TOKENS}
                      max={MAX_MAX_OUTPUT_TOKENS}
                      value={maxOutputTokens}
                      onChange={(event) =>
                        setMaxOutputTokens(Number(event.target.value))
                      }
                    />
                  </Form.Group>
                </div>

                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  disabled={isTesting || (!apiKey.trim() && !savedKeyApplies)}
                  onClick={testConnection}
                >
                  {isTesting ? "Testando..." : "Testar"}
                </button>
                {testResult && (
                  <span
                    data-testid="ai-test-result"
                    className={`ms-3 ${testResult.ok ? "text-success" : "text-danger"}`}
                  >
                    {testResult.text}
                  </span>
                )}
              </div>
            </div>

            <div className="card shadow mb-4">
              <div className="card-body">
                <h4 className="mb-3">Análises</h4>
                <Accordion alwaysOpen>
                  {settings.prompts.map((info) => {
                    const item = prompts.find(
                      (p) => p.analysisType === info.analysisType,
                    )!;
                    return (
                      <Accordion.Item
                        eventKey={info.analysisType}
                        key={info.analysisType}
                      >
                        <Accordion.Header>
                          {ANALYSIS_TYPE_LABELS[info.analysisType]}
                          <span
                            className={`badge ms-2 ${item.enabled ? "bg-success" : "bg-secondary"}`}
                          >
                            {item.enabled ? "Habilitada" : "Desabilitada"}
                          </span>
                        </Accordion.Header>
                        <Accordion.Body>
                          <Form.Check
                            type="switch"
                            id={`ai-enabled-${info.analysisType}`}
                            label="Habilitar IA nesta análise"
                            checked={item.enabled}
                            onChange={(event) =>
                              updatePrompt(info.analysisType, {
                                enabled: event.target.checked,
                              })
                            }
                          />
                          <Form.Group
                            className="mt-3"
                            controlId={`ai-prompt-${info.analysisType}`}
                          >
                            <Form.Label>Prompt</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={6}
                              maxLength={PROMPT_MAX_LENGTH}
                              value={item.prompt}
                              onChange={(event) =>
                                updatePrompt(info.analysisType, {
                                  prompt: event.target.value,
                                })
                              }
                            />
                            <div className="d-flex justify-content-between mt-1">
                              <button
                                type="button"
                                className="btn btn-link btn-sm p-0"
                                disabled={item.prompt === info.defaultPrompt}
                                onClick={() =>
                                  updatePrompt(info.analysisType, {
                                    prompt: info.defaultPrompt,
                                  })
                                }
                              >
                                Restaurar prompt sugerido
                              </button>
                              <small className="text-muted">
                                {item.prompt.length}/{PROMPT_MAX_LENGTH}
                              </small>
                            </div>
                          </Form.Group>
                          <p className="text-muted small mt-2 mb-0">
                            Última alteração:{" "}
                            {lastUpdate(info.updatedAt, info.updatedByName)}
                          </p>
                        </Accordion.Body>
                      </Accordion.Item>
                    );
                  })}
                </Accordion>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="alert alert-danger" data-testid="ai-form-errors">
                <ul className="mb-0">
                  {errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="d-flex justify-content-between align-items-center">
              <div className="text-muted small">
                <div data-testid="ai-last-update">
                  Última alteração:{" "}
                  {lastUpdate(settings.updatedAt, settings.updatedByName)}
                </div>
                <div data-testid="ai-recent-failures">
                  Falhas nos últimos 7 dias:{" "}
                  {settings.recentFailures.length
                    ? settings.recentFailures
                        .map(
                          (f) => `${aiErrorMessage(f.errorCode)} (${f.count})`,
                        )
                        .join(", ")
                    : "nenhuma"}
                </div>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSaving}
              >
                {isSaving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </Form>
        )}
      </div>
    </LayoutDefault>
  );
}
