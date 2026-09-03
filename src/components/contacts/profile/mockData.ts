// ── Dados simulados da página de perfil do contato ──────────────────────────
// Fase frontend-first: estas seções ainda não têm endpoint. Cada gerador
// abaixo será substituído por uma chamada real quando o backend existir:
//
//   mockDealsFor           → GET /deals?contactId=            (módulo deals já existe no backend)
//   mockNotesFor           → GET /contacts/:id/notes          (entidade a criar)
//   mockTasksFor           → GET /contacts/:id/tasks          (entidade a criar)
//   mockCampaignTouchesFor → GET /contacts/:id/campaigns      (exige campaign_recipients)
//   mockAutomationRunsFor  → GET /contacts/:id/automation-runs (coluna contactId já existe em automation_runs)
//
// Desligar TODOS os mocks = PROFILE_MOCKS_ENABLED: false — as seções simuladas
// somem da página sem quebrar nada (cada consumidor checa o gate).
// Os geradores são determinísticos por contactId (hash simples) para que o
// mesmo contato mostre sempre os mesmos dados — e alguns contatos caiam em
// quantidade 0, exercitando os empty states.

import type {
  Deal, ContactNote, ContactTask, CampaignTouch, AutomationRun,
} from '@/types/contactProfile'

export const PROFILE_MOCKS_ENABLED = false

/** Hash determinístico simples (soma de char codes) — só para variar mocks. */
function hashOf(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

function daysAhead(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString()
}

const DEAL_TITLES = ['Plano anual', 'Pacote premium', 'Renovação de contrato', 'Upgrade de plano']
const DEAL_STAGES = ['Proposta enviada', 'Negociação', 'Aguardando aprovação']

export function mockDealsFor(contactId: string): Deal[] {
  const h = hashOf(contactId)
  const count = h % 4 // 0–3
  return Array.from({ length: count }, (_, i) => ({
    id: `mock-deal-${contactId}-${i}`,
    title: DEAL_TITLES[(h + i) % DEAL_TITLES.length],
    value: 500 + ((h + i * 7) % 40) * 250,
    currency: 'BRL',
    stageLabel: DEAL_STAGES[(h + i) % DEAL_STAGES.length],
    status: i === 0 ? 'open' : ((h + i) % 3 === 0 ? 'won' : 'open'),
    expectedCloseAt: daysAhead(7 + ((h + i) % 21)),
    createdAt: daysAgo(10 + i * 12),
  }))
}

const NOTE_BODIES = [
  'Prefere ser contatado no período da tarde. Demonstrou interesse no plano intermediário.',
  'Pediu para retornar depois do dia 15 — aguardando fechamento do orçamento interno.',
  'Cliente indicado pelo Ricardo. Já conhece o produto de uma empresa anterior.',
]

export function mockNotesFor(contactId: string): ContactNote[] {
  const h = hashOf(contactId)
  const count = (h >> 2) % 3 // 0–2
  return Array.from({ length: count }, (_, i) => ({
    id: `mock-note-${contactId}-${i}`,
    body: NOTE_BODIES[(h + i) % NOTE_BODIES.length],
    authorName: (h + i) % 2 === 0 ? 'Você' : 'Equipe comercial',
    createdAt: daysAgo(2 + i * 5),
    pinned: i === 0 && h % 5 === 0,
  }))
}

const TASK_TITLES = [
  'Fazer follow-up da proposta',
  'Enviar catálogo atualizado',
  'Agendar demonstração',
  'Confirmar dados de faturamento',
]

export function mockTasksFor(contactId: string): ContactTask[] {
  const h = hashOf(contactId)
  const count = (h >> 4) % 4 // 0–3
  return Array.from({ length: count }, (_, i) => {
    const overdue = i === 1 && h % 3 === 0
    return {
      id: `mock-task-${contactId}-${i}`,
      title: TASK_TITLES[(h + i) % TASK_TITLES.length],
      dueAt: overdue ? daysAgo(2) : daysAhead(1 + ((h + i) % 6)),
      status: overdue ? 'overdue' : 'pending',
      assigneeName: (h + i) % 2 === 0 ? 'Você' : undefined,
    } satisfies ContactTask
  })
}

const CAMPAIGN_NAMES = [
  'Promoção de julho', 'Reativação de inativos', 'Lançamento — nova linha', 'Boas-vindas',
]
const TOUCH_STATUSES: CampaignTouch['status'][] = ['read', 'delivered', 'replied', 'sent']

export function mockCampaignTouchesFor(contactId: string): CampaignTouch[] {
  const h = hashOf(contactId)
  const count = (h >> 6) % 4 // 0–3
  return Array.from({ length: count }, (_, i) => ({
    id: `mock-touch-${contactId}-${i}`,
    campaignName: CAMPAIGN_NAMES[(h + i) % CAMPAIGN_NAMES.length],
    channel: 'whatsapp',
    status: TOUCH_STATUSES[(h + i) % TOUCH_STATUSES.length],
    sentAt: daysAgo(3 + i * 9),
  }))
}

const AUTOMATION_NAMES = [
  'Boas-vindas ao novo lead', 'Follow-up automático 48h', 'Recuperação de conversa abandonada',
]
const AUTOMATION_TRIGGERS = ['Contato criado', 'Conversa resolvida', 'Etiqueta adicionada']

export function mockAutomationRunsFor(contactId: string): AutomationRun[] {
  const h = hashOf(contactId)
  const count = (h >> 8) % 3 // 0–2
  return Array.from({ length: count }, (_, i) => {
    const failed = (h + i) % 5 === 0
    const total = 3 + ((h + i) % 3)
    return {
      id: `mock-run-${contactId}-${i}`,
      automationName: AUTOMATION_NAMES[(h + i) % AUTOMATION_NAMES.length],
      trigger: AUTOMATION_TRIGGERS[(h + i) % AUTOMATION_TRIGGERS.length],
      status: failed ? 'failed' : 'completed',
      startedAt: daysAgo(1 + i * 6),
      stepsDone: failed ? Math.max(1, total - 2) : total,
      stepsTotal: total,
    } satisfies AutomationRun
  })
}
