import { Check, X } from 'lucide-react'
import type { ChatTurnDebug, GuardSignal, TurnSummary } from '@/services/agentsApi'
import { renderHighlighted } from '@/components/conversations/ChatWindow/AnomalyDetailModal'
import { findingReasonLabel, guardCheckGuidance, guardOutcomeDetail, guardTypeLabel } from '@/lib/guardReason'

/**
 * O que o painel de debug do modal antigo mostrava — verificação, ferramentas
 * e o resumo do turno — em forma compacta, aberto sob demanda por resposta.
 */
const TIPO: Record<string, string> = { http: 'integração', skill: 'skill', crm: 'CRM', kb: 'conhecimento', unknown: 'ferramenta' }
const STATUS: Record<TurnSummary['status'], string> = { answered: 'Respondida', aborted_loop: 'Laço interrompido', max_turns: 'Limite de passos' }

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-surface-500">{rotulo}</dt>
      <dd className="text-right tabular-nums text-surface-200">{valor}</dd>
    </div>
  )
}

function Verificacao({ g }: { g: GuardSignal }) {
  const achados = g.findings ?? []
  return (
    <div className="space-y-2 rounded-md border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_7%,transparent)] p-2.5">
      <p className="font-semibold text-surface-100">{guardTypeLabel(g.outcome, g.claimType)}</p>
      <p className="leading-relaxed text-surface-300">{guardOutcomeDetail(g.outcome, g.claimType)}</p>
      {g.blockedText && (
        <div>
          <p className="mb-1 text-3xs font-bold uppercase tracking-[.12em] text-surface-500">Texto retido (não chegou ao cliente)</p>
          <p className="whitespace-pre-wrap break-words leading-relaxed text-surface-300">{renderHighlighted(g.blockedText, achados)}</p>
        </div>
      )}
      {achados.length > 0 && (
        <ul className="space-y-1">
          {achados.map((f, i) => (
            <li key={i} className="leading-snug text-surface-300">
              <span className="font-medium text-status-pending">“{f.raw}”</span> — {findingReasonLabel(f.type, f.reason)}
              {f.suggested && <> · correto: <span className="font-medium text-surface-100">{f.suggested}</span></>}
            </li>
          ))}
        </ul>
      )}
      <p className="leading-relaxed text-surface-300"><span className="text-surface-500">O que verificar: </span>{guardCheckGuidance(g.outcome, g.claimType)}</p>
      {g.skillFailures.map((f, i) => (
        <p key={i} className="text-surface-300">
          <span className="font-medium text-danger">{f.name}</span>{f.statusCode != null && ` · HTTP ${f.statusCode}`}{f.message && ` — ${f.message}`}
        </p>
      ))}
      {g.correlationId && <p className="break-all font-mono text-3xs text-surface-500">ref: {g.correlationId}</p>}
    </div>
  )
}

export function DetalhesTecnicos({ debug }: { debug: ChatTurnDebug }) {
  const s = debug.turnSummary
  const modelo = s.model.includes('haiku') ? 'Haiku' : s.model.includes('sonnet') ? 'Sonnet' : s.model
  return (
    <div className="space-y-3 text-xs">
      {debug.guard && <Verificacao g={debug.guard} />}
      {debug.toolCalls.length > 0 && (
        <ul className="space-y-1">
          {debug.toolCalls.map((t, i) => (
            <li key={i} className="flex items-center gap-2">
              {t.success ? <Check className='h-3.5 w-3.5 flex-shrink-0 text-status-active' aria-label='funcionou' /> : <X className='h-3.5 w-3.5 flex-shrink-0 text-danger' aria-label='falhou' />}
              <span className="truncate font-mono text-surface-200">{t.name}</span>
              <span className="ml-auto text-surface-500">{TIPO[t.kind] ?? t.kind}</span>
            </li>
          ))}
        </ul>
      )}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
        <Linha rotulo="Situação" valor={STATUS[s.status]} />
        <Linha rotulo="Modelo" valor={modelo} />
        <Linha rotulo="Passos internos" valor={String(s.turns)} />
        <Linha rotulo="Ferramentas" valor={String(s.toolsCalledCount)} />
        <Linha rotulo="Tokens de entrada" valor={s.tokens.input.toLocaleString('pt-BR')} />
        <Linha rotulo="Tokens de saída" valor={s.tokens.output.toLocaleString('pt-BR')} />
      </dl>
    </div>
  )
}
