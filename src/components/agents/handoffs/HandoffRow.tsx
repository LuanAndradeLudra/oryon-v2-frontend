// ─── A linha da caixa de transferências (A6 / SCRUM-1017) ────────────────────
import { Button } from '@/components/ui/Button'
import { accentColor, tint } from '@/components/ui/accentColor'
import type { HandoffItem } from '@/types/agentsOps'
import { acentoDoNome, motivo, sla } from './handoffRowCore'

export function HandoffRow({
  item,
  espera,
  nomeDoAgente,
  selecionada,
  ocupada,
  onSelecionar,
  onAssumir,
  onDevolver,
}: {
  item: HandoffItem
  /** Espera em segundos, já recalculada pelo relógio quando ele está correndo. */
  espera: number
  nomeDoAgente?: string | null
  selecionada: boolean
  /** `true` enquanto uma ação desta linha está no ar — trava os dois botões. */
  ocupada?: boolean
  onSelecionar: () => void
  onAssumir: () => void
  /** Ausente = a linha não oferece "Devolver à IA" (segmento resolvido). */
  onDevolver?: () => void
}) {
  const s = sla(espera, item.slaSeconds)
  const m = motivo(item, nomeDoAgente)
  const acento = acentoDoNome(item.contact.name)
  const inicial = item.contact.name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div
      role="option"
      aria-selected={selecionada}
      tabIndex={selecionada ? 0 : -1}
      onClick={onSelecionar}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelecionar() }
      }}
      // A espera e o estado do SLA por extenso: a cor sozinha não pode carregar
      // a informação, e a fila é lida por quem não distingue âmbar de vermelho.
      aria-label={`${item.contact.name}, ${s.descricao}`}
      className={
        'grid grid-cols-[auto_1.4fr_1fr_1fr_auto] items-center gap-3 rounded-lg border px-3 py-2.5 '
        + 'cursor-pointer transition-colors '
        + (selecionada
          ? 'border-brand-500/60 bg-surface-800 ring-1 ring-brand-500/40'
          : 'border-transparent hover:bg-surface-800/60')
      }
    >
      <span
        aria-hidden
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border font-display text-xs font-bold"
        style={{ background: tint(acento, 15), color: accentColor(acento), borderColor: tint(acento, 28) }}
      >
        {inicial}
      </span>

      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <b className="truncate text-xs font-semibold text-surface-100">{item.contact.name}</b>
          <span className="shrink-0 text-3xs text-surface-500">{item.contact.phoneMasked}</span>
        </div>
        {/* Degradação em cascata: o que não se sabe não se diz. Nunca
            "via · regra — → —" — ver `motivo()`. */}
        <div className="mt-0.5 truncate text-3xs text-surface-500">
          {m.vazio ? (
            '—'
          ) : (
            <>
              {m.agente && <>via <span className="text-surface-300">{m.agente}</span></>}
              {m.regra && <>{m.agente && ' · '}regra <code className="text-surface-300">{m.regra}</code></>}
              {m.destino && <> → <span className="text-surface-300">{m.destino}</span></>}
            </>
          )}
        </div>
      </div>

      <div className="min-w-0">
        <div className="text-3xs font-bold uppercase tracking-[0.12em] text-surface-500">Intenção</div>
        {/* D9: `intent` é null em quase todo evento real, porque não existe
            matcher de keywords em runtime. `—` é o valor correto, não um bug. */}
        <div className="truncate text-xs text-surface-200" title={item.intent ?? undefined}>
          {item.intent ?? <span className="text-surface-600">—</span>}
        </div>
      </div>

      <div className="min-w-0">
        <div className="text-3xs font-bold uppercase tracking-[0.12em] text-surface-500">Esperando</div>
        <div className="flex items-baseline gap-1.5 font-mono text-xs tabular-nums"
             style={s.acento ? { color: accentColor(s.acento) } : undefined}>
          {s.tempo}
          {s.sufixo && <span className="text-3xs font-medium opacity-80">{s.sufixo}</span>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {onDevolver && (
          <Button variant="ghost" size="sm" onClick={onDevolver} disabled={ocupada}>
            Devolver à IA
          </Button>
        )}
        <Button variant="primary" size="sm" onClick={onAssumir} disabled={ocupada}>
          Assumir
        </Button>
      </div>
    </div>
  )
}
