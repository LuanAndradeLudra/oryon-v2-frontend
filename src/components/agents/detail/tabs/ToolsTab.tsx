import { useState } from 'react'
import {
  Plus, Wrench, Trash2, Edit3, AlertCircle,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Link2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { addTool, updateTool, deleteTool } from '@/services/agentsApi'
import type { AgentConfigWithTools, AgentTool } from '@/services/agentsApi'
import { ConfirmModal } from '@/components/ui/Modal'

// Métodos HTTP — cor categórica (não status), matizes convencionais do
// mercado via tokens theme-aware (o claro escurece para manter contraste).
// Único consumidor é esta aba, então (por decisão do Maestro) fica local em
// vez de em detail/shared.tsx.
const METHOD_COLOR: Record<string, string> = {
  GET:    'var(--color-accent-blue)',
  POST:   'var(--color-accent-green)',
  PUT:    'var(--color-accent-amber)',
  PATCH:  'var(--color-warning)',
  DELETE: 'var(--color-danger)',
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

export function ToolsTab({
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
                  <span
                    className="color-chip text-xs font-bold px-1.5 py-0.5 rounded-md border font-mono"
                    style={{ ['--chip']: METHOD_COLOR[tool.method] } as React.CSSProperties}
                  >
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
                    className="p-1.5 rounded-lg hover:bg-danger/10 text-surface-600 hover:text-danger transition"
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
                                  {p.required && <span className="color-chip border text-[10px] px-1 rounded" style={{ ['--chip']: 'var(--color-status-pending)' } as React.CSSProperties}>obrigatório</span>}
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
