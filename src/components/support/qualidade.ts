import type { IndicadorDaQualidade, QualidadeDaEmpresa } from '@/types/support'

/**
 * QUALIDADE (SCRUM-1391) — o que a tela mostra de cada indicador. Os textos
 * (numerador, denominador e período) vêm prontos do backend: são os mesmos do
 * e-mail do mês. Aqui só o número em destaque e o período em palavras.
 */

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** Os últimos 7 dias (só a visão da equipe). */
export const ULTIMOS_7_DIAS = '7d'

export function nomeDoPeriodo(periodo: string): string {
  if (periodo === ULTIMOS_7_DIAS) return 'Últimos 7 dias'
  const [a, m] = periodo.split('-').map(Number)
  if (!a || !m || m < 1 || m > 12) return periodo
  const nome = `${MESES[m - 1]} de ${a}`
  return nome.charAt(0).toUpperCase() + nome.slice(1)
}

export function formatarMinutos(m: number): string {
  if (m < 1) return 'menos de 1 min'
  const total = Math.round(m)
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const resto = total % 60
  return resto ? `${h} h ${resto} min` : `${h} h`
}

/** O número grande do cartão: o percentual; a mediana em tempo; a contagem; "—" sem base. */
export function valorEmDestaque(i: IndicadorDaQualidade): string {
  if (i.percentual !== null) return `${i.percentual}%`
  if (i.numerador === null) return '—'
  if (i.chave === 'primeira_resposta') return formatarMinutos(i.numerador)
  if (i.denominador === 0 && i.chave !== 'chamados_sobre_ia') return '—'
  return i.numerador.toLocaleString('pt-BR')
}

/** "n de d" curto para a tabela da equipe (o texto completo fica no título da célula). */
export function fracaoCurta(i: IndicadorDaQualidade): string {
  if (i.numerador === null || i.denominador === null || i.denominador === 0) return ''
  if (i.chave === 'primeira_resposta') return `${i.denominador.toLocaleString('pt-BR')} resp.`
  return `${i.numerador.toLocaleString('pt-BR')} de ${i.denominador.toLocaleString('pt-BR')}`
}

const dataCurta = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** De onde vêm os números: o retrato guardado (o mesmo do e-mail), o mês fechado ao vivo ou o mês em andamento. */
export function textoDaFonte(q: Pick<QualidadeDaEmpresa, 'fechado' | 'retrato'>): string {
  if (!q.fechado) return 'Mês em andamento: os números até agora.'
  if (!q.retrato) return 'Mês fechado, conta ao vivo: o retrato do mês ainda não foi guardado.'
  const enviado = q.retrato.enviadoEm
    ? ` Enviado por e-mail à gestão em ${dataCurta(q.retrato.enviadoEm)}.`
    : ''
  return `Retrato do mês guardado em ${dataCurta(q.retrato.geradoEm)}: os números não mudam mais.${enviado}`
}
