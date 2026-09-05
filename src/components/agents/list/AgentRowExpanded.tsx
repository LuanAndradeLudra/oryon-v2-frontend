// ─── Agentes · corpo expandido da linha ───────────────────────────────────
// `.xrow .xb` do mockup (A4/SCRUM-1015): três blocos lado a lado — conversas
// ao vivo, ações e saúde — que abrem no lugar, sem drawer e sem troca de tela.
//
// O que cada bloco mostra depende do que existe de verdade hoje:
//   · conversas — `/agents-ops/live` devolve UMA conversa (`latest`), não uma
//     lista; o cabeçalho traz a contagem e o corpo mostra a que temos. A lista
//     curta foi pedida ao backend.
//   · ações — "Duplicar" fica OCULTO enquanto o AS.1 não existir. Não dá para
//     sondar: o endpoint é um POST que criaria um agente.
//   · saúde — cada linha só aparece com o dado correspondente. Sem o AS.2,
//     sobra o que vem do próprio `AgentConfig`.

import { ExternalLink, FlaskConical, Pause, Play, Copy } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { accentColor, tint } from '@/components/ui/accentColor'
import type { AgentConfig } from '@/services/agentsApi'
import type { AgentLiveInfo, AgentHealth } from '@/types/agentsOps'
import { daysSince, personaAccent, personaInitial, relativeTime } from '@/components/agents/deck/deckFormat'

/**
 * O AS.1 (`POST /configs/:id/duplicate`) ainda não existe. `withFallback` só
 * descobriria isso depois de chamar, e chamar criaria um agente — então a
 * visibilidade do botão é uma constante, trocada nesta linha quando o AS.1
 * (SCRUM-1009) mesclar. Decisão do Maestro: oculto, nunca desabilitado.
 */
export const AS1_DUPLICATE_DISPONIVEL = false

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="p-4 min-w-0">
      <div className="text-3xs font-bold uppercase tracking-[0.1em] text-surface-500 mb-1.5">{titulo}</div>
      {children}
    </div>
  )
}

function LinhaSaude({ rotulo, valor, cor }: { rotulo: string; valor: string; cor?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-surface-400">{rotulo}</span>
      <span className="truncate" style={{ color: cor ?? 'var(--color-surface-200)' }}>{valor}</span>
    </div>
  )
}

export interface AgentRowExpandedProps {
  agent: AgentConfig
  live?: AgentLiveInfo
  health?: AgentHealth
  onOpenWorkspace: (agentId: string) => void
  onTest: (agentId: string) => void
  onToggleStatus: (agentId: string, status: AgentConfig['status']) => void
  onDuplicate?: (agentId: string) => void
  /** Enquanto o agente completo é buscado para o simulador. */
  testLoading?: boolean
}

export function AgentRowExpanded({
  agent,
  live,
  health,
  onOpenWorkspace,
  onTest,
  onToggleStatus,
  onDuplicate,
  testLoading,
}: AgentRowExpandedProps) {
  const paused = agent.status === 'paused'
  const ultimoTeste = daysSince(health?.last_test_at ?? agent.last_tested_at)
  const tokenAviso = health?.tool_warnings?.[0]

  return (
    <div className="grid grid-cols-[1.2fr_1fr_1fr] border-t border-surface-700 bg-surface-900 [&>div+div]:border-l [&>div+div]:border-surface-800">
      {/* ── Conversas ao vivo ── */}
      <Bloco titulo={live ? `Conversas ao vivo · ${live.count}` : 'Conversas ao vivo'}>
        {!live ? (
          <p className="text-xs text-surface-500">Indisponível enquanto o painel de operação não estiver ligado.</p>
        ) : live.latest ? (
          <>
            <div className="flex items-center gap-2.5 py-2 text-[12.5px]">
              <span
                className="w-7 h-7 rounded-[8px] flex items-center justify-center font-display font-bold text-xs flex-shrink-0"
                style={{
                  backgroundColor: tint(personaAccent(live.latest.conversationId), 18),
                  color: accentColor(personaAccent(live.latest.conversationId)),
                }}
                aria-hidden
              >
                {personaInitial(live.latest.contactName)}
              </span>
              <span className="font-semibold text-surface-100 flex-shrink-0">{live.latest.contactName}</span>
              <span className="text-surface-400 truncate flex-1">{live.latest.snippet}</span>
              <span className="text-[10.5px] text-surface-500 tabular-nums flex-shrink-0">
                {relativeTime(live.latest.at)}
              </span>
            </div>
            {live.count > 1 && (
              <p className="text-xs text-surface-500 mt-1">
                e mais {live.count - 1} {live.count - 1 === 1 ? 'conversa' : 'conversas'} neste momento
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-surface-500">Nenhuma conversa em andamento agora.</p>
        )}
      </Bloco>

      {/* ── Ações ── */}
      <Bloco titulo="Ações">
        <div className="flex flex-col gap-1.5 items-stretch">
          <Button size="sm" variant="primary" leftIcon={<ExternalLink className="w-3.5 h-3.5" />} onClick={() => onOpenWorkspace(agent.id)}>
            Abrir workspace
          </Button>
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<FlaskConical className="w-3.5 h-3.5" />}
            loading={testLoading}
            onClick={() => onTest(agent.id)}
          >
            Testar no simulador
          </Button>
          <Button
            size="sm"
            variant="secondary"
            leftIcon={paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            onClick={() => onToggleStatus(agent.id, paused ? 'active' : 'paused')}
          >
            {paused ? 'Reativar agente' : 'Pausar agente'}
          </Button>
          {AS1_DUPLICATE_DISPONIVEL && onDuplicate && (
            <Button size="sm" variant="secondary" leftIcon={<Copy className="w-3.5 h-3.5" />} onClick={() => onDuplicate(agent.id)}>
              Duplicar
            </Button>
          )}
        </div>
      </Bloco>

      {/* ── Saúde ── */}
      <Bloco titulo="Saúde">
        <div className="flex flex-col gap-2">
          {health?.prompt_version != null && <LinhaSaude rotulo="Prompt" valor={`v${health.prompt_version}`} />}
          {health?.knowledge_count != null && (
            <LinhaSaude
              rotulo="Conhecimento"
              valor={`${health.knowledge_count} ${health.knowledge_count === 1 ? 'fonte' : 'fontes'}`}
            />
          )}
          {tokenAviso && (
            <LinhaSaude
              rotulo="Ferramentas"
              valor={
                tokenAviso.kind === 'token_expired'
                  ? 'token expirado'
                  : `token expira em ${daysSince(tokenAviso.expires_at) !== null ? Math.abs(daysSince(tokenAviso.expires_at) as number) : '?'}d`
              }
              cor={tokenAviso.kind === 'token_expired' ? 'var(--color-accent-rose)' : 'var(--color-status-pending)'}
            />
          )}
          <LinhaSaude
            rotulo="Último teste"
            valor={ultimoTeste === null ? 'nunca' : ultimoTeste === 0 ? 'hoje' : `há ${ultimoTeste} dias`}
            cor={ultimoTeste === null || ultimoTeste >= 7 ? 'var(--color-status-pending)' : undefined}
          />
        </div>
      </Bloco>
    </div>
  )
}
