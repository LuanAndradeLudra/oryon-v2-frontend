import type { ApoioDoEditor, Catalogo, Entrada, NoDoGrafo, Porta } from '@/services/jornadas/tipos'
import { rotuloDaDuracao } from '@/services/jornadas/simulador'

import { nomeLegivelDoModelo, paraTextoAmigavel, rotuloDaVariavel } from './variaveis'

const listaCurta = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()) as string[] : [])
const DIAS_POR_EXTENSO: Record<string, string> = { seg: 'seg', ter: 'ter', qua: 'qua', qui: 'qui', sex: 'sex', sab: 'sáb', dom: 'dom' }

/** "toda seg e qua, 10h" / "todo dia 1º, 09:00" / "todo dia, 10:00". */
function quandoDoSegmento(p: Record<string, unknown>): string {
  const h = String(p.time ?? '10:00')
  if (p.frequency === 'daily') return `todo dia, ${h}`
  if (p.frequency === 'monthly') return `todo dia ${Number(p.monthDay ?? 1)} do mês, ${h}`
  const dias = listaCurta(p.weekdays).map((d) => DIAS_POR_EXTENSO[d] ?? d)
  return dias.length ? `toda ${dias.join(', ')}, ${h}` : `escolha os dias, ${h}`
}

/** Uma linha que resume o que o passo faz, para o quadradinho do canvas. */
export function resumoDoNo(no: NoDoGrafo, catalogo: Catalogo, apoio: ApoioDoEditor): string {
  const p = no.params
  const nomeDe = <T extends { id: string; name: string }>(lista: T[], id: unknown) => lista.find((x) => x.id === id)?.name
  switch (no.type) {
    case 'send_template': {
      const t = apoio.templates.find((x) => x.id === p.templateId)
      const l = nomeDe(apoio.whatsappNumbers, p.whatsappNumberId)
      return t ? `${nomeLegivelDoModelo(t.name)}${l ? ` · ${l}` : ''}` : 'Escolha o modelo'
    }
    case 'send_text': return curto(paraTextoAmigavel(String(p.text ?? ''))) || 'Escreva o texto'
    case 'send_and_wait': {
      const t = apoio.templates.find((x) => x.id === p.templateId)
      return t ? `${nomeLegivelDoModelo(t.name)} · espera ${rotuloDaDuracao(p.timeout)}` : 'Escolha o modelo'
    }
    case 'ask_question': {
      const tipo = ({ text: 'Texto', number: 'Número', date: 'Data', email: 'E-mail', option: 'Opção', rating: 'Nota' } as Record<string, string>)[String(p.answerType ?? 'text')] ?? 'Texto'
      const campo = nomeDe(apoio.customFields, p.saveTo)
      return p.question ? `${curto(paraTextoAmigavel(String(p.question)), 30)} · ${tipo}${campo ? ` → ${campo}` : ''}` : 'Escreva a pergunta'
    }
    case 'branch_message_status': return p.messageNodeId ? `Até ${rotuloDaDuracao(p.timeout)} · 4 caminhos` : 'Escolha a mensagem'
    case 'notify_team': {
      const acao = catalogo.teamActions.find((a) => a.code === p.action)
      return `Para ${nomeDe(apoio.departments, p.departmentId) ?? '…'}${acao && acao.code !== 'fyi' ? ` · ${acao.label.toLowerCase()}` : ''}${p.groupDaily ? ' · lista do dia' : ''}`
    }
    case 'internal_note': return curto(paraTextoAmigavel(String(p.text ?? ''))) || 'Escreva a nota'
    case 'hold_conversation': return `Por ${rotuloDaDuracao(p.duration)}`
    case 'handoff_agent': return p.note ? 'Com nota de contexto' : 'Sem nota'
    case 'handoff_human': return `${nomeDe(apoio.departments, p.departmentId) ?? 'Setor'}${p.reason ? ` · ${curto(paraTextoAmigavel(String(p.reason)), 28)}` : ''}`
    case 'resolve_conversation': return 'Marca como resolvida'
    case 'tag': return `${p.action === 'remove' ? 'Tirar' : 'Pôr'} "${nomeDe(apoio.tags, p.tagId) ?? '…'}"`
    case 'set_stage': return `Etapa: ${nomeDe(apoio.stages, p.stageId) ?? '…'}`
    case 'assign': return p.to === 'user' ? `Para ${nomeDe(apoio.users, p.userId) ?? '…'}` : `Para ${nomeDe(apoio.departments, p.departmentId) ?? '…'}`
    case 'deal_action': {
      const etapa = nomeDe(apoio.dealStages, p.stageId) ?? (p.stageName ? String(p.stageName) : null)
      if ((p.action === 'create' || p.action === 'move') && etapa) return `${p.action === 'create' ? 'Criar em' : 'Mover para'} “${etapa}”`
      return ({ create: 'Criar negócio', move: 'Mover de etapa', won: 'Marcar como ganho', lost: 'Marcar como perdido' } as Record<string, string>)[String(p.action)] ?? 'Negócio'
    }
    case 'set_field': { const f = nomeDe(apoio.customFields, p.fieldId); return f ? `${f}: ${curto(paraTextoAmigavel(String(p.value ?? '')), 30) || '…'}` : 'Escolha o campo' }
    case 'connector_call': return catalogo.connectorOperations.find((o) => o.key === p.operation)?.label ?? 'Escolha a operação'
    case 'webhook_out': {
      try { return new URL(String(p.url)).host } catch { return 'Informe o endereço' }
    }
    case 'wait':
      if (p.mode === 'until_time') return `Até as ${String(p.time ?? '09:00')}`
      if (p.mode === 'relative_to_field') {
        const d = Number(p.offsetDays ?? 0)
        const data = p.field ? rotuloDaVariavel(String(p.field)).toLowerCase() : 'uma data'
        if (d === 0) return `No dia: ${data}${p.time ? `, ${String(p.time)}` : ''}`
        return `${Math.abs(d)} dia${Math.abs(d) === 1 ? '' : 's'} ${d < 0 ? 'antes' : 'depois'}: ${data}${p.time ? `, ${String(p.time)}` : ''}`
      }
      if (p.mode === 'next_business_hour') return 'Até o horário de atendimento'
      return rotuloDaDuracao(p.duration)
    case 'wait_event': return `Prazo: ${rotuloDaDuracao(p.timeout)}`
    case 'branch': return `${Array.isArray(p.branches) ? p.branches.length : 0} caminho(s) + outros casos`
    case 'goal': return String(p.label ?? 'Sucesso')
    case 'exit': return String(p.reason ?? 'Fim')
    case 'ai_classify': return curto(String(p.question ?? '')) || 'O que decidir'
    case 'ai_extract': { const f = listaCurta(p.fields); return f.length ? `Guarda: ${f.join(', ')}` : 'Escolha o que guardar' }
    case 'ai_summarize': return p.saveAs === 'context' ? 'Resumo para os próximos passos' : 'Resumo numa nota da conversa'
    case 'ai_mission': return catalogo.missionTypes[String(p.missionType ?? '')]?.label ?? 'Escolha o tipo de missão'
    default: return ''
  }
}

function curto(t: string, n = 46): string {
  const limpo = t.replace(/\s+/g, ' ').trim()
  return limpo.length > n ? `${limpo.slice(0, n - 1)}…` : limpo
}

const ROTULO_DA_PORTA: Record<Porta['type'], string> = {
  schedule_list: 'Lista do sistema (agenda)',
  event: 'Quando algo acontecer',
  segment: 'Grupo de contatos',
  webhook: 'Outro sistema avisa',
  manual: 'À mão',
}

export function resumoDaPorta(porta: Porta, catalogo: Catalogo): { titulo: string; detalhe: string } {
  const p = porta.params
  switch (porta.type) {
    case 'schedule_list': {
      const op = catalogo.connectorOperations.find((o) => o.key === p.operation)
      const quando = Number(p.dayOffset ?? 1) === 1 ? 'de amanhã' : `daqui a ${Number(p.dayOffset)} dias`
      return { titulo: ROTULO_DA_PORTA[porta.type], detalhe: `Todo dia às ${String(p.time ?? '09:00')}: ${op?.label ?? 'lista'} ${quando}` }
    }
    case 'event':
      if (p.event === 'conversation.inactive') return { titulo: ROTULO_DA_PORTA[porta.type], detalhe: `A conversa parou: ${Number(p.hours ?? 24)} h sem resposta do contato` }
      return { titulo: ROTULO_DA_PORTA[porta.type], detalhe: catalogo.events.find((e) => e.key === p.event)?.label ?? 'Escolha o evento' }
    case 'segment': return { titulo: ROTULO_DA_PORTA[porta.type], detalhe: `${String(p.segmentName || 'Escolha o segmento')} · ${quandoDoSegmento(p)}` }
    case 'webhook': {
      const mapa = p.mapping as { phone?: string } | undefined
      return { titulo: ROTULO_DA_PORTA[porta.type], detalhe: `${String(p.name ?? 'Porta')} · ${mapa?.phone ? 'campos mapeados' : 'falta ouvir um exemplo'}` }
    }
    case 'manual': return { titulo: ROTULO_DA_PORTA[porta.type], detalhe: 'Inscrever na tela ou pela API' }
  }
}

export const OPCOES_DE_PORTA = Object.entries(ROTULO_DA_PORTA).map(([value, label]) => ({ value, label }))

export function resumoDaReentrada(e: Entrada): string {
  switch (e.reentry.mode) {
    case 'one_open': return 'Uma inscrição de cada vez'
    case 'per_subject': return 'Uma por agendamento, negócio ou pedido'
    case 'once': return 'Só uma vez por pessoa'
    case 'cooldown': return `De novo só depois de ${e.reentry.cooldownDays ?? 30} dias`
    default: return 'Uma inscrição de cada vez'
  }
}

/**
 * A frase do cabeçalho do painel: o que o passo faz, montada com a
 * configuração, em português ("Envia o modelo “Lembrete…” pela Recepção…").
 */
export function fraseDoPasso(no: NoDoGrafo, catalogo: Catalogo, apoio: ApoioDoEditor): string | null {
  const p = no.params
  const nomeDe = <T extends { id: string; name: string }>(lista: T[], id: unknown) => lista.find((x) => x.id === id)?.name
  const aspas = (t: string) => `“${t}”`
  switch (no.type) {
    case 'send_template': {
      const t = apoio.templates.find((x) => x.id === p.templateId)
      const l = nomeDe(apoio.whatsappNumbers, p.whatsappNumberId)
      if (!t) return 'Envia um modelo aprovado pela Meta. Escolha a linha e o modelo.'
      return `Envia o modelo ${aspas(nomeLegivelDoModelo(t.name))}${l ? ` pela ${l}` : ''}.`
    }
    case 'send_text': return 'Envia um texto escrito por você. Só sai até 24 h depois da última mensagem da pessoa.'
    case 'notify_team': { const d = nomeDe(apoio.departments, p.departmentId); return d ? `Avisa ${d}${p.groupDaily ? ' numa lista do dia' : ' na hora'}.` : 'Avisa um setor da equipe.' }
    case 'internal_note': return 'Deixa uma nota na conversa, só para a equipe.'
    case 'hold_conversation': return `Por ${rotuloDaDuracao(p.duration)}, as respostas que a jornada espera vão para ela, e não para o agente.`
    case 'handoff_agent': return 'Passa a conversa para o agente de IA, com o contexto.'
    case 'handoff_human': { const d = nomeDe(apoio.departments, p.departmentId); return d ? `Passa a conversa para ${d} e pausa a IA.` : 'Passa a conversa para uma pessoa e pausa a IA.' }
    case 'resolve_conversation': return 'Marca a conversa como resolvida.'
    case 'tag': { const t = nomeDe(apoio.tags, p.tagId); return t ? `${p.action === 'remove' ? 'Tira' : 'Põe'} a etiqueta ${aspas(t)}.` : 'Põe ou tira uma etiqueta do contato.' }
    case 'set_stage': { const s = nomeDe(apoio.stages, p.stageId); return s ? `Leva o contato para a etapa ${aspas(s)}.` : 'Muda a etapa do contato.' }
    case 'set_field': { const f = nomeDe(apoio.customFields, p.fieldId); return f ? `Grava no campo ${aspas(f)} do cadastro.` : 'Grava um valor num campo personalizado do contato.' }
    case 'assign': { const q = p.to === 'user' ? nomeDe(apoio.users, p.userId) : nomeDe(apoio.departments, p.departmentId); return q ? `Atribui a conversa a ${q}.` : 'Atribui a conversa a uma pessoa ou setor.' }
    case 'connector_call': { const o = catalogo.connectorOperations.find((x) => x.key === p.operation); return o ? `Pede ao sistema do cliente: ${o.label.toLowerCase()}.` : 'Chama uma operação no sistema do cliente.' }
    case 'webhook_out': { try { return `Manda os dados escolhidos para ${new URL(String(p.url)).host}.` } catch { return 'Manda os dados escolhidos para outro sistema da empresa.' } }
    case 'wait':
      if (p.mode === 'until_time') return `Espera até as ${String(p.time ?? '09:00')}.`
      if (p.mode === 'next_business_hour') return 'Espera até o horário de atendimento da empresa.'
      if (p.mode === 'relative_to_field') {
        const d = Number(p.offsetDays ?? 0)
        const data = p.field ? rotuloDaVariavel(String(p.field)).toLowerCase() : 'a data'
        const quando = d === 0 ? 'no próprio dia' : `${Math.abs(d)} dia${Math.abs(d) === 1 ? '' : 's'} ${d < 0 ? 'antes' : 'depois'}`
        return `Espera até ${quando} (${data})${p.time ? `, às ${String(p.time)}` : ''}.`
      }
      return `Espera ${rotuloDaDuracao(p.duration)}.`
    case 'wait_event': { const n = Array.isArray(p.events) ? p.events.length : 0; return `Espera até ${rotuloDaDuracao(p.timeout)} por ${n === 1 ? 'uma resposta' : `${n} tipos de resposta`}. Cada uma segue um caminho.` }
    case 'branch': { const n = Array.isArray(p.branches) ? p.branches.length : 0; return `Separa as pessoas em ${n + 1} caminho${n ? 's' : ''}, por condição.` }
    case 'goal': return `Termina a jornada como sucesso: conta a meta ${aspas(String(p.label ?? 'Objetivo atingido'))}.`
    case 'exit': return `Termina a jornada da pessoa. Motivo: ${String(p.reason ?? 'fim')}.`
    case 'ai_classify': { const n = Array.isArray(p.categories) ? p.categories.length : 0; return `A IA lê a última mensagem da pessoa e escolhe entre ${n} resposta${n === 1 ? '' : 's'}.` }
    case 'deal_action': {
      const etapa = nomeDe(apoio.dealStages, p.stageId) ?? (p.stageName ? String(p.stageName) : null)
      return ({ create: `Abre um negócio novo${etapa ? ` na etapa ${aspas(etapa)}` : ''}.`, move: `Leva o negócio aberto${etapa ? ` para a etapa ${aspas(etapa)}` : ' para outra etapa'}.`, won: 'Fecha o negócio aberto como ganho.', lost: 'Fecha o negócio aberto como perdido.' } as Record<string, string>)[String(p.action)] ?? 'Cria, move ou fecha um negócio do contato.'
    }
    case 'ai_extract': { const f = listaCurta(p.fields); return f.length ? `A IA lê a conversa e guarda: ${f.join(', ')}.` : 'A IA lê a conversa e guarda os dados que você escolher.' }
    case 'ai_summarize': return p.saveAs === 'context' ? 'A IA resume a conversa para os próximos passos.' : 'A IA resume a conversa numa nota para a equipe.'
    case 'ai_mission': { const ev = catalogo.events.find((e) => e.key === p.successEvent); return ev ? `O agente conversa com uma missão até: ${ev.label.toLowerCase()}.` : 'O agente recebe uma missão com prazo e conversa até concluir.' }
    default: return null
  }
}
