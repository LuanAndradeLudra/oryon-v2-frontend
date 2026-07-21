import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, GitBranch, Layers, Sparkles, ClipboardCheck, Wand2, Check } from 'lucide-react'
import type { Automation } from '@/types'
import { automationsApi } from '@/services/api'
import { useSmartLineDefault } from '@/hooks/useSmartLineDefault'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import { WhatsappLineRow } from '@/components/copilot/WhatsappLineRow'
import { Banner } from '@/components/ui/Banner'
import { cn } from '@/lib/utils'
import { TYPE_CONFIG } from './TypeBadge'
import { flowSummary, triggerChipLabel, actionLabel } from './automationText'
import {
  Step1, Step2, Step3, AgentBehaviorSelector, EMPTY_DRAFT, type WizardDraft,
} from './AutomationWizard'
import type { AutomationBuilderSection } from './AutomationDetail'

// Recipes reenquadradas por OBJETIVO de negócio (não por tipo). Hidratam o
// draft in-place. É a "porta rápida" que substitui a TemplateGallery.
const RECIPES: { title: string; desc: string; preset: Partial<WizardDraft> }[] = [
  {
    title: 'Não perder lead fora do horário',
    desc: 'Responde sozinho quando chega mensagem fora do expediente.',
    preset: { type: 'fora_horario', trigger: { type: 'fora_horario' }, status: 'active',
      actions: [{ type: 'send_text', body: 'Olá! Nosso horário é seg–sex das 9h às 18h. Retornamos em breve!' }] },
  },
  {
    title: 'Dar boas-vindas na 1ª mensagem',
    desc: 'Saudação automática para todo contato novo.',
    preset: { type: 'boas_vindas', trigger: { type: 'boas_vindas' }, status: 'active',
      actions: [{ type: 'send_text', body: 'Olá! 👋 Como posso te ajudar hoje?' }] },
  },
  {
    title: 'Retomar cliente que sumiu',
    desc: 'Lembrete quando o cliente fica horas sem responder.',
    preset: { type: 'follow_up', trigger: { type: 'follow_up', afterHours: 24 }, status: 'active',
      actions: [{ type: 'send_text', body: 'Oi! Ainda posso te ajudar com algo? 😊' }] },
  },
  {
    title: 'Reengajar contato inativo',
    desc: 'Mensagem após dias sem nenhuma interação.',
    preset: { type: 'inatividade', trigger: { type: 'inatividade', afterDays: 7 }, status: 'active',
      actions: [{ type: 'send_text', body: 'Faz um tempo que não conversamos. Posso te ajudar? 😊' }] },
  },
  {
    title: 'Triar urgências p/ o suporte',
    desc: 'Detecta palavras críticas e transfere ao time certo.',
    preset: { type: 'triagem_keyword', trigger: { type: 'triagem_keyword', keywords: ['problema', 'urgente', 'erro'], matchMode: 'any' }, status: 'draft', actions: [] },
  },
]

const SECTIONS: { key: string; label: string; icon: React.ElementType }[] = [
  { key: 'gatilho',   label: 'Gatilho',            icon: Zap },
  { key: 'condicoes', label: 'Condições',          icon: GitBranch },
  { key: 'acoes',     label: 'Ações',              icon: Layers },
  { key: 'ia',        label: 'Coexistência c/ IA', icon: Sparkles },
  { key: 'revisar',   label: 'Revisar',            icon: ClipboardCheck },
]

interface BuilderProps {
  open: boolean
  onClose: () => void
  onSaved: (a: Automation) => void
  editTarget?: Automation | null
  preset?: Partial<WizardDraft> | null
  /** Abre rolado até esta seção (deep-link do painel de detalhe). */
  initialSection?: AutomationBuilderSection
  onDescribeWithAI?: () => void
}

export function AutomationBuilder({ open, onClose, onSaved, editTarget, preset, initialSection, onDescribeWithAI }: BuilderProps) {
  const [draft, setDraft]     = useState<WizardDraft>(EMPTY_DRAFT)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [active, setActive]   = useState<string>('gatilho')
  const [recipesOpen, setRecipesOpen] = useState(true)
  const [askClose, setAskClose]       = useState(false)
  const smartDefault = useSmartLineDefault()
  const { numbers } = useWorkspaceNumber()
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const dirtyRef = useRef(false)

  // Init on open.
  useEffect(() => {
    if (!open) return
    setError(null); setActive(initialSection ?? 'gatilho'); setRecipesOpen(!editTarget); setAskClose(false)
    dirtyRef.current = false
    if (editTarget) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, tenantId, executionCount, lastExecutedAt, createdAt, updatedAt, ...rest } = editTarget
      setDraft({ ...EMPTY_DRAFT, ...rest })
    } else if (preset) {
      setDraft({ ...EMPTY_DRAFT, ...preset })
    } else {
      setDraft(EMPTY_DRAFT)
    }
  }, [open, editTarget, preset, initialSection])

  // Smart line default (novos, se ainda não escolheu).
  useEffect(() => {
    if (!open || editTarget || smartDefault.loading || !smartDefault.lineId) return
    setDraft((prev) => (prev.whatsappNumberId ? prev : { ...prev, whatsappNumberId: smartDefault.lineId }))
  }, [open, editTarget, smartDefault.loading, smartDefault.lineId])

  // Deep-link: rola até a seção pedida ao abrir.
  useEffect(() => {
    if (!open || !initialSection) return
    const t = setTimeout(() => sectionRefs.current[initialSection]?.scrollIntoView({ block: 'start' }), 140)
    return () => clearTimeout(t)
  }, [open, initialSection])

  const update = (patch: Partial<WizardDraft>) => { dirtyRef.current = true; setDraft((prev) => ({ ...prev, ...patch })) }

  const applyRecipe = (r: typeof RECIPES[number]) => {
    dirtyRef.current = true
    setDraft((prev) => ({ ...EMPTY_DRAFT, ...r.preset, whatsappNumberId: prev.whatsappNumberId }))
    setRecipesOpen(false)
  }

  const scrollTo = (key: string) => {
    setActive(key)
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const requestClose = () => {
    if (dirtyRef.current && !saving) setAskClose(true)
    else onClose()
  }

  const summ = draft as unknown as Automation
  const suggestedName = (() => {
    const trig = triggerChipLabel(summ)
    const first = draft.actions?.[0]
    return first ? `${trig} → ${actionLabel(first)}` : trig
  })()

  const multiWabaNoLine = numbers.length > 1 && !draft.whatsappNumberId
  const canActivate = draft.actions.length > 0 && !multiWabaNoLine && !saving
  const canDraft = !multiWabaNoLine && !saving

  const save = async (status?: 'active' | 'draft') => {
    setSaving(true); setError(null)
    const payload: WizardDraft = {
      ...draft,
      name: draft.name.trim() || suggestedName,
      status: status ?? draft.status,
      whatsappNumberId: editTarget ? draft.whatsappNumberId : (draft.whatsappNumberId ?? smartDefault.lineId ?? null),
    }
    try {
      const res = editTarget
        ? await automationsApi.update(editTarget.id, payload)
        : await automationsApi.create(payload)
      dirtyRef.current = false
      onSaved(res.data)
      onClose()
    } catch {
      setError('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const registerRef = (key: string) => (el: HTMLDivElement | null) => { sectionRefs.current[key] = el }
  const TypeIcon = TYPE_CONFIG[draft.type]?.icon

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="builder-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={requestClose}
          />
          <motion.div
            key="builder-panel"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 0.9 }}
            className="fixed top-0 right-0 bottom-0 w-[min(72rem,95vw)] z-50 bg-surface-950 border-l overlay-frame flex flex-col"
          >
            {/* Header + resumo vivo */}
            <div className="flex items-start gap-3 px-6 py-4 border-b border-surface-800 flex-shrink-0">
              <div className="color-chip w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0" style={{ ['--chip']: 'var(--color-brand-500)' } as React.CSSProperties}>
                {TypeIcon ?? <Zap className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-surface-100">{editTarget ? 'Editar automação' : 'Nova automação'}</h2>
                <p className="text-[11px] text-surface-400 mt-0.5 leading-relaxed">{flowSummary(summ)}</p>
              </div>
              <button onClick={requestClose} className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-colors flex-shrink-0" aria-label="Fechar">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Corpo: mini-fluxo vertical + seções */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* Nav vertical (mini-fluxo) */}
              <nav className="w-52 flex-shrink-0 border-r border-surface-800 p-4 overflow-y-auto hidden sm:block">
                <div className="relative">
                  <div className="absolute left-[13px] top-4 bottom-4 w-px bg-surface-800" />
                  {SECTIONS.map((s) => {
                    const Icon = s.icon
                    const isActive = active === s.key
                    return (
                      <button key={s.key} onClick={() => scrollTo(s.key)} className="relative w-full flex items-center gap-3 py-2 text-left">
                        <span
                          className={cn(
                            'w-7 h-7 rounded-full flex items-center justify-center border z-10 transition-colors',
                            isActive ? 'color-chip' : 'bg-surface-900 border-surface-700 text-surface-500',
                          )}
                          style={isActive ? ({ ['--chip']: 'var(--color-brand-500)' } as React.CSSProperties) : undefined}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </span>
                        <span className={cn('text-xs font-medium transition-colors', isActive ? 'text-surface-100' : 'text-surface-400 hover:text-surface-200')}>
                          {s.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </nav>

              {/* Seções */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
                {/* Recipes (só criação) */}
                {!editTarget && recipesOpen && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-surface-200">Comece mais rápido</p>
                      <button onClick={() => setRecipesOpen(false)} className="text-[11px] text-surface-500 hover:text-surface-300 transition-colors">começar do zero</button>
                    </div>
                    <div className="grid grid-cols-3 auto-rows-fr gap-2">
                      {onDescribeWithAI && (
                        <button onClick={onDescribeWithAI} className="card-glow h-full text-left p-3 rounded-xl border border-surface-800 bg-surface-900">
                          <Wand2 className="w-4 h-4 text-brand-400 mb-1.5" />
                          <p className="text-xs font-semibold text-surface-100">Descrever com IA</p>
                          <p className="text-[10px] text-surface-400 mt-0.5 leading-relaxed">Explique o objetivo e o Copilot monta.</p>
                        </button>
                      )}
                      {RECIPES.map((r) => (
                        <button key={r.title} onClick={() => applyRecipe(r)} className="card-glow h-full text-left p-3 rounded-xl border border-surface-800 bg-surface-900">
                          <p className="text-xs font-semibold text-surface-200">{r.title}</p>
                          <p className="text-[10px] text-surface-500 mt-1 leading-relaxed">{r.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Linha WhatsApp (gate multi-WABA) */}
                <WhatsappLineRow
                  whatsappNumberId={draft.whatsappNumberId ?? smartDefault.lineId ?? null}
                  variant="callout"
                  onLineChange={(id) => update({ whatsappNumberId: id || null })}
                />

                <section ref={registerRef('gatilho')} className="scroll-mt-4">
                  <SectionTitle icon={Zap} title="Gatilho" hint="O que dispara a automação" />
                  <Step1 draft={draft} onChange={update} hideMeta />
                </section>

                <section ref={registerRef('condicoes')} className="scroll-mt-4">
                  <SectionTitle icon={GitBranch} title="Condições" hint="Filtros opcionais (E / OU)" />
                  <Step2 draft={draft} onChange={update} />
                </section>

                <section ref={registerRef('acoes')} className="scroll-mt-4">
                  <SectionTitle icon={Layers} title="Ações" hint="O que executar, em sequência" />
                  <Step3 draft={draft} onChange={update} hideAgentBehavior />
                </section>

                <section ref={registerRef('ia')} className="scroll-mt-4">
                  <SectionTitle icon={Sparkles} title="Coexistência com a IA" hint="Como o agente se comporta quando isto dispara" />
                  <AgentBehaviorSelector draft={draft} onChange={update} />
                </section>

                <section ref={registerRef('revisar')} className="scroll-mt-4">
                  <SectionTitle icon={ClipboardCheck} title="Revisar" hint="Nome e descrição — depois é só ativar" />
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-surface-300 mb-1.5">Nome</label>
                      <input
                        value={draft.name}
                        onChange={(e) => update({ name: e.target.value })}
                        placeholder={suggestedName}
                        className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3.5 py-2.5 text-sm text-surface-100 placeholder-surface-600 focus:outline-none focus:border-brand-600 transition-colors"
                      />
                      {!draft.name.trim() && (
                        <p className="text-[10px] text-surface-500 mt-1">Em branco, usamos: <span className="text-surface-300">{suggestedName}</span></p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-surface-300 mb-1.5">Descrição <span className="text-surface-600 font-normal">(opcional)</span></label>
                      <input
                        value={draft.description}
                        onChange={(e) => update({ description: e.target.value })}
                        placeholder="Descreva o objetivo desta automação"
                        className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3.5 py-2.5 text-sm text-surface-100 placeholder-surface-600 focus:outline-none focus:border-brand-600 transition-colors"
                      />
                    </div>
                  </div>
                </section>

                {error && <Banner variant="danger">{error}</Banner>}
              </div>
            </div>

            {/* Footer — status decidido no fim */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-surface-800 flex-shrink-0">
              <p className="text-[11px] text-surface-500">
                {draft.actions.length === 0 ? 'Adicione ao menos uma ação para ativar.' : `${draft.actions.length} ${draft.actions.length === 1 ? 'ação' : 'ações'} · pronto para ativar`}
              </p>
              <div className="flex items-center gap-2">
                {editTarget ? (
                  <button
                    onClick={() => save()}
                    disabled={!canActivate}
                    title={multiWabaNoLine ? 'Escolha a linha WhatsApp acima' : undefined}
                    className={cn('flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors',
                      canActivate ? 'bg-brand-600 text-surface-950 hover:bg-brand-500' : 'bg-surface-800 text-surface-600 cursor-not-allowed')}
                  >
                    {saving ? 'Salvando…' : 'Salvar alterações'} {!saving && <Check className="w-3.5 h-3.5" />}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => save('draft')}
                      disabled={!canDraft}
                      className={cn('px-4 py-2 rounded-xl text-xs font-medium border transition-colors',
                        canDraft ? 'border-surface-700 text-surface-300 hover:text-surface-100 hover:border-surface-600' : 'border-surface-800 text-surface-600 cursor-not-allowed')}
                    >
                      Salvar rascunho
                    </button>
                    <button
                      onClick={() => save('active')}
                      disabled={!canActivate}
                      title={multiWabaNoLine ? 'Escolha a linha WhatsApp acima' : draft.actions.length === 0 ? 'Adicione ao menos uma ação' : undefined}
                      className={cn('flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors',
                        canActivate ? 'bg-brand-600 text-surface-950 hover:bg-brand-500' : 'bg-surface-800 text-surface-600 cursor-not-allowed')}
                    >
                      {saving ? 'Salvando…' : 'Ativar automação'} {!saving && <Check className="w-3.5 h-3.5" />}
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Confirmação de descarte */}
          {askClose && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60" onClick={() => setAskClose(false)} />
              <div className="relative z-10 bg-surface-950 overlay-frame border rounded-2xl w-full max-w-sm p-6 text-center">
                <h3 className="text-sm font-semibold text-surface-100 mb-1">Descartar alterações?</h3>
                <p className="text-xs text-surface-500 mb-5">As mudanças não salvas serão perdidas.</p>
                <div className="flex gap-3">
                  <button onClick={() => setAskClose(false)} className="flex-1 py-2 rounded-xl border border-surface-700 text-surface-300 hover:text-surface-100 text-sm font-medium transition-colors">Continuar editando</button>
                  <button onClick={() => { setAskClose(false); onClose() }} className="flex-1 py-2 rounded-xl bg-danger hover:bg-danger/90 text-white text-sm font-semibold transition-colors">Descartar</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  )
}

function SectionTitle({ icon: Icon, title, hint }: { icon: React.ElementType; title: string; hint: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-surface-100 flex items-center gap-2">
        <Icon className="w-4 h-4 text-brand-400" /> {title}
      </h3>
      <p className="text-[11px] text-surface-500 mt-0.5 ml-6">{hint}</p>
    </div>
  )
}
