/**
 * Nutrientes entregues da Manutenção e Nutrição de Plantas (spec 010).
 *
 * A ordem de `report.AditionalInformation` variou ao longo do tempo, então a planilha identifica
 * cada item pela sigla (`label`) ou, em registros antigos sem sigla, pela descrição
 * ("Qtd de X entregue") — nunca pela posição.
 */

export const DELIVERED_LABELS = ["Ca", "Si", "Mg", "B", "S", "N"] as const;
export type DeliveredLabel = (typeof DELIVERED_LABELS)[number];
export type DeliveredValues = Record<DeliveredLabel, number | "">;

const DESCRIPTION_RE = /^\s*qtd\s+de\s+(ca|si|mg|b|s|n)\s+entregue\s*$/i;

function toLabel(raw: unknown): DeliveredLabel | undefined {
  const key = String(raw ?? "").trim().toLowerCase();
  return DELIVERED_LABELS.find((label) => label.toLowerCase() === key);
}

/** Valor entregue de cada nutriente; "" quando o nutriente não está na lista. */
export function deliveredNutrientValues(list: unknown): DeliveredValues {
  const values: DeliveredValues = { Ca: "", Si: "", Mg: "", B: "", S: "", N: "" };
  if (!Array.isArray(list)) return values;

  for (const item of list as any[]) {
    const label =
      toLabel(item?.label) ??
      toLabel(DESCRIPTION_RE.exec(String(item?.description ?? ""))?.[1]);
    if (label && values[label] === "") values[label] = item?.value ?? "";
  }
  return values;
}
