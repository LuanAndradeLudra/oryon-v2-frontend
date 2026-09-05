import { useState, useEffect } from 'react'
import {
  Bot, Power, PauseCircle, FileText, Clock, RefreshCw, Sparkles,
  MessageCircleQuestion, Wrench, Workflow, CheckCircle2, Save, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateAgent } from '@/services/agentsApi'
import type { AgentConfig, AgentConfigWithTools } from '@/services/agentsApi'
import { FormField } from '@/components/ui/FormField'
import { Select } from '@/components/ui/Select'
import { conversationsApi } from '@/services/api'
import { STATUS_CONFIG } from '../constants'

// ─── Card: AI behaviour (Phase 34 — moved here from Company Profile) ──────────
// Per-agent handoff pause + inbound debounce. Both can be left to "inherit"
// (NULL), in which case the backend falls back to the organization-level
// value (then the hardcoded default). 0 on debounce means "reply immediately"
// and is distinct from "inherit".
const PAUSE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Herdar da organização' },
  { value: '30', label: '30 minutos' },
  { value: '60', label: '1 hora' },
  { value: '120', label: '2 horas' },
  { value: '240', label: '4 horas' },
  { value: '480', label: '8 horas' },
  { value: '1440', label: '24 horas' },
  { value: '4320', label: '3 dias' },
  { value: '10080', label: '1 semana' },
]
const DEBOUNCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Herdar da organização' },
  { value: '0', label: 'Desligado (resposta imediata)' },
  { value: '5', label: '5 segundos' },
  { value: '10', label: '10 segundos' },
  { value: '12', label: '12 segundos' },
  { value: '15', label: '15 segundos' },
  { value: '20', label: '20 segundos' },
  { value: '30', label: '30 segundos' },
]

function AiBehaviorCard({ agent, onUpdate }: { agent: AgentConfigWithTools; onUpdate: (a: AgentConfig) => void }) {
  const toStr = (n: number | null | undefined): string => (n == null ? '' : String(n))
  const initialPause = toStr(agent.ai_handoff_pause_minutes)
  const initialDebounce = toStr(agent.ai_inbound_debounce_seconds)
  const [pause, setPause] = useState(initialPause)
  const [debounce, setDebounce] = useState(initialDebounce)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setPause(toStr(agent.ai_handoff_pause_minutes))
    setDebounce(toStr(agent.ai_inbound_debounce_seconds))
  }, [agent.ai_handoff_pause_minutes, agent.ai_inbound_debounce_seconds])

  const dirty = pause !== initialPause || debounce !== initialDebounce

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateAgent(agent.id, {
        ai_handoff_pause_minutes: pause === '' ? null : parseInt(pause, 10),
        ai_inbound_debounce_seconds: debounce === '' ? null : parseInt(debounce, 10),
      })
      onUpdate(updated)
      // Bust the backend's per-agent behavior cache so the new value takes
      // effect immediately (otherwise it lags up to the 60s TTL). Best-effort:
      // the TTL is the fallback if this call fails.
      await conversationsApi.refreshAgentBehaviorCache(agent.id).catch(() => {})
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-surface-900/60 border border-surface-800/60 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Bot className="w-3.5 h-3.5 text-surface-500" />
        <p className="text-xs font-medium text-surface-500">Comportamento da IA</p>
      </div>

      <FormField
        label="Pausar IA quando um atendente humano intervém"
        hint="Quando um atendente envia uma mensagem na conversa, a IA pausa automaticamente por este período. O atendente pode reativar a IA a qualquer momento na própria conversa."
      >
        <Select value={pause} onChange={(e) => setPause(e.target.value)}>
          {PAUSE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Aguardar mensagens fragmentadas antes de responder"
        hint="Quando o cliente envia mensagens em sequência (ex: 'oi' / 'tudo bem?' / 'queria saber sobre X'), a IA espera este período após cada mensagem. Mensagens novas dentro da janela cancelam o timer e a IA responde tudo de uma vez só. Desligar = resposta imediata por mensagem."
      >
        <Select value={debounce} onChange={(e) => setDebounce(e.target.value)}>
          {DEBOUNCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </FormField>

      <div className="flex items-center justify-end gap-3 mt-1">
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs text-status-active">
            <CheckCircle2 className="w-3.5 h-3.5" /> Salvo
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors',
            dirty
              ? 'border-transparent bg-status-active-bg text-status-active ring-1 ring-status-active-border hover:brightness-110 cursor-pointer'
              : 'border-surface-800 text-surface-600 bg-surface-900 cursor-default',
          )}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salvar
        </button>
      </div>
    </div>
  )
}

export function OverviewTab({ agent, onUpdate }: { agent: AgentConfigWithTools; onUpdate: (a: AgentConfig) => void }) {
  const [savingStatus, setSavingStatus] = useState(false)

  const setStatus = async (status: AgentConfig['status']) => {
    setSavingStatus(true)
    try {
      const updated = await updateAgent(agent.id, { status })
      onUpdate(updated)
    } finally {
      setSavingStatus(false)
    }
  }

  const infoRows = [
    { icon: <Clock className="w-3.5 h-3.5" />, label: 'Criado', value: new Date(agent.created_at).toLocaleString('pt-BR') },
    { icon: <RefreshCw className="w-3.5 h-3.5" />, label: 'Atualizado', value: new Date(agent.updated_at).toLocaleString('pt-BR') },
  ]

  const enabledTools = agent.tools.filter(t => t.enabled).length
  const totalTools = agent.tools.length
  const rulesList = agent.handoff_rules?.rules ?? []
  const enabledRules = rulesList.filter(r => r.enabled).length
  const totalRules = rulesList.length

  const formatRelative = (iso: string | null): string => {
    if (!iso) return 'nunca'
    const diffMs = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diffMs / 60_000)
    if (m < 1) return 'agora'
    if (m < 60) return `há ${m} min`
    const h = Math.floor(m / 60)
    if (h < 24) return `há ${h} h`
    const d = Math.floor(h / 24)
    if (d < 7) return `há ${d} d`
    return new Date(iso).toLocaleDateString('pt-BR')
  }

  const activityRows = [
    {
      icon: <MessageCircleQuestion className="w-4 h-4" />,
      label: 'Conversas atendidas',
      value: agent.conversation_count.toLocaleString('pt-BR'),
      highlighted: agent.conversation_count > 0,
    },
    {
      icon: <Sparkles className="w-4 h-4" />,
      label: 'Testes realizados',
      value: agent.test_count.toLocaleString('pt-BR'),
      highlighted: agent.test_count > 0,
    },
    {
      icon: <Clock className="w-4 h-4" />,
      label: 'Último teste',
      value: formatRelative(agent.last_tested_at),
      highlighted: !!agent.last_tested_at,
    },
    {
      icon: <Wrench className="w-4 h-4" />,
      label: 'Ferramentas ativas',
      value: totalTools === 0 ? 'nenhuma' : `${enabledTools} / ${totalTools}`,
      highlighted: enabledTools > 0,
    },
    {
      icon: <Workflow className="w-4 h-4" />,
      label: 'Regras de handoff',
      value: totalRules === 0 ? 'nenhuma' : `${enabledRules} / ${totalRules}`,
      highlighted: enabledRules > 0,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Status controls */}
      <div className="bg-surface-900/60 border border-surface-800/60 rounded-xl p-4">
        <p className="text-xs font-medium text-surface-500 mb-3">Status do agente</p>
        <div className="flex items-center gap-2">
          {(['active', 'paused', 'draft'] as const).map((s) => {
            const cfg = STATUS_CONFIG[s]
            const active = agent.status === s
            return (
              <button
                key={s}
                onClick={() => !active && setStatus(s)}
                disabled={savingStatus || active}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors',
                  active
                    ? 'color-chip cursor-default'
                    : 'border-surface-800 text-surface-500 hover:border-surface-700 hover:text-surface-300 bg-surface-900 cursor-pointer',
                )}
                style={active ? { ['--chip']: cfg.chip } as React.CSSProperties : undefined}
              >
                {s === 'active'  && <Power       className="w-3.5 h-3.5" />}
                {s === 'paused'  && <PauseCircle className="w-3.5 h-3.5" />}
                {s === 'draft'   && <FileText    className="w-3.5 h-3.5" />}
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* AI behaviour (Phase 34) */}
      <AiBehaviorCard agent={agent} onUpdate={onUpdate} />

      {/* Activity */}
      <div className="bg-surface-900/60 border border-surface-800/60 rounded-xl p-4">
        <p className="text-xs font-medium text-surface-500 mb-3">Atividade</p>
        <div className="space-y-2">
          {activityRows.map(row => (
            <div key={row.label} className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors',
              row.highlighted ? 'border-status-active-border/60 bg-status-active-bg/40' : 'border-surface-800/60 bg-surface-950/40',
            )}>
              <span className={row.highlighted ? 'text-status-active' : 'text-surface-600'}>{row.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium', row.highlighted ? 'text-surface-200' : 'text-surface-500')}>
                  {row.label}
                </p>
              </div>
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  row.highlighted
                    ? 'color-chip border'
                    : 'text-surface-500 bg-surface-800/40 ring-1 ring-surface-700/30',
                )}
                style={row.highlighted ? { ['--chip']: 'var(--color-status-active)' } as React.CSSProperties : undefined}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Info rows */}
      <div className="bg-surface-900/60 border border-surface-800/60 rounded-xl p-4">
        <p className="text-xs font-medium text-surface-500 mb-3">Informações</p>
        <div className="space-y-2">
          {infoRows.map(r => (
            <div key={r.label} className="flex items-center gap-2 text-xs">
              <span className="text-surface-600">{r.icon}</span>
              <span className="text-surface-500 w-20 flex-shrink-0">{r.label}</span>
              <span className="text-surface-300">{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
