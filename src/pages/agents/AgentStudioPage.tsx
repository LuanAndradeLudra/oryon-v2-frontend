import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Loader2, Rocket, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { accentColor } from '@/components/ui/accentColor'
import { useStudioDraft } from '@/components/agents/studio/useStudioDraft'
import { STEP_LABELS, type WizardData } from '@/components/agents/studio/types'
import { StudioAccordion } from '@/components/agents/studio/blueprint/StudioAccordion'
import { BlueprintCard } from '@/components/agents/studio/blueprint/BlueprintCard'
import { StudioInsights } from '@/components/agents/studio/blueprint/StudioInsights'
import { StudioPreview } from '@/components/agents/studio/blueprint/StudioPreview'
import { Step4NegocioCompacto } from '@/components/agents/studio/blueprint/Step4NegocioCompacto'
import { Step6ConhecimentoCompacto } from '@/components/agents/studio/blueprint/Step6ConhecimentoCompacto'
import { Step1Identidade } from '@/components/agents/studio/steps/Step1Identidade'
import { Step2Personalidade } from '@/components/agents/studio/steps/Step2Personalidade'
import { Step3Escopo } from '@/components/agents/studio/steps/Step3Escopo'
import { Step5PassarParaHumano } from '@/components/agents/studio/steps/Step5PassarParaHumano'
import { Step7GerarPrompt } from '@/components/agents/studio/steps/Step7GerarPrompt'
import { Step8Revisao } from '@/components/agents/studio/steps/Step8Revisao'

/**
 * A3 — Studio blueprint (SCRUM-1014). Rota `/agents/new`.
 *
 * Em vez do wizard de formulário com painel-tutor, o agente é montado à vista:
 * as 8 etapas viram um acordeão à esquerda, o centro mostra o blueprint se
 * preenchendo, e a direita responde com o que já foi definido.
 *
 * Segundo shell sobre o `useStudioDraft` que a W0.3 extraiu — o wizard modal é
 * o primeiro. Os dois convivem por ora: apontar "Novo agente" para esta rota e
 * aposentar o modal é uma mudança pequena para depois que a `AgentsPage` virar
 * roteador fino (pendência 1 do `coord/A3-plano.md`).
 *
 * Passos 1, 2, 3, 5, 7 e 8 reusam os `Step*` da W0.3 inteiros. Os passos 4 e 6
 * têm corpo reduzido próprio, sob a regra "o Studio cria, o Workspace refina"
 * (`coord/A3-decisoes.md` §1).
 */
export function AgentStudioPage() {
  const navigate = useNavigate()
  const {
    data, setData,
    step, goNext, goBack, jumpToStep,
    validationError,
    publishing, publishError,
    publish,
    generating, generateError, generatePrompt,
  } = useStudioDraft()

  const total = STEP_LABELS.length
  const ultimo = step === total
  const pct = ((step - 1) / (total - 1)) * 100

  const passo = (Componente: React.ComponentType<{
    data: WizardData
    setData: React.Dispatch<React.SetStateAction<WizardData>>
  }>) => <Componente data={data} setData={setData} />

  const bodies: React.ReactNode[] = [
    passo(Step1Identidade),
    passo(Step2Personalidade),
    passo(Step3Escopo),
    passo(Step4NegocioCompacto),
    passo(Step5PassarParaHumano),
    passo(Step6ConhecimentoCompacto),
    <Step7GerarPrompt
      data={data} setData={setData}
      generating={generating} generateError={generateError} generatePrompt={generatePrompt}
    />,
    passo(Step8Revisao),
  ]

  const publicar = async (status: 'active' | 'draft') => {
    const agent = await publish(status)
    if (agent) navigate(`/agents/${agent.id}`)
  }

  return (
    <div className="flex flex-col h-full bg-surface-950">
      {/* ── TopBar ───────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-4 px-5 py-3 border-b border-surface-800 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-sm font-bold text-surface-50">Studio</h1>
          <p className="text-[11px] text-surface-500 truncate">
            Novo agente · {STEP_LABELS[step - 1]}
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-[220px] flex-shrink-0">
          {/* Barra de 4px local — o ui/ProgressBar é de 8px e sólido
              (coord/A3-decisoes.md §2). */}
          <div
            className="flex-1 h-1 rounded-full bg-surface-700 overflow-hidden"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={total}
            aria-label="Progresso do Studio"
          >
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${pct}%`,
                // Rampa da marca, como o mockup (#14B8A6 -> #2DD4BF). Tokens,
                // nunca hex — e os dois trocam junto com o tema.
                background: 'linear-gradient(90deg, var(--color-brand-500), var(--color-brand-cta))',
              }}
            />
          </div>
          <span className="text-[11px] font-mono text-surface-500 tabular-nums whitespace-nowrap">
            {step} / {total}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => void publicar('draft')}
            disabled={publishing}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-surface-800 border border-surface-700 text-surface-300 hover:text-surface-100 hover:border-surface-600 disabled:opacity-40 transition"
          >
            Salvar rascunho
          </button>
          {ultimo ? (
            <button
              type="button"
              onClick={() => void publicar('active')}
              disabled={publishing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-500 text-surface-950 disabled:opacity-40 transition"
            >
              {publishing
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
                : <Rocket className="w-3.5 h-3.5" aria-hidden />}
              Publicar e ativar
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-500 text-surface-950 transition"
            >
              Continuar
              <ChevronRight className="w-3.5 h-3.5" aria-hidden />
            </button>
          )}
        </div>
      </header>

      {(validationError || publishError) && (
        <div className="flex items-center gap-2 px-5 py-2 border-b border-surface-800 bg-danger/10 flex-shrink-0">
          <AlertCircle className="w-3.5 h-3.5 text-danger flex-shrink-0" aria-hidden />
          <p className="text-xs text-danger">{validationError ?? publishError}</p>
        </div>
      )}

      {/* ── 3 colunas: 340 / blueprint / 360 ─────────────────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[340px_1fr] xl:grid-cols-[340px_1fr_360px]">
        <div className="min-h-0 min-w-0">
          <StudioAccordion step={step} data={data} bodies={bodies} onJump={jumpToStep} />
        </div>

        <div
          className="min-h-0 min-w-0 overflow-y-auto px-7 py-6"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, color-mix(in srgb, ${accentColor('brand')} 7%, transparent), transparent 55%)`,
          }}
        >
          <BlueprintCard data={data} step={step} />
          <div className="mt-3.5">
            <StudioInsights data={data} setData={setData} step={step} />
          </div>

          {/* Voltar mora aqui embaixo: no TopBar só ficam avançar e publicar,
              como o mockup. */}
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              className={cn(
                'mt-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                'text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition',
              )}
            >
              <ChevronLeft className="w-3.5 h-3.5" aria-hidden />
              Voltar para {STEP_LABELS[step - 2]}
            </button>
          )}
        </div>

        {/* Abaixo de xl a prévia sai: com 3 colunas em telas estreitas nenhuma
            das três fica utilizável. */}
        <div className="min-h-0 min-w-0 hidden xl:block">
          <StudioPreview data={data} />
        </div>
      </div>
    </div>
  )
}
