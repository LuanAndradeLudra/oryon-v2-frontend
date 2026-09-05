import { useState, useEffect } from 'react'
import {
  Plus, Edit3, Trash2, ToggleLeft, ToggleRight, Clock, Loader2, Save, MessageCircleQuestion,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { listFaqRules, addFaqRule, updateFaqRule, deleteFaqRule } from '@/services/agentsApi'
import type { AgentConfigWithTools, FaqRule, FaqRuleDraft, FaqMatchMode } from '@/services/agentsApi'
import { ConfirmModal } from '@/components/ui/Modal'
import { Banner } from '@/components/ui/Banner'

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
        <Banner variant="danger">{error}</Banner>
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

export function FaqRulesTab({ agent }: { agent: AgentConfigWithTools }) {
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
                  className="p-1.5 rounded-lg hover:bg-danger/10 text-surface-600 hover:text-danger transition mt-0.5"
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
