import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Paginacao } from '@/components/ui/Paginacao'
import { paginar } from '@/lib/paginar'
import type { AvailableUser } from '@/services/api'
import type { AgentConfig } from '@/services/agentsApi'
import type { WhatsAppNumberDetailed } from '@/types'
import { AgentIcon } from '@/components/agents/AgentIcons'
import { HelpCircle } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminTier } from '@/lib/roleHelpers'

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
  // 12/11 (João): resumo no pé do cartão — com equipe pequena, a altura fixa deixava um vão vazio.
  const emAtendimento = equipe.reduce((s, u) => s + u.activeConversations, 0)
  const paradas = equipe.reduce((s, u) => s + (u.staleConversations ?? 0), 0)
  const mediaPorOnline = online > 0 ? Math.round(emAtendimento / online) : null
  const { user } = useAuth()
  const podeGerenciar = isAdminTier(user?.role)

  return (
    <section
      aria-labelledby="equipe-agora-titulo"
      // 12/11 (João): a mesma altura FIXA da "Fila agora" (FilaAoVivo), com rolagem interna —
      // antes era só um teto (max-h) e o cartão ficava mais baixo que a fila ao lado.
      className={cn('flex flex-col bg-surface-800 border border-surface-700 rounded-[10px] overflow-hidden', 'h-[min(640px,75vh)] xl:h-[600px]')}
      data-testid="equipe-agora"
    >
      <header className="flex-shrink-0 flex items-center gap-2 h-10 px-3.5 border-b border-surface-700">
        <h2 id="equipe-agora-titulo" className="text-sm font-semibold text-surface-100">Equipe agora</h2>
        <span className="ml-auto text-xs text-surface-400 tabular-nums">
          {online} de {equipe.length} online
        </span>
      </header>

      <div className="flex-shrink-0">
      <div className="px-3.5 pt-2.5 pb-1">
        <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-surface-500">Agentes de IA</p>
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
                <AgentIcon iconId={agente.icon} className="w-7 h-7" />
                <span className="flex-1 min-w-0 leading-[1.3]">
                  <span className="block text-sm font-semibold text-surface-100 truncate">{agente.name}</span>
                  <span className="block text-xs text-surface-400 truncate">
                    {dele.length === 1 ? `atende ${rotuloDaLinha(dele[0])}` : `atende ${dele.length} linhas`}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-surface-400 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-online" aria-hidden />
                  ligado
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="px-3.5 pt-2 pb-1 border-t border-surface-700">
        <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.12em] text-surface-500">
          Pessoas · em atendimento
          <Tooltip content="Conversas abertas ou pendentes atribuídas à pessoa, com mensagem nos últimos 7 dias. As atribuídas a ela e paradas há mais tempo aparecem em cinza, à parte." side="top" wide>
            <HelpCircle className="w-3 h-3 text-surface-600 hover:text-surface-400 transition-colors normal-case" aria-label="O que é em atendimento" />
          </Tooltip>
        </p>
      </div>
      </div>

      {/* 12/11 (João): só a lista de pessoas rola; o topo e o resumo ficam fixos. */}
      <div ref={rolagem} className="flex-1 min-h-0 overflow-y-auto" data-testid="equipe-rolagem">
      {equipe.length === 0 ? (
        <p className="px-3.5 pb-3 text-xs text-surface-400">Ninguém ativo na equipe.</p>
      ) : (
        <ul className="pb-2">
          {pag.itens.map((u) => (
            <li key={u.id} className="flex items-center gap-2.5 px-3.5 py-1.5" data-testid="equipe-pessoa">
              <Avatar name={nomeDe(u)} size="xs" online={u.isOnline} kind="operator" />
              <span className="flex-1 min-w-0 leading-[1.3]">
                <span className={cn('block text-sm font-medium truncate', u.isOnline ? 'text-surface-100' : 'text-surface-400')}>
                  {nomeDe(u)}{u.id === meuId && <span className="text-surface-500 font-normal"> (você)</span>}
                </span>
                <span className="block text-2xs text-surface-500 truncate">
                  {PAPEL[u.role] ?? u.role} · {u.isOnline ? 'online' : 'offline'}
                </span>
              </span>
              <span className="w-[112px] flex-shrink-0" title={`${u.activeConversations} conversas em atendimento com ${u.firstName}${u.staleConversations ? ` · ${u.staleConversations} paradas há mais de 7 dias` : ''}`}>
                <span className="block text-right text-xs text-surface-300 tabular-nums whitespace-nowrap">
                  {u.activeConversations} em atendimento
                </span>
                {!!u.staleConversations && (
                  <span className="block text-right text-2xs text-surface-500 tabular-nums whitespace-nowrap">+ {u.staleConversations} paradas</span>
                )}
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

      {/* Resumo da equipe: fixo no pé do cartão, sempre visível (12/11). */}
      <div className="flex-shrink-0 border-t border-surface-700" data-testid="equipe-resumo">
        <p className="px-3.5 pt-2.5 pb-1 text-2xs font-semibold uppercase tracking-[0.12em] text-surface-500">Resumo da equipe</p>
        <dl className="grid grid-cols-2 gap-px bg-surface-700 border-y border-surface-700">
          {[
            { rotulo: 'Em atendimento', valor: emAtendimento.toLocaleString('pt-BR'), nota: 'conversas ativas com alguém', dica: 'Soma das conversas abertas ou pendentes atribuídas às pessoas, com mensagem nos últimos 7 dias.' },
            { rotulo: 'Por pessoa online', valor: mediaPorOnline === null ? '—' : mediaPorOnline.toLocaleString('pt-BR'), nota: online > 0 ? `${online} ${online === 1 ? 'pessoa online' : 'pessoas online'}` : 'ninguém online agora', dica: 'Conversas em atendimento divididas pelas pessoas online agora: quanto cada uma carrega, em média.' },
            { rotulo: 'Paradas', valor: paradas.toLocaleString('pt-BR'), nota: 'atribuídas, sem mensagem há 7+ dias', dica: 'Conversas atribuídas a alguém e sem mensagem há mais de 7 dias. Ficam fora da carga e são arquivadas pelo encerramento por inatividade.' },
            { rotulo: 'Agentes de IA', valor: agentes === null ? '—' : String(comLinha.length), nota: comLinha.length === 1 ? 'ligado a uma linha' : 'ligados a uma linha', dica: 'Agentes de IA ligados e atendendo ao menos uma linha de WhatsApp.' },
          ].map((c) => (
            <div key={c.rotulo} className="bg-surface-800 px-3.5 py-2.5 min-w-0" title={c.dica}>
              <dt className="text-2xs text-surface-500 truncate">{c.rotulo}</dt>
              <dd className="text-base font-semibold text-surface-100 tabular-nums leading-6">{c.valor}</dd>
              <dd className="text-2xs text-surface-500 truncate">{c.nota}</dd>
            </div>
          ))}
        </dl>
        {podeGerenciar && (
          <Link to="/settings/agents" className="flex items-center justify-center h-9 text-xs font-semibold text-brand-400 hover:bg-[var(--rowhover)] transition-colors">
            Gerenciar a equipe
          </Link>
        )}
      </div>

    </section>
  )
}
