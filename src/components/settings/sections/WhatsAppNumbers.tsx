import { useState, useEffect } from 'react'
import { Plus, Trash2, Wifi, WifiOff, Clock, Bot, X, Star, RefreshCw, Smartphone } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { SectionHeader } from '../SectionHeader'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { ConfirmModal } from '@/components/ui/Modal'
import { Tooltip } from '@/components/ui/Tooltip'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { listAgents, type AgentConfig } from '@/services/agentsApi'
import { api, whatsappNumbersApi, type WhatsappLineDependencies } from '@/services/api'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import type { WhatsAppNumberDetailed } from '@/types'

// Wifi/WifiOff/Clock não existem no set da casa (traço 2 do lucide real) —
// strokeWidth explícito pra bater com os botões de ação (Star/RefreshCw/
// Trash2, traço 1.75) na mesma linha.
const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; chip: string }> = {
  connected:    { label: 'Conectado',    icon: <Wifi className="w-3.5 h-3.5" strokeWidth={1.75} />,    chip: 'var(--color-status-active)' },
  CONNECTED:    { label: 'Conectado',    icon: <Wifi className="w-3.5 h-3.5" strokeWidth={1.75} />,    chip: 'var(--color-status-active)' },
  disconnected: { label: 'Desconectado', icon: <WifiOff className="w-3.5 h-3.5" strokeWidth={1.75} />, chip: 'var(--color-danger)' },
  DISCONNECTED: { label: 'Desconectado', icon: <WifiOff className="w-3.5 h-3.5" strokeWidth={1.75} />, chip: 'var(--color-danger)' },
  pending:      { label: 'Pendente',     icon: <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />,    chip: 'var(--color-status-pending)' },
  PENDING:      { label: 'Pendente',     icon: <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />,    chip: 'var(--color-status-pending)' },
  DELETED:      { label: 'Removido',     icon: <WifiOff className="w-3.5 h-3.5" strokeWidth={1.75} />, chip: 'var(--color-status-muted)' },
}

const DEFAULT_STATUS = { label: 'Desconhecido', icon: <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />, chip: 'var(--color-status-muted)' }

const QUALITY_CONFIG: Record<string, { label: string; cls: string }> = {
  green:   { label: 'Alta',      cls: 'bg-online' },
  GREEN:   { label: 'Alta',      cls: 'bg-online' },
  yellow:  { label: 'Média',     cls: 'bg-away' },
  YELLOW:  { label: 'Média',     cls: 'bg-away' },
  red:     { label: 'Baixa',     cls: 'bg-danger' },
  RED:     { label: 'Baixa',     cls: 'bg-danger' },
  unknown: { label: 'N/D',       cls: 'bg-surface-600' },
  UNKNOWN: { label: 'N/D',       cls: 'bg-surface-600' },
}

const DEFAULT_QUALITY = { label: 'N/D', cls: 'bg-surface-600' }

export function WhatsAppNumbers() {
  const { toast } = useToast()
  const { refresh: refreshWorkspace } = useWorkspaceNumber()
  const [numbers, setNumbers] = useState<WhatsAppNumberDetailed[]>([])
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [disconnectTarget, setDisconnectTarget] = useState<WhatsAppNumberDetailed | null>(null)
  const [dependencies, setDependencies] = useState<WhatsappLineDependencies | null>(null)
  const [savingAgent, setSavingAgent] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [promoting, setPromoting] = useState<string | null>(null)
  const [resubscribing, setResubscribing] = useState<string | null>(null)

  const fetchNumbers = () => {
    setLoading(true)
    setFetchError(false)
    Promise.all([
      api.get<WhatsAppNumberDetailed[]>('/whatsapp/numbers').then((r) => Array.isArray(r.data) ? r.data : []),
      listAgents().catch(() => []),
    ]).then(([nums, ags]) => {
      setNumbers(nums)
      setAgents(ags)
      setLoading(false)
    }).catch(() => {
      setFetchError(true)
      setNumbers([])
      setAgents([])
      setLoading(false)
    })
  }

  const startConnect = async () => {
    try {
      const { data } = await api.get<Record<string, unknown>>('/meta/oauth/start')
      // Backend returns { redirectUrl: "https://facebook.com/dialog/oauth?..." }
      const oauthUrl = (data.redirectUrl ?? data.url ?? '') as string
      if (oauthUrl) {
        const janela = window.open(oauthUrl, '_blank', 'width=600,height=700')
        // Popup bloqueado: antes nada acontecia e o clique parecia morto.
        if (!janela) toast('O navegador bloqueou a janela da Meta. Libere pop-ups para este site e tente de novo.', 'error')
      } else {
        toast('Não foi possível iniciar a conexão com a Meta. Tente de novo.', 'error')
      }
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status
      toast(status === 403
        ? 'Só administradores conectam números.'
        : 'Não foi possível iniciar a conexão com a Meta. Tente de novo.', 'error')
    }
  }

  const assignAgent = async (numberId: string, agentId: string | null) => {
    setSavingAgent(numberId)
    try {
      const { data } = await api.patch<{ agentId: string | null }>(`/meta/numbers/${numberId}`, { agentId })
      setNumbers((prev) => prev.map((n) => n.id === numberId ? { ...n, agentId: data.agentId } : n))
      toast(agentId ? 'Agente de IA atribuído ao número.' : 'Agente removido do número.', 'success')
    } catch {
      toast('Erro ao atribuir agente.', 'error')
    }
    setSavingAgent(null)
  }

  /** R16 — promote a line to primary. Refreshes the workspace context too,
   *  so the TopBar switcher picks up the change without a manual reload. */
  const handlePromote = async (numberId: string) => {
    if (promoting) return
    setPromoting(numberId)
    try {
      await whatsappNumbersApi.setPrimary(numberId)
      setNumbers((prev) => prev.map((n) => ({ ...n, isPrimary: n.id === numberId })))
      await refreshWorkspace()
      toast('Linha definida como principal.', 'success')
    } catch {
      toast('Falha ao definir linha principal.', 'error')
    } finally {
      setPromoting(null)
    }
  }

  /** R16 — force unsubscribe → subscribe on the line's WABA. Self-serve fix
   *  for "webhook stopped delivering" instead of depending on support. */
  const handleResubscribe = async (num: WhatsAppNumberDetailed) => {
    if (resubscribing || !num.wabaId) return
    setResubscribing(num.id)
    try {
      await whatsappNumbersApi.resubscribeWaba(num.wabaId)
      toast('Inscrição da Meta reativada.', 'success')
    } catch {
      toast('Falha ao reinscrever nos webhooks da Meta.', 'error')
    } finally {
      setResubscribing(null)
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected') === 'true') {
      const phones = params.get('phones') ?? '0'
      toast(`WhatsApp conectado com sucesso! ${phones} número(s) encontrado(s).`, 'success')
      window.history.replaceState({}, '', window.location.pathname)
      if (window.opener) {
        window.opener.location.reload()
        window.close()
        return
      }
    }
    if (params.get('error')) {
      // O texto do `?error=` não entra no toast: qualquer link poderia exibir
      // uma mensagem arbitrária dentro da plataforma.
      toast('A conexão com a Meta não foi concluída. Tente de novo.', 'error')
      window.history.replaceState({}, '', window.location.pathname)
      if (window.opener) { window.close(); return }
    }
    fetchNumbers()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /** R16 — pre-flight before showing the disconnect confirmation, so the
   *  operator sees how many templates/campaigns/automations/departments
   *  would be affected. Best-effort if this fails. */
  const openDisconnectConfirm = async (num: WhatsAppNumberDetailed) => {
    setDisconnectTarget(num)
    setDependencies(null)
    try {
      const { data } = await whatsappNumbersApi.dependencies(num.id)
      setDependencies(data)
    } catch {
      // Best-effort — confirm dialog falls back to the generic description.
    }
  }

  const handleDisconnect = async () => {
    if (!disconnectTarget) return
    setDisconnecting(true)
    try {
      await api.delete(`/whatsapp/numbers/${disconnectTarget.id}`)
      // O backend desconecta (status DISCONNECTED), não apaga: a linha segue
      // na lista como "Desconectado". Tirá-la daqui fazia ela "voltar" no F5.
      setNumbers((n) => n.map((x) => (x.id === disconnectTarget.id ? { ...x, status: 'DISCONNECTED' as WhatsAppNumberDetailed['status'], isActive: false } : x)))
      toast('Número desconectado.', 'success')
    } catch {
      toast('Erro ao desconectar. Tente novamente.', 'error')
    } finally {
      setDisconnecting(false)
    }
    setDisconnectTarget(null)
    setDependencies(null)
  }

  // Alcance real (impact) = o que está vinculado à linha; a descrição fica com
  // a consequência fixa (atendimento interrompido).
  const disconnectAffected: string[] = []
  if (dependencies) {
    if (dependencies.templates > 0) disconnectAffected.push(`${dependencies.templates} template(s)`)
    if (dependencies.campaigns > 0) disconnectAffected.push(`${dependencies.campaigns} campanha(s)`)
    if (dependencies.automations > 0) disconnectAffected.push(`${dependencies.automations} automação(ões)`)
    if (dependencies.departments.length > 0) disconnectAffected.push(`${dependencies.departments.length} setor(es)`)
  }
  const disconnectImpact = {
    label: disconnectAffected.length > 0
      ? `Número ${disconnectTarget?.displayPhoneNumber ?? ''} — afeta ${disconnectAffected.join(', ')} vinculados à linha`
      : `Número ${disconnectTarget?.displayPhoneNumber ?? ''}`,
    tone: 'danger' as const,
  }
  const disconnectDescription = 'O atendimento via este número será interrompido imediatamente.'

  if (loading) {
    return (
      <div>
        <SectionHeader
          title="Números WhatsApp"
          description="Gerencie os números WhatsApp Business conectados à plataforma."
        />
        <div className="flex flex-col gap-4">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div>
        <SectionHeader
          title="Números WhatsApp"
          description="Gerencie os números WhatsApp Business conectados à plataforma."
        />
        <ErrorState compact onRetry={fetchNumbers} />
      </div>
    )
  }

  // Cada cliente tem UMA linha hoje. Com ela conectada, "Conectar número",
  // a estrela de principal e o selo só aparecem quando houver mais de uma
  // (sem nenhuma conectada, o botão volta — ex.: linha desconectada).
  const conectadas = numbers.filter((n) => n.status === 'connected' || n.status === 'CONNECTED').length
  const variasLinhas = conectadas > 1

  return (
    <div>
      <SectionHeader
        title="Números WhatsApp"
        description="Gerencie os números WhatsApp Business conectados à plataforma."
        action={conectadas === 0 && numbers.length > 0 ? (
          <Button onClick={() => { void startConnect() }} leftIcon={<Plus className="w-4 h-4" />}>
            Conectar número
          </Button>
        ) : undefined}
      />

      {numbers.length === 0 && (
        <EmptyState
          icon={Smartphone}
          title="Nenhum número conectado"
          hint="Conecte um número WhatsApp Business para começar a atender pela plataforma."
          action={{ label: 'Conectar número', onClick: () => { void startConnect() } }}
        />
      )}

      {/* Lista densa: linhas separadas por hairline — sem chrome de card. */}
      <div className="divide-y divide-surface-700">
        {numbers.map((num) => {
          const status = STATUS_CONFIG[num.status] ?? DEFAULT_STATUS
          const quality = QUALITY_CONFIG[num.qualityRating] ?? DEFAULT_QUALITY
          const connected = num.status === 'connected' || num.status === 'CONNECTED'

          return (
            <div key={num.id} className="py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-md bg-status-active-bg border border-status-active-border flex items-center justify-center flex-shrink-0">
                    <WhatsAppIcon size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-surface-50">{num.displayPhoneNumber}</p>
                      <span className={cn('color-chip-soft inline-flex items-center gap-1 h-5 px-[7px] rounded-[5px] text-[11px] font-bold border')} style={{ ['--chip']: status.chip } as React.CSSProperties}>
                        {status.icon}
                        {status.label}
                      </span>
                      {variasLinhas && num.isPrimary && (
                        <span className="inline-flex items-center gap-1 h-5 px-[7px] rounded-[5px] text-[11px] font-bold border border-brand-500/40 text-brand-300 bg-brand-500/10">
                          <Star className="w-3 h-3 fill-current" />
                          Principal
                        </span>
                      )}
                    </div>
                    {(num.wabaName || num.verifiedName) && <p className="text-xs text-surface-400 mb-3">{num.wabaName || num.verifiedName}</p>}

                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-surface-600 mb-0.5">Qualidade</p>
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', quality.cls)} />
                          <span className="text-xs text-surface-300">{quality.label}</span>
                        </div>
                      </div>
                      {num.messagingLimit && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-surface-600 mb-0.5">Limite</p>
                        <span className="text-xs text-surface-300">{num.messagingLimit}</span>
                      </div>
                      )}
                      {num.connectedAt && (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-surface-600 mb-0.5">Conectado em</p>
                        <span className="text-xs text-surface-300">
                          {(() => { try { return format(new Date(num.connectedAt), "dd 'de' MMM 'de' yyyy", { locale: ptBR }) } catch { return 'Data indisponível' } })()}
                        </span>
                      </div>
                      )}
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-surface-600 mb-0.5">ID do número na Meta</p>
                        <span className="text-xs text-surface-500 font-mono">{num.phoneNumberId}</span>
                      </div>
                    </div>

                    {/* Agent AI Assignment */}
                    <div className="mt-4 pt-4 border-t border-surface-700">
                      <p className="text-[10px] uppercase tracking-widest text-surface-600 mb-2">Agente de IA</p>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <Bot className="w-4 h-4 text-surface-500 flex-shrink-0" />
                          <Select
                            size="sm"
                            className="flex-1"
                            value={num.agentId ?? ''}
                            onChange={(e) => assignAgent(num.id, e.target.value || null)}
                            disabled={savingAgent === num.id}
                            >
                            <option value="">Nenhum agente (atendimento humano)</option>
                            {agents.filter((a) => a.status === 'active' || a.id === num.agentId).map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name} {a.status !== 'active' ? `(${a.status})` : ''}
                              </option>
                            ))}
                          </Select>
                          {num.agentId && (
                            <button
                              onClick={() => assignAgent(num.id, null)}
                              disabled={savingAgent === num.id}
                              className="p-1.5 rounded-xs text-surface-500 hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
                              title="Remover agente"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {savingAgent === num.id && (
                          <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        )}
                      </div>
                      {num.agentId && (
                        <p className="text-[10px] text-status-active mt-1.5">
                          Agente ativo — mensagens recebidas serão respondidas automaticamente
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {connected && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {variasLinhas && !num.isPrimary && (
                      <Tooltip content="Definir como linha principal">
                        <button
                          onClick={() => { void handlePromote(num.id) }}
                          disabled={promoting === num.id}
                          aria-label="Definir como linha principal"
                          className="p-1.5 rounded-xs text-surface-400 hover:text-brand-400 hover:bg-brand-500/10 transition-colors disabled:opacity-50"
                        >
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      </Tooltip>
                    )}
                    {/* Só com o wabaId em mãos: sem ele a chamada virava
                        /meta/waba/undefined/resubscribe e sempre falhava. */}
                    {num.wabaId && (
                    <Tooltip content="Reinscrever nos webhooks da Meta">
                      <button
                        onClick={() => { void handleResubscribe(num) }}
                        disabled={resubscribing === num.id}
                        aria-label="Reinscrever nos webhooks da Meta"
                        className="p-1.5 rounded-xs text-surface-400 hover:text-surface-100 hover:bg-[var(--rowhover)] transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={cn('w-3.5 h-3.5', resubscribing === num.id && 'animate-spin')} />
                      </button>
                    </Tooltip>
                    )}
                    <button
                      onClick={() => { void openDisconnectConfirm(num) }}
                      aria-label={`Desconectar ${num.displayPhoneNumber}`}
                      title="Desconectar número"
                      className="p-1.5 rounded-xs text-surface-400 hover:text-danger hover:bg-danger/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <ConfirmModal
        open={!!disconnectTarget}
        onClose={() => { setDisconnectTarget(null); setDependencies(null) }}
        onConfirm={handleDisconnect}
        loading={disconnecting}
        title="Desconectar número"
        impact={disconnectImpact}
        description={disconnectDescription}
        confirmLabel="Desconectar"
        danger
      />
    </div>
  )
}
