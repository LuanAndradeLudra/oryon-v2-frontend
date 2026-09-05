import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, AlertCircle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PromptArtifact } from '@/components/agents/PromptArtifact'
import type { WizardData } from '../types'
import { TONES } from './constants'
import { PromptReviewModal } from './PromptReviewModal'

// ─── Prompt Generating Animation ─────────────────────────────────────────────

// NOTA (extração W0.3): PROMPT_PHASES não é usado em lugar nenhum hoje (dead
// code já no arquivo original AgentBuilderWizard.tsx, ficava logo antes de
// GENERATION_STEPS). Movido como estava, sem apagar — não exportado pra não
// disparar react-refresh/only-export-components neste arquivo (que também
// exporta o componente Step7GerarPrompt).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PROMPT_PHASES = [
  'Analisando identidade e setor do agente',
  'Definindo tom e estilo de comunicação',
  'Estruturando capacidades e restrições',
  'Incorporando dados do negócio e FAQs',
  'Mapeando regras de escalada e handoffs',
  'Redigindo seções do system prompt',
  'Refinando linguagem e coesão do texto',
]

const GENERATION_STEPS = [
  {
    id: 'identity',
    label: 'Analisando identidade e setor do agente',
    details: ['Lendo nome, setor e objetivo configurados…', 'Mapeando perfil do público-alvo…', 'Identificando nicho de mercado…', 'Estabelecendo contexto da empresa…'],
  },
  {
    id: 'tone',
    label: 'Definindo tom e estilo de comunicação',
    details: ['Calibrando nível de formalidade…', 'Selecionando vocabulário por setor…', 'Ajustando ritmo e tamanho das respostas…', 'Definindo padrões de abertura e encerramento…'],
  },
  {
    id: 'structure',
    label: 'Estruturando seções do system prompt',
    details: ['Organizando hierarquia de instruções…', 'Definindo seções obrigatórias…', 'Montando fluxo lógico de atendimento…', 'Planejando exemplos de diálogo…'],
  },
  {
    id: 'scope',
    label: 'Incorporando capacidades e restrições',
    details: ['Listando o que o agente pode fazer…', 'Definindo limites e comportamentos proibidos…', 'Integrando FAQs configuradas…', 'Incluindo contexto adicional do negócio…'],
  },
  {
    id: 'handoff',
    label: 'Mapeando regras de escalada e handoffs',
    details: ['Processando palavras-chave de transferência…', 'Configurando condições de escalada…', 'Definindo departamentos de destino…', 'Ajustando respostas de handoff…'],
  },
  {
    id: 'draft',
    label: 'Redigindo o prompt em linguagem natural',
    details: ['Escrevendo instruções em segunda pessoa…', 'Adicionando exemplos concretos de diálogo…', 'Refinando clareza e objetividade…', 'Expandindo edge cases e situações difíceis…'],
  },
  {
    id: 'review',
    label: 'Validando coerência e qualidade final',
    details: ['Verificando consistência das instruções…', 'Revisando tom em todas as seções…', 'Contando palavras e completude…', 'Finalizando e enviando o prompt…'],
  },
]

// Step duration: ~10s each × 7 steps = ~70s, matching the API response time
const STEP_DURATION_MS = 10_000
const DETAIL_CYCLE_MS  = 2_400

function PromptGeneratingAnimation() {
  const [completedSteps, setCompletedSteps] = useState(0)
  const [detailIdx, setDetailIdx]           = useState(0)
  const [elapsed, setElapsed]               = useState(0)

  // Advance steps at STEP_DURATION_MS intervals; last step stays active until API responds
  useEffect(() => {
    if (completedSteps >= GENERATION_STEPS.length - 1) return
    const t = setTimeout(() => {
      setCompletedSteps(s => s + 1)
      setDetailIdx(0)
    }, STEP_DURATION_MS)
    return () => clearTimeout(t)
  }, [completedSteps])

  // Cycle detail text within the active step
  useEffect(() => {
    const step = GENERATION_STEPS[completedSteps]
    if (!step) return
    const t = setInterval(() => setDetailIdx(d => (d + 1) % step.details.length), DETAIL_CYCLE_MS)
    return () => clearInterval(t)
  }, [completedSteps])

  // Elapsed-time counter
  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const progressPct = Math.round((completedSteps / GENERATION_STEPS.length) * 100)
  const elapsedLabel = elapsed < 60
    ? `${elapsed}s`
    : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-brand-500/25 bg-surface-900/80 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-surface-800 bg-surface-900">
        {/* Pulsing orb */}
        <div className="relative flex-shrink-0">
          {[0, 1].map(ring => (
            <motion.div
              key={ring}
              className="absolute inset-0 rounded-full border border-brand-400/30"
              animate={{ scale: [1, 1.7 + ring * 0.4], opacity: [0.5, 0] }}
              transition={{ repeat: Infinity, duration: 2, delay: ring * 0.6, ease: 'easeOut' }}
            />
          ))}
          <div className="w-6 h-6 rounded-full bg-brand-600/20 border border-brand-500/40 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
            >
              <Sparkles className="w-3 h-3 text-brand-400" />
            </motion.div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-surface-200">Gerando System Prompt</span>
          <AnimatePresence mode="wait">
            <motion.p
              key={`${completedSteps}-${detailIdx}`}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.25 }}
              className="text-[11px] text-brand-400/80 truncate"
            >
              {GENERATION_STEPS[completedSteps]?.details[detailIdx]}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          <span className="text-[11px] text-brand-400 font-mono font-semibold">{progressPct}%</span>
          <span className="text-[10px] text-surface-600 font-mono">{elapsedLabel}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-surface-800">
        <motion.div
          className="h-full bg-gradient-to-r from-brand-600 via-brand-400 to-brand-300"
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </div>

      {/* Steps list */}
      <div className="px-4 py-3 space-y-1.5">
        {GENERATION_STEPS.map((step, i) => {
          const done    = i < completedSteps
          const active  = i === completedSteps
          const pending = i > completedSteps
          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: pending ? 0.28 : 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className={cn(
                'flex items-center gap-3 rounded-lg px-2.5 py-1.5 transition-colors',
                active && 'bg-brand-600/6 ring-1 ring-brand-500/15',
              )}
            >
              {/* Status icon */}
              <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                {done ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 350 }}
                    className="w-4 h-4 rounded-full bg-brand-600/25 border border-brand-500/50 flex items-center justify-center"
                  >
                    <Check className="w-2 h-2 text-brand-400" />
                  </motion.div>
                ) : active ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-3.5 h-3.5 rounded-full border-2 border-brand-500/25 border-t-brand-400"
                  />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-surface-700" />
                )}
              </div>

              {/* Label */}
              <span className={cn(
                'text-xs flex-1 transition-colors',
                done    && 'text-surface-500 line-through decoration-surface-700',
                active  && 'text-surface-100 font-medium',
                pending && 'text-surface-600',
              )}>
                {step.label}
              </span>

              {/* Active step: time indicator */}
              {active && (
                <div className="flex gap-0.5 items-center">
                  {[0, 1, 2].map(d => (
                    <motion.span
                      key={d}
                      animate={{ opacity: [0.2, 1, 0.2], scaleY: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 1.4, delay: d * 0.22 }}
                      className="w-0.5 h-2.5 rounded-full bg-brand-400 origin-bottom"
                    />
                  ))}
                </div>
              )}

              {/* Done step: subtle timestamp */}
              {done && (
                <Check className="w-3 h-3 text-brand-600/60 flex-shrink-0" />
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t border-surface-800/60 bg-surface-900/40">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="w-1.5 h-1.5 rounded-full bg-brand-400"
        />
        <p className="text-[11px] text-surface-500">
          Prompts completos levam entre 60 e 90 segundos — o resultado aparecerá aqui
        </p>
      </div>
    </motion.div>
  )
}

// ─── Step 7: Gerar Prompt ─────────────────────────────────────────────────────
// NOTA (extração W0.3): esta função se chamava `Step6` no arquivo original
// (AgentBuilderWizard.tsx) — nome fora de sincronia com STEP_LABELS por causa
// de um passo (Base de Conhecimento) inserido no meio sem renumerar o resto.
// Renomeada aqui pelo rótulo real ("Gerar Prompt", passo 7 de 8).

export function Step7GerarPrompt({
  data, setData, generating, generateError, generatePrompt,
}: {
  data: WizardData
  setData: React.Dispatch<React.SetStateAction<WizardData>>
  generating: boolean
  generateError: string | null
  generatePrompt: () => Promise<string | null>
}) {
  const [manualMode, setManualMode] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)

  const generate = useCallback(async () => {
    const prompt = await generatePrompt()
    // Open the review modal right after a successful generation so the user
    // can read the full prompt comfortably and edit before confirming.
    //
    // `!== null` e nao `if (prompt)`: o hook so devolve null quando a geracao
    // FALHA — string vazia e um retorno de sucesso legal. Com o truthy check,
    // um prompt vazio parava o spinner sem abrir modal e sem erro (no-op
    // silencioso), enquanto o comportamento original abria o modal mesmo
    // vazio. Achado pelo Lince na revisao do #122.
    if (prompt !== null) setReviewOpen(true)
  }, [generatePrompt])

  const summaryItems = [
    { label: 'Agente',       value: data.name },
    { label: 'Tom',          value: TONES.find(t => t.value === data.tone)?.label ?? '—' },
    { label: 'Empresa',      value: data.company_name || '—' },
    { label: 'Capacidades',  value: `${data.can_do.length} configuradas` },
    { label: 'Restrições',   value: `${data.cannot_do.length} configuradas` },
    { label: 'FAQs',         value: `${data.faqs.filter(f => f.question).length} perguntas` },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-surface-100">Gerar System Prompt com IA</h2>
        <p className="text-sm text-surface-500 mt-0.5">
          A IA irá criar um prompt completo e robusto com base em tudo que você configurou.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {summaryItems.map(({ label, value }) => (
          <div key={label} className="bg-surface-900/60 border border-surface-800 rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-surface-600 uppercase tracking-wide">{label}</p>
            <p className="text-sm text-surface-200 font-medium truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* Idle state — ready to generate */}
      {!data.generated_prompt && !manualMode && !generating && (
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-600/10 ring-1 ring-brand-500/20 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-brand-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-surface-200">Pronto para gerar</p>
            <p className="text-xs text-surface-500 mt-1">O prompt terá entre 1.200 e 2.500 palavras, estruturado em seções claras</p>
          </div>
          <button
            type="button" onClick={generate}
            className="inline-flex items-center gap-2.5 px-7 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-surface-950 font-medium transition-all shadow-lg shadow-brand-900/40"
          >
            <Sparkles className="w-5 h-5" />
            Gerar System Prompt com IA
          </button>
          {generateError && (
            <div className="flex flex-col items-center gap-2 text-center">
              <p className="text-xs text-danger flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> {generateError}
              </p>
              <button
                type="button" onClick={() => setManualMode(true)}
                className="text-xs text-surface-500 hover:text-surface-300 underline transition"
              >
                Escrever o prompt manualmente
              </button>
            </div>
          )}
        </div>
      )}

      {/* Generating animation */}
      {generating && <PromptGeneratingAnimation />}

      {/* Completed — collapsed inline preview (first 10 lines).
          Editing happens only in the modal; both views share data.generated_prompt. */}
      {data.generated_prompt && !generating && !manualMode && (
        <PromptArtifact
          content={data.generated_prompt}
          previewLines={8}
          onExpand={() => setReviewOpen(true)}
          onRegenerate={generate}
          regenerating={generating}
        />
      )}

      {/* Manual mode — plain textarea */}
      {manualMode && (
        <div className="space-y-2">
          <p className="text-xs text-surface-500">System prompt — modo manual</p>
          <textarea
            value={data.generated_prompt}
            onChange={e => setData(d => ({ ...d, generated_prompt: e.target.value }))}
            rows={18} maxLength={10000}
            placeholder="Escreva o system prompt do agente aqui..."
            className="w-full bg-surface-900/80 border border-surface-800 rounded-xl px-4 py-3 text-xs text-surface-300 font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition"
          />
          <p className="text-right text-xs text-surface-700">{data.generated_prompt.length.toLocaleString()} caracteres</p>
        </div>
      )}

      {/* Review modal — opens automatically after generation, reopenable from card */}
      <PromptReviewModal
        open={reviewOpen}
        initialPrompt={data.generated_prompt}
        onClose={() => setReviewOpen(false)}
        onConfirm={(prompt) => {
          setData(d => ({ ...d, generated_prompt: prompt }))
          setReviewOpen(false)
        }}
        onRegenerate={generate}
        regenerating={generating}
      />
    </div>
  )
}
