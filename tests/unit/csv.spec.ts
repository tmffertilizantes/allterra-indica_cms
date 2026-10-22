/** Unidade: lib/csv.ts — neutralização de fórmulas nas exportações (#21, specs/022 research R13). */
import { expect, test } from "@playwright/test";
import { sanitizeCsv, sanitizeCsvValue } from "../../lib/csv";

test("texto iniciado por = + - @ tabulação ou retorno ganha o prefixo '", () => {
  for (const value of ["=SOMA(1)", "+SOMA(1)", "-cmd", "@x", "\tx", "\rx"]) {
    expect(sanitizeCsvValue(value)).toBe(`'${value}`);
  }
});

test("trecho depois de vírgula, ponto e vírgula ou quebra de linha também é neutralizado", () => {
  expect(sanitizeCsvValue("Fazenda,=HYPERLINK(\"x\")")).toBe("Fazenda,'=HYPERLINK(\"x\")");
  expect(sanitizeCsvValue("a;+1")).toBe("a;'+1");
  expect(sanitizeCsvValue("linha\n@cmd")).toBe("linha\n'@cmd");
  expect(sanitizeCsvValue("=a,=b")).toBe("'=a,'=b");
});

test("números, negativos, vazios, null e texto comum não mudam", () => {
  expect(sanitizeCsvValue(-12.5)).toBe(-12.5);
  expect(sanitizeCsvValue(0)).toBe(0);
  expect(sanitizeCsvValue("")).toBe("");
  expect(sanitizeCsvValue(null)).toBeNull();
  expect(sanitizeCsvValue(undefined)).toBeUndefined();
  expect(sanitizeCsvValue(true)).toBe(true);
  expect(sanitizeCsvValue("Soja 2026 - safra")).toBe("Soja 2026 - safra");
  for (const n of ["-3.50", "+1", "-1,5", "12", "-2e3"]) expect(sanitizeCsvValue(n)).toBe(n);
  expect(sanitizeCsvValue("e-mail@x.com")).toBe("e-mail@x.com");
});

test("linhas como objetos e como listas; cabeçalhos e chaves preservados", () => {
  expect(
    sanitizeCsv([
      { nome: "=1+1", area: -3, obs: null },
      { nome: "ok", area: 2, obs: "x" },
    ]),
  ).toEqual([
    { nome: "'=1+1", area: -3, obs: null },
    { nome: "ok", area: 2, obs: "x" },
  ]);
  expect(sanitizeCsv([["Nome", "Área"], ["@x", 5]])).toEqual([["Nome", "Área"], ["'@x", 5]]);
  expect(sanitizeCsv(null)).toBeNull();
});
