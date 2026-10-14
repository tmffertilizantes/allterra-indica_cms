import { api } from "../lib/api";
import { isFeatureEnabled } from "../lib/clientConfig";
import {
  DEFAULT_WEBCHAT_TITLE,
  isValidWebchatUrl,
  WEBCHAT_TITLE_MAX_LENGTH,
  WEBCHAT_URL_MAX_LENGTH,
} from "../lib/webchat";
import LayoutDefault from "@components/Layouts/default";
import { AlertError, AlertItemEdited } from "@components/Alerts/Alerts";
import { useEffect, useState } from "react";
import { Form, Spinner } from "react-bootstrap";

/**
 * Configurações → Webchat IA (specs/018-webchat-ia, US2; research R14). Habilita ou desabilita o
 * assistente no app, troca a URL do webchat e o título do painel, sem deploy. Módulo nativo da v2: só aparece com
 * `webchat` ligado no /client-config; a v2 exige `ver|atualizar webchat` (admin e super-admin).
 */

type AdminSettings = {
  enabled: boolean;
  url: string;
  /** Ausente em uma v2 anterior ao título configurável: o campo não é exibido nem enviado. */
  title?: string;
  defaultTitle?: string;
  isDefaultUrl: boolean;
  defaultUrl: string;
  updatedAt: string | null;
  updatedByName: string | null;
};

type LoadState = "loading" | "ready" | "forbidden" | "error";

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

const statusOf = (error: unknown) =>
  (error as { response?: { status?: number } })?.response?.status;
const messageOf = (error: unknown) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data
    ?.message;

export default function WebchatIa() {
  const [featureEnabled, setFeatureEnabled] = useState<boolean | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [hideTitle, setHideTitle] = useState(false);
  const [touched, setTouched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => setFeatureEnabled(isFeatureEnabled("webchat")), []);

  const apply = (value: AdminSettings) => {
    setSettings(value);
    setEnabled(value.enabled);
    setUrl(value.url);
    setTitle(value.title ?? "");
    setHideTitle(value.title === "");
    setTouched(false);
  };

  useEffect(() => {
    if (!featureEnabled) return;
    api
      .get("/webchat/settings/admin")
      .then((res) => {
        apply(res.data.settings);
        setState("ready");
      })
      .catch((error) =>
        setState(statusOf(error) === 403 ? "forbidden" : "error"),
      );
  }, [featureEnabled]);

  const urlInvalid = !isValidWebchatUrl(url);
  const titleSupported = typeof settings?.title === "string";
  const defaultTitle = settings?.defaultTitle ?? DEFAULT_WEBCHAT_TITLE;

  async function save() {
    setTouched(true);
    if (urlInvalid) return;
    setIsSaving(true);
    try {
      const res = await api.put("/webchat/settings", {
        enabled,
        url: url.trim(),
        ...(titleSupported ? { title: hideTitle ? "" : title.trim() } : {}),
      });
      apply(res.data.settings);
      AlertItemEdited();
    } catch (error) {
      if (statusOf(error) === 403) setState("forbidden");
      AlertError(messageOf(error));
    }
    setIsSaving(false);
  }

  if (featureEnabled === false || state === "forbidden") {
    return (
      <LayoutDefault>
        <div className="container-fluid p-4">
          <h1 className="mb-4">Webchat IA</h1>
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
        <h1>Webchat IA</h1>
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
          <div className="card shadow">
            <div className="card-body">
              <p className="mb-4">
                Assistente de IA exibido no aplicativo (ícone flutuante e item
                do menu lateral).
              </p>
              <Form
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  save();
                }}
              >
                <Form.Group className="mb-4" controlId="webchat-enabled">
                  <Form.Check
                    type="switch"
                    label={enabled ? "Habilitado" : "Desabilitado"}
                    checked={enabled}
                    onChange={(event) => setEnabled(event.target.checked)}
                  />
                  <Form.Text muted>
                    Desabilitado, o ícone e o item do menu lateral deixam de
                    aparecer no aplicativo.
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3" controlId="webchat-url">
                  <Form.Label>URL do webchat</Form.Label>
                  <Form.Control
                    type="url"
                    value={url}
                    maxLength={WEBCHAT_URL_MAX_LENGTH}
                    isInvalid={touched && urlInvalid}
                    onChange={(event) => {
                      setUrl(event.target.value);
                      setTouched(true);
                    }}
                  />
                  <Form.Control.Feedback type="invalid">
                    Informe uma URL https válida.
                  </Form.Control.Feedback>
                  <div className="mt-2">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      disabled={url.trim() === settings.defaultUrl}
                      onClick={() => {
                        setUrl(settings.defaultUrl);
                        setTouched(true);
                      }}
                    >
                      Restaurar URL padrão
                    </button>
                  </div>
                </Form.Group>

                {titleSupported && (
                  <Form.Group className="mb-4" controlId="webchat-title">
                    <Form.Label>Título do assistente</Form.Label>
                    <Form.Control
                      type="text"
                      value={hideTitle ? "" : title}
                      maxLength={WEBCHAT_TITLE_MAX_LENGTH}
                      placeholder={hideTitle ? "Sem título" : defaultTitle}
                      disabled={hideTitle}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                    <Form.Text muted>
                      Exibido no topo do chat, no aplicativo. Em branco, o chat
                      fica sem título.
                    </Form.Text>
                    <Form.Check
                      className="mt-2"
                      type="checkbox"
                      id="webchat-hide-title"
                      label="Não exibir título"
                      checked={hideTitle}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setHideTitle(checked);
                        // Marcar limpa o campo; desmarcar com o campo vazio volta ao padrão.
                        setTitle(checked ? "" : title || defaultTitle);
                      }}
                    />
                  </Form.Group>
                )}

                <p
                  className="text-muted small"
                  data-testid="webchat-last-update"
                >
                  Última alteração:{" "}
                  {settings.updatedAt
                    ? `${settings.updatedByName ?? "—"} em ${formatDateTime(settings.updatedAt)}`
                    : "—"}
                </p>

                <div className="text-end">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSaving}
                  >
                    {isSaving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </Form>
            </div>
          </div>
        )}
      </div>
    </LayoutDefault>
  );
}
