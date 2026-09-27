import { useEffect, useState } from 'react'
import { ArrowRightLeft, FileText, FlaskConical, History, Power, Settings2, Sparkles, SlidersHorizontal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { listTestSessions, type AgentConfigWithTools } from '@/services/agentsApi'
import { listTenantAuditFeed, type TenantAuditRow } from '@/services/tenantAuditApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { CabecalhoDaSecao } from './Estrutura'

interface Evento {
  id: string
  quando: string
  titulo: string
  detalhe?: string
  quem?: string
  icone: LucideIcon
}

const ACAO: Record<string, { titulo: string; icone: LucideIcon }> = {
  agent_created: { titulo: 'Agente criado', icone: Sparkles },
  agent_status_changed: { titulo: 'Status alterado', icone: Power },
  agent_prompt_updated: { titulo: 'Instruções atualizadas', icone: FileText },
  agent_handoff_rules_updated: { titulo: 'Regras de transferência atualizadas', icone: ArrowRightLeft },
  agent_decision_criteria_updated: { titulo: 'Critérios de decisão atualizados', icone: SlidersHorizontal },
  agent_updated: { titulo: 'Configuração atualizada', icone: Settings2 },
}

/** Traduz a descrição técnica do log ("… (system_prompt, status)") para gente. */
function detalheDoLog(row: TenantAuditRow): string | undefined {
  const campos = /\(([^)]+)\)\s*$/.exec(row.description)?.[1]
  if (!campos) return undefined
  const nomes: Record<string, string> = {
    system_prompt: 'instruções', status: 'status', name: 'nome', handoff_rules: 'regras',
    crm_capabilities: 'capacidades', ai_handoff_pause_minutes: 'pausa da IA',
    ai_inbound_debounce_seconds: 'espera por mensagens', objective: 'objetivo', icon: 'ícone',
  }
  return campos.split(',').map((c) => c.trim()).map((c) => nomes[c] ?? c).join(', ')
}

function dataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/**
 * Alterações — o que mudou neste agente e quando: o registro de auditoria da
 * conta (filtrado por este agente), as conversas de teste e a criação.
 * Quem não tem acesso à auditoria vê só o que dá para afirmar sem ela.
 */
export function SecaoAlteracoes({ agent }: { agent: AgentConfigWithTools }) {
  const [eventos, setEventos] = useState<Evento[] | null>(null)
  const [semAuditoria, setSemAuditoria] = useState(false)

  useEffect(() => {
    let vivo = true
    Promise.allSettled([
      listTenantAuditFeed({ entityType: 'ai_agent', limit: 200 }),
      listTestSessions(agent.id),
    ]).then(([auditoria, testes]) => {
      if (!vivo) return
      const lista: Evento[] = [{
        id: 'criado', quando: agent.created_at, titulo: 'Agente criado', icone: Sparkles,
      }]
      if (auditoria.status === 'fulfilled') {
        for (const r of auditoria.value.data) {
          if (r.entityId !== agent.id) continue
          const a = ACAO[r.action] ?? { titulo: r.description, icone: Settings2 }
          if (r.action === 'agent_created') continue // já temos a criação pela data do agente
          lista.push({ id: r.id, quando: r.createdAt, titulo: a.titulo, detalhe: r.action === 'agent_updated' ? detalheDoLog(r) : undefined, quem: r.actorName ?? undefined, icone: a.icone })
        }
      } else {
        setSemAuditoria(true)
        lista.push({ id: 'atualizado', quando: agent.updated_at, titulo: 'Última alteração salva', icone: Settings2 })
      }
      if (testes.status === 'fulfilled') {
        for (const t of testes.value) {
          lista.push({
            id: `t-${t.id}`, quando: t.created_at, titulo: 'Conversa de teste',
            detalhe: `${t.message_count} ${t.message_count === 1 ? 'mensagem' : 'mensagens'}`, icone: FlaskConical,
          })
        }
      }
      lista.sort((a, b) => new Date(b.quando).getTime() - new Date(a.quando).getTime())
      setEventos(lista)
    })
    return () => { vivo = false }
  }, [agent.id, agent.created_at, agent.updated_at])

  return (
    <div>
      <CabecalhoDaSecao id="alteracoes" />
      {semAuditoria && (
        <p className="mb-4 text-xs text-surface-400">
          O histórico detalhado (quem mudou o quê) fica visível para administradores da conta.
        </p>
      )}
      {eventos === null ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full bg-[var(--sf2)]" />)}</div>
      ) : eventos.length <= 1 && !semAuditoria ? (
        <EmptyState icon={History} title="Nada mudou desde a criação" hint="Cada alteração salva e cada conversa de teste aparecem aqui, com data e autor." />
      ) : (
        <ol className="relative ml-3 border-l border-surface-700">
          {eventos.map((e) => {
            const Icone = e.icone
            return (
              <li key={e.id} className="relative pb-5 pl-6 last:pb-0">
                <span className="absolute -left-[13px] top-0 flex h-6 w-6 items-center justify-center rounded-full border border-surface-700 bg-surface-900 text-surface-400">
                  <Icone className="h-3.5 w-3.5" aria-hidden />
                </span>
                <p className="text-sm font-semibold text-surface-100">{e.titulo}</p>
                <p className="mt-0.5 text-xs text-surface-400">
                  <time dateTime={e.quando}>{dataHora(e.quando)}</time>
                  {e.quem && <> · {e.quem}</>}
                  {e.detalhe && <> · {e.detalhe}</>}
                </p>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
