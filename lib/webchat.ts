/**
 * Webchat IA (specs/018-webchat-ia, research R5): mesma regra da v2 para dar retorno imediato no
 * formulário. A v2 é a fonte da verdade e recusa o que passar daqui.
 */
export const WEBCHAT_URL_MAX_LENGTH = 2048;
/** Título do painel no app (mesmo limite da v2); vazio = sem título. */
export const WEBCHAT_TITLE_MAX_LENGTH = 60;
export const DEFAULT_WEBCHAT_TITLE = "Assistente IA";

export function isValidWebchatUrl(value: string): boolean {
  const url = value.trim();
  if (!url || url.length > WEBCHAT_URL_MAX_LENGTH) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.includes(".") &&
      !parsed.hostname.startsWith(".") &&
      !parsed.hostname.endsWith(".")
    );
  } catch {
    return false;
  }
}
