import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Clock, ShieldAlert, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { emFrase } from '@/lib/emFrase'
import type { ToolCallRecord } from '@/contexts/CopilotContext'
import { TOOL_LABEL } from './CopilotMessage'

// ─── Registro de aprovação ─────────────────────────────────────────────────
// Linha compacta que fica na conversa no ponto em que o Copilot pediu
// aprovação: aguardando, aprovado (todo ou em parte), recusado ou expirado.
// A revisão em si acontece na bancada (aba Aprovações); aqui fica o registro,
// que abre a lista das ações com o que foi aprovado e o que foi recusado.

export function RegistroDeAprovacao({ tc }: { tc: ToolCallRecord }) {
  const [aberto, setAberto] = useState(false)
  const itens = tc.batchItems ?? []
  const nome = (n: string) => emFrase(TOOL_LABEL[n] ?? n)
  const primeiro = itens.length > 0 ? nome(itens[0].name) : 'Ação'

  const status = tc.approvalStatus
  const aguardando = status === 'pending' || status === 'submitting'
  const aprovado = status === 'approved'
  const recusado = status === 'denied'
  const expirado = status === 'expired'

  // Revisão 11/10: aprovação parcial (1 de 3) aparecia como "3 ações
  // aprovadas". Registros antigos sem `approvedIds` contam como aprovação total.
  const aprovados = aprovado ? new Set(tc.approvedIds ?? itens.map((i) => i.id)) : new Set<string>()
  const nAprovados = itens.filter((i) => aprovados.has(i.id)).length
  const parcial = aprovado && itens.length > 1 && nAprovados < itens.length

  const rotuloAprovado = itens.length === 1
    ? `${primeiro} aprovado`
    : parcial
      ? `${nAprovados} de ${itens.length} ${nAprovados === 1 ? 'aprovada' : 'aprovadas'}`
      : `${itens.length} ações aprovadas`

  const v = aguardando
    ? { cor: 'bg-status-pending-bg border-status-pending/30 text-status-pending', Icone: ShieldAlert, rotulo: 'Aguardando sua aprovação' }
    : aprovado
      ? { cor: 'bg-success/10 border-success/25 text-success', Icone: Check, rotulo: rotuloAprovado }
      : recusado
        ? { cor: 'bg-surface-800 border-surface-700 text-surface-300', Icone: X, rotulo: itens.length === 1 ? `${primeiro} recusado` : `${itens.length} ações recusadas` }
        : expirado
          ? { cor: 'bg-surface-800 border-surface-700 text-surface-300', Icone: Clock, rotulo: 'Expirou — peça de novo ao Copilot' }
          : { cor: 'bg-surface-800 border-surface-700 text-surface-300', Icone: ShieldAlert, rotulo: 'Aprovação' }

  const expansivel = !aguardando && itens.length > 0

  return (
    <div className={cn('rounded-[8px] border px-3 py-2 text-xs', v.cor)}>
      <button
        type="button"
        disabled={!expansivel}
        aria-expanded={expansivel ? aberto : undefined}
        onClick={() => setAberto((x) => !x)}
        className="flex w-full items-center gap-2 text-left disabled:cursor-default"
      >
        <v.Icone className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
        <span className="flex-1 truncate font-semibold">{v.rotulo}</span>
        {expansivel && <span className="flex-shrink-0">{aberto ? 'Ocultar' : 'Ver ações'}</span>}
      </button>
      <AnimatePresence initial={false}>
        {aberto && expansivel && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="mt-2 space-y-1 overflow-hidden border-t border-current/15 pt-2"
          >
            {itens.map((item) => {
              const foiAprovado = aprovados.has(item.id)
              return (
                <li key={item.id} className="flex items-center gap-1.5 min-w-0">
                  {aprovado && (foiAprovado
                    ? <Check className="h-3 w-3 flex-shrink-0" aria-hidden />
                    : <X className="h-3 w-3 flex-shrink-0 text-surface-400" aria-hidden />)}
                  <span className={cn('truncate', aprovado && !foiAprovado && 'text-surface-400 line-through')}>{nome(item.name)}</span>
                  {aprovado && !foiAprovado && <span className="flex-shrink-0 text-surface-400">recusada</span>}
                  {expirado && <span className="sr-only">(não executada)</span>}
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
