import { AlertTriangle, CircleAlert, Info, CheckCircle2 } from 'lucide-react'
import type { WhatsappLineHealth } from '@/services/api'

/**
 * Diagnóstico de saúde de uma linha (SCRUM-1253, PO 07/10): o veredito
 * (saudável · atenção · precisa de ação) e os itens do que resolver. Mora no
 * cartão do número em Números WhatsApp — por isso a reconexão, o agente de IA
 * e os setores não viram link (estão no próprio cartão); só o que se resolve
 * em outra tela leva para lá.
 */
export type Gravidade = 'critico' | 'atencao' | 'info'
export interface Achado { gravidade: Gravidade; texto: string; acao?: { rotulo: string; para: string } }

export function diagnosticar(l: WhatsappLineHealth): Achado[] {
  const a: Achado[] = []
  const nota = String(l.qualityRating ?? '').toUpperCase()
  if (!l.isActive) a.push({ gravidade: 'critico', texto: 'Linha inativa — não envia nem recebe mensagens.' })
  if (!l.hasSystemUserToken) a.push({ gravidade: 'critico', texto: 'Sem token de acesso: as mensagens desta linha vão falhar.' })
  if (nota === 'RED' || nota === 'LOW') a.push({ gravidade: 'critico', texto: 'Qualidade baixa na Meta: risco de limite de envio menor ou bloqueio.' })
  else if (nota === 'YELLOW' || nota === 'MEDIUM') a.push({ gravidade: 'atencao', texto: 'Qualidade média na Meta: reveja disparos com muitas denúncias ou bloqueios.' })
  if (l.templates.rejected > 0) a.push({ gravidade: 'atencao', texto: `${l.templates.rejected} ${l.templates.rejected === 1 ? 'template rejeitado' : 'templates rejeitados'} pela Meta.`, acao: { rotulo: 'Ver templates', para: '/campaigns?tab=templates' } })
  const semLinha = l.templates.needsAssignment + l.campaigns.needsAssignment
  if (semLinha > 0) a.push({ gravidade: 'atencao', texto: `${semLinha} ${semLinha === 1 ? 'recurso está' : 'recursos estão'} sem linha definida (templates ou disparos).`, acao: { rotulo: 'Ver disparos', para: '/campaigns' } })
  if (l.departments.length === 0) a.push({ gravidade: 'info', texto: 'Nenhum setor usa este número: as conversas não são distribuídas por setor.' })
  return a
}

export const VEREDITO = {
  critico: { rotulo: 'Precisa de ação', cor: 'var(--color-danger)', Icone: CircleAlert },
  atencao: { rotulo: 'Atenção', cor: 'var(--color-status-pending)', Icone: AlertTriangle },
  ok: { rotulo: 'Saudável', cor: 'var(--color-status-active)', Icone: CheckCircle2 },
} as const
export const ICONE_ACHADO = { critico: CircleAlert, atencao: AlertTriangle, info: Info }
export const COR_ACHADO = { critico: 'text-danger', atencao: 'text-status-pending', info: 'text-surface-400' }

export function veredito(achados: Achado[]): keyof typeof VEREDITO {
  if (achados.some((x) => x.gravidade === 'critico')) return 'critico'
  if (achados.some((x) => x.gravidade === 'atencao')) return 'atencao'
  return 'ok'
}
