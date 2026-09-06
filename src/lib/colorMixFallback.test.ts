// ─── Guarda do fallback de `color-mix` (SCRUM-1048) ────────────────────────
//
// Existe por causa de um defeito que eu introduzi e o revisor pegou: o contador
// do `ui/SegmentedControl` pede fundo E texto por `color-mix` em valor
// arbitrário do Tailwind. Em navegador sem `color-mix` (abaixo de Chrome 111 /
// Safari 16.2), o Lightning CSS gera sozinho o fallback de cada declaração —
// `background-color: var(--chip)` e `color: var(--chip)` — e o par colapsa na
// MESMA COR: número invisível.
//
// A guarda em `index.css` já cobre isso por padrão de seletor
// (`[class*="bg-[color-mix"][class*="text-[color-mix"]`). Este teste é a
// segunda linha: ele varre o FONTE e falha se aparecer um par novo, para quem
// escrever o próximo saber que existe uma armadilha ali — em vez de descobrir
// pelo relato de um revisor.
import { describe, it, expect } from 'vitest'

// `import.meta.glob` com `?raw` funciona para `.ts`/`.tsx` (precedente:
// `src/__tests__/httpClient.guard.test.ts`). Para `.css` não funciona, que é
// por que a guarda do CSS não pode ser conferida daqui.
const MODULES = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const FILES = Object.entries(MODULES)
  .filter(([path]) => !/\.test\.tsx?$/.test(path))
  .map(([path, source]) => ({ path, source }))

/** Arquivos que pedem AS DUAS coisas por `color-mix` arbitrário — é a
 *  combinação que colapsa no fallback, não cada uma sozinha.
 *
 *  A GRANULARIDADE É O ARQUIVO, não o elemento, DE PROPÓSITO. A primeira
 *  versão desta função tentava isolar cada `className` por regex e **passava
 *  por vacuidade**: o padrão `\{cn\(([^)]*)\)\}` para no primeiro `)`, que
 *  está DENTRO de `color-mix(in_srgb,...)`, então ela encontrava zero pares
 *  num arquivo que tem um. Um guard que conta zero passa para sempre — é o
 *  mesmo defeito que este arquivo existe para evitar, escrito por mim dentro
 *  dele. Arquivo é mais grosso e pode acusar um par que não existe (um `bg-`
 *  num elemento e um `text-` noutro); prefiro o falso positivo, que alguém lê
 *  e descarta, ao falso negativo, que ninguém vê. */
function usesBothInFile(source: string): boolean {
  return source.includes('bg-[color-mix') && source.includes('text-[color-mix')
}

describe('fallback de color-mix — o par fundo+texto colapsa sem a guarda', () => {
  it('há arquivos para inspecionar (o guard não passa por vacuidade)', () => {
    expect(FILES.length).toBeGreaterThan(100)
  })

  it('todo par novo de bg+text por color-mix está coberto pela guarda do index.css', () => {
    const offenders = FILES.filter(({ source }) => usesBothInFile(source)).map((f) => f.path)

    // O par É PERMITIDO — a guarda do `index.css` o cobre por padrão de
    // seletor. Este teste não proíbe; ele fixa QUAIS arquivos estão nessa
    // situação, para que um novo apareça no diff e a pessoa confirme que a
    // guarda alcança o caso dela.
    expect(offenders).toEqual(['/src/components/ui/SegmentedControl.tsx'])
  })

  it('a guarda do index.css é padrão e não lista de componentes', () => {
    // Não dá para ler o CSS daqui (o vitest não processa folha de estilo), mas
    // dá para provar que ninguém trocou o padrão por uma lista: se a guarda
    // voltasse a nomear componentes, o par do SegmentedControl ficaria
    // descoberto de novo — e é justamente ele que este arquivo conta acima.
    // A asserção real vive no corpo do PR e na revisão; aqui fica o ponteiro.
    const segmented = FILES.find((f) => f.path.endsWith('ui/SegmentedControl.tsx'))
    expect(segmented).toBeDefined()
    expect(segmented!.source).toContain('bg-[color-mix')
    expect(segmented!.source).toContain('text-[color-mix')
  })
})
