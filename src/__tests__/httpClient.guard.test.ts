// Guard de arquitetura da camada HTTP — onda 3 da auditoria de interface.
//
// Espelha o `architecture-guard.spec.ts` do backend: a regra vira teste, em vez
// de convenção que se perde na próxima história.
//
// **O que estava errado.** 14 componentes/páginas/hooks importavam `axios`
// direto e montavam a URL à mão (`${API}/tags`), em vez de usar a instância
// compartilhada. Isso os deixava de fora de:
//   * `withCredentials: true` — o cookie httpOnly da sessão;
//   * o interceptor de retry (5xx/408/429);
//   * a auditoria de escrita (`appLogger.logUserAction`) — ou seja, criar
//     usuário, mudar tag, alterar conta e senha **não apareciam na trilha**;
//   * `VITE_API_URL_NATIVE_DEV`, a base URL do app nativo em dev.
//
// O time já tinha remendado a parte de auth registrando um interceptor no
// `axios` global (há um comentário no `api.ts` explicando). Este teste ataca a
// causa: não deixar o padrão voltar.
import { describe, it, expect } from 'vitest'

const ROOT_PREFIXES = ['/src/components/', '/src/pages/', '/src/hooks/']

/** `axios.isAxiosError` é utilitário de tipo, não cliente HTTP — segue liberado. */
const ALLOWED_AXIOS_MEMBERS = new Set(['isAxiosError'])

// `import.meta.glob` do Vite em vez de `node:fs`: o teste roda no mesmo
// ambiente do app, sem depender de @types/node no tsconfig da aplicação.
const MODULES = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const FILES = Object.entries(MODULES)
  .filter(([path]) => ROOT_PREFIXES.some((p) => path.startsWith(p)))
  .filter(([path]) => !/\.test\.tsx?$/.test(path))
  .map(([path, source]) => ({ path, source }))

describe('camada HTTP — um cliente só', () => {
  it('há arquivos para inspecionar (o guard não passa por vacuidade)', () => {
    expect(FILES.length).toBeGreaterThan(100)
  })

  it('nenhum componente, página ou hook chama axios direto — só `isAxiosError`', () => {
    const offenders = FILES.flatMap(({ path, source }) => {
      const members = [...source.matchAll(/\baxios\.(\w+)/g)].map((m) => m[1])
      const bad = members.filter((m) => !ALLOWED_AXIOS_MEMBERS.has(m))
      return bad.length > 0 ? [`${path}: axios.${[...new Set(bad)].join(', axios.')}`] : []
    })

    expect(offenders).toEqual([])
  })

  it('ninguém monta a URL da API à mão — a base vem do cliente compartilhado', () => {
    // `${API}/rota` era o sintoma visível: cada arquivo redefinindo
    // `VITE_API_URL` e perdendo a variante nativa.
    const offenders = FILES.filter(({ source }) =>
      /const API(_URL)? = import\.meta\.env\.VITE_API_URL/.test(source),
    ).map(({ path }) => path)

    expect(offenders).toEqual([])
  })

  it('nenhuma chamada `fetch` para a API — fetch fica para blob e outros serviços', () => {
    // `fetch` continua legítimo para baixar mídia (precisa de `.blob()`) e para
    // falar com o agent-server. O que não pode é JSON da nossa API por fora do
    // cliente, sem retry, sem auditoria e sem a base correta.
    const offenders = FILES.flatMap(({ path, source }) => {
      const calls = [...source.matchAll(/(?<![a-zA-Z])fetch\(\s*[`'"]([^`'"]*)/g)].map((m) => m[1])
      const bad = calls.filter((u) => u.includes('${API}') || u.includes('/api/'))
      return bad.length > 0 ? [`${path}: fetch(${bad.join(', ')})`] : []
    })

    expect(offenders).toEqual([])
  })
})
