import { useState, useRef, useEffect, useId, useCallback } from 'react'
import {
  Sparkles, Send, X, Plus, Trash2, Edit3, ArrowUp, ArrowDown,
  ArrowRightLeft, Check, Loader2, Users, ExternalLink, MessageSquare,
  Zap, ChevronDown,
  Tag, Layers, FileText, AlignLeft, Heart,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { EmptyState } from '@/components/ui/EmptyState'
import {
  generateHandoffRule,
  type HandoffRule,
  type HandoffRuleDraft,
  type HandoffAction,
  type HandoffRuleResult,
  type HandoffBusinessContext,
  type HandoffTemplateVariants,
  type HandoffKeywordTiers,
} from '@/services/agentsApi'

// ─── Rule Modal shell ─────────────────────────────────────────────────────────

function RuleModal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  wide,
  tall,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: React.ReactNode
  wide?: boolean
  tall?: boolean
  children: React.ReactNode
}) {
  // Casca migrada pro ui/Modal (SCRUM-1097): herda role="dialog"/aria-modal,
  // foco inicial + devolução, trap de Tab, Esc pela pilha de camadas
  // (LayerContext), portal e scrim do token. Aqui só o que é específico:
  // cabeçalho com ícone + subtítulo (title como nó => aria-label), largura
  // e altura, e corpo sem recuo (os formulários já trazem o próprio).
  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-label={title}
      title={
        <div className="flex-1 min-w-0 flex items-center gap-3 pb-3">
          {icon && (
            <div className="w-8 h-8 rounded-xl bg-brand-600/15 ring-1 ring-brand-500/25 flex items-center justify-center flex-shrink-0">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-display font-bold tracking-[-0.01em] text-surface-50">{title}</h2>
            {subtitle && <p className="text-xs text-surface-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      }
      className={cn(wide ? 'max-w-2xl' : 'max-w-lg', tall && 'h-[78vh]')}
      bodyClassName="p-0"
    >
      {children}
    </Modal>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BuilderMessage {
  id: string
  role: 'ai' | 'user'
  content: string
  draft?: HandoffRuleDraft
  step?: BuilderStep
}

type BuilderStep =
  | 'describe'
  | 'review_keywords'
  | 'review_action'
  | 'review_template'
  | 'confirm'
  | 'done'

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_OPTIONS: { value: HandoffAction; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  {
    value: 'human_handoff',
    label: 'Transferir para humano',
    desc: 'Envia template e abre ticket de atendimento humano',
    icon: <Users className="w-4 h-4" />,
    color: 'blue',
  },
  {
    value: 'auto_reply',
    label: 'Resposta automática',
    desc: 'Envia o template e encerra sem handoff',
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'emerald',
  },
  {
    value: 'external_redirect',
    label: 'Redirecionar externamente',
    desc: 'Envia o template com um link externo (ex: outro WhatsApp)',
    icon: <ExternalLink className="w-4 h-4" />,
    color: 'violet',
  },
  {
    value: 'pass_to_ai',
    label: 'Passar para a IA',
    desc: 'Deixa a IA processar normalmente (sem interceptação)',
    icon: <Zap className="w-4 h-4" />,
    color: 'amber',
  },
]

// Cor por ação — categórica (não status). Tokens theme-aware (--color-accent-*)
// para o tema claro escurecer os matizes sem tocar aqui. Consumida de duas
// formas: como badge "cheio" (.color-chip via ACTION_CHIP) no cartão da regra,
// e como estado SELECIONADO (tint suave) no seletor de ação do editor.
const ACTION_CHIP: Record<HandoffAction, string> = {
  human_handoff:    'var(--color-accent-blue)',
  auto_reply:       'var(--color-accent-green)',
  external_redirect:'var(--color-accent-violet)',
  pass_to_ai:       'var(--color-accent-amber)',
}

// Tint suave para o estado selecionado (equivalente ao antigo bg/10 + border/20 + texto).
const softTint = (color: string): React.CSSProperties => ({
  color,
  backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)`,
  borderColor: `color-mix(in srgb, ${color} 20%, transparent)`,
})

const ACTION_LABEL: Record<HandoffAction, string> = {
  human_handoff:    'Transferir para humano',
  auto_reply:       'Resposta automática',
  external_redirect:'Redirect externo',
  pass_to_ai:       'Passa para IA',
}

// ─── Shared input style ───────────────────────────────────────────────────────

const INPUT = 'w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition'

// ─── Rule Card (list display) ─────────────────────────────────────────────────

function RuleCard({
  rule,
  index,
  total,
  onToggle,
  onEdit,
  onDelete,
  onMove,
}: {
  rule: HandoffRule
  index: number
  total: number
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  /** Troca de lugar com a vizinha (-1 = sobe, 1 = desce). A ordem decide
   *  qual regra vale quando duas casam. */
  onMove: (delta: -1 | 1) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const actionCfg = ACTION_OPTIONS.find(a => a.value === rule.action)

  return (
    <motion.div
      layout
      className={cn(
        'rounded-lg border border-surface-700 bg-[var(--sf2)] overflow-hidden transition-opacity',
        !rule.enabled && 'opacity-70',
      )}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <span className="w-6 h-6 rounded-sm bg-surface-800 border border-surface-700 flex items-center justify-center text-2xs font-bold tabular-nums text-surface-400 flex-shrink-0" aria-label={`Ordem ${index + 1}`}>
          {index + 1}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-surface-100">{rule.name}</span>
            <span
              className="inline-flex items-center gap-1 h-5 px-[7px] rounded-xs border text-2xs font-semibold"
              style={{
                color: ACTION_CHIP[rule.action],
                backgroundColor: `color-mix(in srgb, ${ACTION_CHIP[rule.action]} 12%, transparent)`,
                borderColor: `color-mix(in srgb, ${ACTION_CHIP[rule.action]} 25%, transparent)`,
              }}
            >
              {actionCfg?.icon}
              {ACTION_LABEL[rule.action]}
            </span>
            {rule.aiGenerated && (
              <span className="inline-flex items-center gap-1 h-5 px-[7px] rounded-xs text-2xs font-semibold bg-accent-soft text-accent-dark">
                <Sparkles className="w-3 h-3" aria-hidden /> Sugerida pela IA
              </span>
            )}
          </div>
          <p className="text-xs text-surface-400 truncate mt-0.5">
            {rule.keywords.slice(0, 5).join(' · ')}
            {rule.keywords.length > 5 && <span className="text-surface-500"> +{rule.keywords.length - 5}</span>}
          </p>
        </div>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Button variant="ghost" size="sm" iconOnly aria-label="Subir regra" title="Subir" disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUp className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" iconOnly aria-label="Descer regra" title="Descer" disabled={index === total - 1} onClick={() => onMove(1)}>
            <ArrowDown className="w-3.5 h-3.5" />
          </Button>
          <Switch checked={rule.enabled} onChange={onToggle} className="mx-1.5" />
          <Button variant="ghost" size="sm" iconOnly aria-label={`Editar ${rule.name}`} onClick={onEdit}>
            <Edit3 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" iconOnly aria-label={`Excluir ${rule.name}`} onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" iconOnly aria-label={expanded ? 'Recolher detalhes' : 'Ver detalhes'} aria-expanded={expanded} onClick={() => setExpanded(v => !v)}>
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')} />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden border-t border-surface-700"
          >
            <dl className="px-3.5 py-3 grid grid-cols-[130px_1fr] gap-x-3 gap-y-2 text-xs">
              <dt className="text-surface-500">Palavras ({rule.matchMode === 'any_keyword' ? 'qualquer uma' : rule.matchMode === 'all_keywords' ? 'todas' : 'frase exata'})</dt>
              <dd className="flex flex-wrap gap-1">
                {rule.keywords.map(kw => (
                  <span key={kw} className="px-1.5 h-5 inline-flex items-center rounded-xs bg-surface-800 border border-surface-700 text-surface-200 font-mono">{kw}</span>
                ))}
              </dd>
              {rule.template && (<><dt className="text-surface-500">Resposta</dt><dd className="text-surface-200 whitespace-pre-wrap leading-relaxed">{rule.template}</dd></>)}
              {rule.redirectUrl && (<><dt className="text-surface-500 inline-flex items-center gap-1"><ExternalLink className="w-3 h-3" aria-hidden />Redireciona para</dt><dd className="text-surface-200 font-mono break-all">{rule.redirectUrl}</dd></>)}
              {rule.department && (<><dt className="text-surface-500 inline-flex items-center gap-1"><Users className="w-3 h-3" aria-hidden />Setor</dt><dd className="text-surface-200">{rule.department}</dd></>)}
              {rule.description && (<><dt className="text-surface-500">Observação</dt><dd className="text-surface-300">{rule.description}</dd></>)}
            </dl>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Template Variant Picker ──────────────────────────────────────────────────

const VARIANT_LABELS: Record<keyof HandoffTemplateVariants, { label: string; desc: string }> = {
  brief:      { label: 'Breve',     desc: 'Direto ao ponto' },
  detailed:   { label: 'Detalhado', desc: 'Com mais contexto' },
  empathetic: { label: 'Empático',  desc: 'Tom mais acolhedor' },
}

function TemplateVariantPicker({
  variants,
  selected,
  onSelect,
}: {
  variants: HandoffTemplateVariants
  selected: keyof HandoffTemplateVariants
  onSelect: (v: keyof HandoffTemplateVariants) => void
}) {
  return (
    <div className="flex gap-1.5 mb-2">
      {(Object.keys(VARIANT_LABELS) as Array<keyof HandoffTemplateVariants>).map(key => (
        <button
          key={key}
          type="button"
          onClick={() => onSelect(key)}
          className={cn(
            'flex-1 flex flex-col items-center px-2 py-1.5 rounded-lg border text-center transition-all',
            selected === key
              ? 'bg-brand-600/15 border-brand-500/30 ring-1 ring-brand-500/25 text-brand-300'
              : 'bg-surface-800 border-surface-700 text-surface-500 hover:border-surface-600 hover:text-surface-300',
          )}
        >
          <span className="text-[11px] font-medium">{VARIANT_LABELS[key].label}</span>
          <span className="text-[9px] opacity-70">{VARIANT_LABELS[key].desc}</span>
        </button>
      ))}
    </div>
  )
}

// ─── Keyword Tiers Display ────────────────────────────────────────────────────

// Cor por camada de keyword — categórica. `chip` guarda o matiz (hex/token);
// o badge da camada usa .color-chip e as pills ativas reusam o mesmo tom via softTint.
const TIER_META: Record<keyof HandoffKeywordTiers, { label: string; chip: string; tip: string }> = {
  exact_phrases:  { label: 'Frases exatas',     chip: 'var(--color-accent-green)',  tip: 'A regra dispara quando a mensagem contém esta frase completa' },
  contains_words: { label: 'Palavras-chave',    chip: 'var(--color-brand-500)',     tip: 'Dispara se qualquer uma dessas palavras aparecer na mensagem' },
  typo_variants:  { label: 'Erros de digitação',chip: 'var(--color-accent-amber)',  tip: 'Variações e abreviações comuns no WhatsApp' },
}

function KeywordTiersView({
  tiers,
  flatKeywords,
  onChange,
}: {
  tiers: HandoffKeywordTiers
  flatKeywords: string[]
  onChange: (keywords: string[]) => void
}) {
  const [kwInput, setKwInput] = useState('')

  const removeKeyword = (kw: string) => onChange(flatKeywords.filter(k => k !== kw))
  const addKeyword = () => {
    const v = kwInput.trim().toLowerCase()
    if (!v || flatKeywords.includes(v)) return
    onChange([...flatKeywords, v])
    setKwInput('')
  }

  const allTierKws = new Set([
    ...(tiers.exact_phrases ?? []),
    ...(tiers.contains_words ?? []),
    ...(tiers.typo_variants ?? []),
  ])
  // Words added manually by user (not in any tier)
  const manualKws = flatKeywords.filter(k => !allTierKws.has(k))

  return (
    <div className="space-y-3">
      {(Object.keys(TIER_META) as Array<keyof HandoffKeywordTiers>).map(tier => {
        const kws = tiers[tier] ?? []
        if (kws.length === 0) return null
        const meta = TIER_META[tier]
        return (
          <div key={tier}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span
                className="color-chip text-[10px] font-medium px-1.5 py-0.5 rounded border"
                style={{ ['--chip']: meta.chip } as React.CSSProperties}
              >
                {meta.label}
              </span>
              <span className="text-[10px] text-surface-600">{meta.tip}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {kws.map(kw => (
                <span
                  key={kw}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-mono',
                    !flatKeywords.includes(kw) &&
                      'text-surface-600 bg-surface-800/50 border-surface-700/50 line-through opacity-50',
                  )}
                  style={flatKeywords.includes(kw) ? softTint(meta.chip) : undefined}
                >
                  {kw}
                  {flatKeywords.includes(kw) && (
                    <button type="button" onClick={() => removeKeyword(kw)} aria-label={`Remover palavra-chave "${kw}"`} className="opacity-60 hover:opacity-100 hover:text-red-400 transition">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        )
      })}

      {/* Manually added keywords */}
      {manualKws.length > 0 && (
        <div>
          <span className="text-[10px] text-surface-600 uppercase tracking-wide">Adicionadas manualmente</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {manualKws.map(kw => (
              <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface-800 border border-surface-700 text-xs text-surface-300 font-mono">
                {kw}
                <button type="button" onClick={() => removeKeyword(kw)} aria-label={`Remover palavra-chave "${kw}"`} className="text-surface-600 hover:text-red-400 transition">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add keyword input */}
      <div className="flex gap-2">
        <input
          value={kwInput}
          onChange={e => setKwInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword() } }}
          placeholder="Adicionar keyword e pressionar Enter..."
          className={INPUT}
        />
        <button type="button" onClick={addKeyword} disabled={!kwInput.trim()} aria-label="Adicionar palavra-chave"
          className="px-3 rounded-xl bg-surface-800 border border-surface-700 text-surface-400 hover:text-brand-400 hover:border-brand-500/40 disabled:opacity-40 transition">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[10px] text-surface-700">Total: {flatKeywords.length} keyword(s) ativas</p>
    </div>
  )
}

// ─── Draft Editor (full form for editing/reviewing before saving) ─────────────

function DraftEditor({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  draft: HandoffRuleDraft
  onChange: (d: HandoffRuleDraft) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
}) {
  const [kwInput, setKwInput]       = useState('')
  const [activeVariant, setActiveVariant] = useState<keyof HandoffTemplateVariants>('detailed')

  const addKeyword = () => {
    const v = kwInput.trim().toLowerCase()
    if (!v || draft.keywords.includes(v)) return
    onChange({ ...draft, keywords: [...draft.keywords, v] })
    setKwInput('')
  }

  const removeKeyword = (kw: string) =>
    onChange({ ...draft, keywords: draft.keywords.filter(k => k !== kw) })

  const selectVariant = (v: keyof HandoffTemplateVariants) => {
    setActiveVariant(v)
    if (draft.templateVariants?.[v]) {
      onChange({ ...draft, template: draft.templateVariants[v] })
    }
  }

  return (
    <div className="space-y-4 bg-surface-900/80 border border-surface-700 rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-brand-400" />
        <p className="text-sm font-semibold text-surface-100">Revisar e salvar regra</p>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs font-medium text-surface-400 mb-1.5">Nome da regra</label>
        <input
          value={draft.name}
          onChange={e => onChange({ ...draft, name: e.target.value })}
          className={INPUT}
          placeholder="Ex: Solicitação de Orçamento"
        />
      </div>

      {/* Action selector */}
      <div>
        <label className="block text-xs font-medium text-surface-400 mb-2">Ação ao detectar</label>
        <div className="grid grid-cols-2 gap-2">
          {ACTION_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ ...draft, action: opt.value })}
              className={cn(
                'flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all',
                draft.action === opt.value
                  ? 'ring-1'
                  : 'bg-surface-800 border-surface-700 hover:border-surface-600',
              )}
              style={draft.action === opt.value ? softTint(ACTION_CHIP[opt.value]) : undefined}
            >
              <span className={draft.action === opt.value ? '' : 'text-surface-500 mt-0.5'}>{opt.icon}</span>
              <div>
                <p className="text-xs font-medium text-surface-200">{opt.label}</p>
                <p className="text-[10px] text-surface-500 leading-tight mt-0.5">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Redirect URL — only when external_redirect */}
      {draft.action === 'external_redirect' && (
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1.5">URL de redirecionamento</label>
          <input
            value={draft.redirectUrl ?? ''}
            onChange={e => onChange({ ...draft, redirectUrl: e.target.value })}
            className={INPUT}
            placeholder="https://wa.me/55119..."
          />
        </div>
      )}

      {/* Department — only when human_handoff */}
      {draft.action === 'human_handoff' && (
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1.5">Departamento de destino <span className="text-surface-600 font-normal">(opcional)</span></label>
          <input
            value={draft.department ?? ''}
            onChange={e => onChange({ ...draft, department: e.target.value })}
            className={INPUT}
            placeholder='Ex: "Vendas", "Suporte"'
          />
        </div>
      )}

      {/* Keywords — tiered view when available, flat view otherwise */}
      <div>
        <label className="block text-xs font-medium text-surface-400 mb-1">Palavras-chave</label>
        {draft.keywordTiers ? (
          <KeywordTiersView
            tiers={draft.keywordTiers}
            flatKeywords={draft.keywords}
            onChange={kws => onChange({ ...draft, keywords: kws })}
          />
        ) : (
          <>
            <p className="text-xs text-surface-600 mb-2">A regra dispara quando qualquer uma dessas palavras aparecer na mensagem do lead.</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {draft.keywords.map(kw => (
                <span key={kw} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-800 border border-surface-700 text-xs text-surface-300 font-mono">
                  {kw}
                  <button type="button" onClick={() => removeKeyword(kw)} aria-label={`Remover palavra-chave "${kw}"`} className="text-surface-600 hover:text-red-400 transition">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={kwInput}
                onChange={e => setKwInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword() } }}
                placeholder="Adicionar palavra-chave e pressionar Enter..."
                className={INPUT}
              />
              <button type="button" onClick={addKeyword} disabled={!kwInput.trim()} aria-label="Adicionar palavra-chave"
                className="px-3 rounded-xl bg-surface-800 border border-surface-700 text-surface-400 hover:text-brand-400 hover:border-brand-500/40 disabled:opacity-40 transition">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Template — variant picker when available */}
      {draft.action !== 'pass_to_ai' && (
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1.5">Template de resposta</label>
          {draft.templateVariants && (
            <TemplateVariantPicker
              variants={draft.templateVariants}
              selected={activeVariant}
              onSelect={selectVariant}
            />
          )}
          {!draft.templateVariants && (
            <p className="text-xs text-surface-600 mb-2">Mensagem enviada ao lead quando a regra é ativada. Suporta formatação WhatsApp (*negrito*, _itálico_).</p>
          )}
          <textarea
            value={draft.template ?? ''}
            onChange={e => onChange({ ...draft, template: e.target.value })}
            rows={5}
            className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2.5 text-sm text-surface-100 placeholder:text-surface-600 font-mono resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition leading-relaxed"
            placeholder="Mensagem que será enviada ao lead..."
          />
          {draft.templateVariants && (
            <p className="text-[10px] text-surface-600 mt-1">Edite o texto acima para personalizar esta variante.</p>
          )}
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-sm border border-surface-700 text-sm text-surface-400 hover:text-surface-200 hover:bg-[var(--rowhover)] transition"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!draft.name.trim() || draft.keywords.length === 0 || saving}
          className="flex-1 px-4 py-2.5 rounded-sm bg-surface-100 hover:bg-surface-50 disabled:opacity-50 disabled:cursor-not-allowed text-surface-950 text-sm font-medium transition inline-flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? 'Salvando…' : 'Salvar regra'}
        </button>
      </div>
    </div>
  )
}

// ─── Handoff Generating Animation ────────────────────────────────────────────

const HANDOFF_PHASES = [
  { icon: Tag,         label: 'Mapeando palavras-chave exatas'    },
  { icon: Layers,      label: 'Expandindo variações e sinônimos'  },
  { icon: FileText,    label: 'Redigindo variante breve'          },
  { icon: AlignLeft,   label: 'Elaborando variante detalhada'     },
  { icon: Heart,       label: 'Construindo variante empática'     },
  { icon: Check,       label: 'Ajustando prioridade e ação'       },
]

const SAMPLE_KEYWORDS = [
  'orçamento', 'preço', 'valor', 'quanto custa', 'proposta',
  'atendimento', 'humano', 'falar com', 'urgente', 'cancelar',
]

function HandoffGeneratingCard() {
  const [phaseIdx, setPhaseIdx] = useState(0)
  const [visibleKws, setVisibleKws] = useState<string[]>([])

  useEffect(() => {
    const phaseTimer = setInterval(() => setPhaseIdx(i => (i + 1) % HANDOFF_PHASES.length), 1100)
    return () => clearInterval(phaseTimer)
  }, [])

  useEffect(() => {
    if (visibleKws.length >= SAMPLE_KEYWORDS.length) return
    const t = setTimeout(() => {
      setVisibleKws(prev => [...prev, SAMPLE_KEYWORDS[prev.length]])
    }, 420)
    return () => clearTimeout(t)
  }, [visibleKws])

  const phase = HANDOFF_PHASES[phaseIdx]
  const PhaseIcon = phase.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface-800 border border-surface-700 rounded-2xl rounded-tl-sm px-4 py-3 space-y-3 max-w-[85%]"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-lg bg-brand-600/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3 h-3 text-brand-400" />
        </div>
        <span className="text-[11px] font-medium text-surface-400">Gerando regra de handoff</span>
        <div className="ml-auto flex gap-1">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1 h-1 rounded-full bg-brand-400 animate-bounce"
              style={{ animationDelay: `${i * 140}ms` }}
            />
          ))}
        </div>
      </div>

      {/* Current phase */}
      <AnimatePresence mode="wait">
        <motion.div
          key={phaseIdx}
          initial={{ opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -6 }}
          transition={{ duration: 0.18 }}
          className="flex items-center gap-1.5"
        >
          <PhaseIcon className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
          <span className="text-xs text-surface-500">{phase.label}...</span>
        </motion.div>
      </AnimatePresence>

      {/* Keywords appearing */}
      <div className="flex flex-wrap gap-1.5 min-h-[22px]">
        <AnimatePresence>
          {visibleKws.map(kw => (
            <motion.span
              key={kw}
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className="px-2 py-0.5 rounded-md bg-surface-800 border border-[var(--bd2)] text-[11px] text-surface-300"
            >
              {kw}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* Template preview skeleton */}
      <div className="space-y-1.5 pt-0.5">
        {[72, 88, 55].map((w, i) => (
          <div
            key={i}
            className="h-1.5 rounded-full bg-surface-700 animate-pulse"
            style={{ width: `${w}%`, animationDelay: `${i * 180}ms` }}
          />
        ))}
      </div>
    </motion.div>
  )
}

// ─── AI Chat Builder ──────────────────────────────────────────────────────────

function AIRuleBuilder({
  businessContext,
  onRuleCreated,
  onCancel,
}: {
  businessContext?: HandoffBusinessContext
  onRuleCreated: (draft: HandoffRuleDraft) => void
  onCancel: () => void
}) {
  const uid = useId()
  const [messages, setMessages] = useState<BuilderMessage[]>([
    {
      id: `${uid}-0`,
      role: 'ai',
      content: 'Olá! Descreva em linguagem natural o cenário de encaminhamento que você quer criar.\n\nExemplo: "quando o lead pedir orçamento de qualquer serviço, quero encaminhar para a equipe humana" ou "quando mencionar dentista, redirecionar para o WhatsApp parceiro".',
      step: 'describe',
    },
  ])
  const [input, setInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [draft, setDraft] = useState<HandoffRuleDraft | null>(null)
  const [editingDraft, setEditingDraft] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const addMessage = (msg: Omit<BuilderMessage, 'id'>) => {
    setMessages(prev => [...prev, { ...msg, id: `${uid}-${prev.length}` }])
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || generating) return
    setInput('')
    addMessage({ role: 'user', content: text })

    setGenerating(true)
    try {
      const result: HandoffRuleResult = await generateHandoffRule(text, businessContext)
      setDraft(result.draft)
      const kwCount = result.draft.keywords.length
      const hasVariants = !!result.draft.templateVariants
      const aiMsg = result.source === 'ai'
        ? `Pronto! Gerei uma regra com ${kwCount} keywords em 3 camadas${hasVariants ? ' e 3 variantes de template' : ''}. Revise e ajuste antes de salvar:`
        : `Gerado com padrões locais (backend offline). Revise com atenção — as keywords e o template podem precisar de ajuste para o seu cenário:`
      addMessage({
        role: 'ai',
        content: aiMsg,
        draft: result.draft,
        step: 'confirm',
      })
      setEditingDraft(true)
    } catch (err) {
      addMessage({
        role: 'ai',
        content: `Ocorreu um erro ao gerar a regra: ${err instanceof Error ? err.message : 'tente novamente'}`,
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSaveDraft = async () => {
    if (!draft) return
    setSavingDraft(true)
    try {
      await new Promise(r => setTimeout(r, 300)) // brief UX pause
      onRuleCreated(draft)
    } finally {
      setSavingDraft(false)
    }
  }

  const handleRegenerate = async () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
    if (!lastUserMsg) return
    setEditingDraft(false)
    setGenerating(true)
    try {
      const result: HandoffRuleResult = await generateHandoffRule(lastUserMsg.content, businessContext)
      setDraft(result.draft)
      const kwCount = result.draft.keywords.length
      const aiMsg = result.source === 'ai'
        ? `Regenerei com IA — ${kwCount} keywords e 3 variantes de template. Revise e ajuste:`
        : 'Regenerei com padrões locais (backend offline). Revise as keywords e o template:'
      addMessage({
        role: 'ai',
        content: aiMsg,
        draft: result.draft,
        step: 'confirm',
      })
      setEditingDraft(true)
    } catch {
      addMessage({ role: 'ai', content: 'Não consegui regenerar. Tente descrever novamente.' })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.map(msg => (
          <div key={msg.id} className={cn('flex gap-2.5', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            {msg.role === 'ai' && (
              <div className="w-6 h-6 rounded-full bg-brand-600/20 ring-1 ring-brand-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="w-3 h-3 text-brand-400" />
              </div>
            )}
            <div className={cn('max-w-[85%] space-y-2', msg.role === 'user' ? 'items-end' : 'items-start')}>
              <div className={cn(
                'rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-brand-600 text-surface-950 rounded-tr-sm'
                  : 'bg-surface-800 border border-surface-700 text-surface-200 rounded-tl-sm',
              )}>
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {/* Draft editor inline */}
        {editingDraft && draft && (
          <DraftEditor
            draft={draft}
            onChange={setDraft}
            onSave={handleSaveDraft}
            onCancel={() => setEditingDraft(false)}
            saving={savingDraft}
          />
        )}

        {/* Regenerate button */}
        {editingDraft && draft && !savingDraft && (
          <div className="flex justify-center">
            <button
              onClick={handleRegenerate}
              disabled={generating}
              className="inline-flex items-center gap-1.5 text-xs text-surface-500 hover:text-brand-400 transition"
            >
              {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              Regenerar sugestão
            </button>
          </div>
        )}

        {generating && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-6 h-6 rounded-full bg-brand-600/20 ring-1 ring-brand-500/30 flex items-center justify-center flex-shrink-0 mt-1">
              <Sparkles className="w-3 h-3 text-brand-400" />
            </div>
            <HandoffGeneratingCard />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!editingDraft && (
        <div className="flex-shrink-0 border-t border-surface-700 px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ex: quando o lead pedir orçamento, encaminhar para equipe humana..."
              rows={2}
              disabled={generating}
              className="flex-1 bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 text-sm text-surface-100 placeholder:text-surface-500 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition leading-relaxed disabled:opacity-50"
              style={{ maxHeight: '100px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || generating}
              aria-label="Enviar descrição da regra"
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all bg-surface-100 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed text-surface-950"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-surface-700 mt-1">Enter para enviar · Shift+Enter para nova linha</p>
        </div>
      )}
    </div>
  )
}

// ─── Manual Rule Form ─────────────────────────────────────────────────────────

function ManualRuleForm({
  onCreated,
  onCancel,
}: {
  onCreated: (draft: HandoffRuleDraft) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<HandoffRuleDraft>({
    name: '',
    keywords: [],
    template: '',
    action: 'human_handoff',
    matchMode: 'any_keyword',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await new Promise(r => setTimeout(r, 200))
      onCreated(draft)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-5 py-4">
      <DraftEditor
        draft={draft}
        onChange={setDraft}
        onSave={handleSave}
        onCancel={onCancel}
        saving={saving}
      />
    </div>
  )
}

// ─── Main HandoffRulesPanel ───────────────────────────────────────────────────

export interface HandoffRulesPanelProps {
  rules: HandoffRule[]
  businessContext?: HandoffBusinessContext
  onChange: (rules: HandoffRule[]) => void
}

type ModalMode = 'ai_builder' | 'manual' | 'edit' | null

export function HandoffRulesPanel({
  rules,
  businessContext,
  onChange,
}: HandoffRulesPanelProps) {
  const [modal, setModal] = useState<ModalMode>(null)
  const [editingRule, setEditingRule] = useState<HandoffRule | null>(null)

  const close = useCallback(() => {
    setModal(null)
    setEditingRule(null)
  }, [])

  const makeRule = (draft: HandoffRuleDraft, aiGenerated: boolean): HandoffRule => ({
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: draft.name,
    description: draft.description,
    // Use AI-suggested priority if provided, otherwise append to end of list
    priority: draft.priority ?? rules.length + 1,
    enabled: true,
    matchMode: draft.matchMode,
    keywords: draft.keywords,
    action: draft.action,
    template: draft.template,
    redirectUrl: draft.redirectUrl,
    department: draft.department,
    aiGenerated,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  const handleRuleCreated = (draft: HandoffRuleDraft) => {
    onChange([...rules, makeRule(draft, modal === 'ai_builder')])
    close()
  }

  const handleRuleEdited = (draft: HandoffRuleDraft) => {
    if (!editingRule) return
    onChange(rules.map(r =>
      r.id === editingRule.id
        ? { ...makeRule(draft, r.aiGenerated), id: r.id, priority: r.priority, createdAt: r.createdAt }
        : r
    ))
    close()
  }

  const moveRule = (index: number, delta: -1 | 1) => {
    const alvo = index + delta
    if (alvo < 0 || alvo >= rules.length) return
    const next = [...rules]
    ;[next[index], next[alvo]] = [next[alvo], next[index]]
    onChange(next.map((r, i) => ({ ...r, priority: i + 1, updatedAt: new Date().toISOString() })))
  }

  const toggleRule = (id: string) =>
    onChange(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled, updatedAt: new Date().toISOString() } : r))

  const [deleteRuleTarget, setDeleteRuleTarget] = useState<string | null>(null)

  const deleteRule = () => {
    if (!deleteRuleTarget) return
    onChange(rules.filter(r => r.id !== deleteRuleTarget))
    setDeleteRuleTarget(null)
  }

  const openEdit = (id: string) => {
    const rule = rules.find(r => r.id === id)
    if (!rule) return
    setEditingRule(rule)
    setModal('edit')
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Always-visible list */}
      <div className="flex flex-col h-full min-h-0">
        {rules.length > 0 && <div className="flex items-center justify-between gap-3 mb-3 flex-shrink-0">
          <p className="text-xs text-surface-400">
            {rules.length === 0
              ? 'Nenhuma regra ainda'
              : `${rules.filter(r => r.enabled).length} de ${rules.length} ligadas · avaliadas de cima para baixo, a primeira que casar vale`}
          </p>
          {rules.length > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="neutral" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setModal('manual')}>
                Escrever regra
              </Button>
              <Button variant="secondary" size="sm" leftIcon={<Sparkles className="w-3.5 h-3.5" />} onClick={() => setModal('ai_builder')}>
                Criar com IA
              </Button>
            </div>
          )}
        </div>}

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {rules.length === 0 ? (
            <div>
              <EmptyState
                icon={ArrowRightLeft}
                title="Nenhuma regra de transferência"
                hint="Diga em que situações a IA deve chamar uma pessoa, redirecionar ou responder algo fixo. Descreva o caso e a IA monta a regra."
                action={{ label: 'Criar com IA', onClick: () => setModal('ai_builder') }}
              />
              <Button variant="ghost" size="sm" className="mt-2" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setModal('manual')}>
                Ou escrever a regra à mão
              </Button>
            </div>
          ) : (
            rules.map((rule, i) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                index={i}
                total={rules.length}
                onToggle={() => toggleRule(rule.id)}
                onEdit={() => openEdit(rule.id)}
                onDelete={() => setDeleteRuleTarget(rule.id)}
                onMove={(d) => moveRule(i, d)}
              />
            ))
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!deleteRuleTarget}
        onClose={() => setDeleteRuleTarget(null)}
        onConfirm={deleteRule}
        title="Excluir regra de handoff"
        description="Esta ação é irreversível. A regra será removida e não será mais aplicada nas conversas do agente."
        impact={(() => {
          const rule = rules.find(r => r.id === deleteRuleTarget)
          return rule ? { label: `Regra "${rule.name}"`, tone: 'danger' as const } : undefined
        })()}
        confirmLabel="Excluir regra"
        danger
      />

      {/* Os 3 modais ficam montados com `open` dirigido pelo estado: o
          AnimatePresence interno do ui/Modal cuida da saída, e o conteúdo só
          existe enquanto aberto (formulários nascem zerados a cada abertura). */}

      {/* ── Modal: AI Builder ──────────────────────────────────────────────── */}
      <RuleModal
        open={modal === 'ai_builder'}
        onClose={close}
        title="Criar regra com IA"
        subtitle="Descreva o cenário em linguagem natural"
        icon={<Sparkles className="w-4 h-4 text-brand-400" />}
        wide
        tall
      >
        <AIRuleBuilder
          businessContext={businessContext}
          onRuleCreated={handleRuleCreated}
          onCancel={close}
        />
      </RuleModal>

      {/* ── Modal: Manual Form ─────────────────────────────────────────────── */}
      <RuleModal
        open={modal === 'manual'}
        onClose={close}
        title="Nova regra manual"
        subtitle="Configure palavras-chave, ação e template"
        icon={<Plus className="w-4 h-4 text-surface-300" />}
      >
        <ManualRuleForm
          onCreated={handleRuleCreated}
          onCancel={close}
        />
      </RuleModal>

      {/* ── Modal: Edit Rule ───────────────────────────────────────────────── */}
      <RuleModal
        open={modal === 'edit' && !!editingRule}
        onClose={close}
        title={`Editar: ${editingRule?.name ?? ''}`}
        subtitle="Ajuste palavras-chave, ação e template"
        icon={<Edit3 className="w-4 h-4 text-surface-300" />}
      >
        {editingRule && (
          <EditRuleForm
            rule={editingRule}
            onSaved={handleRuleEdited}
            onCancel={close}
          />
        )}
      </RuleModal>
    </div>
  )
}

// ─── Edit Rule Form (pre-filled DraftEditor) ──────────────────────────────────

function EditRuleForm({
  rule,
  onSaved,
  onCancel,
}: {
  rule: HandoffRule
  onSaved: (draft: HandoffRuleDraft) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState<HandoffRuleDraft>({
    name: rule.name,
    description: rule.description,
    keywords: rule.keywords,
    template: rule.template ?? '',
    action: rule.action,
    matchMode: rule.matchMode,
    redirectUrl: rule.redirectUrl,
    department: rule.department,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await new Promise(r => setTimeout(r, 200))
      onSaved(draft)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-5 py-4">
      <DraftEditor
        draft={draft}
        onChange={setDraft}
        onSave={handleSave}
        onCancel={onCancel}
        saving={saving}
      />
    </div>
  )
}
