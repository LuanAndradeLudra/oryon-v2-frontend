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
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOTS = ['src/components', 'src/pages', 'src/hooks']

/** `axios.isAxiosError` é utilitário de tipo, não cliente HTTP — segue liberado. */
const ALLOWED_AXIOS_MEMBERS = new Set(['isAxiosError'])

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (/\.tsx?$/.test(full) && !/\.test\.tsx?$/.test(full)) out.push(full)
  }
  return out
}

const FILES = ROOTS.flatMap((r) => walk(r)).map((f) => ({
  path: relative(process.cwd(), f).replace(/\\/g, '/'),
  source: readFileSync(f, 'utf8'),
}))

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
