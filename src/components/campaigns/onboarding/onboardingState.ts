// ─── onboardingState ───────────────────────────────────────────────────────
// O estado dos 3 passos do onboarding do primeiro disparo (D5/SCRUM-1024),
// como função PURA: sem I/O, sem React, testável com arrays literais.
//
// A ordem dos passos não é decoração — ela é a razão da tela existir. Disparo
// em massa no WhatsApp exige template aprovado pela Meta, e template exige
// linha conectada. Um botão "criar campanha" no vazio levaria a um wizard que
// falha na etapa 1; o checklist mostra POR QUE ainda não dá.
import type { WhatsAppNumber, WhatsAppTemplate } from '@/types'

export type StepStatus = 'done' | 'current' | 'todo'

export type StepId = 'line' | 'template' | 'campaign'

export interface OnboardingStep {
  id: StepId
  status: StepStatus
  /** Subtítulo dinâmico da linha, quando há dado real para mostrar. Ausente
   *  quando não há — nunca uma frase inventada para preencher espaço. */
  detail?: string
  /** Só no passo 2: quantos templates estão aguardando a Meta, e o nome do
   *  mais recente. É o chip âmbar "1 em análise · boas_vindas_v1" do mockup. */
  pending?: { count: number; latestName: string }
}

export interface OnboardingState {
  steps: [OnboardingStep, OnboardingStep, OnboardingStep]
  /** 0..3 — alimenta o `RingProgress` com `max={3}`. */
  doneCount: number
  /** 3 - doneCount, para o título "Faltam N passos". */
  remaining: number
  /** Os 3 passos prontos: o onboarding sai de cena e a lista normal volta. */
  complete: boolean
}

export interface OnboardingInput {
  numbers: WhatsAppNumber[]
  templates: WhatsAppTemplate[]
  campaignCount: number
}

/** Uma linha só conta quando dá para enviar por ela. `isActive` é opcional no
 *  tipo, e ausente significa ativa — só o `false` explícito desqualifica. */
function hasActiveLine(numbers: WhatsAppNumber[]): boolean {
  return numbers.some((n) => n.isActive !== false)
}

/** `needsWabaAssignment` só é marcado em tenant multi-linha (Migration #045),
 *  então checar sem condicionar ao número de linhas dá o mesmo resultado nos
 *  dois casos e evita passar a contagem de linhas para dentro desta regra:
 *  um template aprovado mas sem linha atribuída não pode ser disparado, e
 *  contá-lo como pronto faria o passo 3 liberar para um envio que falha. */
function isUsableTemplate(template: WhatsAppTemplate): boolean {
  return template.status === 'APPROVED' && !template.needsWabaAssignment
}

function pendingInfo(templates: WhatsAppTemplate[]): OnboardingStep['pending'] {
  const pending = templates.filter((t) => t.status === 'PENDING')
  if (pending.length === 0) return undefined
  // O mais recente é o que a pessoa acabou de enviar, e é dele que ela quer
  // notícia.
  const latest = [...pending].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
  return { count: pending.length, latestName: latest.name }
}

/** Rótulo da linha para o subtítulo do passo 1: nome dado pela pessoa, ou o
 *  telefone. O selo de qualidade NÃO entra aqui — ele depende de
 *  `/meta/health`, que é admin-only, e de quem está olhando; isso é decisão de
 *  apresentação e mora no componente. */
function lineDetail(numbers: WhatsAppNumber[], formatPhone: (raw?: string | null) => string): string | undefined {
  const line = numbers.find((n) => n.isActive !== false)
  if (!line) return undefined
  const phone = formatPhone(line.displayPhoneNumber)
  return line.label ? `${line.label} · ${phone}` : phone
}

export function computeOnboardingState(
  { numbers, templates, campaignCount }: OnboardingInput,
  formatPhone: (raw?: string | null) => string = (raw) => raw ?? '',
): OnboardingState {
  const lineDone = hasActiveLine(numbers)
  const templateDone = templates.some(isUsableTemplate)
  const campaignDone = campaignCount > 0

  const done: Record<StepId, boolean> = {
    line: lineDone,
    template: templateDone,
    campaign: campaignDone,
  }

  // Só UM passo é `current`: o primeiro não-feito na ordem. Os posteriores
  // ficam `todo` — sem isso a tela mostraria três ações concorrendo e nenhuma
  // seria a próxima.
  const order: StepId[] = ['line', 'template', 'campaign']
  const firstPending = order.find((id) => !done[id])

  const statusOf = (id: StepId): StepStatus =>
    done[id] ? 'done' : id === firstPending ? 'current' : 'todo'

  const steps: [OnboardingStep, OnboardingStep, OnboardingStep] = [
    { id: 'line', status: statusOf('line'), detail: lineDetail(numbers, formatPhone) },
    { id: 'template', status: statusOf('template'), pending: pendingInfo(templates) },
    { id: 'campaign', status: statusOf('campaign') },
  ]

  const doneCount = order.filter((id) => done[id]).length

  return {
    steps,
    doneCount,
    remaining: 3 - doneCount,
    complete: doneCount === 3,
  }
}
