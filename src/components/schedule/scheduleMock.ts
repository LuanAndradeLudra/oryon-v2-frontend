// UI estática de exemplo — funcionalidade real de agenda (persistência,
// integração de calendário, regras de negócio de agendamento) é outro
// épico, fora do escopo desta reestilização visual (SCRUM-1107, README de
// design seção 3.8). Tudo abaixo é dado fixo, não vem de nenhuma API.

export const HOUR_START = 8
export const HOUR_END = 17 // grade cobre 08:00–17:00 (9 linhas de 1h)
export const WEEKDAY_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'] as const

// Âncora da semana de exemplo — mesma semana do mockup aprovado (tela `2d`),
// com "hoje" caindo na terça (índice 1), igual ao mock.
const BASE_MONDAY = new Date(2026, 8, 15)
const TODAY_DAY_INDEX = 1
const H = 60
const NOW_MINUTES_FROM_START = (14 - HOUR_START) * H + 10

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export interface ScheduleWeekDay {
  date: Date
  dayIndex: number // 0=segunda .. 6=domingo
  label: string
  dayNumber: number
  isToday: boolean
  isWeekend: boolean
}

export function getWeekDays(weekOffset: number): ScheduleWeekDay[] {
  const monday = addDays(BASE_MONDAY, weekOffset * 7)
  return WEEKDAY_LABELS.map((label, i) => {
    const date = addDays(monday, i)
    return {
      date,
      dayIndex: i,
      label,
      dayNumber: date.getDate(),
      isToday: weekOffset === 0 && i === TODAY_DAY_INDEX,
      isWeekend: i >= 5,
    }
  })
}

export function formatWeekPeriod(days: ScheduleWeekDay[]): string {
  const first = days[0].date
  const last = days[6].date
  const monthName = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'long' })
  return first.getMonth() === last.getMonth()
    ? `${first.getDate()} – ${last.getDate()} de ${monthName(last)}`
    : `${first.getDate()} de ${monthName(first)} – ${last.getDate()} de ${monthName(last)}`
}

export function formatDayLong(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
}

export function formatHourLabel(minutesFromStart: number): string {
  const totalMinutes = HOUR_START * H + minutesFromStart
  const h = Math.floor(totalMinutes / H)
  const m = totalMinutes % H
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export type ScheduleEventStatus = 'confirmado' | 'aguardando' | 'cancelado'

export interface ScheduleEvent {
  id: string
  title: string
  type: string
  dayIndex: number // 0=segunda..6=domingo, relativo à semana exibida
  startMinutes: number // minutos desde HOUR_START
  endMinutes: number
  agent: string
  /** Cor de dado (tipo/agente) — nunca token fechado, igual à regra de cor de etapa/tag. */
  color: string
  status: ScheduleEventStatus
  isCampaign?: boolean
  detail: {
    contact?: string
    origin?: string
    channel?: string
  }
}

export const MOCK_EVENTS: ScheduleEvent[] = [
  {
    id: 'evt-1',
    title: 'Implantação · Grupo Tavares',
    type: 'Implantação',
    dayIndex: 2,
    startMinutes: 0,
    endMinutes: H,
    agent: 'Lucas',
    color: '#8B5CF6',
    status: 'confirmado',
    detail: { contact: 'Grupo Tavares', origin: 'Onboarding', channel: 'Google Meet' },
  },
  {
    id: 'evt-2',
    title: 'Demo · Consultório Dr. Paulo',
    type: 'Demo',
    dayIndex: 0,
    startMinutes: H,
    endMinutes: H * 2,
    agent: 'Rafael',
    color: '#3B82F6',
    status: 'confirmado',
    detail: { contact: 'Consultório Dr. Paulo', origin: 'Indicação', channel: 'Google Meet' },
  },
  {
    id: 'evt-3',
    title: 'Demo · Mariana Costa · Acme',
    type: 'Demo',
    dayIndex: 1,
    startMinutes: H * 2,
    endMinutes: H * 3 + 30,
    agent: 'Ana Nunes',
    color: '#3B82F6',
    status: 'confirmado',
    detail: { contact: 'Mariana Costa · Acme Ltda', origin: 'Agente Vendas', channel: 'Google Meet' },
  },
  {
    id: 'evt-4',
    title: 'Demo · Eduardo Martins',
    type: 'Demo',
    dayIndex: 3,
    startMinutes: H * 3,
    endMinutes: H * 4,
    agent: 'Rafael',
    color: '#3B82F6',
    status: 'cancelado',
    detail: { contact: 'Eduardo Martins', origin: 'Site', channel: 'Google Meet' },
  },
  {
    id: 'evt-5',
    title: 'Suporte · Lab Vida',
    type: 'Suporte',
    dayIndex: 0,
    startMinutes: H * 6,
    endMinutes: H * 6 + 30,
    agent: 'Lucas',
    color: '#8B5CF6',
    status: 'confirmado',
    detail: { contact: 'Lab Vida', origin: 'Chamado', channel: 'Ligação' },
  },
  {
    id: 'evt-6',
    title: 'Retorno · Helena Prado',
    type: 'Retorno',
    dayIndex: 4,
    startMinutes: H * 6,
    endMinutes: H * 7,
    agent: 'Ana Nunes',
    color: '#F59E0B',
    status: 'aguardando',
    detail: { contact: 'Helena Prado', origin: 'Conversa', channel: 'WhatsApp' },
  },
  {
    id: 'evt-7',
    title: 'Retorno · Beatriz Fonseca',
    type: 'Retorno',
    dayIndex: 2,
    startMinutes: H * 7,
    endMinutes: H * 8,
    agent: 'Lucas',
    color: '#F59E0B',
    status: 'aguardando',
    detail: { contact: 'Beatriz Fonseca', origin: 'Conversa', channel: 'WhatsApp' },
  },
  {
    id: 'evt-8',
    title: 'Treinamento equipe · Acme',
    type: 'Treinamento',
    dayIndex: 4,
    startMinutes: H * 8,
    endMinutes: H * 9,
    agent: 'Lucas',
    color: '#10B981',
    status: 'confirmado',
    detail: { contact: 'Acme Ltda', origin: 'Onboarding', channel: 'Google Meet' },
  },
  {
    id: 'evt-9',
    title: 'Campanha · Reativação de clientes',
    type: 'Campanha',
    dayIndex: 5,
    startMinutes: H * 2,
    endMinutes: H * 3,
    agent: 'Automação',
    color: '#6B8080',
    status: 'confirmado',
    isCampaign: true,
    detail: { origin: 'Disparo automático', channel: 'WhatsApp' },
  },
]

export const SCHEDULE_AGENTS = ['Ana Nunes', 'Lucas', 'Rafael'] as const
export const SCHEDULE_TYPES = ['Demo', 'Suporte', 'Retorno', 'Implantação', 'Treinamento', 'Campanha'] as const

export const NOW_LINE = { dayIndex: TODAY_DAY_INDEX, minutes: NOW_MINUTES_FROM_START }

export const STATUS_LABEL: Record<ScheduleEventStatus, string> = {
  confirmado: 'Confirmado',
  aguardando: 'Aguardando confirmação',
  cancelado: 'Cancelado pelo contato',
}

export const STATUS_CHIP_VAR: Record<ScheduleEventStatus, string> = {
  confirmado: 'var(--color-success)',
  aguardando: 'var(--color-warning)',
  cancelado: 'var(--color-danger)',
}
