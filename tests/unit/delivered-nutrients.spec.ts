import { test, expect } from "@playwright/test";
import { DELIVERED_LABELS, deliveredNutrientValues } from "../../utils/deliveredNutrients";

/**
 * Spec 010 — a planilha do CMS lê os nutrientes entregues pela sigla (ou pela descrição),
 * não pela posição na lista.
 */

const item = (label: string, value: number, withLabel = true) => ({
  description: `Qtd de ${label} entregue`,
  value,
  ...(withLabel ? { label } : {}),
});

// Registros reais do snapshot de teste (tests/db/snapshot.sql)
// analysis 8644: ordem antiga Ca, Si, Mg, B, S, N — sem label
const SNAPSHOT_OLD_ORDER = [
  { value: 136.11111111111111, description: "Qtd de Ca entregue" },
  { value: 7.777777777777779, description: "Qtd de Si entregue" },
  { value: 66.11111111111111, description: "Qtd de Mg entregue" },
  { value: 7.777777777777779, description: "Qtd de B entregue" },
  { value: 0, description: "Qtd de S entregue" },
  { value: 0, description: "Qtd de N entregue" },
];
// analysis 8963: ordem Ca, Mg, B, S, N, Si — com label (hoje exportado com colunas trocadas)
const SNAPSHOT_NEW_ORDER = [
  { label: "Ca", value: 68, description: "Qtd de Ca entregue" },
  { label: "Mg", value: 31.085714285714285, description: "Qtd de Mg entregue" },
  { label: "B", value: 0, description: "Qtd de B entregue" },
  { label: "S", value: 19.428571428571427, description: "Qtd de S entregue" },
  { label: "N", value: 0, description: "Qtd de N entregue" },
  { label: "Si", value: 3.8857142857142857, description: "Qtd de Si entregue" },
];

const EMPTY = { Ca: "", Si: "", Mg: "", B: "", S: "", N: "" };

test.describe("deliveredNutrientValues", () => {
  test("ordem padrão (Ca, Si, Mg, B, S, N) com label", () => {
    const list = [item("Ca", 1), item("Si", 2), item("Mg", 3), item("B", 4), item("S", 5), item("N", 6)];
    expect(deliveredNutrientValues(list)).toEqual({ Ca: 1, Si: 2, Mg: 3, B: 4, S: 5, N: 6 });
  });

  test("ordem Ca, Mg, B, S, N, Si com label → mesmos valores por sigla", () => {
    const list = [item("Ca", 1), item("Mg", 3), item("B", 4), item("S", 5), item("N", 6), item("Si", 2)];
    expect(deliveredNutrientValues(list)).toEqual({ Ca: 1, Si: 2, Mg: 3, B: 4, S: 5, N: 6 });
  });

  test("registro antigo real (sem label): igual à leitura por posição de hoje (SC-003)", () => {
    const values = deliveredNutrientValues(SNAPSHOT_OLD_ORDER);
    DELIVERED_LABELS.forEach((label, i) => {
      expect(values[label]).toBe(SNAPSHOT_OLD_ORDER[i].value);
    });
  });

  test("registro novo real (Ca, Mg, …): Si vem do item Si, não da posição 1 (SC-002)", () => {
    const values = deliveredNutrientValues(SNAPSHOT_NEW_ORDER);
    expect(values).toEqual({
      Ca: 68,
      Si: 3.8857142857142857,
      Mg: 31.085714285714285,
      B: 0,
      S: 19.428571428571427,
      N: 0,
    });
    expect(values.Si).not.toBe(SNAPSHOT_NEW_ORDER[1].value);
  });

  test("label com maiúsculas e espaços é aceito", () => {
    const values = deliveredNutrientValues([
      { label: " ca ", value: 1, description: "x" },
      { label: "SI", value: 2, description: "x" },
    ]);
    expect(values.Ca).toBe(1);
    expect(values.Si).toBe(2);
  });

  test("sem label: identifica pela descrição, ignorando maiúsculas e espaços", () => {
    expect(deliveredNutrientValues([{ description: "  QTD DE mg ENTREGUE ", value: 7 }]).Mg).toBe(7);
  });

  test("item não identificável é ignorado; nutriente ausente fica vazio sem deslocar os outros", () => {
    const values = deliveredNutrientValues([
      item("Ca", 1),
      { description: "Outro", value: 9 },
      item("Mg", 3, false),
    ]);
    expect(values).toEqual({ ...EMPTY, Ca: 1, Mg: 3 });
  });

  for (const input of [undefined, null, {}, "x"]) {
    test(`entrada inválida (${JSON.stringify(input)}) → tudo vazio`, () => {
      expect(deliveredNutrientValues(input)).toEqual(EMPTY);
    });
  }

  test("dois itens do mesmo nutriente: vale o primeiro", () => {
    expect(deliveredNutrientValues([item("Ca", 1), item("Ca", 99)]).Ca).toBe(1);
  });

  test("item identificado sem value → vazio", () => {
    expect(deliveredNutrientValues([{ label: "B", description: "Qtd de B entregue" }]).B).toBe("");
  });
});
