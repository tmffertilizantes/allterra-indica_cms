import { test, expect } from "@playwright/test";
import { bagsFromKg, budgetBags, KG_POR_SACA } from "../../utils/bemBags";

/**
 * Spec 012 — o orçamento do Dimensionamento BEM mostra as sacas de 25 kg de cada item,
 * com a mesma regra do app (arredonda sempre para cima).
 */

test("saca tem 25 kg", () => {
  expect(KG_POR_SACA).toBe(25);
});

test("bagsFromKg arredonda sempre para cima", () => {
  expect(bagsFromKg(1245)).toBe(50);
  expect(bagsFromKg(1250)).toBe(50);
  expect(bagsFromKg(1250.1)).toBe(51);
});

test("bagsFromKg ignora ruído de ponto flutuante", () => {
  expect(bagsFromKg(999.7500000000001)).toBe(40);
});

test("bagsFromKg com kg ausente ou zero => 0", () => {
  expect(bagsFromKg(0)).toBe(0);
  expect(bagsFromKg(null)).toBe(0);
  expect(bagsFromKg(undefined)).toBe(0);
});

test("budgetBags usa as sacas gravadas no orçamento", () => {
  const result = {
    qtdStartKg: 2000,
    qtdReposicaoKg: 2800,
    orcamento: { sacasStart: 80, sacasReposicao: 112 },
  };
  expect(budgetBags(result)).toEqual({ start: 80, reposicao: 112 });
});

test("budgetBags deriva das quantidades em kg em registros antigos", () => {
  const result = { qtdStartKg: 1245, qtdReposicaoKg: 2490, orcamento: { total: 0 } };
  expect(budgetBags(result)).toEqual({ start: 50, reposicao: 100 });
});
