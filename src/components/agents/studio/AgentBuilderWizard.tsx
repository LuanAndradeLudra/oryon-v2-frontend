import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Zap, AlertCircle, Loader2, Sparkles } from 'lucide-react'
import type { AgentConfigWithTools } from '@/services/agentsApi'
import { ConfirmModal } from '@/components/ui/Modal'
import { WizardProgress } from '@/components/ui/WizardProgress'
import { STEP_TEACHINGS } from '@/components/agents/agentBuilderTeachings'
import { STEP_LABELS } from './types'
import { useStudioDraft } from './useStudioDraft'
import { Step1Identidade } from './steps/Step1Identidade'
import { Step2Personalidade } from './steps/Step2Personalidade'
import { Step3Escopo } from './steps/Step3Escopo'
import { Step4Negocio } from './steps/Step4Negocio'
import { Step5PassarParaHumano } from './steps/Step5PassarParaHumano'
import { Step6BaseConhecimento } from './steps/Step6BaseConhecimento'
// NOTA (extração W0.3): os nomes das funções abaixo, no arquivo monolítico
// original, eram `Step6` (Gerar Prompt) e `Step7` (Revisão) — fora de
// sincronia com STEP_LABELS por causa do passo "Base de Conhecimento"
// inserido no meio sem renumerar o resto. Aqui os arquivos/nomes seguem o
// rótulo real que a UI mostra (ver W0.3-mapa.md, item 1).
import { Step7GerarPrompt } from './steps/Step7GerarPrompt'
import { Step8Revisao } from './steps/Step8Revisao'

// ─── Animated background orbs ────────────────────────────────────────────────

function BackgroundOrbs() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <motion.div
        animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-brand-600/8 blur-3xl"
      />
      <motion.div
        animate={{ x: [0, -50, 30, 0], y: [0, 40, -25, 0], scale: [1, 0.9, 1.05, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-indigo-700/8 blur-3xl"
      />
      <motion.div
        animate={{ x: [0, 30, -40, 0], y: [0, -20, 35, 0], scale: [1, 1.15, 0.9, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
        className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-brand-500/5 blur-3xl"
      />
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{ backgroundImage: 'radial-gradient(circle, #6366f1 1px, transparent 1px)', backgroundSize: '40px 40px' }}
      />
    </div>
  )
}

// ─── Wizard root ──────────────────────────────────────────────────────────────

interface AgentBuilderWizardProps {
  onClose: () => void
  onCreated: (agent: AgentConfigWithTools) => void
}

export function AgentBuilderWizard({ onClose, onCreated }: AgentBuilderWizardProps) {
  const {
    data, setData,
    step, goNext, goBack, jumpToStep,
    validationError,
    isDirty,
    publishing, publishError,
    publish,
    generating, generateError, generatePrompt,
  } = useStudioDraft()
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false)

  const handleCloseClick = () => {
    if (publishing) return
    if (isDirty) { setCloseConfirmOpen(true); return }
    onClose()
  }

  const handlePublish = async (status: 'active' | 'draft') => {
    const agent = await publish(status)
    if (agent) onCreated(agent)
  }

  const teaching = STEP_TEACHINGS[step - 1]
  const TeachingIcon = teaching.icon

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 bg-surface-950"
    >
          <div className="h-full flex overflow-hidden relative">
            <BackgroundOrbs />

            {/* ── LEFT TUTOR PANEL ─────────────────────────────────────── */}
            <div className="relative z-10 w-80 flex-shrink-0 flex flex-col border-r border-surface-800/60 bg-surface-950/80 backdrop-blur-sm">
              {/* Brand header + close */}
              <div className="flex items-center gap-3 px-8 pt-8 pb-6 border-b border-surface-800/60 flex-shrink-0">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-900/50 flex-shrink-0"
                >
                  <Zap className="w-4 h-4 text-surface-950" fill="currentColor" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">Studio</p>
                  <h1 className="text-sm font-bold text-surface-50 truncate">Criar Agente IA</h1>
                </div>
                <button
                  onClick={handleCloseClick}
                  disabled={publishing}
                  aria-label="Fechar"
                  className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition disabled:opacity-40"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Teaching content — fills remaining height, scrolls if needed */}
              <div className="flex-1 overflow-y-auto px-8 py-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`teach-${step}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0"
                        style={{
                          color: teaching.accent,
                          backgroundColor: `color-mix(in srgb, ${teaching.accent} 18%, transparent)`,
                          borderColor: `color-mix(in srgb, ${teaching.accent} 32%, transparent)`,
                        }}
                      >
                        <TeachingIcon className="w-4.5 h-4.5" />
                      </div>
                      <h2 className="text-base font-bold text-surface-100 leading-tight">{teaching.title}</h2>
                    </div>
                    <p className="text-sm text-surface-400 leading-relaxed mb-6">{teaching.description}</p>
                    <div className="flex flex-col gap-3">
                      {teaching.tips.map((tip, i) => {
                        const TipIcon = tip.icon
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.25, delay: 0.1 + i * 0.07 }}
                            className="flex items-start gap-2.5"
                          >
                            <div className="w-6 h-6 rounded-md bg-surface-800 border border-surface-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <TipIcon className="w-3 h-3 text-brand-400" />
                            </div>
                            <p className="text-xs text-surface-500 leading-relaxed">{tip.text}</p>
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Nav buttons + errors */}
              <div className="px-8 pt-4 pb-8 border-t border-surface-800/60 flex flex-col gap-2 flex-shrink-0">
                {step < 8 && validationError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-1 text-xs text-danger flex items-start gap-1.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> <span>{validationError}</span>
                  </motion.p>
                )}
                {step === 8 && publishError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-1 text-xs text-danger flex items-start gap-1.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> <span>{publishError}</span>
                  </motion.p>
                )}
                {step === 8 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePublish('active')}
                      disabled={publishing || !data.generated_prompt}
                      className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-surface-950 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-900/40"
                    >
                      {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      {publishing ? 'Publicando...' : 'Publicar agente'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePublish('draft')}
                      disabled={publishing}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium text-surface-300 hover:text-surface-100 hover:bg-surface-800 border border-surface-800 transition-all disabled:opacity-50"
                    >
                      Salvar como rascunho
                    </button>
                    <button
                      type="button"
                      onClick={goBack}
                      disabled={publishing}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium text-surface-500 hover:text-surface-300 transition-all disabled:opacity-50"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Voltar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={step === 7 && !data.generated_prompt}
                      className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-surface-950 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-900/40"
                    >
                      {step === 7 ? <><Sparkles className="w-4 h-4" /> Revisar</> : <>Continuar <ChevronRight className="w-4 h-4" /></>}
                    </button>
                    {step > 1 && (
                      <button
                        type="button"
                        onClick={goBack}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium text-surface-300 hover:text-surface-100 hover:bg-surface-800 border border-surface-800 transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" /> Voltar
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* ── RIGHT FORM PANEL ─────────────────────────────────────── */}
            <div className="relative z-10 flex-1 flex flex-col">
              {/* Sticky top: progress bar + horizontal stepper */}
              <WizardProgress
                steps={STEP_LABELS}
                currentStep={step}
                onStepClick={jumpToStep}
                className="flex-shrink-0 bg-surface-950/85 backdrop-blur-md border-b border-surface-800/40"
              />

              {/* Scrollable form content */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-10 py-8">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`form-${step}`}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -24 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                      <div className="bg-surface-900/70 backdrop-blur-sm overlay-frame border rounded-2xl p-6">
                        {step === 1 && <Step1Identidade data={data} setData={setData} />}
                        {step === 2 && <Step2Personalidade data={data} setData={setData} />}
                        {step === 3 && <Step3Escopo data={data} setData={setData} />}
                        {step === 4 && <Step4Negocio data={data} setData={setData} />}
                        {step === 5 && <Step5PassarParaHumano data={data} setData={setData} />}
                        {step === 6 && <Step6BaseConhecimento data={data} setData={setData} />}
                        {step === 7 && (
                          <Step7GerarPrompt
                            data={data} setData={setData}
                            generating={generating} generateError={generateError} generatePrompt={generatePrompt}
                          />
                        )}
                        {step === 8 && <Step8Revisao data={data} setData={setData} />}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

      <ConfirmModal
        open={closeConfirmOpen}
        onClose={() => setCloseConfirmOpen(false)}
        onConfirm={() => { setCloseConfirmOpen(false); onClose() }}
        title="Descartar agente em criação?"
        description={`Você está na etapa ${step} de ${STEP_LABELS.length}. Ao fechar agora, todo o progresso feito neste agente será perdido.`}
        confirmLabel="Descartar"
        danger
      />
    </motion.div>
  )
}
