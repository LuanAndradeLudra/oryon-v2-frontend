import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, GitBranch, Layers, Sparkles, ClipboardCheck, Wand2 } from 'lucide-react'
import type { Automation } from '@/types'
import { automationsApi } from '@/services/api'
import { useSmartLineDefault } from '@/hooks/useSmartLineDefault'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import { WhatsappLineRow } from '@/components/copilot/WhatsappLineRow'
import { Banner } from '@/components/ui/Banner'
import { cn, formatRelativeTime } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
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
  const [visited, setVisited] = useState<Set<string>>(new Set(['gatilho']))
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
    setVisited((prev) => (prev.has(key) ? prev : new Set(prev).add(key)))
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Bolinha de estado do nav (tela 2b): verde = seção com conteúdo válido,
  // âmbar = seção obrigatória (gatilho/ações) já visitada e ainda vazia,
  // vazio = ainda não visitada. Condições/IA são opcionais — nunca âmbar.
  const sectionStatus = (key: string): 'ok' | 'pending' | 'unvisited' => {
    const has = (() => {
      switch (key) {
        case 'gatilho':   return !!draft.trigger?.type
        case 'condicoes': return (draft.conditions?.length ?? 0) > 0
        case 'acoes':     return draft.actions.length > 0
        case 'ia':        return true // sempre tem default ('auto')
        case 'revisar':   return draft.name.trim().length > 0
        default:          return false
      }
    })()
    if (has) return 'ok'
    if (!visited.has(key)) return 'unvisited'
    return (key === 'gatilho' || key === 'acoes') ? 'pending' : 'unvisited'
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
            className="fixed top-0 right-0 bottom-0 w-[min(880px,95vw)] z-50 bg-surface-800 border-l overlay-frame flex flex-col"
          >
            {/* Header — R2-AUTO-01 (mock 2b): título 14/700 + subtítulo 12 --tx2 (resumo vivo),
                chip de estado e X; sem tile de ícone. */}
            <div className="flex items-start gap-3 px-5 min-h-14 py-2.5 border-b border-surface-700 flex-shrink-0">
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-bold tracking-[-0.01em] text-surface-100">{editTarget ? (editTarget.name || 'Editar automação') : 'Nova automação'}</h2>
                <p className="text-[11.5px] text-surface-400 leading-[1.25] mt-0.5">{flowSummary(summ)}</p>
              </div>
              {editTarget && (
                <span className={cn(
                  'inline-flex items-center gap-1 h-5 px-[7px] rounded-[5px] text-[11px] font-bold flex-shrink-0 mt-0.5',
                  editTarget.status === 'active' ? 'color-chip-soft border [--chip:var(--color-status-active)]'
                    : editTarget.status === 'inactive' ? 'color-chip-soft border [--chip:var(--color-status-pending)]'
                    : 'bg-[var(--sf2)] border border-surface-700 text-surface-400',
                )}>
                  {editTarget.status === 'active' ? 'Ativa' : editTarget.status === 'inactive' ? 'Pausada' : 'Rascunho'}
                </span>
              )}
              <button onClick={requestClose} className="w-7 h-7 flex items-center justify-center rounded-sm text-surface-400 hover:text-surface-200 hover:bg-[var(--rowhover)] transition-colors flex-shrink-0" aria-label="Fechar">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Corpo: mini-fluxo vertical + seções */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* Nav vertical (mini-fluxo) */}
              <nav className="w-[200px] flex-shrink-0 border-r border-surface-700 bg-[var(--sf2)] px-2.5 py-3.5 overflow-y-auto hidden sm:block">
                <div className="flex flex-col gap-0.5">
                  {SECTIONS.map((s) => {
                    const isActive = active === s.key
                    const status = sectionStatus(s.key)
                    // Contagem no nav (tela 2b, "Ações · 3") — só pras 2
                    // seções com lista real (condições/ações); "1 · pendente"
                    // etc não existe, então mostro só quando > 0.
                    const count = s.key === 'acoes' ? draft.actions.length
                      : s.key === 'condicoes' ? (draft.conditions?.length ?? 0)
                      : 0
                    return (
                      <button
                        key={s.key}
                        onClick={() => scrollTo(s.key)}
                        className={cn(
                          'w-full flex items-center gap-2 h-[30px] px-2.5 rounded-xs border text-left transition-colors',
                          isActive
                            ? 'bg-surface-800 border-surface-700'
                            : 'border-transparent hover:bg-surface-800/50',
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            'w-1.5 h-1.5 rounded-full flex-shrink-0',
                            status === 'ok' && 'bg-online',
                            status === 'pending' && 'bg-away',
                            status === 'unvisited' && 'border border-[var(--bd2)]',
                          )}
                        />
                        <span className={cn('flex-1 min-w-0 truncate text-[12.5px] transition-colors', isActive ? 'text-surface-100 font-semibold' : 'text-surface-400 font-medium')}>
                          {s.label}
                        </span>
                        {count > 0 && (
                          <span className="text-[11px] tabular-nums text-surface-500 flex-shrink-0">{count}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </nav>

              {/* Seções */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-[22px]">
                {/* Recipes (só criação) */}
                {!editTarget && recipesOpen && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-surface-200">Comece mais rápido</p>
                      <button onClick={() => setRecipesOpen(false)} className="text-[11px] text-surface-500 hover:text-surface-300 transition-colors">começar do zero</button>
                    </div>
                    <div className="grid grid-cols-3 auto-rows-fr gap-2">
                      {onDescribeWithAI && (
                        <button onClick={onDescribeWithAI} className="h-full text-left p-3 rounded-lg border border-surface-700 bg-surface-800 hover:bg-[var(--rowhover)] transition-colors">
                          {/* Wand2 não tem versão desenhada da casa em
                              lib/icons.tsx — cai no lucide cru, traço 2 em
                              vez de 1.75. strokeWidth explícito por enquanto
                              (DECISOES-PENDENTES #18, "corrigido caso a
                              caso"). */}
                          <Wand2 className="w-4 h-4 text-brand-400 mb-1.5" strokeWidth={1.75} />
                          <p className="text-xs font-semibold text-surface-100">Descrever com IA</p>
                          <p className="text-[10px] text-surface-400 mt-0.5 leading-relaxed">Explique o objetivo e o Copilot monta.</p>
                        </button>
                      )}
                      {RECIPES.map((r) => (
                        <button key={r.title} onClick={() => applyRecipe(r)} className="h-full text-left p-3 rounded-lg border border-surface-700 bg-surface-800 hover:bg-[var(--rowhover)] transition-colors">
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
                  <SectionTitle active={active === 'gatilho'} title="Gatilho" hint="O que dispara a automação" />
                  <Step1 draft={draft} onChange={update} hideMeta />
                </section>

                <section ref={registerRef('condicoes')} className="scroll-mt-4">
                  <SectionTitle active={active === 'condicoes'} title="Condições" hint="Filtros opcionais (E / OU)" />
                  <Step2 draft={draft} onChange={update} />
                </section>

                <section ref={registerRef('acoes')} className="scroll-mt-4">
                  <SectionTitle active={active === 'acoes'} title="Ações" hint="O que executar, em sequência" />
                  <Step3 draft={draft} onChange={update} hideAgentBehavior />
                </section>

                <section ref={registerRef('ia')} className="scroll-mt-4">
                  <SectionTitle active={active === 'ia'} title="Coexistência com a IA" hint="Como o agente se comporta quando isto dispara" />
                  <AgentBehaviorSelector draft={draft} onChange={update} />
                </section>

                <section ref={registerRef('revisar')} className="scroll-mt-4">
                  <SectionTitle active={active === 'revisar'} title="Revisar" hint="Nome e descrição — depois é só ativar" />
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-surface-300 mb-1.5">Nome</label>
                      <input
                        value={draft.name}
                        onChange={(e) => update({ name: e.target.value })}
                        placeholder={suggestedName}
                        className="w-full bg-surface-800 border border-[var(--bd2)] rounded-sm px-2.5 py-2 text-[13px] text-surface-100 placeholder-surface-500 focus:outline-none focus:border-brand-500 transition-colors"
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
                        className="w-full bg-surface-800 border border-[var(--bd2)] rounded-sm px-2.5 py-2 text-[13px] text-surface-100 placeholder-surface-500 focus:outline-none focus:border-brand-500 transition-colors"
                      />
                    </div>
                  </div>
                </section>

                {error && <Banner variant="danger">{error}</Banner>}
              </div>
            </div>

            {/* Footer — R2-AUTO-02 (mock 2b): "Alterado há N min" à esquerda (updatedAt
                real; "não publicado" não existe — não há versão publicada),
                botões do sistema (neutral/primary, raio 7). */}
            <div className="flex items-center justify-between h-[60px] px-5 border-t border-surface-700 flex-shrink-0">
              <p className="text-xs text-surface-500">
                {editTarget
                  ? `Alterado ${formatRelativeTime(editTarget.updatedAt)}${draft.actions.length === 0 ? ' · adicione ao menos uma ação para ativar' : ''}`
                  : draft.actions.length === 0 ? 'Adicione ao menos uma ação para ativar.' : `${draft.actions.length} ${draft.actions.length === 1 ? 'ação' : 'ações'} · pronto para ativar`}
              </p>
              <div className="flex items-center gap-2">
                {editTarget ? (
                  <Button
                    onClick={() => save()}
                    disabled={!canActivate}
                    loading={saving}
                    title={multiWabaNoLine ? 'Escolha a linha WhatsApp acima' : undefined}
                  >
                    Salvar alterações
                  </Button>
                ) : (
                  <>
                    <Button variant="neutral" onClick={() => save('draft')} disabled={!canDraft}>
                      Salvar rascunho
                    </Button>
                    <Button
                      onClick={() => save('active')}
                      disabled={!canActivate}
                      loading={saving}
                      title={multiWabaNoLine ? 'Escolha a linha WhatsApp acima' : draft.actions.length === 0 ? 'Adicione ao menos uma ação' : undefined}
                    >
                      Ativar automação
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>

          {/* Confirmação de descarte */}
          {askClose && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              {/* Eixo 10: scrim do token (--color-scrim-soft), não bg-black/60
                  cru — o Modal primitivo (MODAL-07) usa o token porque preto
                  cru fica errado no tema claro; largura 400px, igual ao
                  ConfirmModal (canvas). */}
              <div className="absolute inset-0 bg-[var(--color-scrim-soft)]" onClick={() => setAskClose(false)} />
              <div className="relative z-10 bg-surface-800 overlay-frame border rounded-xl w-full max-w-[400px] p-6 text-center">
                <h3 className="text-sm font-semibold text-surface-100 mb-1">Descartar alterações?</h3>
                <p className="text-xs text-surface-500 mb-5">As mudanças não salvas serão perdidas.</p>
                <div className="flex gap-3">
                  <button onClick={() => setAskClose(false)} className="flex-1 py-2 rounded-sm border border-[var(--bd2)] text-surface-300 hover:text-surface-100 text-sm font-medium transition-colors">Continuar editando</button>
                  <button onClick={() => { setAskClose(false); onClose() }} className="flex-1 py-2 rounded-sm bg-danger hover:bg-danger/90 text-white text-sm font-semibold transition-colors">Descartar</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  )
}

// R2-AUTO-03 (mock 2b): título de seção = eyebrow 10/700 .14em uppercase --tx3,
// dica inline (11px --tx3) — sem ícone e sem linha de descrição abaixo.
function SectionTitle({ title, hint, active }: { title: string; hint: string; active?: boolean }) {
  return (
    <div className="mb-2.5 flex items-baseline gap-2">
      <h3 className={cn('text-[10px] font-bold uppercase tracking-[.14em]', active ? 'text-accent-dark' : 'text-surface-500')}>{title}</h3>
      <p className="text-[11.5px] text-surface-500 truncate">{hint}</p>
    </div>
  )
}
