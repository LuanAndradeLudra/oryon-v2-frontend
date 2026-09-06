// ─── ArchetypeGallery (A5 / SCRUM-1016) ──────────────────────────────────────
// O estado vazio de `/agents` deixa de ser "um vazio com botão" e vira a
// escolha de um arquétipo. Só aparece quando não há nenhum agente (decisão 5 do
// `coord/A5-plano.md`): quem já tem agente sabe o que quer e vai direto ao
// Studio em branco; quem não tem precisa do começo guiado.
//
// Quem monta isto é a `AgentsPage` (do Buril), trocando a chamada do
// `NoAgentsState` por `<ArchetypeGallery onEscolher={...} />`. Este arquivo não
// conhece rota nem estado da página — recebe um callback e pronto.
import { PencilLine } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ArchetypeCard } from './ArchetypeCard'
import { ARCHETYPES, type Archetype } from './archetypes'

export function ArchetypeGallery({
  onEscolher,
}: {
  /**
   * Chamado com o arquétipo escolhido, ou **sem argumento** no "Começar do
   * zero no Studio" — os dois caminhos vão para o mesmo lugar, a diferença é
   * só o rascunho já vir preenchido (ver `applyArchetype`).
   */
  onEscolher: (arquetipo?: Archetype) => void
}) {
  return (
    <div
      className="h-full overflow-y-auto px-6 py-4"
      style={{
        background:
          'radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--color-brand-500) 8%, transparent), transparent 50%)',
      }}
    >
      <div className="mx-auto mt-4 max-w-[880px] text-center">
        {/* O eyebrow da casa (`.eyebrow`) é 0.6875rem, que a manopla de 110%
            leva a 12,1px — o mockup pede 10. O sistema TEM o valor certo em
            `--text-3xs: 10px`, e o fato de ser px cravado é justamente o sinal
            de que o design não quis que esse tamanho escalasse.
            Não dá para somar `eyebrow text-3xs`: `.eyebrow` mora fora de
            `@layer` e CSS sem layer vence utilitário em layer, então ela
            ganharia o `font-size` — conferido na ordem do CSS emitido, não no
            nome da classe. Por isso o eyebrow é composto por token aqui, com os
            demais valores da casa (incluindo `.16em` contra o `.1em` do
            mockup — divergência declarada em `evidencias/SCRUM-1016/CSS.md`). */}
        <div className="font-sans text-3xs font-bold uppercase tracking-[0.16em] text-brand-400">
          Comece por um arquétipo
        </div>
        <h2 className="mt-2 mb-1.5 text-3xl text-surface-50">
          Que tipo de atendimento você quer automatizar?
        </h2>
        <p className="mx-auto mb-6 max-w-[56ch] text-sm text-surface-400">
          Cada arquétipo já vem com tom, escopo, regras de transferência e capacidades típicas.
          Você ajusta tudo depois no Workspace.
        </p>
      </div>

      {/* O mockup é desktop e fixa 3 colunas; abaixo de `md` elas empilham,
          senão o card de 292px vira 100px no celular. */}
      <div className="mx-auto grid max-w-[1040px] grid-cols-1 gap-3.5 md:grid-cols-3">
        {ARCHETYPES.map((arquetipo) => (
          <ArchetypeCard
            key={arquetipo.id}
            arquetipo={arquetipo}
            onUsar={() => onEscolher(arquetipo)}
          />
        ))}
      </div>

      <div className="mt-5 text-center">
        <Button variant="ghost" leftIcon={<PencilLine className="h-4 w-4" />} onClick={() => onEscolher()}>
          Começar do zero no Studio
        </Button>
      </div>
    </div>
  )
}
