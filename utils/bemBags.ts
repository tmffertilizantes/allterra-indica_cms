/**
 * Sacas de 25 kg do orçamento do Dimensionamento BEM (spec 012).
 *
 * Mesma regra de `qtdSacas` no app (`lib/bem/calculations.ts`): ⌈kg / 25⌉, com tolerância a
 * ruído de ponto flutuante. Registros anteriores à spec 012 não têm as sacas gravadas no
 * orçamento; nesse caso elas são derivadas das quantidades em kg.
 */

export const KG_POR_SACA = 25;

export function bagsFromKg(kg?: number | null): number {
  if (!kg || kg <= 0) return 0;
  return Math.ceil(kg / KG_POR_SACA - 1e-9);
}

export function budgetBags(result: any): { start: number; reposicao: number } {
  const o = result?.orcamento ?? {};
  return {
    start: o.sacasStart ?? bagsFromKg(result?.qtdStartKg),
    reposicao: o.sacasReposicao ?? bagsFromKg(result?.qtdReposicaoKg),
  };
}
