// ─── ArchetypeCard (A5 / SCRUM-1016) ─────────────────────────────────────────
// Um card da galeria: cabeçalho com avatar tingido, nome, descrição, a conversa
// de exemplo e os dois chips, com o botão colado no rodapé.
//
// A conversa de exemplo é o ponto da tela: quem nunca criou um agente não sabe
// escolher entre "Vendas" e "Suporte" pelo nome, mas sabe apontar qual das duas
// respostas quer ver o próprio negócio dando.
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { accentColor, tint } from '@/components/ui/accentColor'
import { chipLabel, type Archetype } from './archetypes'

export function ArchetypeCard({
  arquetipo,
  onUsar,
}: {
  arquetipo: Archetype
  onUsar: () => void
}) {
  const { icone: Icone, acento } = arquetipo
  const cor = accentColor(acento)

  return (
    // A borda acende no hover como no mockup, por regra CSS de verdade
    // (`--tc` inline + `hover:border-[var(--tc)]`, mesmo truque do `--chip` do
    // `ui/Badge.tsx`) — não por handler de mouse, que não sairia no CSS
    // emitido e portanto escaparia do gate de paridade.
    // O card em si não é clicável: o botão é o único controle, para não aninhar
    // interativo dentro de interativo. Divergência deliberada do
    // `.arch{cursor:pointer}`, registrada em `evidencias/SCRUM-1016/CSS.md`.
    <article
      className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-surface-700 bg-surface-800 p-5 transition-colors hover:border-[var(--tc)]"
      style={{ ['--tc']: cor } as React.CSSProperties}
    >
      {/* Véu de cor do topo — o `.arch::before` do mockup. `aria-hidden` e sem
          eventos: é decoração, não conteúdo. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[90px]"
        style={{ background: `linear-gradient(160deg, ${tint(acento, 22)}, transparent 70%)` }}
      />

      <div className="relative flex items-start justify-between">
        <span
          className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border"
          style={{ background: tint(acento, 15), color: cor, borderColor: tint(acento, 28) }}
        >
          <Icone className="h-6 w-6" />
        </span>
        {arquetipo.destaque && <Badge>{arquetipo.destaque}</Badge>}
      </div>

      <div className="relative">
        {/* `text-lg`, não `text-xl`: a régua da fonte é o pixel EMITIDO, e com a
            manopla de 110% do desktop `text-lg` emite 19,8 contra os 20px do
            mockup (−0,2), enquanto `text-xl` emitiria 22 (+2). Token cujo
            emitido fica mais perto — nunca literal só para fechar o número. */}
        <div className="font-display text-lg font-bold tracking-[-0.02em] text-surface-50">
          {arquetipo.nome}
        </div>
        <div className="mt-1 text-xs leading-[1.5] text-surface-400">{arquetipo.descricao}</div>
      </div>

      <div className="relative flex flex-col gap-1.5 rounded-[14px] border border-surface-800 bg-surface-950 p-2.5">
        {arquetipo.exemplo.map((bolha, i) => (
          <div
            key={i}
            className={
              'max-w-[78%] rounded-[14px] px-2.5 py-1.5 text-xs leading-[1.45] ' +
              (bolha.autor === 'cliente'
                ? 'self-end rounded-br-[4px] bg-bubble-out text-bubble-out-fg'
                : 'self-start rounded-bl-[4px] border border-surface-700 bg-bubble-in text-bubble-in-fg')
            }
          >
            {bolha.texto}
          </div>
        ))}
      </div>

      <div className="relative flex items-center gap-2.5 text-3xs text-surface-500">
        {arquetipo.chips.map((chip) => {
          const ChipIcone = chip.icone
          const texto = chipLabel(chip, arquetipo)
          return (
            <span key={texto} className="inline-flex items-center gap-1">
              <ChipIcone className="h-[11px] w-[11px]" />
              {texto}
            </span>
          )
        })}
      </div>

      <Button
        variant={arquetipo.enfase}
        size="sm"
        onClick={onUsar}
        className="relative mt-auto w-full"
      >
        Usar este arquétipo
      </Button>
    </article>
  )
}
