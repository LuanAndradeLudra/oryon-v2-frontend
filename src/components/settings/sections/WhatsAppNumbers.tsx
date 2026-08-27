import { useState, useEffect } from 'react'
import { Plus, Trash2, Wifi, WifiOff, Clock, Bot, X, Star, RefreshCw, Smartphone } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { SectionHeader } from '../SectionHeader'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { ConfirmModal } from '@/components/ui/Modal'
import { Tooltip } from '@/components/ui/Tooltip'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { listAgents, type AgentConfig } from '@/services/agentsApi'
import { api, whatsappNumbersApi, type WhatsappLineDependencies } from '@/services/api'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import type { WhatsAppNumberDetailed } from '@/types'

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; chip: string }> = {
  connected:    { label: 'Conectado',    icon: <Wifi className="w-3.5 h-3.5" />,    chip: 'var(--color-status-active)' },
  CONNECTED:    { label: 'Conectado',    icon: <Wifi className="w-3.5 h-3.5" />,    chip: 'var(--color-status-active)' },
  disconnected: { label: 'Desconectado', icon: <WifiOff className="w-3.5 h-3.5" />, chip: 'var(--color-danger)' },
  DISCONNECTED: { label: 'Desconectado', icon: <WifiOff className="w-3.5 h-3.5" />, chip: 'var(--color-danger)' },
  pending:      { label: 'Pendente',     icon: <Clock className="w-3.5 h-3.5" />,    chip: 'var(--color-status-pending)' },
  PENDING:      { label: 'Pendente',     icon: <Clock className="w-3.5 h-3.5" />,    chip: 'var(--color-status-pending)' },
  DELETED:      { label: 'Removido',     icon: <WifiOff className="w-3.5 h-3.5" />, chip: 'var(--color-status-muted)' },
}

const DEFAULT_STATUS = { label: 'Desconhecido', icon: <Clock className="w-3.5 h-3.5" />, chip: 'var(--color-status-muted)' }

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
  const { toast, toasts, dismiss } = useToast()
  const { refresh: refreshWorkspace } = useWorkspaceNumber()
  const [numbers, setNumbers] = useState<WhatsAppNumberDetailed[]>([])
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [disconnectTarget, setDisconnectTarget] = useState<WhatsAppNumberDetailed | null>(null)
  const [dependencies, setDependencies] = useState<WhatsappLineDependencies | null>(null)
  const [savingAgent, setSavingAgent] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState(false)
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
      const oauthUrl = (data.redirectUrl ?? data.url ?? '') as string
      if (oauthUrl) {
        window.open(oauthUrl, '_blank', 'width=600,height=700')
      } else {
        toast('URL de OAuth não retornada pelo servidor.', 'error')
      }
    } catch {
      toast('Erro ao iniciar conexão com WhatsApp. Verifique as configurações do Meta App.', 'error')
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

  const handleResubscribe = async (num: WhatsAppNumberDetailed) => {
    if (resubscribing) return
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
      toast(`Erro na conexão: ${params.get('error')}`, 'error')
      window.history.replaceState({}, '', window.location.pathname)
      if (window.opener) { window.close(); return }
    }
    fetchNumbers()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
    try {
      await api.delete(`/whatsapp/numbers/${disconnectTarget.id}`)
      setNumbers((n) => n.filter((x) => x.id !== disconnectTarget.id))
      toast('Número desconectado e removido com sucesso.', 'success')
    } catch {
      toast('Erro ao desconectar. Tente novamente.', 'error')
    }
    setDisconnectTarget(null)
    setDependencies(null)
  }

  const disconnectDescription = (() => {
    const base = `Tem certeza que deseja desconectar o número ${disconnectTarget?.displayPhoneNumber}?`
    if (!dependencies) return `${base} O atendimento via este número será interrompido imediatamente.`
    const affected: string[] = []
    if (dependencies.templates > 0) affected.push(`${dependencies.templates} template(s)`)
    if (dependencies.campaigns > 0) affected.push(`${dependencies.campaigns} campanha(s)`)
    if (dependencies.automations > 0) affected.push(`${dependencies.automations} automação(ões)`)
    if (dependencies.departments.length > 0) affected.push(`${dependencies.departments.length} setor(es)`)
    if (affected.length === 0) return `${base} O atendimento via este número será interrompido imediatamente.`
    return `${base} Isso afeta ${affected.join(', ')} vinculados a esta linha. O atendimento será interrompido imediatamente.`
  })()

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

  return (
    <div>
      <SectionHeader
        title="Números WhatsApp"
        description="Gerencie os números WhatsApp Business conectados à plataforma."
        action={
          <Button onClick={() => { void startConnect() }} leftIcon={<Plus className="w-4 h-4" />}>
            Conectar número
          </Button>
        }
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
      <div className="divide-y divide-surface-800/60">
        {numbers.map((num) => {
          const status = STATUS_CONFIG[num.status] ?? DEFAULT_STATUS
          const quality = QUALITY_CONFIG[num.qualityRating] ?? DEFAULT_QUALITY
          const connected = num.status === 'connected' || num.status === 'CONNECTED'

          return (
            <div key={num.id} className="py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-status-active-bg border border-status-active-border flex items-center justify-center flex-shrink-0">
                    <WhatsAppIcon size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-semibold text-surface-50">{num.displayPhoneNumber}</p>
                      <span className={cn('color-chip inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border')} style={{ ['--chip']: status.chip } as React.CSSProperties}>
                        {status.icon}
                        {status.label}
                      </span>
                      {num.isPrimary && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-brand-500/40 text-brand-300 bg-brand-500/10">
                          <Star className="w-3 h-3 fill-current" />
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-surface-400 mb-3">{num.wabaName}</p>

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
                        <p className="text-[10px] uppercase tracking-widest text-surface-600 mb-0.5">Phone Number ID</p>
                        <span className="text-xs text-surface-500 font-mono">{num.phoneNumberId}</span>
                      </div>
                    </div>

                    {/* Agent AI Assignment */}
                    <div className="mt-4 pt-4 border-t border-surface-800/60">
                      <p className="text-[10px] uppercase tracking-widest text-surface-600 mb-2">Agente de IA</p>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <Bot className="w-4 h-4 text-surface-500 flex-shrink-0" />
                          <select
                            value={num.agentId ?? ''}
                            onChange={(e) => assignAgent(num.id, e.target.value || null)}
                            disabled={savingAgent === num.id}
                            className="flex-1 bg-surface-800 border border-surface-700 rounded-lg px-3 py-1.5 text-xs text-surface-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors disabled:opacity-50"
                          >
                            <option value="">Nenhum agente (atendimento humano)</option>
                            {agents.filter((a) => a.status === 'active' || a.id === num.agentId).map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name} {a.status !== 'active' ? `(${a.status})` : ''}
                              </option>
                            ))}
                          </select>
                          {num.agentId && (
                            <button
                              onClick={() => assignAgent(num.id, null)}
                              disabled={savingAgent === num.id}
                              className="p-1.5 rounded-lg text-surface-500 hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
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
                    {!num.isPrimary && (
                      <Tooltip content="Definir como linha principal">
                        <button
                          onClick={() => { void handlePromote(num.id) }}
                          disabled={promoting === num.id}
                          className="p-2 rounded-xl text-surface-400 hover:text-brand-400 hover:bg-brand-500/10 transition-colors disabled:opacity-50"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    )}
                    <Tooltip content="Reinscrever nos webhooks da Meta">
                      <button
                        onClick={() => { void handleResubscribe(num) }}
                        disabled={resubscribing === num.id}
                        className="p-2 rounded-xl text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={cn('w-4 h-4', resubscribing === num.id && 'animate-spin')} />
                      </button>
                    </Tooltip>
                    <button
                      onClick={() => { void openDisconnectConfirm(num) }}
                      className="p-2 rounded-xl text-surface-400 hover:text-danger hover:bg-danger/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
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
        title="Desconectar número"
        description={disconnectDescription}
        confirmLabel="Desconectar"
        danger
      />
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
