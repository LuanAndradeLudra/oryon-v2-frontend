import type { ApoioDoEditor, Catalogo, Entrada, NoDoGrafo, Porta } from '@/services/jornadas/tipos'
import { rotuloDaDuracao } from '@/services/jornadas/simulador'

/** Uma linha que resume o que o passo faz, para o quadradinho do canvas. */
export function resumoDoNo(no: NoDoGrafo, catalogo: Catalogo, apoio: ApoioDoEditor): string {
  const p = no.params
  const nomeDe = <T extends { id: string; name: string }>(lista: T[], id: unknown) => lista.find((x) => x.id === id)?.name
  switch (no.type) {
    case 'send_template': {
      const t = apoio.templates.find((x) => x.id === p.templateId)
      const l = nomeDe(apoio.whatsappNumbers, p.whatsappNumberId)
      return t ? `${t.name}${l ? ` · ${l}` : ''}` : 'Escolha o modelo'
    }
    case 'send_text': return curto(String(p.text ?? '')) || 'Escreva o texto'
    case 'notify_team': return `Para ${nomeDe(apoio.departments, p.departmentId) ?? '…'}${p.groupDaily ? ' · lista do dia' : ''}`
    case 'internal_note': return curto(String(p.text ?? '')) || 'Escreva a nota'
    case 'hold_conversation': return `Por ${rotuloDaDuracao(p.duration)}`
    case 'handoff_agent': return p.note ? 'Com nota de contexto' : 'Sem nota'
    case 'handoff_human': return `${nomeDe(apoio.departments, p.departmentId) ?? 'Setor'}${p.reason ? ` · ${curto(String(p.reason), 28)}` : ''}`
    case 'resolve_conversation': return 'Marca como resolvida'
    case 'tag': return `${p.action === 'remove' ? 'Tirar' : 'Pôr'} "${nomeDe(apoio.tags, p.tagId) ?? '…'}"`
    case 'set_stage': return `Etapa: ${nomeDe(apoio.stages, p.stageId) ?? '…'}`
    case 'assign': return p.to === 'user' ? `Para ${nomeDe(apoio.users, p.userId) ?? '…'}` : `Para ${nomeDe(apoio.departments, p.departmentId) ?? '…'}`
    case 'deal_action': return ({ create: 'Criar negócio', move: 'Mover de etapa', won: 'Marcar como ganho', lost: 'Marcar como perdido' } as Record<string, string>)[String(p.action)] ?? 'Negócio'
    case 'connector_call': return catalogo.connectorOperations.find((o) => o.key === p.operation)?.label ?? 'Escolha a operação'
    case 'webhook_out': {
      try { return new URL(String(p.url)).host } catch { return 'Informe o endereço' }
    }
    case 'wait':
      if (p.mode === 'until_time') return `Até as ${String(p.time ?? '09:00')}`
      if (p.mode === 'relative_to_field') {
        const d = Number(p.offsetDays ?? 0)
        return `${Math.abs(d)} dia${Math.abs(d) === 1 ? '' : 's'} ${d < 0 ? 'antes' : 'depois'} de ${String(p.field ?? 'uma data')}${p.time ? `, ${String(p.time)}` : ''}`
      }
      if (p.mode === 'next_business_hour') return 'Até o próximo horário útil'
      return rotuloDaDuracao(p.duration)
    case 'wait_event': return `Prazo: ${rotuloDaDuracao(p.timeout)}`
    case 'branch': return `${Array.isArray(p.branches) ? p.branches.length : 0} ramo(s) + senão`
    case 'goal': return String(p.label ?? 'Sucesso')
    case 'exit': return String(p.reason ?? 'Fim')
    case 'ai_classify': return curto(String(p.question ?? '')) || 'O que decidir'
    case 'ai_mission': return curto(String(p.objective ?? '')) || 'Objetivo da missão'
    default: return ''
  }
}

function curto(t: string, n = 46): string {
  const limpo = t.replace(/\s+/g, ' ').trim()
  return limpo.length > n ? `${limpo.slice(0, n - 1)}…` : limpo
}

const ROTULO_DA_PORTA: Record<Porta['type'], string> = {
  schedule_list: 'Agenda + lista do sistema',
  event: 'Quando acontecer',
  segment: 'Segmento',
  webhook: 'Webhook de entrada',
  manual: 'Manual ou API',
}

export function resumoDaPorta(porta: Porta, catalogo: Catalogo): { titulo: string; detalhe: string } {
  const p = porta.params
  switch (porta.type) {
    case 'schedule_list': {
      const op = catalogo.connectorOperations.find((o) => o.key === p.operation)
      const quando = Number(p.dayOffset ?? 1) === 1 ? 'de amanhã' : `daqui a ${Number(p.dayOffset)} dias`
      return { titulo: ROTULO_DA_PORTA[porta.type], detalhe: `Todo dia às ${String(p.time ?? '09:00')}: ${op?.label ?? 'lista'} ${quando}` }
    }
    case 'event': return { titulo: ROTULO_DA_PORTA[porta.type], detalhe: catalogo.events.find((e) => e.key === p.event)?.label ?? 'Escolha o evento' }
    case 'segment': return { titulo: ROTULO_DA_PORTA[porta.type], detalhe: `${String(p.segment ?? 'Quem')} · ${String(p.schedule ?? '')}` }
    case 'webhook': return { titulo: ROTULO_DA_PORTA[porta.type], detalhe: `${String(p.name ?? 'Porta')} · /v1/hooks/••••` }
    case 'manual': return { titulo: ROTULO_DA_PORTA[porta.type], detalhe: 'Inscrever na tela ou pela API' }
  }
}

export const OPCOES_DE_PORTA = Object.entries(ROTULO_DA_PORTA).map(([value, label]) => ({ value, label }))

export function resumoDaReentrada(e: Entrada): string {
  switch (e.reentry.mode) {
    case 'per_subject': return 'Uma inscrição por assunto (ex.: por consulta)'
    case 'once': return 'Só uma vez por pessoa'
    case 'cooldown': return `De novo só depois de ${e.reentry.cooldownDays ?? 30} dias`
    case 'always': return 'Pode entrar de novo a cada vez'
  }
}
