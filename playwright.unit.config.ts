import { defineConfig } from "@playwright/test";

/**
 * Testes unitários de lógica pura (sem navegador, sem servidor e sem login).
 * Roda com: npm run test:unit
 */
export default defineConfig({
  testDir: "./tests/unit",
  reporter: [["list"]],
  // pasta própria: test-results/ é do e2e
  outputDir: "./test-results-unit",
});
