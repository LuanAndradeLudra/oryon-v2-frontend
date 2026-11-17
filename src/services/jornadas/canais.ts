import { passoDoCatalogo } from './catalogo'
import type { CanalDaJornada, Catalogo, VersaoDaJornada } from './tipos'

/**
 * Por onde a jornada age (P2, 16/11): a lista mostra os canais de cada jornada
 * e a galeria filtra as receitas por canal. Vem do desenho, sem cadastro à parte.
 */
export const ROTULO_DO_CANAL: Record<CanalDaJornada, string> = {
  whatsapp: 'WhatsApp',
  equipe: 'Avisa a equipe',
  agente: 'Passa para o agente de IA',
  sistema: 'Sistema do cliente',
  ia: 'Passos de IA',
  crm: 'CRM',
}
const ORDEM: CanalDaJornada[] = ['whatsapp', 'agente', 'equipe', 'sistema', 'crm', 'ia']
const MENSAGEM = new Set(['send_template', 'send_text', 'send_and_wait', 'ask_question'])

export function canaisDoDesenho(v: Pick<VersaoDaJornada, 'graph' | 'entry'>, catalogo: Catalogo): CanalDaJornada[] {
  const s = new Set<CanalDaJornada>()
  for (const n of Object.values(v.graph.nodes)) {
    if (MENSAGEM.has(n.type)) s.add('whatsapp')
    else if (n.type === 'notify_team' || n.type === 'handoff_human') s.add('equipe')
    else if (n.type === 'handoff_agent') s.add('agente')
    else if (n.type === 'connector_call' || n.type === 'webhook_out') s.add('sistema')
    else if (n.type.startsWith('ai_')) s.add('ia')
    else if (passoDoCatalogo(catalogo, n.type)?.group === 'crm') s.add('crm')
  }
  if (v.entry.doors.some((d) => d.type === 'schedule_list')) s.add('sistema')
  return ORDEM.filter((c) => s.has(c))
}
