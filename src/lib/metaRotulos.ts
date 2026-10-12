/**
 * Rótulos do que a Meta diz sobre templates e números (plano MA, Fase 6).
 *
 * O backend agora recebe os avisos da Meta (status, qualidade e categoria do
 * template; limite e qualidade do número) e grava status que a tela não
 * conhecia (ARCHIVED, DELETED, PENDING_DELETION). Um status desconhecido
 * NUNCA pode quebrar a tela: tudo aqui tem um rótulo de reserva.
 */

export interface RotuloDeStatus {
  label: string
  /** Classe do chip (mesma receita `.color-chip-soft` das telas). */
  chip: string
  /** O template não pode ser enviado neste status. */
  bloqueia: boolean
}

const CHIP = {
  ativo: 'color-chip-soft border [--chip:var(--color-status-active)]',
  pendente: 'color-chip-soft border [--chip:var(--color-status-pending)]',
  perigo: 'color-chip-soft border [--chip:var(--color-danger)]',
  neutro: 'bg-surface-900 border border-surface-700 text-surface-400',
} as const

const STATUS: Record<string, RotuloDeStatus> = {
  APPROVED:         { label: 'Aprovado',     chip: CHIP.ativo,    bloqueia: false },
  PENDING:          { label: 'Em análise',   chip: CHIP.pendente, bloqueia: true },
  REJECTED:         { label: 'Rejeitado',    chip: CHIP.perigo,   bloqueia: true },
  PAUSED:           { label: 'Pausado',      chip: CHIP.pendente, bloqueia: true },
  DISABLED:         { label: 'Desativado',   chip: CHIP.perigo,   bloqueia: true },
  ARCHIVED:         { label: 'Arquivado',    chip: CHIP.neutro,   bloqueia: true },
  PENDING_DELETION: { label: 'Excluindo',    chip: CHIP.neutro,   bloqueia: true },
  DELETED:          { label: 'Excluído',     chip: CHIP.neutro,   bloqueia: true },
  // Registros antigos podem ter guardado estes como status.
  IN_APPEAL:        { label: 'Em recurso',   chip: CHIP.pendente, bloqueia: true },
}

/** Rótulo do status do template; desconhecido = o próprio código, neutro. */
export function statusDoModelo(status: string | null | undefined): RotuloDeStatus {
  const s = String(status ?? '').toUpperCase()
  return STATUS[s] ?? { label: s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ') : 'Sem status', chip: CHIP.neutro, bloqueia: s !== 'APPROVED' }
}

/** O que a Meta tirou do ar — campanhas com ele foram interrompidas. */
export const STATUS_QUE_PARAM = new Set(['REJECTED', 'PAUSED', 'DISABLED', 'ARCHIVED', 'DELETED', 'PENDING_DELETION'])

/**
 * Sinais da Meta que NÃO tiram o template do ar (`metaFlag`): ele continua
 * sendo enviado, mas a equipe precisa saber.
 */
export const SINAL_DA_META: Record<string, { label: string; texto: string; tom: 'warning' | 'info' }> = {
  FLAGGED: {
    label: 'Sinalizado',
    texto: 'A Meta sinalizou este template por qualidade baixa. Ele continua sendo enviado, mas pode ser pausado se a qualidade não melhorar.',
    tom: 'warning',
  },
  LIMIT_EXCEEDED: {
    label: 'Limite de templates',
    texto: 'A conta atingiu o limite de templates da Meta. Exclua os que não usa para poder criar novos.',
    tom: 'warning',
  },
  LOCKED: {
    label: 'Travado',
    texto: 'A Meta travou a edição deste template. Ele continua podendo ser enviado.',
    tom: 'info',
  },
  IN_APPEAL: {
    label: 'Em recurso',
    texto: 'O recurso contra a reprovação está em análise na Meta.',
    tom: 'info',
  },
}

export const QUALIDADE_DO_MODELO: Record<string, { label: string; cor: string }> = {
  GREEN:   { label: 'Alta',     cor: 'bg-online' },
  YELLOW:  { label: 'Média',    cor: 'bg-away' },
  RED:     { label: 'Baixa',    cor: 'bg-danger' },
  UNKNOWN: { label: 'Sem nota', cor: 'bg-surface-600' },
}

export function qualidadeDoModelo(nota: string | null | undefined) {
  return QUALIDADE_DO_MODELO[String(nota ?? '').toUpperCase()] ?? null
}

/** Qualidade do número — o backend manda MAIÚSCULAS; telas antigas mandavam minúsculas. */
export function qualidadeDoNumero(nota: string | null | undefined): { label: string; cor: string } {
  return QUALIDADE_DO_MODELO[String(nota ?? '').toUpperCase()] ?? { label: 'Sem nota', cor: 'bg-surface-600' }
}

const CATEGORIA: Record<string, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utilidade',
  AUTHENTICATION: 'Autenticação',
}
export const rotuloDaCategoria = (c: string | null | undefined) => CATEGORIA[String(c ?? '').toUpperCase()] ?? (c || '—')

const TIER: Record<string, string> = {
  TIER_50: '50', TIER_250: '250', TIER_1K: '1.000', TIER_2K: '2.000',
  TIER_10K: '10.000', TIER_100K: '100.000',
}

/**
 * Limite de envio do número: quantos contatos diferentes a empresa pode
 * chamar primeiro (com template) em 24 h. `null` = a Meta ainda não informou.
 */
export function limiteDoNumero(tier: string | null | undefined, maxDiario?: number | null): string | null {
  if (typeof maxDiario === 'number' && maxDiario > 0) return `${maxDiario.toLocaleString('pt-BR')} contatos / 24 h`
  const t = String(tier ?? '').toUpperCase()
  if (!t) return null
  if (t === 'TIER_UNLIMITED') return 'Ilimitado'
  if (t === 'TIER_NOT_SET') return 'Ainda não definido pela Meta'
  return TIER[t] ? `${TIER[t]} contatos / 24 h` : t
}

/** "15 de out." — data curta em português. */
export function dataCurta(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
