import { useState, useEffect } from 'react'
import { Plus, Trash2, Wifi, WifiOff, Clock, Bot, X, Star, RefreshCw, Smartphone, FileText, Send, Users, ArrowRight, CheckCircle2, Copy, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { diagnosticar, veredito, VEREDITO, ICONE_ACHADO, COR_ACHADO } from './diagnosticoDaLinha'
import { SetoresDoNumero } from './SetoresDoNumero'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { SectionHeader } from '../SectionHeader'
import { WhatsAppIcon } from '@/components/ui/WhatsAppIcon'
import { ConfirmModal } from '@/components/ui/Modal'
import { Tooltip } from '@/components/ui/Tooltip'
import { Button } from '@/components/ui/Button'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { listAgents, type AgentConfig } from '@/services/agentsApi'
import { api, departmentsApi, whatsappNumbersApi, type WhatsappLineDependencies, type WhatsappLinesHealth } from '@/services/api'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import type { Department, WhatsAppNumberDetailed } from '@/types'
import { qualidadeDoNumero, limiteDoNumero } from '@/lib/metaRotulos'

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


/**
 * "· 3 aprovados · 1 pendente" — só as partes com contagem; a última posição
 * da tupla é a cor de destaque (rejeitados, sem linha).
 */
function partesDoTotal(partes: Array<[number, string, string, string?]>) {
  return partes.filter(([n]) => n > 0).map(([n, um, varios, cor]) => (
    <span key={um} className={cor}>
      <span aria-hidden className="text-surface-500">· </span>{n} {n === 1 ? um : varios}
    </span>
  ))
}

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
  // A saúde de cada linha mora no próprio cartão do número (SCRUM-1253).
  const [saude, setSaude] = useState<WhatsappLinesHealth | null>(null)
  // Setores: uma busca para todos os cartões (antes cada SetoresDoNumero
  // buscava a sua e ficava velho quando outro cartão mudava um setor).
  const [setores, setSetores] = useState<Department[] | null>(null)
  const carregarSetores = () => { departmentsApi.list().then((r) => setSetores(r.data)).catch(() => setSetores((atual) => atual ?? [])) }
  useEffect(carregarSetores, [])
  const aoMudarSetor = (setorId: string, numeroId: string) => {
    // Otimista em todos os cartões; depois confirma com o servidor.
    setSetores((lista) => (lista ?? []).map((x) => (x.id === setorId ? { ...x, whatsappNumberId: numeroId } : x)))
    carregarSetores()
  }
  useEffect(() => {
    let vivo = true
    whatsappNumbersApi.health().then((r) => { if (vivo) setSaude(r.data) }).catch(() => {})
    return () => { vivo = false }
  }, [numbers])

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

  // ── SCRUM-1253 (PO, 07/10): Números + Saúde numa tela só. Cada linha
  // é um cartão: quem ela é e se está conectada; o veredito e o diagnóstico
  // (o que resolver, com a ação ali mesmo); quem atende (IA e setores); e o
  // que roda nela (templates, disparos). Antes isso morava em duas páginas.
  {
    const saudeDe = (id: string) => saude?.lines.find((l) => l.id === id)
    return (
      <div>
        <SectionHeader
          title="Números WhatsApp"
          description="Cada número conectado: se está saudável, o que resolver e quem atende por ele."
          action={conectadas === 0 && numbers.length > 0 ? (
            <Button onClick={() => { void startConnect() }} leftIcon={<Plus className="w-4 h-4" />}>Conectar número</Button>
          ) : undefined}
        />
        {numbers.length === 0 && (
          <EmptyState icon={Smartphone} title="Nenhum número conectado" hint="Conecte um número WhatsApp Business para começar a atender pela plataforma." action={{ label: 'Conectar número', onClick: () => { void startConnect() } }} />
        )}
        {/* Recursos órfãos (voltou da antiga Saúde das linhas, PO 10/10): templates,
            disparos e automações que apontam para uma linha desativada ou removida
            — não pertencem a nenhum cartão abaixo, então o total fica aqui em cima. */}
        {saude && numbers.length > 0 && (() => {
          const o = saude.orphans
          const total = o.templates + o.campaigns + o.automations
          return (
            <p
              className={cn(
                'mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[6px] border px-3 py-2 text-xs',
                total > 0 ? 'border-status-pending-border bg-status-pending-bg text-status-pending' : 'border-surface-700 bg-surface-800 text-surface-400',
              )}
              data-testid="recursos-orfaos"
              title="Recursos apontando para uma linha desativada ou removida"
            >
              {total > 0 ? <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden /> : <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-status-active" aria-hidden />}
              <span>
                <strong className="font-semibold tabular-nums">{total}</strong> {total === 1 ? 'recurso órfão' : 'recursos órfãos'}
                {total > 0
                  ? ` — apontam para uma linha desativada ou removida: ${[
                      o.templates ? `${o.templates} ${o.templates === 1 ? 'template' : 'templates'}` : '',
                      o.campaigns ? `${o.campaigns} ${o.campaigns === 1 ? 'disparo' : 'disparos'}` : '',
                      o.automations ? `${o.automations} ${o.automations === 1 ? 'automação' : 'automações'}` : '',
                    ].filter(Boolean).join(' · ')}.`
                  : ' — nada aponta para uma linha desativada ou removida.'}
              </span>
              {total > 0 && (o.templates > 0 || o.campaigns > 0) && (
                <Link to={o.campaigns > 0 ? '/campaigns' : '/campaigns?tab=templates'} className="ml-auto font-semibold hover:underline">
                  {o.campaigns > 0 ? 'Ver disparos' : 'Ver templates'}
                </Link>
              )}
            </p>
          )
        })()}
        <div className="flex flex-col gap-4">
          {numbers.map((num) => {
            const status = STATUS_CONFIG[num.status] ?? DEFAULT_STATUS
            const nota = qualidadeDoNumero(num.qualityRating)
            const quality = QUALITY_CONFIG[num.qualityRating] ?? { label: nota.label, cls: nota.cor }
            const limite = limiteDoNumero(num.messagingLimitTier, num.maxDailyConversations) ?? num.messagingLimit ?? null
            const connected = num.status === 'connected' || num.status === 'CONNECTED'
            const h = saudeDe(num.id)
            const achados = h ? diagnosticar(h) : []
            const tipo = veredito(achados)
            const semToken = h ? !h.hasSystemUserToken : false
            return (
              <article key={num.id} className="overflow-hidden rounded-[10px] border border-surface-700 bg-surface-800">
                {/* Quem é */}
                <header className="flex flex-wrap items-start gap-3 border-b border-surface-700 px-4 py-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-[var(--sf2)]"><WhatsAppIcon size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-surface-100">
                      {num.displayPhoneNumber}
                      <span className="color-chip-soft inline-flex h-5 items-center gap-1 rounded-[6px] border px-[7px] text-2xs font-semibold" style={{ ['--chip']: status.chip } as React.CSSProperties}>{status.icon}{status.label}</span>
                      {variasLinhas && num.isPrimary && <span className="inline-flex items-center gap-1 text-2xs font-semibold text-surface-400"><Star className="h-3 w-3 fill-current" />Principal</span>}
                    </p>
                    <p className="text-xs text-surface-500">{num.wabaName || num.verifiedName || 'Conta WhatsApp'}{num.connectedAt ? ` · conectado em ${(() => { try { return format(new Date(num.connectedAt), "dd/MM/yyyy", { locale: ptBR }) } catch { return '—' } })()}` : ''}</p>
                  </div>
                  {h && (() => {
                    const v = VEREDITO[tipo]
                    return (
                      <span className="color-chip-soft inline-flex h-6 items-center gap-1 rounded-[6px] border px-2 text-xs font-semibold" style={{ ['--chip']: v.cor } as React.CSSProperties}>
                        <v.Icone className="h-3.5 w-3.5" aria-hidden />{v.rotulo}
                      </span>
                    )
                  })()}
                  {connected && (
                    <div className="flex items-center gap-0.5">
                      {variasLinhas && !num.isPrimary && (
                        <Tooltip content="Definir como linha principal">
                          <button onClick={() => { void handlePromote(num.id) }} disabled={promoting === num.id} aria-label="Definir como linha principal" className="rounded-[6px] p-1.5 text-surface-400 hover:bg-[var(--rowhover)] hover:text-surface-100 disabled:opacity-50"><Star className="h-3.5 w-3.5" /></button>
                        </Tooltip>
                      )}
                      {num.wabaId && (
                        <Tooltip content="Reinscrever nos webhooks da Meta">
                          <button onClick={() => { void handleResubscribe(num) }} disabled={resubscribing === num.id} aria-label="Reinscrever nos webhooks da Meta" className="rounded-[6px] p-1.5 text-surface-400 hover:bg-[var(--rowhover)] hover:text-surface-100 disabled:opacity-50"><RefreshCw className={cn('h-3.5 w-3.5', resubscribing === num.id && 'animate-spin')} /></button>
                        </Tooltip>
                      )}
                      <Tooltip content="Desconectar número">
                        <button onClick={() => { void openDisconnectConfirm(num) }} aria-label={`Desconectar ${num.displayPhoneNumber}`} className="rounded-[6px] p-1.5 text-surface-400 hover:bg-danger/10 hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                      </Tooltip>
                    </div>
                  )}
                </header>

                <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
                  {/* O que resolver */}
                  <section aria-label="Saúde" className="border-b border-surface-700 px-4 py-3 md:border-b-0 md:border-r">
                    <p className="mb-2 text-xs font-semibold text-surface-300">Saúde</p>
                    {!h ? (
                      <p className="text-xs text-surface-500">Carregando o diagnóstico…</p>
                    ) : achados.length === 0 ? (
                      <p className="flex items-center gap-2 text-sm text-surface-300"><CheckCircle2 className="h-4 w-4 text-status-active" aria-hidden />Nada pendente neste número.</p>
                    ) : (
                      <ul className="flex flex-col gap-2">
                        {achados.map((x) => {
                          const Icone = ICONE_ACHADO[x.gravidade]
                          return (
                            <li key={x.texto} className="flex items-start gap-2.5 text-sm">
                              <Icone className={cn('mt-0.5 h-4 w-4 flex-shrink-0', COR_ACHADO[x.gravidade])} aria-hidden />
                              <span className="min-w-0 flex-1 text-surface-200">{x.texto}</span>
                              {x.acao && <Link to={x.acao.para} className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-accent-dark hover:underline">{x.acao.rotulo}<ArrowRight className="h-3 w-3" aria-hidden /></Link>}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                    {semToken && (
                      <Button size="sm" className="mt-3" onClick={() => { void startConnect() }} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>Reconectar número</Button>
                    )}
                    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div><dt className="text-surface-500">Qualidade</dt><dd className="mt-0.5 flex items-center gap-1.5 text-surface-200"><span className={cn('h-2 w-2 rounded-full', quality.cls)} aria-hidden />{quality.label}</dd></div>
                      <div><dt className="text-surface-500" title="Quantos contatos diferentes a linha pode chamar primeiro (com template) em 24 horas">Limite de envio</dt><dd className="mt-0.5 text-surface-200">{limite ?? 'A Meta ainda não informou'}</dd></div>
                    </dl>
                  </section>

                  {/* Quem atende */}
                  <section aria-label="Atendimento" className="px-4 py-3">
                    <p className="mb-2 text-xs font-semibold text-surface-300">Quem atende</p>
                    <label className="mb-1 flex items-center gap-1.5 text-xs text-surface-500"><Bot className="h-3.5 w-3.5" aria-hidden />Agente de IA</label>
                    <div className="flex items-center gap-1.5">
                      <SelectMenu size="sm" aria-label="Agente de IA" className="flex-1" value={num.agentId ?? ''} onChange={(e) => assignAgent(num.id, e.target.value || null)} disabled={savingAgent === num.id}>
                        <option value="">Nenhum (só a equipe)</option>
                        {agents.filter((a) => a.status === 'active' || a.id === num.agentId).map((a) => (
                          <option key={a.id} value={a.id}>{a.name} {a.status !== 'active' ? `(${a.status})` : ''}</option>
                        ))}
                      </SelectMenu>
                      {num.agentId && (
                        <button onClick={() => assignAgent(num.id, null)} disabled={savingAgent === num.id} className="rounded-[6px] p-1.5 text-surface-500 hover:bg-danger/10 hover:text-danger disabled:opacity-50" title="Remover agente"><X className="h-3.5 w-3.5" /></button>
                      )}
                    </div>
                    <p className="mt-1 text-2xs text-surface-500">{num.agentId ? 'A IA responde as mensagens que chegam.' : 'Ninguém responde automaticamente.'}</p>
                    <p className="mb-1 mt-3 flex items-center gap-1.5 text-xs text-surface-500"><Users className="h-3.5 w-3.5" aria-hidden />Setores</p>
                    <SetoresDoNumero
                      numeroId={num.id}
                      setores={setores}
                      onSetorMudou={aoMudarSetor}
                      rotuloDoNumero={(id) => numbers.find((n) => n.id === id)?.displayPhoneNumber ?? 'outro número'}
                      onMudou={() => { whatsappNumbersApi.health().then((r) => setSaude(r.data)).catch(() => {}) }}
                    />
                  </section>
                </div>

                {/* O que roda nele */}
                <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-surface-700 bg-[var(--sf2)] px-4 py-2.5 text-xs text-surface-400">
                  {h && (
                    <>
                      {/* Totais por linha (voltaram da antiga Saúde das linhas, PO 10/10):
                          cada estado da Meta e o que ficou sem linha definida. */}
                      <Link to="/campaigns?tab=templates" className="inline-flex flex-wrap items-center gap-x-1.5 hover:text-surface-100" data-testid={`totais-templates-${num.id}`}>
                        <FileText className="h-3.5 w-3.5" aria-hidden />
                        <strong className="font-semibold text-surface-200">{h.templates.total}</strong> templates
                        {partesDoTotal([
                          [h.templates.approved, 'aprovado', 'aprovados'],
                          [h.templates.pending, 'pendente', 'pendentes'],
                          [h.templates.rejected, 'rejeitado', 'rejeitados', 'text-danger'],
                          [h.templates.needsAssignment, 'sem linha', 'sem linha', 'text-status-pending'],
                        ])}
                      </Link>
                      <Link to="/campaigns" className="inline-flex flex-wrap items-center gap-x-1.5 hover:text-surface-100" data-testid={`totais-disparos-${num.id}`}>
                        <Send className="h-3.5 w-3.5" aria-hidden />
                        <strong className="font-semibold text-surface-200">{h.campaigns.total}</strong> disparos
                        {partesDoTotal([
                          [h.campaigns.draft, 'rascunho', 'rascunhos'],
                          [h.campaigns.scheduled, 'agendado', 'agendados'],
                          [h.campaigns.sending, 'enviando', 'enviando'],
                          [h.campaigns.sent, 'enviado', 'enviados'],
                          [h.campaigns.needsAssignment, 'sem linha', 'sem linha', 'text-status-pending'],
                        ])}
                      </Link>
                      {h.automations.total > 0 && (
                        <span className="inline-flex flex-wrap items-center gap-x-1.5" data-testid={`totais-automacoes-${num.id}`}>
                          <strong className="font-semibold text-surface-200">{h.automations.total}</strong> automações
                          {partesDoTotal([
                            [h.automations.active, 'ativa', 'ativas'],
                            [h.automations.inactive, 'inativa', 'inativas'],
                            [h.automations.draft, 'rascunho', 'rascunhos'],
                            [h.automations.needsAssignment, 'sem linha', 'sem linha', 'text-status-pending'],
                          ])}
                        </span>
                      )}
                    </>
                  )}
                  <button type="button" onClick={() => void navigator.clipboard.writeText(num.phoneNumberId).then(() => toast('ID da Meta copiado.', 'success')).catch(() => {})} className="ml-auto inline-flex items-center gap-1 hover:text-surface-100" title={num.phoneNumberId}>
                    <Copy className="h-3 w-3" aria-hidden />Copiar ID da Meta
                  </button>
                </footer>
              </article>
            )
          })}
        </div>
        <ConfirmModal open={!!disconnectTarget} onClose={() => { setDisconnectTarget(null); setDependencies(null) }} onConfirm={handleDisconnect} loading={disconnecting} title="Desconectar número" impact={disconnectImpact} description={disconnectDescription} confirmLabel="Desconectar" danger />
      </div>
    )
  }
}
