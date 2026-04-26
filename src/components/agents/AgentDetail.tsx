import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Bot, Plus, Wrench, MoreHorizontal, Power, PauseCircle,
  FileText, Trash2, Save, X, Check, Edit3, Globe, MessageSquare,
  Instagram, Zap, Clock, AlertCircle, Copy, Eye, EyeOff,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Shield,
  Link2, Hash, RefreshCw, Sparkles, BookOpen, FileUp, Loader2,
  Pencil, CheckCircle2, Upload, MessageCircleQuestion, BarChart3,
  Workflow, Info,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { useAuth } from '@/contexts/AuthContext'
import { loadHub, hubHasContent, isAgentStale, injectHubIntoPrompt } from '@/services/companyContextService'
import { cn } from '@/lib/utils'
import {
  updateAgent,
  addTool, updateTool, deleteTool,
  listAgentKnowledge, addAgentKnowledge, deleteAgentKnowledge, updateAgentKnowledge,
  getAgentKnowledgeDoc, extractBrandFile,
  listFaqRules, addFaqRule, updateFaqRule, deleteFaqRule,
  getToolMetrics,
} from '@/services/agentsApi'
import type {
  AgentConfig, AgentConfigWithTools, AgentTool, HandoffRule, AgentKnowledgeDoc,
  FaqRule, FaqRuleDraft, FaqMatchMode, ToolMetricRow,
} from '@/services/agentsApi'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { HandoffRulesPanel } from '@/components/agents/HandoffRuleBuilder'
import { PromptArtifact } from '@/components/agents/PromptArtifact'
import { KnowledgeDocArtifact } from '@/components/agents/KnowledgeDocArtifact'
import { AgentIcon } from '@/components/agents/AgentIcons'
import { AgentTestModal } from '@/components/agents/AgentTestModal'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  active:  { label: 'Ativo',     color: 'bg-status-active-bg text-status-active ring-status-active-border', dot: 'bg-status-active' },
  draft:   { label: 'Rascunho',  color: 'bg-status-pending-bg   text-status-pending   ring-status-pending-border',   dot: 'bg-status-pending'   },
  paused:  { label: 'Pausado',   color: 'bg-surface-700/40 text-surface-400 ring-surface-600/30', dot: 'bg-surface-400' },
}

const METHOD_COLOR = {
  GET:    'bg-blue-500/15    text-blue-400    ring-blue-500/20',
  POST:   'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20',
  PUT:    'bg-amber-500/15   text-amber-400   ring-amber-500/20',
  PATCH:  'bg-orange-500/15  text-orange-400  ring-orange-500/20',
  DELETE: 'bg-red-500/15     text-red-400     ring-red-500/20',
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: AgentConfig['status'] }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ring-1', cfg.color)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

// ─── Inline editable field ────────────────────────────────────────────────────

function InlineEdit({
  value,
  onSave,
  className,
}: {
  value: string
  onSave: (v: string) => Promise<void>
  className?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (draft.trim() === value) { setEditing(false); return }
    setSaving(true)
    try { await onSave(draft.trim()); setEditing(false) } finally { setSaving(false) }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
          className="bg-surface-800 border border-brand-500/50 rounded-lg px-2 py-1 text-sm font-semibold text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
        <button onClick={handleSave} disabled={saving} className="p-1 rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-50 transition">
          <Check className="w-3.5 h-3.5 text-white" />
        </button>
        <button onClick={() => { setDraft(value); setEditing(false) }} className="p-1 rounded-lg hover:bg-surface-700 transition">
          <X className="w-3.5 h-3.5 text-surface-400" />
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => { setDraft(value); setEditing(true) }} className={cn('group flex items-center gap-1.5 hover:text-surface-50 transition-colors', className)}>
      {value}
      <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
    </button>
  )
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function OverviewTab({ agent, onUpdate }: { agent: AgentConfigWithTools; onUpdate: (a: AgentConfig) => void }) {
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

  const channels = agent.channels ?? {}

  const infoRows = [
    { icon: <Clock className="w-3.5 h-3.5" />, label: 'Criado', value: new Date(agent.created_at).toLocaleString('pt-BR') },
    { icon: <RefreshCw className="w-3.5 h-3.5" />, label: 'Atualizado', value: new Date(agent.updated_at).toLocaleString('pt-BR') },
    { icon: <Wrench className="w-3.5 h-3.5" />, label: 'Ferramentas', value: `${agent.tools.length} configurada(s)` },
    { icon: <Hash className="w-3.5 h-3.5" />, label: 'ID', value: agent.id.slice(0, 8) + '…' },
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
                    ? cn(cfg.color, 'ring-1 border-transparent cursor-default')
                    : 'border-surface-800 text-surface-500 hover:border-surface-700 hover:text-surface-300 bg-surface-900 cursor-pointer',
                )}
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

      {/* Channels */}
      <div className="bg-surface-900/60 border border-surface-800/60 rounded-xl p-4">
        <p className="text-xs font-medium text-surface-500 mb-3">Canais conectados</p>
        <div className="space-y-2">
          {[
            { key: 'whatsapp', icon: <MessageSquare className="w-4 h-4" />, label: 'WhatsApp', detail: (channels as {whatsapp?: {number?: string}}).whatsapp?.number },
            { key: 'messenger', icon: <Globe className="w-4 h-4" />, label: 'Messenger', detail: (channels as {messenger?: {page_id?: string}}).messenger?.page_id },
            { key: 'instagram', icon: <Instagram className="w-4 h-4" />, label: 'Instagram Direct', detail: (channels as {instagram?: {username?: string}}).instagram?.username },
          ].map(ch => {
            const connected = !!(channels as Record<string, unknown>)[ch.key]
            return (
              <div key={ch.key} className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors',
                connected ? 'border-status-active-border bg-status-active-bg' : 'border-surface-800/60 bg-surface-950/40',
              )}>
                <span className={connected ? 'text-status-active' : 'text-surface-600'}>{ch.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', connected ? 'text-surface-200' : 'text-surface-500')}>{ch.label}</p>
                  {ch.detail && <p className="text-xs text-surface-500 truncate">{ch.detail}</p>}
                </div>
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full ring-1',
                  connected ? 'text-status-active bg-status-active-bg ring-status-active-border' : 'text-surface-600 bg-surface-800/40 ring-surface-700/20',
                )}>
                  {connected ? 'Conectado' : 'Não configurado'}
                </span>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-surface-600 mt-3">
          Configure os canais nas Configurações → WhatsApp / Meta
        </p>
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

// ─── Tab: System Prompt ───────────────────────────────────────────────────────

function SystemPromptTab({ agent, onUpdate }: { agent: AgentConfigWithTools; onUpdate: (a: AgentConfig) => void }) {
  const { user } = useAuth()
  const [draft, setDraft] = useState(agent.system_prompt)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const isDirty = draft !== agent.system_prompt

  const hub     = user?.tenantId ? loadHub(user.tenantId) : null
  const hasHub  = hub ? hubHasContent(hub) : false
  const isStale = hub ? isAgentStale(agent.updated_at, hub) : false

  useEffect(() => { setDraft(agent.system_prompt) }, [agent.system_prompt])

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateAgent(agent.id, { system_prompt: draft })
      onUpdate(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const handleSync = async () => {
    if (!hub || !hasHub) return
    setSyncing(true)
    try {
      const newPrompt = injectHubIntoPrompt(agent.system_prompt, hub)
      const updated = await updateAgent(agent.id, { system_prompt: newPrompt })
      onUpdate(updated)
      setDraft(newPrompt)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Stale warning banner */}
      {isStale && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-status-pending-bg border border-status-pending-border flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 text-status-pending flex-shrink-0" />
            <p className="text-xs text-status-pending">
              O Contexto da IA foi atualizado depois que este prompt foi gerado.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-status-pending-bg hover:bg-status-pending-bg/80 text-status-pending text-xs font-medium border border-status-pending-border transition-colors flex-shrink-0 disabled:opacity-50"
          >
            {syncing
              ? <><RefreshCw className="w-3 h-3 animate-spin" /> Sincronizando…</>
              : <><Sparkles className="w-3 h-3" /> Sincronizar com Hub</>}
          </button>
        </div>
      )}

      {/* Artifact — editable */}
      <PromptArtifact
        content={draft}
        onChange={setDraft}
      />

      {/* Save / discard row */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDraft(agent.system_prompt)}
            disabled={!isDirty}
            className="text-xs text-surface-500 hover:text-surface-300 disabled:opacity-0 transition"
          >
            Descartar alterações
          </button>
          {hasHub && !isStale && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 text-xs text-surface-600 hover:text-brand-400 disabled:opacity-40 transition"
            >
              {syncing
                ? <><RefreshCw className="w-3 h-3 animate-spin" /> Sincronizando…</>
                : <><Sparkles className="w-3 h-3" /> Sincronizar com Hub</>}
            </button>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
            saved
              ? 'bg-status-active-bg text-status-active ring-1 ring-status-active-border'
              : isDirty
                ? 'bg-brand-600 hover:bg-brand-500 text-surface-950'
                : 'bg-surface-800 text-surface-600 cursor-not-allowed',
          )}
        >
          {saved
            ? <><Check className="w-3.5 h-3.5" /> Salvo</>
            : saving
              ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Salvando…</>
              : <><Save className="w-3.5 h-3.5" /> Salvar prompt</>}
        </button>
      </div>
    </div>
  )
}

// ─── Tool Form ────────────────────────────────────────────────────────────────

const EMPTY_TOOL = {
  name: '', description: '', method: 'GET' as AgentTool['method'],
  url: '', headers: {} as Record<string, string>, body_template: null as Record<string, unknown> | null,
  parameters: [] as AgentTool['parameters'], response_hint: '', enabled: true,
}

function ToolForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<typeof EMPTY_TOOL>
  onSave: (data: typeof EMPTY_TOOL) => Promise<void>
  onCancel: () => void
}) {
  const [form, setForm] = useState({ ...EMPTY_TOOL, ...initial })
  const [saving, setSaving] = useState(false)
  const [headersText, setHeadersText] = useState(
    initial?.headers ? JSON.stringify(initial.headers, null, 2) : '{}'
  )
  const [paramsText, setParamsText] = useState(
    initial?.parameters ? JSON.stringify(initial.parameters, null, 2) : '[]'
  )

  const handleSave = async () => {
    let headers: Record<string, string> = {}
    let parameters: AgentTool['parameters'] = []
    try { headers = JSON.parse(headersText) } catch { /* keep empty */ }
    try { parameters = JSON.parse(paramsText) } catch { /* keep empty */ }
    setSaving(true)
    try {
      await onSave({ ...form, headers, parameters })
    } finally {
      setSaving(false)
    }
  }

  const field = (label: string, node: React.ReactNode, hint?: string) => (
    <div>
      <label className="block text-xs font-medium text-surface-400 mb-1.5">{label}</label>
      {node}
      {hint && <p className="text-xs text-surface-600 mt-1">{hint}</p>}
    </div>
  )

  const inputCls = "w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition"
  const textareaCls = "w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 text-sm text-surface-100 placeholder:text-surface-600 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition"

  return (
    <div className="space-y-4 bg-surface-900/60 border border-surface-800/60 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Wrench className="w-4 h-4 text-brand-400" />
        <p className="text-sm font-medium text-surface-200">{initial?.name ? 'Editar ferramenta' : 'Nova ferramenta'}</p>
      </div>

      {field('Nome interno', (
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value.replace(/\s/g, '_') }))}
          placeholder="verificar_disponibilidade" className={inputCls} />
      ), 'Sem espaços. O agente usa este nome para chamar a ferramenta.')}

      {field('Descrição', (
        <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Verifica a disponibilidade de horários no sistema de agendamento" className={inputCls} />
      ), 'O agente lê essa descrição para decidir quando e por que usar a ferramenta.')}

      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1.5">Método</label>
          <select
            value={form.method}
            onChange={e => setForm(f => ({ ...f, method: e.target.value as AgentTool['method'] }))}
            className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition"
          >
            {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const).map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="col-span-3">
          {field('URL do endpoint', (
            <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder="https://api.seudominio.com/horarios?data={{params.data}}" className={inputCls} />
          ))}
        </div>
      </div>

      {field('Headers HTTP', (
        <textarea value={headersText} onChange={e => setHeadersText(e.target.value)}
          rows={3} placeholder={'{\n  "Authorization": "Bearer {{secrets.api_key}}"\n}'} className={textareaCls} />
      ), 'JSON. Use {{secrets.nome}} para referenciar chaves de API armazenadas de forma segura.')}

      {field('Parâmetros', (
        <textarea value={paramsText} onChange={e => setParamsText(e.target.value)}
          rows={4} placeholder={'[\n  {"name": "data", "type": "string", "required": true, "description": "Data no formato YYYY-MM-DD"}\n]'} className={textareaCls} />
      ), 'JSON. Parâmetros que o agente pode preencher ao chamar a ferramenta.')}

      {field('Dica de resposta (opcional)', (
        <input value={form.response_hint ?? ''} onChange={e => setForm(f => ({ ...f, response_hint: e.target.value }))}
          placeholder="Retorna lista de horários disponíveis como array de strings" className={inputCls} />
      ), 'Orienta o agente sobre o que esperar na resposta da API.')}

      <div className="flex items-center gap-2 pt-2">
        <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-xl border border-surface-700 text-sm text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition">
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={!form.name || !form.url || saving}
          className="flex-1 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-surface-950 text-sm font-medium transition"
        >
          {saving ? 'Salvando…' : 'Salvar ferramenta'}
        </button>
      </div>
    </div>
  )
}

// ─── Tab: Tools ───────────────────────────────────────────────────────────────

function ToolsTab({
  agent,
  onToolsChange,
}: {
  agent: AgentConfigWithTools
  onToolsChange: (tools: AgentTool[]) => void
}) {
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleAdd = async (data: typeof EMPTY_TOOL) => {
    const tool = await addTool(agent.id, data)
    onToolsChange([...agent.tools, tool])
    setAdding(false)
  }

  const handleEdit = async (toolId: string, data: typeof EMPTY_TOOL) => {
    const tool = await updateTool(agent.id, toolId, data)
    onToolsChange(agent.tools.map(t => t.id === toolId ? tool : t))
    setEditingId(null)
  }

  const handleToggle = async (tool: AgentTool) => {
    setTogglingId(tool.id)
    try {
      const updated = await updateTool(agent.id, tool.id, { enabled: !tool.enabled })
      onToolsChange(agent.tools.map(t => t.id === tool.id ? updated : t))
    } finally {
      setTogglingId(null)
    }
  }

  const [deleteToolTarget, setDeleteToolTarget] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deleteToolTarget) return
    setDeletingId(deleteToolTarget)
    try {
      await deleteTool(agent.id, deleteToolTarget)
      onToolsChange(agent.tools.filter(t => t.id !== deleteToolTarget))
    } finally {
      setDeletingId(null)
      setDeleteToolTarget(null)
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-surface-500">
            {agent.tools.length === 0
              ? 'Nenhuma ferramenta conectada'
              : `${agent.tools.length} ferramenta(s) — APIs que o agente pode chamar`}
          </p>
        </div>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600/15 hover:bg-brand-600/25 text-brand-400 text-xs font-medium ring-1 ring-brand-500/25 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar
          </button>
        )}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <ToolForm onSave={handleAdd} onCancel={() => setAdding(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tool cards */}
      {agent.tools.length === 0 && !adding && (
        <div className="flex flex-col items-center gap-3 py-12 border border-dashed border-surface-800 rounded-xl">
          <Wrench className="w-8 h-8 text-surface-700" />
          <div className="text-center">
            <p className="text-sm text-surface-500">Nenhuma ferramenta configurada</p>
            <p className="text-xs text-surface-600 mt-0.5">Conecte APIs externas para o agente consultar seus sistemas</p>
          </div>
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600/15 text-brand-400 text-xs font-medium ring-1 ring-brand-500/25 hover:bg-brand-600/25 transition">
            <Plus className="w-3.5 h-3.5" /> Adicionar ferramenta
          </button>
        </div>
      )}

      <div className="space-y-2">
        {agent.tools.map(tool => (
          <motion.div key={tool.id} layout className="bg-surface-900/60 border border-surface-800/60 rounded-xl overflow-hidden">
            {editingId === tool.id ? (
              <ToolForm
                initial={{
                  name: tool.name, description: tool.description, method: tool.method,
                  url: tool.url, headers: tool.headers, body_template: tool.body_template,
                  parameters: tool.parameters, response_hint: tool.response_hint ?? '',
                  enabled: tool.enabled,
                }}
                onSave={(data) => handleEdit(tool.id, data)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                {/* Tool header row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-md ring-1 font-mono', METHOD_COLOR[tool.method])}>
                    {tool.method}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-semibold font-mono', tool.enabled ? 'text-surface-100' : 'text-surface-500')}>
                      {tool.name}
                    </p>
                    <p className="text-xs text-surface-500 truncate">{tool.description}</p>
                  </div>
                  {/* Enable toggle */}
                  <button
                    onClick={() => handleToggle(tool)}
                    disabled={togglingId === tool.id}
                    className="p-1 rounded-lg hover:bg-surface-800 transition text-surface-500 hover:text-surface-200"
                    title={tool.enabled ? 'Desativar' : 'Ativar'}
                  >
                    {tool.enabled
                      ? <ToggleRight className="w-5 h-5 text-status-active" />
                      : <ToggleLeft  className="w-5 h-5" />
                    }
                  </button>
                  <button onClick={() => setEditingId(tool.id)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-200 transition">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteToolTarget(tool.id)}
                    disabled={deletingId === tool.id}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-surface-600 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setExpandedId(expandedId === tool.id ? null : tool.id)} className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-600 hover:text-surface-300 transition">
                    {expandedId === tool.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {expandedId === tool.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden border-t border-surface-800/60"
                    >
                      <div className="px-4 py-3 space-y-3">
                        <div className="flex items-center gap-2 text-xs">
                          <Link2 className="w-3.5 h-3.5 text-surface-600" />
                          <span className="text-surface-500">URL:</span>
                          <code className="text-surface-300 break-all">{tool.url}</code>
                        </div>

                        {Object.keys(tool.headers).length > 0 && (
                          <div>
                            <p className="text-xs text-surface-500 mb-1">Headers</p>
                            <pre className="text-xs text-surface-400 bg-surface-950/60 rounded-lg px-3 py-2 overflow-x-auto">
                              {JSON.stringify(tool.headers, null, 2)}
                            </pre>
                          </div>
                        )}

                        {tool.parameters.length > 0 && (
                          <div>
                            <p className="text-xs text-surface-500 mb-1.5">Parâmetros</p>
                            <div className="space-y-1">
                              {tool.parameters.map((p, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs">
                                  <code className="text-brand-300 font-mono">{p.name}</code>
                                  <span className="text-surface-700">·</span>
                                  <span className="text-surface-600">{p.type}</span>
                                  {p.required && <span className="text-status-pending text-[10px] px-1 bg-status-pending-bg rounded">obrigatório</span>}
                                  <span className="text-surface-500">—</span>
                                  <span className="text-surface-400">{p.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {tool.response_hint && (
                          <div className="flex items-start gap-2 text-xs">
                            <AlertCircle className="w-3.5 h-3.5 text-surface-600 flex-shrink-0 mt-0.5" />
                            <span className="text-surface-500">{tool.response_hint}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        ))}
      </div>

      <ConfirmModal
        open={!!deleteToolTarget}
        onClose={() => setDeleteToolTarget(null)}
        onConfirm={handleDelete}
        title="Remover ferramenta"
        description="Esta ação é irreversível. A integração com esta ferramenta será removida permanentemente do agente."
        confirmLabel="Remover ferramenta"
        danger
        loading={!!deletingId}
      />
    </div>
  )
}

// ─── Tab: Handoff ─────────────────────────────────────────────────────────────
// Auto-saves on every change (matching Tools and FAQs). The previous UX
// asked the operator to click a separate "Salvar regras" button, which was
// silently ignored often enough that rules weren't being persisted — the
// agent_configs.handoff_rules JSONB stayed empty even after the UI
// suggested a rule had been created. Small "salvando / salvo" indicator
// replaces the explicit button.

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function HandoffTab({ agent, onUpdate }: { agent: AgentConfigWithTools; onUpdate: (a: AgentConfig) => void }) {
  const currentRules: HandoffRule[] = useMemo(
    () => agent.handoff_rules?.rules ?? [],
    [agent.handoff_rules],
  )
  const [localRules, setLocalRules] = useState<HandoffRule[]>(currentRules)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Keep local state in sync when the parent reloads the agent (e.g. after
  // a refresh or when switching agents).
  useEffect(() => { setLocalRules(currentRules) }, [currentRules])

  // Debounced auto-save: every edit schedules a PATCH, newer edits cancel
  // the pending one. 300ms is short enough that it feels instant while
  // avoiding a flurry of requests when the user is rapidly toggling rows.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleSave = useCallback((next: HandoffRule[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      setStatus('saving')
      setErrorMessage(null)
      try {
        const updated = await updateAgent(agent.id, { handoff_rules: { rules: next } })
        onUpdate(updated)
        setStatus('saved')
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
        savedTimerRef.current = setTimeout(() => setStatus('idle'), 1500)
      } catch (err) {
        setStatus('error')
        setErrorMessage(err instanceof Error ? err.message : 'Erro ao salvar')
      }
    }, 300)
  }, [agent.id, onUpdate])

  const handleRulesChange = useCallback((next: HandoffRule[]) => {
    setLocalRules(next)
    scheduleSave(next)
  }, [scheduleSave])

  // Cleanup pending timers on unmount so a late save doesn't fire after
  // the component is gone.
  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
  }, [])

  return (
    <div className="flex flex-col h-full gap-3">
      <HandoffRulesPanel
        rules={localRules}
        onChange={handleRulesChange}
      />

      {/* Small status strip — replaces the old manual "Salvar regras" button.
          Reserves 20px of vertical space so the layout doesn't shift on state
          changes; only renders content when something is happening. */}
      <div className="flex items-center justify-end h-5 flex-shrink-0 text-[11px]" aria-live="polite">
        {status === 'saving' && (
          <span className="inline-flex items-center gap-1.5 text-surface-500">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Salvando…
          </span>
        )}
        {status === 'saved' && (
          <span className="inline-flex items-center gap-1.5 text-status-active">
            <Check className="w-3 h-3" />
            Salvo automaticamente
          </span>
        )}
        {status === 'error' && (
          <span className="inline-flex items-center gap-1.5 text-red-400">
            <AlertCircle className="w-3 h-3" />
            Falha ao salvar{errorMessage ? `: ${errorMessage}` : ''}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Knowledge Base Tab ──────────────────────────────────────────────────────

function DocStatusBadge({ status }: { status: string }) {
  if (status === 'ready') return (
    <span className="inline-flex items-center gap-1 text-[10px] text-status-active px-1.5 py-0.5 bg-status-active-bg border border-status-active-border rounded">
      <CheckCircle2 className="w-3 h-3" />Pronto
    </span>
  )
  if (status === 'processing') return (
    <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded">
      <Loader2 className="w-3 h-3 animate-spin" />Processando
    </span>
  )
  if (status === 'error') return (
    <span className="inline-flex items-center gap-1 text-[10px] text-red-400 px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded">
      <AlertCircle className="w-3 h-3" />Erro
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-surface-500 px-1.5 py-0.5 bg-surface-800 border border-surface-700 rounded">
      <Clock className="w-3 h-3" />Pendente
    </span>
  )
}

const KB_UPLOAD_STEPS = [
  'Lendo arquivo...',
  'Extraindo conteúdo com IA...',
  'Analisando estrutura do documento...',
  'Processando texto extraído...',
  'Indexando na base de conhecimento...',
  'Gerando embeddings vetoriais...',
]

function KBUploadProgress({ fileName }: { fileName: string }) {
  const [step, setStep] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const stepTimer = setInterval(() => setStep(s => (s + 1) % KB_UPLOAD_STEPS.length), 6000)
    const tick = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => { clearInterval(stepTimer); clearInterval(tick) }
  }, [])

  const progress = Math.min(95, elapsed * 1.2)

  return (
    <div className="p-3 bg-surface-900/60 border border-surface-800 rounded-xl space-y-2">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-brand-400 flex-shrink-0" />
        <p className="text-xs text-surface-200 font-medium truncate">{fileName}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="relative w-3.5 h-3.5 flex-shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-brand-500/30" />
          <div className="absolute inset-0 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
        </div>
        <p className="text-[11px] text-brand-400 transition-all duration-500">{KB_UPLOAD_STEPS[step]}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-surface-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-surface-600 tabular-nums w-8 text-right">{elapsed}s</span>
      </div>
    </div>
  )
}

function KnowledgeBaseTab({ agent }: { agent: AgentConfigWithTools }) {
  const [docs, setDocs] = useState<AgentKnowledgeDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingFile, setUploadingFile] = useState<string | null>(null) // file name being uploaded
  const [textInput, setTextInput] = useState('')
  const [textName, setTextName] = useState('')
  const [editingDocId, setEditingDocId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [updatingDocId, setUpdatingDocId] = useState<string | null>(null)
  const [textModalOpen, setTextModalOpen] = useState(false)
  const [addingText, setAddingText] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const updateFileRef = useRef<HTMLInputElement>(null)

  const loadDocs = useCallback(async () => {
    setLoading(true)
    try {
      const list = await listAgentKnowledge(agent.id)
      setDocs(list)
    } finally {
      setLoading(false)
    }
  }, [agent.id])

  useEffect(() => { void loadDocs() }, [loadDocs])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(file.name)
    try {
      const isText = file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')
      let content: string
      let contentType: 'base64' | 'text'

      if (isText) {
        content = await file.text()
        contentType = 'text'
      } else {
        const buffer = await file.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        let binary = ''
        for (let j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j])
        content = btoa(binary)
        contentType = 'base64'
      }

      const extracted = await extractBrandFile(file.name, file.type || 'text/plain', content, contentType)
      const docId = `kb-${Date.now()}`
      const newDoc = await addAgentKnowledge(agent.id, {
        document_id: docId,
        document_name: file.name,
        content: extracted,
        source_type: 'file',
      })
      await loadDocs()
      // Auto-open the artifact editor for the newly uploaded doc
      setEditContent(extracted)
      setEditingDocId(newDoc.id)
    } catch (err) {
      console.error('[KB upload]', err)
    } finally {
      setUploadingFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleAddText = async () => {
    const trimmed = textInput.trim()
    if (!trimmed) return
    setAddingText(true)
    try {
      const docId = `kb-text-${Date.now()}`
      await addAgentKnowledge(agent.id, {
        document_id: docId,
        document_name: textName.trim() || `Texto-${docs.length + 1}`,
        content: trimmed,
        source_type: 'text',
      })
      setTextInput('')
      setTextName('')
      setTextModalOpen(false)
      await loadDocs()
      // No auto-open of the viewer: the user just composed the text in the
      // dedicated modal, so they already saw what was saved.
    } catch (err) {
      console.error('[KB text]', err)
    } finally {
      setAddingText(false)
    }
  }

  const [deleteDocTarget, setDeleteDocTarget] = useState<string | null>(null)
  const [deletingDoc, setDeletingDoc] = useState(false)

  const handleDelete = async () => {
    if (!deleteDocTarget) return
    setDeletingDoc(true)
    try {
      await deleteAgentKnowledge(agent.id, deleteDocTarget)
      setDocs(prev => prev.filter(d => d.id !== deleteDocTarget))
    } catch (err) {
      console.error('[KB delete]', err)
    } finally {
      setDeletingDoc(false)
      setDeleteDocTarget(null)
    }
  }

  const handleEdit = async (docId: string) => {
    if (editingDocId === docId) { setEditingDocId(null); return }
    setEditLoading(true)
    try {
      const full = await getAgentKnowledgeDoc(agent.id, docId)
      setEditContent(full.content ?? '')
      setEditingDocId(docId)
    } catch (err) {
      console.error('[KB edit]', err)
    } finally {
      setEditLoading(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingDocId) return
    setEditLoading(true)
    try {
      await updateAgentKnowledge(agent.id, editingDocId, { content: editContent })
      setEditingDocId(null)
      await loadDocs()
    } catch (err) {
      console.error('[KB save-edit]', err)
    } finally {
      setEditLoading(false)
    }
  }

  const handleUpdateFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !updatingDocId) return
    const targetDocId = updatingDocId
    setUploadingFile(file.name)
    try {
      const isText = file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')
      let content: string
      let contentType: 'base64' | 'text'
      if (isText) { content = await file.text(); contentType = 'text' }
      else {
        const buf = await file.arrayBuffer()
        const bytes = new Uint8Array(buf)
        let binary = ''
        for (let j = 0; j < bytes.length; j++) binary += String.fromCharCode(bytes[j])
        content = btoa(binary)
        contentType = 'base64'
      }
      const extracted = await extractBrandFile(file.name, file.type || 'text/plain', content, contentType)
      await updateAgentKnowledge(agent.id, targetDocId, { content: extracted, document_name: file.name })
      setUpdatingDocId(null)
      await loadDocs()
      setEditContent(extracted)
      setEditingDocId(targetDocId)
    } catch (err) {
      console.error('[KB update]', err)
    } finally {
      setUploadingFile(null)
      if (updateFileRef.current) updateFileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-brand-400" />
          Base de Conhecimento
        </h3>
        <p className="text-xs text-surface-500 mt-1">
          Documentos e textos que o agente usa como referência (RAG).
        </p>
      </div>

      {/* Hidden file inputs (kept above the grid so the refs stay valid) */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.webp"
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        ref={updateFileRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.webp"
        onChange={handleUpdateFile}
        className="hidden"
      />

      {/* Side-by-side: file dropzone (left) + paste-text composer (right).
          A vertical divider + a short intro on each side make the two paths
          self-explanatory: file = "extract from existing material",
          text = "type/paste short instructions directly". */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-8 items-stretch">
        {/* ── Left: file upload ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 min-h-[200px]">
          <div>
            <p className="text-xs font-semibold text-surface-200">Enviar arquivo</p>
            <p className="text-[11px] text-surface-500 mt-0.5 leading-relaxed">
              Para documentos que você já tem. Extraímos texto de PDF, DOCX, imagens e arquivos de texto automaticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!!uploadingFile}
            className="flex-1 flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed border-surface-700 hover:border-brand-500/40 text-surface-400 hover:text-brand-400 text-xs font-medium transition disabled:opacity-50"
          >
            <FileUp className="w-7 h-7" />
            <span>Clique para selecionar</span>
            <span className="text-[10px] text-surface-600 font-normal">PDF, DOCX, TXT, MD, PNG, JPG, WEBP</span>
          </button>
        </div>

        {/* ── Vertical divider ──────────────────────────────────────────── */}
        <div className="w-px bg-surface-800" aria-hidden />

        {/* ── Right: manual text composer (button → modal) ──────────────── */}
        <div className="flex flex-col gap-3 min-h-[200px]">
          <div>
            <p className="text-xs font-semibold text-surface-200">Adicionar texto</p>
            <p className="text-[11px] text-surface-500 mt-0.5 leading-relaxed">
              Para instruções, FAQs ou trechos curtos. Abra o editor para colar e revisar antes de salvar — vai direto pra base, sem extração.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTextModalOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed border-surface-700 hover:border-brand-500/40 text-surface-400 hover:text-brand-400 text-xs font-medium transition"
          >
            <Plus className="w-7 h-7" />
            <span>Abrir editor de texto</span>
            <span className="text-[10px] text-surface-600 font-normal">Cole instruções, FAQs ou notas</span>
          </button>
        </div>
      </div>

      {/* Upload progress */}
      {uploadingFile && <KBUploadProgress fileName={uploadingFile} />}

      {/* Document list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-5 h-5 text-surface-700 animate-spin" />
        </div>
      ) : docs.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-surface-400">{docs.length} documento(s)</p>
          {docs.map(doc => {
            const isLoadingThis = editLoading && editingDocId === doc.id && editContent === ''
            const previewText = (doc.content_preview ?? '').split('\n').slice(0, 8).join('\n').trim()
            return (
              <div key={doc.id} className="bg-surface-900/60 border border-surface-800 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-surface-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-surface-200 font-medium truncate">{doc.document_name}</p>
                      <DocStatusBadge status={doc.status} />
                    </div>
                    <p className="text-[10px] text-surface-600">{doc.source_type}  ·  {new Date(doc.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleEdit(doc.id)}
                    disabled={isLoadingThis}
                    title="Visualizar / Editar conteúdo"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] bg-surface-700 text-surface-200 hover:bg-surface-600 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {isLoadingThis ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <><Eye className="w-3 h-3" /> Visualizar</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUpdatingDocId(doc.id); updateFileRef.current?.click() }}
                    title="Atualizar arquivo"
                    className="p-1 rounded text-surface-600 hover:text-brand-400 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button" onClick={() => setDeleteDocTarget(doc.id)}
                    title="Excluir"
                    className="p-1 rounded text-surface-600 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {previewText && (
                  <div className="mt-3 pt-3 border-t border-surface-800/60">
                    <pre className="text-[11px] text-surface-500 leading-relaxed whitespace-pre-wrap break-words font-sans line-clamp-[8]">
                      {previewText}
                    </pre>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <FileUp className="w-8 h-8 text-surface-700" />
          <p className="text-xs text-surface-600">Nenhum documento adicionado. Envie arquivos ou cole textos acima.</p>
        </div>
      )}

      <ConfirmModal
        open={!!deleteDocTarget}
        onClose={() => setDeleteDocTarget(null)}
        onConfirm={handleDelete}
        title="Excluir documento"
        description="Esta ação é irreversível. O documento e todos os chunks indexados serão removidos da base de conhecimento do agente."
        confirmLabel="Excluir documento"
        danger
        loading={deletingDoc}
      />

      {/* Full-screen viewer/editor modal — opens when the user clicks Visualizar
          on a doc card. Hosts the existing KnowledgeDocArtifact (Visualizar /
          Editar toggle + Save/Cancel) inside a wide centered modal. */}
      <Modal
        open={editingDocId !== null}
        onClose={() => setEditingDocId(null)}
        title={docs.find(d => d.id === editingDocId)?.document_name ?? 'Documento'}
        className="max-w-3xl"
      >
        <KnowledgeDocArtifact
          title=""
          content={editContent}
          onChange={setEditContent}
          onSave={handleSaveEdit}
          onCancel={() => setEditingDocId(null)}
          saving={editLoading}
        />
      </Modal>

      {/* Composer modal — opens from the "Abrir editor de texto" button.
          Provides ample space for pasting and reviewing before save, mirroring
          the centered fullscreen pattern used by PromptReviewModal. */}
      <Modal
        open={textModalOpen}
        onClose={() => setTextModalOpen(false)}
        title="Adicionar texto à base de conhecimento"
        className="max-w-3xl"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-surface-400 mb-1">
              Nome do documento <span className="text-surface-600 font-normal">(opcional)</span>
            </label>
            <input
              value={textName}
              onChange={e => setTextName(e.target.value)}
              placeholder='Ex: "Política de devolução", "FAQ de atendimento"…'
              className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-surface-400 mb-1">Conteúdo</label>
            <textarea
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              rows={14}
              placeholder="Cole o texto que o agente deve conhecer..."
              className="w-full bg-surface-900 border border-surface-700 rounded-xl px-3 py-2 text-xs text-surface-200 placeholder:text-surface-600 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition font-mono leading-relaxed"
            />
            <p className="text-right text-[10px] text-surface-600 mt-1">
              {textInput.length.toLocaleString()} caracteres
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-surface-800">
            <button
              type="button"
              onClick={() => setTextModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800 transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAddText}
              disabled={!textInput.trim() || addingText}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 text-surface-950 hover:bg-brand-500 disabled:opacity-40 transition"
            >
              {addingText ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              {addingText ? 'Adicionando…' : 'Adicionar à base'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Rules Tab (unified wrapper) ─────────────────────────────────────────────
// Single operator-facing tab that groups "Respostas rápidas" (FAQ keyword
// bypass) and "Roteamento" (Handoff rules). Backend schemas, APIs and
// runtime behaviour remain 100% independent — this is purely a UI grouping
// so the operator sees one place for "when a message arrives, what happens
// BEFORE the LLM gets called".
//
// subTab state is lifted to the parent (AgentDetail) because the outer
// layout toggles between scroll and flex-contained depending on which
// panel is active (Handoff needs flex-col for its sticky save bar; FAQ
// needs overflow-y-auto for a long list of rules).

type RulesSubTab = 'faqs' | 'handoff'

function RulesTab({
  agent,
  onUpdate,
  subTab,
  onSubTabChange,
}: {
  agent: AgentConfigWithTools
  onUpdate: (a: AgentConfig) => void
  subTab: RulesSubTab
  onSubTabChange: (s: RulesSubTab) => void
}) {
  const subTabs: Array<{ id: RulesSubTab; label: string; icon: React.ReactNode; hint: string }> = [
    {
      id: 'faqs',
      label: 'Respostas rápidas',
      icon: <MessageCircleQuestion className="w-3.5 h-3.5" />,
      hint: 'Responde automaticamente a saudações e perguntas frequentes por palavra-chave, sem consumir créditos de IA. O agente continua disponível para o resto da conversa.',
    },
    {
      id: 'handoff',
      label: 'Roteamento',
      icon: <Shield className="w-3.5 h-3.5" />,
      hint: 'Transfere a conversa para um atendente humano, redireciona para outro canal ou envia uma resposta final quando o agente NÃO deve continuar atendendo.',
    },
  ]

  const activeHint = subTabs.find(t => t.id === subTab)?.hint ?? ''

  return (
    <div className={cn('flex flex-col gap-4', subTab === 'handoff' && 'h-full min-h-0')}>
      {/* Sub-tab selector (pill style, nested inside the main tab area) */}
      <div className="flex items-center gap-1 p-1 bg-surface-900/60 border border-surface-800/60 rounded-xl w-fit flex-shrink-0">
        {subTabs.map(t => (
          <button
            key={t.id}
            onClick={() => onSubTabChange(t.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              subTab === t.id
                ? 'bg-surface-800 text-surface-100 ring-1 ring-surface-700'
                : 'text-surface-500 hover:text-surface-300 hover:bg-surface-900',
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Contextual banner — explains the difference so operators don't confuse
          the two panels. Same layout for both sub-tabs, content swaps. */}
      <div className="flex items-start gap-2.5 px-3 py-2.5 bg-brand-600/5 border border-brand-500/15 rounded-xl flex-shrink-0">
        <Info className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-surface-400 leading-relaxed">{activeHint}</p>
      </div>

      {/* Active sub-tab content */}
      <div className={cn(
        subTab === 'handoff' ? 'flex flex-col flex-1 min-h-0' : 'min-h-0',
      )}>
        {subTab === 'faqs'    && <FaqRulesTab agent={agent} />}
        {subTab === 'handoff' && <HandoffTab agent={agent} onUpdate={onUpdate} />}
      </div>
    </div>
  )
}

// ─── FAQ Rules Tab ────────────────────────────────────────────────────────────
// Keyword rules that short-circuit the LLM with a static template.
// Matches the patterns used by ToolsTab: inline add/edit form, expand/collapse
// per row, toggle + delete + edit buttons, optimistic updates.

const EMPTY_FAQ: FaqRuleDraft = {
  name: '',
  keywords: [],
  match_mode: 'any_keyword',
  response_template: '',
  priority: 0,
  enabled: true,
  cooldown_minutes: 0,
}

const FAQ_MATCH_MODE_LABEL: Record<FaqMatchMode, string> = {
  any_keyword: 'Qualquer palavra',
  all_keywords: 'Todas as palavras',
  exact: 'Mensagem exata',
}

function FaqRuleForm({
  initial = EMPTY_FAQ,
  onSave,
  onCancel,
}: {
  initial?: FaqRuleDraft
  onSave: (draft: FaqRuleDraft) => Promise<void>
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<FaqRuleDraft>(initial)
  const [keywordsText, setKeywordsText] = useState(initial.keywords.join(', '))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    const keywords = keywordsText
      .split(',')
      .map(k => k.trim())
      .filter(Boolean)
    if (!draft.name.trim()) return setError('Dê um nome à regra')
    if (keywords.length === 0) return setError('Adicione ao menos uma palavra-chave')
    if (!draft.response_template.trim()) return setError('Escreva a resposta automática')

    setError(null)
    setSaving(true)
    try {
      await onSave({ ...draft, keywords, name: draft.name.trim(), response_template: draft.response_template.trim() })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-surface-900/60 border border-brand-500/30 rounded-xl p-4 space-y-3">
      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-surface-400 mb-1">Nome da regra</label>
        <input
          value={draft.name}
          onChange={e => setDraft({ ...draft, name: e.target.value })}
          placeholder="Ex: Saudações, Horário de funcionamento…"
          className="w-full bg-surface-950 border border-surface-800 rounded-lg px-3 py-1.5 text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>

      {/* Keywords */}
      <div>
        <label className="block text-xs font-medium text-surface-400 mb-1">
          Palavras-chave <span className="text-surface-600">(separadas por vírgula)</span>
        </label>
        <input
          value={keywordsText}
          onChange={e => setKeywordsText(e.target.value)}
          placeholder="oi, olá, bom dia, boa tarde"
          className="w-full bg-surface-950 border border-surface-800 rounded-lg px-3 py-1.5 text-sm text-surface-100 font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>

      {/* Match mode + priority */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-surface-400 mb-1">Modo de match</label>
          <select
            value={draft.match_mode}
            onChange={e => setDraft({ ...draft, match_mode: e.target.value as FaqMatchMode })}
            className="w-full bg-surface-950 border border-surface-800 rounded-lg px-3 py-1.5 text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          >
            {(Object.keys(FAQ_MATCH_MODE_LABEL) as FaqMatchMode[]).map(m => (
              <option key={m} value={m}>{FAQ_MATCH_MODE_LABEL[m]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1">Prioridade</label>
          <input
            type="number"
            value={draft.priority}
            onChange={e => setDraft({ ...draft, priority: parseInt(e.target.value, 10) || 0 })}
            className="w-full bg-surface-950 border border-surface-800 rounded-lg px-3 py-1.5 text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>
      </div>

      {/* Response template */}
      <div>
        <label className="block text-xs font-medium text-surface-400 mb-1">
          Resposta automática <span className="text-surface-600">(use {'{{nome}}'}, {'{{empresa}}'}, {'{{telefone}}'})</span>
        </label>
        <textarea
          value={draft.response_template}
          onChange={e => setDraft({ ...draft, response_template: e.target.value })}
          rows={3}
          placeholder="Olá {{nome}}! Como posso ajudar?"
          className="w-full bg-surface-950 border border-surface-800 rounded-lg px-3 py-2 text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>

      {/* Cooldown */}
      <div>
        <label className="block text-xs font-medium text-surface-400 mb-1">
          Cooldown <span className="text-surface-600">(minutos antes de repetir esta resposta para o mesmo contato; 0 = sem cooldown)</span>
        </label>
        <input
          type="number"
          min={0}
          value={draft.cooldown_minutes}
          onChange={e => setDraft({ ...draft, cooldown_minutes: Math.max(0, parseInt(e.target.value, 10) || 0) })}
          className="w-32 bg-surface-950 border border-surface-800 rounded-lg px-3 py-1.5 text-sm text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-medium transition disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salvar
        </button>
      </div>
    </div>
  )
}

function FaqRulesTab({ agent }: { agent: AgentConfigWithTools }) {
  const [rules, setRules] = useState<FaqRule[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await listFaqRules(agent.id)
        if (!cancelled) setRules(list)
      } catch (err) {
        console.error('[faq] list failed', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [agent.id])

  const handleAdd = async (draft: FaqRuleDraft) => {
    const created = await addFaqRule(agent.id, draft)
    setRules(prev => [...prev, created].sort((a, b) => b.priority - a.priority))
    setAdding(false)
  }

  const handleEdit = async (faqId: string, draft: FaqRuleDraft) => {
    const updated = await updateFaqRule(agent.id, faqId, draft)
    setRules(prev => prev.map(r => r.id === faqId ? updated : r).sort((a, b) => b.priority - a.priority))
    setEditingId(null)
  }

  const handleToggle = async (rule: FaqRule) => {
    setTogglingId(rule.id)
    try {
      const updated = await updateFaqRule(agent.id, rule.id, { enabled: !rule.enabled })
      setRules(prev => prev.map(r => r.id === rule.id ? updated : r))
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteFaqRule(agent.id, deleteTarget)
      setRules(prev => prev.filter(r => r.id !== deleteTarget))
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-surface-500">
          {loading
            ? 'Carregando regras…'
            : rules.length === 0
              ? 'Nenhuma regra — o agente responde tudo via IA'
              : `${rules.length} regra(s) — respostas instantâneas sem chamar a IA`}
        </p>
        {!adding && !loading && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600/15 hover:bg-brand-600/25 text-brand-400 text-xs font-medium ring-1 ring-brand-500/25 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar FAQ
          </button>
        )}
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <FaqRuleForm onSave={handleAdd} onCancel={() => setAdding(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && rules.length === 0 && !adding && (
        <div className="flex flex-col items-center gap-3 py-12 border border-dashed border-surface-800 rounded-xl">
          <MessageCircleQuestion className="w-8 h-8 text-surface-700" />
          <div className="text-center">
            <p className="text-sm text-surface-500">Nenhuma FAQ configurada</p>
            <p className="text-xs text-surface-600 mt-0.5">Crie respostas automáticas para saudações, horários, políticas — economiza IA</p>
          </div>
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600/15 text-brand-400 text-xs font-medium ring-1 ring-brand-500/25 hover:bg-brand-600/25 transition"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar primeira FAQ
          </button>
        </div>
      )}

      <div className="space-y-2">
        {rules.map(rule => (
          <motion.div key={rule.id} layout className="bg-surface-900/60 border border-surface-800/60 rounded-xl overflow-hidden">
            {editingId === rule.id ? (
              <FaqRuleForm
                initial={{
                  name: rule.name,
                  keywords: rule.keywords,
                  match_mode: rule.match_mode,
                  response_template: rule.response_template,
                  priority: rule.priority,
                  enabled: rule.enabled,
                  cooldown_minutes: rule.cooldown_minutes,
                }}
                onSave={(d) => handleEdit(rule.id, d)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-start gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={cn('text-sm font-semibold', rule.enabled ? 'text-surface-100' : 'text-surface-500')}>
                      {rule.name}
                    </p>
                    <span className="text-[10px] uppercase tracking-wide text-surface-600 bg-surface-800/60 px-1.5 py-0.5 rounded">
                      {FAQ_MATCH_MODE_LABEL[rule.match_mode]}
                    </span>
                    {rule.priority !== 0 && (
                      <span className="text-[10px] text-surface-600">prio {rule.priority}</span>
                    )}
                    {rule.cooldown_minutes > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-surface-600">
                        <Clock className="w-3 h-3" /> {rule.cooldown_minutes}min
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-surface-500 font-mono truncate">
                    {rule.keywords.slice(0, 5).join(', ')}
                    {rule.keywords.length > 5 && ` +${rule.keywords.length - 5}`}
                  </p>
                  <p className="text-xs text-surface-400 mt-1 line-clamp-2 italic">
                    “{rule.response_template}”
                  </p>
                </div>
                <button
                  onClick={() => handleToggle(rule)}
                  disabled={togglingId === rule.id}
                  className="p-1 rounded-lg hover:bg-surface-800 transition text-surface-500 hover:text-surface-200 mt-0.5"
                  title={rule.enabled ? 'Desativar' : 'Ativar'}
                >
                  {rule.enabled
                    ? <ToggleRight className="w-5 h-5 text-status-active" />
                    : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => setEditingId(rule.id)}
                  className="p-1.5 rounded-lg hover:bg-surface-800 text-surface-500 hover:text-surface-200 transition mt-0.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteTarget(rule.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-surface-600 hover:text-red-400 transition mt-0.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remover FAQ"
        description="A regra será removida e o agente voltará a responder essas mensagens via IA."
        confirmLabel="Remover FAQ"
        danger
        loading={deleting}
      />
    </div>
  )
}

// ─── Metrics Tab (tool executions dashboard) ─────────────────────────────────
// Reads GET /metrics/tools. Admin-only on the backend — this component fails
// gracefully when the caller lacks access or the FF_AGENT_AUDIT_LOG flag is
// off (returns an empty/error state instead of crashing).

function MetricsTab({ agent: _agent }: { agent: AgentConfigWithTools }) {
  const [rows, setRows] = useState<ToolMetricRow[]>([])
  const [windowDays, setWindowDays] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (days: number) => {
    setError(null)
    try {
      const resp = await getToolMetrics(days)
      setRows(resp.tools)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar métricas')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    load(windowDays).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [windowDays, load])

  const handleRefresh = async () => {
    setRefreshing(true)
    try { await load(windowDays) } finally { setRefreshing(false) }
  }

  const totals = rows.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      successes: acc.successes + r.successes,
      failures: acc.failures + r.failures,
    }),
    { total: 0, successes: 0, failures: 0 },
  )
  const successRate = totals.total > 0
    ? Math.round((totals.successes / totals.total) * 1000) / 10
    : null

  return (
    <div className="space-y-4">
      {/* Header with window selector + refresh */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-surface-500">
            Execução de ferramentas HTTP — últimas {windowDays} {windowDays === 1 ? 'dia' : 'dias'}
          </p>
          <p className="text-[10px] text-surface-600 mt-0.5">
            Requer <code className="text-surface-400">FF_AGENT_AUDIT_LOG</code> ativo no agent-server
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={windowDays}
            onChange={(e) => setWindowDays(parseInt(e.target.value, 10))}
            className="bg-surface-900 border border-surface-800 rounded-lg px-2.5 py-1 text-xs text-surface-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          >
            <option value={1}>Último dia</option>
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-900 hover:bg-surface-800 border border-surface-800 text-xs text-surface-300 transition disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3 h-3', refreshing && 'animate-spin')} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {!loading && !error && totals.total > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface-900/60 border border-surface-800/60 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wide text-surface-600 mb-1">Total de chamadas</p>
            <p className="text-xl font-bold text-surface-100">{totals.total.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-surface-900/60 border border-surface-800/60 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wide text-surface-600 mb-1">Taxa de sucesso</p>
            <p className={cn('text-xl font-bold', successRate !== null && successRate >= 95 ? 'text-status-active' : successRate !== null && successRate >= 80 ? 'text-status-pending' : 'text-red-400')}>
              {successRate !== null ? `${successRate}%` : '—'}
            </p>
          </div>
          <div className="bg-surface-900/60 border border-surface-800/60 rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-wide text-surface-600 mb-1">Falhas</p>
            <p className={cn('text-xl font-bold', totals.failures === 0 ? 'text-surface-400' : 'text-red-400')}>
              {totals.failures.toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Não foi possível carregar as métricas</p>
            <p className="opacity-80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-surface-500" />
        </div>
      )}

      {/* Empty */}
      {!loading && !error && rows.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 border border-dashed border-surface-800 rounded-xl">
          <BarChart3 className="w-8 h-8 text-surface-700" />
          <div className="text-center">
            <p className="text-sm text-surface-500">Nenhuma execução registrada</p>
            <p className="text-xs text-surface-600 mt-0.5">
              Ative <code className="text-surface-400">FF_AGENT_CUSTOM_TOOLS</code> + <code className="text-surface-400">FF_AGENT_AUDIT_LOG</code> e execute conversas para ver os dados aqui.
            </p>
          </div>
        </div>
      )}

      {/* Per-tool table */}
      {!loading && !error && rows.length > 0 && (
        <div className="bg-surface-900/60 border border-surface-800/60 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-surface-950/60 text-surface-500 uppercase tracking-wide text-[10px]">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Ferramenta</th>
                <th className="text-right px-4 py-2 font-medium">Total</th>
                <th className="text-right px-4 py-2 font-medium">Sucesso</th>
                <th className="text-right px-4 py-2 font-medium">Falhas</th>
                <th className="text-right px-4 py-2 font-medium">Média</th>
                <th className="text-right px-4 py-2 font-medium">p95</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/60">
              {rows.map(r => {
                const rate = r.total > 0 ? (r.successes / r.total) * 100 : 0
                return (
                  <tr key={r.tool_name} className="hover:bg-surface-800/30 transition">
                    <td className="px-4 py-2.5 font-mono text-surface-200">{r.tool_name}</td>
                    <td className="px-4 py-2.5 text-right text-surface-300">{r.total}</td>
                    <td className={cn('px-4 py-2.5 text-right font-medium', rate >= 95 ? 'text-status-active' : rate >= 80 ? 'text-status-pending' : 'text-red-400')}>
                      {r.successes} <span className="text-surface-600">({rate.toFixed(1)}%)</span>
                    </td>
                    <td className={cn('px-4 py-2.5 text-right', r.failures === 0 ? 'text-surface-500' : 'text-red-400 font-medium')}>
                      {r.failures}
                    </td>
                    <td className="px-4 py-2.5 text-right text-surface-400">
                      {r.avg_duration_ms !== null ? `${r.avg_duration_ms.toFixed(0)}ms` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right text-surface-400">
                      {r.p95_duration_ms !== null ? `${r.p95_duration_ms.toFixed(0)}ms` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Agent Detail ─────────────────────────────────────────────────────────────

type Tab = 'overview' | 'prompt' | 'tools' | 'rules' | 'knowledge' | 'metrics'

export function AgentDetail({
  agent: initialAgent,
  onDeleted,
  tested,
  onTested,
}: {
  agent: AgentConfigWithTools
  onDeleted: () => void
  tested: boolean
  onTested: () => void
}) {
  const [agent, setAgent] = useState<AgentConfigWithTools>(initialAgent)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  // Sub-tab state for the unified "Regras" tab — lifted here because the
  // outer scroll/flex layout depends on which sub-panel is active.
  const [rulesSubTab, setRulesSubTab] = useState<RulesSubTab>('faqs')
  const [deletingAgent, setDeletingAgent] = useState(false)
  const [showTest, setShowTest] = useState(false)
  const [togglingStatus, setTogglingStatus] = useState(false)

  const toggleStatus = async () => {
    const next = agent.status === 'active' ? 'paused' : 'active'
    setTogglingStatus(true)
    try {
      const updated = await updateAgent(agent.id, { status: next })
      handleAgentUpdate(updated)
    } finally {
      setTogglingStatus(false)
    }
  }

  useEffect(() => { setAgent(initialAgent) }, [initialAgent])

  const handleAgentUpdate = useCallback((updated: AgentConfig) => {
    setAgent(prev => ({ ...prev, ...updated }))
  }, [])

  const handleToolsChange = useCallback((tools: AgentTool[]) => {
    setAgent(prev => ({ ...prev, tools }))
  }, [])

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Visão geral', icon: <Bot className="w-3.5 h-3.5" /> },
    { id: 'prompt',   label: 'System Prompt', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'tools',    label: `Ferramentas${agent.tools.length > 0 ? ` (${agent.tools.length})` : ''}`, icon: <Wrench className="w-3.5 h-3.5" /> },
    { id: 'rules',    label: 'Regras', icon: <Workflow className="w-3.5 h-3.5" /> },
    { id: 'knowledge', label: 'Conhecimento', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'metrics',  label: 'Métricas', icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-surface-800/60 flex-shrink-0">
        <AgentIcon iconId={agent.icon} className="w-10 h-10" />
        <div className="flex-1 min-w-0">
          <InlineEdit
            value={agent.name}
            onSave={async (name) => {
              const updated = await updateAgent(agent.id, { name })
              handleAgentUpdate(updated)
            }}
            className="text-base font-bold text-surface-100"
          />
          <div className="flex items-center gap-3 mt-0.5">
            <StatusBadge status={agent.status} />
            <span className="text-xs text-surface-600">
              {agent.tools.length} ferramenta(s)
            </span>
          </div>
        </div>
        {/* Testar Agente */}
        <button
          onClick={() => setShowTest(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-600/15 hover:bg-brand-600/25 text-brand-400 text-xs font-medium ring-1 ring-brand-500/30 transition-colors hover:ring-brand-500/50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Testar
        </button>
        {/* Ativar / Pausar */}
        <button
          onClick={toggleStatus}
          disabled={togglingStatus}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium ring-1 transition-colors disabled:opacity-50',
            agent.status === 'active'
              ? 'bg-surface-800 text-surface-400 ring-surface-700 hover:bg-red-500/10 hover:text-red-400 hover:ring-red-500/30'
              : 'bg-status-active-bg text-status-active ring-status-active-border hover:bg-status-active-bg/80',
          )}
        >
          {togglingStatus
            ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            : agent.status === 'active'
              ? <><PauseCircle className="w-3.5 h-3.5" /> Pausar</>
              : <><Power className="w-3.5 h-3.5" /> Ativar</>}
        </button>
        {/* Excluir */}
        <button
          onClick={() => {
            if (!confirm(`Excluir o agente "${agent.name}"? Esta ação não pode ser desfeita.`)) return
            setDeletingAgent(true)
            updateAgent(agent.id, { status: 'draft' })
              .then(() => onDeleted())
              .catch(() => setDeletingAgent(false))
          }}
          disabled={deletingAgent}
          className="p-2 rounded-xl border border-surface-800 text-surface-600 hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/5 transition"
          title="Excluir agente"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Setup notification — show when agent not yet tested */}
      <AnimatePresence>
        {!tested && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 overflow-hidden"
          >
            <div className="flex items-center gap-3 mx-6 my-3 px-4 py-3 bg-status-pending-bg border border-status-pending-border rounded-xl">
              <AlertCircle className="w-4 h-4 text-status-pending flex-shrink-0" />
              <p className="text-xs text-status-pending flex-1">
                Agente ainda não testado — recomendamos testar antes de ativar para garantir o comportamento correto.
              </p>
              <button
                onClick={() => setShowTest(true)}
                className="text-xs font-medium text-status-pending hover:text-status-pending/80 underline underline-offset-2 transition flex-shrink-0"
              >
                Testar agora
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 px-6 py-2 border-b border-surface-800/60 flex-shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-surface-800 text-surface-100'
                : 'text-surface-500 hover:text-surface-300 hover:bg-surface-900',
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content — "Regras" with Roteamento sub-tab needs flex-contained
          layout for the sticky save bar; everything else scrolls normally. */}
      {(() => {
        const needsFlex = activeTab === 'rules' && rulesSubTab === 'handoff'
        return (
          <div className={cn(
            'flex-1 min-h-0 px-6 py-5',
            needsFlex ? 'flex flex-col overflow-hidden' : 'overflow-y-auto',
          )}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
                className={needsFlex ? 'flex flex-col flex-1 min-h-0' : undefined}
              >
                {activeTab === 'overview' && <OverviewTab  agent={agent} onUpdate={handleAgentUpdate} />}
                {activeTab === 'prompt'   && <SystemPromptTab agent={agent} onUpdate={handleAgentUpdate} />}
                {activeTab === 'tools'    && <ToolsTab agent={agent} onToolsChange={handleToolsChange} />}
                {activeTab === 'rules'    && (
                  <RulesTab
                    agent={agent}
                    onUpdate={handleAgentUpdate}
                    subTab={rulesSubTab}
                    onSubTabChange={setRulesSubTab}
                  />
                )}
                {activeTab === 'knowledge' && <KnowledgeBaseTab agent={agent} />}
                {activeTab === 'metrics'  && <MetricsTab agent={agent} />}
              </motion.div>
            </AnimatePresence>
          </div>
        )
      })()}

      {/* Test chat modal */}
      <AnimatePresence>
        {showTest && (
          <AgentTestModal
            agent={agent}
            onClose={() => setShowTest(false)}
            onTested={onTested}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
