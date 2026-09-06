// ─── OnboardingChecklist ───────────────────────────────────────────────────
// O card `.onb` inteiro: cabeçalho com anel de progresso + as 3 linhas.
//
// A tela existe porque o vazio de Disparos tem pré-requisitos REAIS. Um botão
// "criar campanha" levaria a um wizard que falha na etapa 1; o checklist
// mostra por que ainda não dá, e o que fazer sobre isso.
//
// Apresentação pura: quem calcula o estado é `onboardingState.ts`, e quem
// busca os dados é a casca. Aqui só há o desenho e o despacho das ações.
//
// As ações navegam por `useNavigate` em vez de `<Link>` estilizado: o
// `ui/Button` não tem `asChild` e `ui/` está congelado, e copiar as classes do
// Button para dentro de um `<Link>` criaria uma segunda fonte de verdade para
// o mesmo botão. O mockup também desenha `<button>`, não `<a>`.
import { useNavigate } from 'react-router-dom'
import { Plus, Download, Clock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { RingProgress } from '@/components/ui/RingProgress'
import { OnboardingStep } from './OnboardingStep'
import type { OnboardingState } from './onboardingState'

interface OnboardingChecklistProps {
  state: OnboardingState
  /** Abre o criador de template já aberto — não só navega até a aba. */
  onCreateTemplate: () => void
  onImportFromMeta: () => void
  importing?: boolean
  /** Selo de qualidade da linha, quando quem está olhando pode vê-lo.
   *  `/meta/health` é admin-only: para os demais não vem nada, em vez de um
   *  valor vazio ou de uma chamada que sabidamente dá 403. */
  lineQuality?: string
  /** O Composer ainda pode não existir: a D2c entrega a tela de verdade. Sem
   *  ela, o passo 3 fica desabilitado COM O MOTIVO em vez de habilitado
   *  apontando para um esqueleto — mandar alguém para o vazio no fim de um
   *  checklist de onboarding é o pior lugar possível para um beco. */
  composerReady: boolean
}

const STEP_COPY = {
  line: {
    title: 'Conectar uma linha de WhatsApp',
    description: 'Sem uma linha conectada não há de onde enviar.',
  },
  template: {
    title: 'Ter um template aprovado pela Meta',
    description: 'Crie um ou importe os que já existem na sua conta da Meta. Aprovação costuma levar até 24h.',
  },
  campaign: {
    title: 'Montar e agendar o primeiro disparo',
    description: 'Escolha o público, preencha as variáveis e escolha o horário — o Composer te guia.',
  },
} as const

export function OnboardingChecklist({
  state, onCreateTemplate, onImportFromMeta, importing = false, lineQuality, composerReady,
}: OnboardingChecklistProps) {
  const navigate = useNavigate()
  const [line, template, campaign] = state.steps

  return (
    <section
      aria-labelledby="onboarding-title"
      className="w-[760px] max-w-full rounded-[24px] border border-surface-700 bg-surface-800 overflow-hidden"
    >
      {/* `.oh` — o gradiente de 120° do mockup, em azul a 10%. */}
      <div
        className="flex items-center justify-between gap-[20px] py-[24px] px-[28px] border-b border-surface-700"
        style={{
          backgroundImage:
            'linear-gradient(120deg, color-mix(in srgb, var(--color-accent-blue) 10%, transparent), transparent 60%)',
        }}
      >
        <div className="min-w-0">
          <div
            className="text-3xs font-bold uppercase tracking-[0.1em]"
            style={{ color: 'var(--color-accent-blue)' }}
          >
            Primeiro disparo
          </div>
          <h2 id="onboarding-title" className="text-[24px] text-surface-50 mt-1.5">
            {state.remaining === 1
              ? 'Falta 1 passo para o seu primeiro envio'
              : `Faltam ${state.remaining} passos para o seu primeiro envio`}
          </h2>
          <p className="text-sm text-surface-400 mt-1">
            Mensagens em massa no WhatsApp usam templates aprovados pela Meta — por isso a ordem importa.
          </p>
        </div>

        <RingProgress
          value={state.doneCount}
          max={3}
          size={72}
          color="brand"
          label=""
        >
          {`${state.doneCount}/3`}
        </RingProgress>
      </div>

      <OnboardingStep
        index={1}
        status={line.status}
        title={STEP_COPY.line.title}
        description={line.detail ?? STEP_COPY.line.description}
        meta={
          line.status === 'done' && lineQuality ? (
            <span className="text-3xs text-surface-500">{lineQuality}</span>
          ) : undefined
        }
        action={
          line.status === 'done' ? undefined : (
            <Button variant="primary" size="sm" onClick={() => navigate('/settings/numbers')}>
              Conectar WhatsApp
            </Button>
          )
        }
      />

      <OnboardingStep
        index={2}
        status={template.status}
        title={STEP_COPY.template.title}
        description={STEP_COPY.template.description}
        meta={
          template.pending ? (
            <>
              <span
                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[12px] font-medium leading-[1.5]"
                style={{
                  color: 'var(--color-status-pending)',
                  backgroundColor: 'color-mix(in srgb, var(--color-status-pending) 12%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--color-status-pending) 25%, transparent)',
                }}
              >
                <Clock className="w-3 h-3" aria-hidden="true" />
                {template.pending.count} em análise
              </span>
              <span className="text-3xs text-surface-500 truncate">{template.pending.latestName}</span>
            </>
          ) : undefined
        }
        action={
          template.status === 'done' ? undefined : (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={onCreateTemplate}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Criar template
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onImportFromMeta}
                disabled={importing}
                leftIcon={
                  importing
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Download className="w-3.5 h-3.5" />
                }
              >
                Importar da Meta
              </Button>
            </>
          )
        }
      />

      <OnboardingStep
        index={3}
        status={campaign.status}
        title={STEP_COPY.campaign.title}
        description={STEP_COPY.campaign.description}
        action={
          campaign.status === 'current' && composerReady ? (
            <Button variant="secondary" size="sm" onClick={() => navigate('/campaigns/new')}>
              Abrir Composer
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled
              title={
                !composerReady
                  ? 'Disponível quando o construtor de disparos entrar'
                  : 'Conecte uma linha e tenha um template aprovado primeiro'
              }
            >
              Abrir Composer
            </Button>
          )
        }
      />
    </section>
  )
}
