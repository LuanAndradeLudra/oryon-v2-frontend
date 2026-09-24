import { DEMO_LEAD, DEMO_LEAD_PREVIEW, DEMO_MESSAGES, type DemoConversation } from '../demoData'

/** Roteiro da cena Conversas: passos, tempos e o que cada passo mostra (ver inbox.tsx). */
export const TYPE_CHUNKS = 5
export const STEP = {
  newRow: 1, chatOpen: 2, typing: 3, ai: 4, inbound2: 5, guard: 6, cursor: 7, press: 8, human: 9,
  typeFirst: 10, typeLast: 10 + TYPE_CHUNKS - 1, delivered: 10 + TYPE_CHUNKS, read: 10 + TYPE_CHUNKS + 1,
} as const

export const DELAYS: number[] = [
  900,  // 0
  800,  // 1
  1000, // 2
  1100, // 3
  1500, // 4
  1100, // 5
  1700, // 6
  900,  // 7
  380,  // 8
  700,  // 9
  ...Array.from({ length: TYPE_CHUNKS }, (_, i) => (i === TYPE_CHUNKS - 1 ? 550 : 170)), // 10..14
  700,  // 15
  3200, // 16
]

export function typedHuman(step: number): { shown: string; ghost: string } {
  const text = DEMO_MESSAGES.human
  const chunk = Math.ceil(text.length / TYPE_CHUNKS)
  const n = Math.min(text.length, (step - STEP.typeFirst + 1) * chunk)
  return { shown: text.slice(0, n), ghost: text.slice(n) }
}

export function leadRow(step: number): DemoConversation {
  const preview =
    step >= STEP.typeFirst ? DEMO_LEAD_PREVIEW.human
      : step >= STEP.inbound2 ? DEMO_LEAD_PREVIEW.inbound2
        : step >= STEP.ai ? DEMO_LEAD_PREVIEW.ai1
          : DEMO_LEAD_PREVIEW.inbound1
  const time = step >= STEP.typeFirst ? '14:04' : step >= STEP.inbound2 ? '14:03' : '14:02'
  return {
    id: DEMO_LEAD.id,
    name: DEMO_LEAD.name,
    phone: DEMO_LEAD.phone,
    preview,
    time,
    actor: step >= STEP.human ? 'human' : 'ai',
    unread: step === STEP.newRow ? 1 : undefined,
  }
}
