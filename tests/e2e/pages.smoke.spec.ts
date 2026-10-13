import { test, expect } from "@playwright/test";

/**
 * Smoke de TODAS as telas do painel: cada rota carrega logada, renderiza conteúdo
 * e não dispara erro de página não tratada. É a rede de segurança larga —
 * fluxos CRUD detalhados ficam nos specs dedicados.
 */
const ROUTES: { path: string; expect: RegExp | string }[] = [
  { path: "/", expect: /.+/ },
  { path: "/analises", expect: /an[aá]lise/i },
  { path: "/produtores", expect: /produtor/i },
  { path: "/produtos", expect: /produto/i },
  { path: "/culturas", expect: /cultura/i },
  { path: "/categorias", expect: /categoria/i },
  { path: "/categorias-de-materiais", expect: /categoria/i },
  { path: "/consultores", expect: /consultor/i },
  { path: "/registro-de-consultores", expect: /consultor/i },
  { path: "/administradores", expect: /administrador/i },
  { path: "/revendas", expect: /revenda/i },
  { path: "/regioes", expect: /regi[aã]o|regi[oõ]es/i },
  { path: "/nutrientes", expect: /nutriente/i },
  { path: "/nutricao-de-plantas", expect: /nutri[cç][aã]o/i },
  { path: "/custo-de-producao", expect: /custo/i },
  { path: "/custo-tmf-calcario", expect: /custo|calc[aá]rio/i },
  { path: "/construcao-e-manutencao-de-perfil-de-solo", expect: /solo|perfil/i },
  { path: "/bio-estacoes", expect: /esta[cç][aã]o|bio/i },
  { path: "/materiais", expect: /material|materiais/i },
  { path: "/termos", expect: /termo/i },
  { path: "/contato", expect: /contato/i },
  { path: "/personalizacao-resultados", expect: /personaliza|resultado|se[cç][aã]o/i },
  // spec 017: lista (módulo ligado) ou "Funcionalidade indisponível" (desligado); o título aparece nos dois.
  { path: "/posicao-microgeo", expect: /posi[cç][aã]o microgeo/i },
  { path: "/editar-senha", expect: /senha/i },
];

for (const route of ROUTES) {
  test(`carrega ${route.path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));

    const resp = await page.goto(route.path, { waitUntil: "networkidle" });
    expect(resp?.status(), `HTTP de ${route.path}`).toBeLessThan(400);

    // não deve ter redirecionado para /login (sessão válida)
    expect(page.url()).not.toContain("/login");

    await expect(page.locator("body")).toContainText(route.expect, { timeout: 15_000 });
    expect(errors, `erros de página em ${route.path}:\n${errors.join("\n")}`).toHaveLength(0);
  });
}
