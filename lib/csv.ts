/**
 * Neutralização de fórmulas nas exportações CSV (#21 — specs/022 research R13). Valores de texto que
 * começam com `=`, `+`, `-`, `@`, tabulação ou retorno ganham o prefixo `'`, e a planilha os trata como
 * texto. O `CSVLink` do `postType` não usa aspas (`enclosingCharacter=""`), então uma vírgula,
 * um ponto e vírgula ou uma quebra de linha dentro do valor abre uma célula nova: o trecho depois deles
 * também é neutralizado. Números (inclusive negativos, também em texto — `toFixed`), booleanos e vazios não mudam.
 */

const FORMULA_START = /^[=+\-@\t\r]/;
/** Número em texto (ex.: `toFixed` das telas de análises): `-3.50`, `+1`, `-1,5`, `-2e3`. */
const NUMERIC_TEXT = /^[-+]?\d+([.,]\d+)?(e[-+]?\d+)?$/i;
const FORMULA_AFTER_SEPARATOR = /([,;\n\r\t])([=+\-@])/g;

export function sanitizeCsvValue<T>(value: T): T | string {
  if (typeof value !== "string" || value === "" || NUMERIC_TEXT.test(value)) return value;
  let text: string = value.replace(FORMULA_AFTER_SEPARATOR, "$1'$2");
  if (FORMULA_START.test(text)) text = `'${text}`;
  return text;
}

/** Linhas como objetos (chave → valor) ou listas de células; só o primeiro nível é tratado. */
export function sanitizeCsv<T>(rows: T[] | null | undefined): T[] | null | undefined {
  if (!Array.isArray(rows)) return rows;
  return rows.map((row: any) => {
    if (Array.isArray(row)) return row.map(sanitizeCsvValue);
    if (row && typeof row === "object") {
      return Object.fromEntries(Object.entries(row).map(([k, v]) => [k, sanitizeCsvValue(v)]));
    }
    return sanitizeCsvValue(row);
  }) as T[];
}
