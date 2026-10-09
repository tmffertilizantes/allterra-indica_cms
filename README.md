# Allterra Indica - CMS

## Sessão com a identidade da v2 (Fase 1)


Especificação: [`specs/016-fase1-identidade-v2`](../specs/016-fase1-identidade-v2/). Com `auth`/`user` em v2 para esta
versão do CMS (`targets.cms` no `/client-config`, versão de `package.json`), o login, a sessão e as telas de usuários
usam a v2. Implementação em `lib/session.ts` (interceptores instalados em `pages/_app.tsx`) e `lib/users.ts`.

| Cookie (`Secure` em HTTPS, `SameSite=Strict`) | Sessão legada | Sessão v2 |
|---|---|---|
| `USER_TOKEN` | token do legado | token-ponte (as telas que chamam a v1 seguem iguais) |
| `USER_ACCESS` | — | access token da v2 (15 min) |
| `USER_REFRESH` | — | renovação rotativa (12 h sem uso, teto de 7 dias) |
| `user` | `/auth/me` | `/auth/me` |

O `Authorization` de cada requisição é reescrito pelo destino (v2 → access; v1 → ponte), e a sessão é renovada antes
de vencer, uma vez por vez, inclusive entre abas (`navigator.locks`). Sessão recusada → `/login?expired=1`.
