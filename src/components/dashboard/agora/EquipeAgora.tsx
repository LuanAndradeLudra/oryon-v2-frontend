import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Paginacao } from '@/components/ui/Paginacao'
import { paginar } from '@/lib/paginar'
import type { AvailableUser } from '@/services/api'
import type { AgentConfig } from '@/services/agentsApi'
import type { WhatsAppNumberDetailed } from '@/types'

// "Equipe agora" (direção A): o Agente IA como primeira linha da equipe — a
// lacuna do mercado que o canvas apontou — e depois as pessoas, online
// primeiro, com a carga de conversas em aberto de cada uma.
//
// Só dado que existe: para a IA, se está ligada e quais linhas atende. Os
// números por dia do agente (atendidas, passadas) são o P2 do SCRUM-1161;
// até lá a linha não inventa contagem.

interface Props {
  agentes: AgentConfig[] | null
  linhas: WhatsAppNumberDetailed[]
  equipe: AvailableUser[]
  meuId: string | undefined
  /** Página das pessoas (1-based; vive na URL). */
  pagina: number
  onPagina: (p: number) => void
}

/** Pessoas por página. O cartão tem a mesma altura fixa da fila (PO 28/09). */
const POR_PAGINA = 12

function nomeDe(u: { firstName: string; lastName?: string | null }): string {
  return [u.firstName, u.lastName].filter(Boolean).join(' ')
}

function rotuloDaLinha(l: WhatsAppNumberDetailed): string {
  return l.label || l.displayPhoneNumber
}

const PAPEL: Record<string, string> = {
  super_admin: 'Admin',
  admin: 'Admin',
  business_admin: 'Admin',
  supervisor: 'Supervisor',
  agent: 'Atendente',
}

export function EquipeAgora({ agentes, linhas, equipe, meuId, pagina, onPagina }: Props) {
  const pag = paginar(equipe, pagina, POR_PAGINA)
  const rolagem = useRef<HTMLDivElement>(null)
  useEffect(() => { rolagem.current?.scrollTo?.({ top: 0 }) }, [pag.pagina])
  // Agentes que respondem de verdade: ligados e com ao menos uma linha.
  const comLinha = (agentes ?? [])
    .map((a) => ({ agente: a, linhas: linhas.filter((l) => l.agentId === a.id) }))
    .filter((x) => x.agente.status === 'active' && x.linhas.length > 0)
  const online = equipe.filter((u) => u.isOnline).length
  const maiorCarga = Math.max(1, ...equipe.map((u) => u.activeConversations))

  return (
    <section
      aria-labelledby="equipe-agora-titulo"
      className="flex flex-col h-[min(640px,75vh)] xl:h-[600px] bg-surface-800 border border-surface-700 rounded-lg overflow-hidden"
      data-testid="equipe-agora"
    >
      <header className="flex-shrink-0 flex items-center gap-2 h-10 px-3.5 border-b border-surface-700">
        <h2 id="equipe-agora-titulo" className="text-[13px] font-semibold text-surface-100">Equipe agora</h2>
        <span className="ml-auto text-xs text-surface-400 tabular-nums">
          {online} de {equipe.length} online
        </span>
      </header>

      <div ref={rolagem} className="flex-1 min-h-0 overflow-y-auto" data-testid="equipe-rolagem">
      <div className="px-3.5 pt-2.5 pb-1">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-surface-500">Agentes de IA</p>
      </div>
      {agentes === null ? (
        <p className="px-3.5 pb-3 text-xs text-surface-400">
          Não foi possível ler os agentes agora. A fila continua certa: só entra quem a IA não está atendendo.
        </p>
      ) : comLinha.length === 0 ? (
        <p className="px-3.5 pb-3 text-xs text-surface-400">
          Nenhum agente ligado a uma linha. <Link to="/agents" className="font-semibold text-brand-400 hover:underline">Ver agentes</Link>
        </p>
      ) : (
        <ul className="pb-1.5">
          {comLinha.map(({ agente, linhas: dele }) => (
            <li key={agente.id}>
              <Link
                to={`/agents/${agente.id}`}
                className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-[var(--rowhover)] transition-colors"
              >
                <span className="w-[26px] h-[26px] rounded-[7px] bg-brand-500/15 text-brand-400 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-3.5 h-3.5" aria-hidden />
                </span>
                <span className="flex-1 min-w-0 leading-[1.3]">
                  <span className="block text-[13px] font-semibold text-surface-100 truncate">{agente.name}</span>
                  <span className="block text-[11.5px] text-surface-400 truncate">
                    {dele.length === 1 ? `atende ${rotuloDaLinha(dele[0])}` : `atende ${dele.length} linhas`}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11.5px] text-surface-400 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-online" aria-hidden />
                  ligado
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="px-3.5 pt-2 pb-1 border-t border-surface-700">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-surface-500">Pessoas</p>
      </div>
      {equipe.length === 0 ? (
        <p className="px-3.5 pb-3 text-xs text-surface-400">Ninguém ativo na equipe.</p>
      ) : (
        <ul className="pb-2">
          {pag.itens.map((u) => (
            <li key={u.id} className="flex items-center gap-2.5 px-3.5 py-1.5" data-testid="equipe-pessoa">
              <Avatar name={nomeDe(u)} size="xs" online={u.isOnline} kind="operator" />
              <span className="flex-1 min-w-0 leading-[1.3]">
                <span className={cn('block text-[13px] font-medium truncate', u.isOnline ? 'text-surface-100' : 'text-surface-400')}>
                  {nomeDe(u)}{u.id === meuId && <span className="text-surface-500 font-normal"> (você)</span>}
                </span>
                <span className="block text-[11px] text-surface-500 truncate">
                  {PAPEL[u.role] ?? u.role} · {u.isOnline ? 'online' : 'offline'}
                </span>
              </span>
              <span className="w-[88px] flex-shrink-0" title={`${u.activeConversations} conversas em aberto com ${u.firstName}`}>
                <span className="block text-right text-[11.5px] text-surface-300 tabular-nums whitespace-nowrap">
                  {u.activeConversations} em aberto
                </span>
                <span className="mt-1 block h-1 rounded-full bg-[var(--sf2)] overflow-hidden" aria-hidden>
                  <span
                    className="block h-full rounded-full bg-brand-500"
                    style={{ width: `${Math.round((u.activeConversations / maiorCarga) * 100)}%` }}
                  />
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      </div>

      <Paginacao
        pagina={pag.pagina}
        paginas={pag.paginas}
        de={pag.de}
        ate={pag.ate}
        total={pag.total}
        onPagina={onPagina}
        rotulo="pessoas da equipe"
        className="flex-shrink-0"
      />
    </section>
  )
}
