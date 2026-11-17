import { describe, expect, it } from 'vitest'
import { CATALOGO_EXEMPLO, saidasDoNo } from '@/services/jornadas/catalogo'
import { APOIO_EXEMPLO, jornadasDeExemplo, RECEITAS_EXEMPLO } from '@/services/jornadas/dados-exemplo'
import { validarDesenho } from '@/services/jornadas/validar'
import type { NoDoGrafo, VersaoDaJornada } from '@/services/jornadas/tipos'
import { instrucaoDosDados, intencaoDoRotulo, lerCaminho, lerCaminhoDaSaida, oQueAconteceu, preencherPeloCaminho, sugestoesDoPasso, textoDoAviso } from './caminho'
import { terminarAqui } from './terminarAqui'
import { alternarFrase, SEGMENTOS, sugestoesPara, temFrase } from '@/services/jornadas/sugestoes'

const C = CATALOGO_EXEMPLO
const base = () => jornadasDeExemplo().find((j) => j.id === 'j_cancelados')!.draft

/** Um desenho pequeno: mensagem que espera resposta → (sem resposta) → passo novo. */
function desenho(nos: Record<string, NoDoGrafo>, start: string, entrada?: VersaoDaJornada['entry']): VersaoDaJornada {
  const v = base()
  return { ...v, entry: entrada ?? v.entry, graph: { start, nodes: nos, layout: {} } }
}

const convite: NoDoGrafo = {
  type: 'send_and_wait', label: 'Convite para remarcar',
  params: { templateId: 't_remarcar', replies: [{ key: 'quero', label: 'Quero remarcar' }, { key: 'agora_nao', label: 'Agora não' }], timeout: { amount: 48, unit: 'hours' } },
  outputs: { quero: null, agora_nao: null, outra_resposta: null, sem_resposta: 'n_novo' },
}

describe('lerCaminho (17/11)', () => {
  it('lê "sem resposta" e o assunto do agendamento cancelado', () => {
    const v = desenho({ n_convite: convite, n_novo: { type: 'notify_team', params: {}, outputs: { next: null } } }, 'n_convite')
    const l = lerCaminho(v, 'n_novo', C, APOIO_EXEMPLO)
    expect(l.situacao).toBe('sem_resposta')
    expect(l.origem?.nome).toBe('Convite para remarcar')
    expect(l.assunto.tipo).toBe('agendamento')
    expect(textoDoAviso(l, C)).toBe('{{contato.nome}} não respondeu à mensagem “Convite para remarcar” (agendamento cancelado de {{evento.data | data:"DD/MM"}}).')
  })

  it('passa por passos que só seguem adiante (etiqueta, aviso) até achar quem decidiu', () => {
    const v = desenho({
      n_convite: { ...convite, outputs: { ...convite.outputs, agora_nao: 'n_tag', sem_resposta: null } },
      n_tag: { type: 'tag', params: { action: 'add', tagId: 'tg_nao_remarcar' }, outputs: { next: 'n_aviso' } },
      n_aviso: { type: 'notify_team', params: {}, outputs: { next: 'n_sair' } },
      n_sair: { type: 'exit', params: {}, outputs: {} },
    }, 'n_convite')
    const l = lerCaminho(v, 'n_sair', C, APOIO_EXEMPLO)
    expect(l.situacao).toBe('recusou')
    expect(l.rotulo).toBe('Agora não')
    expect(l.equipeAvisada).toBe(true)
    expect(sugestoesDoPasso(v.graph.nodes.n_sair, l, C)).toEqual({ reasonCode: 'declined', reason: 'Recusou' })
  })

  it('a meta depois de "Concluiu" vem do tipo de missão', () => {
    const v = desenho({
      n_missao: { type: 'ai_mission', params: { missionType: 'confirm_attendance' }, outputs: { concluiu: 'n_meta', nao_concluiu: null, prazo: null } },
      n_meta: { type: 'goal', params: {}, outputs: {} },
    }, 'n_missao')
    const l = lerCaminho(v, 'n_meta', C, APOIO_EXEMPLO)
    expect(l.situacao).toBe('missao_concluiu')
    expect(sugestoesDoPasso(v.graph.nodes.n_meta, l, C)).toEqual({ goalCode: 'attendance_confirmed', label: 'Presença confirmada' })
    expect(oQueAconteceu(lerCaminhoDaSaida(v, 'n_missao', 'prazo', C), C)).toBe('não concluiu no prazo a missão “Confirmar presença”')
  })

  it('o botão "Cancelar" leva a "Quer cancelar" na entrega à equipe e a "Remarcar ou cancelar no sistema" no aviso', () => {
    const v = desenho({
      n_lembrete: { type: 'send_and_wait', label: 'Lembrete', params: { replies: [{ key: 'cancelar', label: 'Cancelar' }] }, outputs: { cancelar: 'n_humano' } },
      n_humano: { type: 'handoff_human', params: {}, outputs: { next: null } },
    }, 'n_lembrete')
    const l = lerCaminho(v, 'n_humano', C, APOIO_EXEMPLO)
    expect(sugestoesDoPasso(v.graph.nodes.n_humano, l, C)).toEqual({ reasonCode: 'wants_cancel', reason: 'Quer cancelar' })
    expect(sugestoesDoPasso({ type: 'notify_team', params: {}, outputs: {} }, l, C).action).toBe('update_system')
  })

  it('entende a intenção dos botões e das respostas da IA', () => {
    expect(intencaoDoRotulo('Quero remarcar')).toBe('remarcar')
    expect(intencaoDoRotulo('Cancelar')).toBe('cancelar')
    expect(intencaoDoRotulo('Agora não')).toBe('recusar')
    expect(intencaoDoRotulo('Não tem interesse')).toBe('recusar')
    expect(intencaoDoRotulo('Insatisfeita')).toBe('reclamar')
    expect(intencaoDoRotulo('Confirmar')).toBe('confirmar')
    expect(intencaoDoRotulo('Tenho uma dúvida')).toBeNull()
  })
})

describe('preencherPeloCaminho (17/11)', () => {
  it('o aviso nasce escrito, com o setor do passo de equipe anterior e a ação sugerida', () => {
    const v = desenho({
      n_humano: { type: 'handoff_human', params: { departmentId: 'd_comercial' }, outputs: { next: 'n_convite' } },
      n_convite: convite,
      n_novo: { type: 'notify_team', params: {}, outputs: { next: null } },
    }, 'n_humano')
    const p = preencherPeloCaminho(v, 'n_novo', C, APOIO_EXEMPLO)
    expect(p.departmentId).toBe('d_comercial')
    expect(p.action).toBe('call')
    expect(String(p.message)).toContain('não respondeu à mensagem “Convite para remarcar”')
  })

  it('a missão escolhe o tipo pela entrada e já vem com as escolhas e restrições testadas', () => {
    const v = desenho({ n_convite: { ...convite, outputs: { ...convite.outputs, quero: 'n_missao', sem_resposta: null } }, n_missao: { type: 'ai_mission', params: {}, outputs: {} } }, 'n_convite')
    const p = preencherPeloCaminho(v, 'n_missao', C, APOIO_EXEMPLO)
    expect(p.missionType).toBe('reschedule')
    expect(p.restrictions).toEqual(['no_insist', 'handoff_on_complaint'])
    expect(p.missionOptions).toEqual({ professional: 'same', withinDays: '14', unit: 'same' })
    expect(p.deadline).toEqual({ amount: 48, unit: 'hours' })
  })

  it('qualificar o contato já vem com a etapa "Qualificado" do funil', () => {
    const v = desenho({ n_missao: { type: 'ai_mission', params: {}, outputs: {} } }, 'n_missao', {
      ...base().entry, doors: [{ id: 'p', type: 'event', params: { event: 'message.first' } }],
    })
    const p = preencherPeloCaminho(v, 'n_missao', C, APOIO_EXEMPLO)
    expect(p.missionType).toBe('qualify_lead')
    expect((p.missionOptions as Record<string, unknown>).moveTo).toBe('f_qualificado')
  })

  it('"Terminar aqui" grava o código e o rótulo da lista', () => {
    const v = desenho({ n_convite: { ...convite, outputs: { ...convite.outputs, sem_resposta: null } } }, 'n_convite')
    const novo = terminarAqui(v, [{ origem: 'n_convite', saida: 'sem_resposta', codigo: 'no_reply', motivo: 'Sem resposta' }])
    const sair = Object.values(novo.graph.nodes).find((n) => n.type === 'exit')!
    expect(sair.params).toEqual({ reasonCode: 'no_reply', reason: 'Sem resposta' })
  })

  it('a instrução do "Extrair dados" sai dos dados escolhidos', () => {
    expect(instrucaoDosDados(['convênio'])).toBe('Ache na conversa: convênio.')
    expect(instrucaoDosDados(['convênio', 'melhor horário', 'interesse'])).toBe('Ache na conversa: convênio, melhor horário e interesse.')
    expect(instrucaoDosDados([])).toBe('')
  })
})

describe('receitas e exemplos com as listas padronizadas (17/11)', () => {
  const versoes = [...jornadasDeExemplo().map((j) => j.draft), ...RECEITAS_EXEMPLO.map((r) => r.version)]

  it('toda meta, saída e entrega à equipe tem código (da lista ou "other" com nome)', () => {
    for (const v of versoes) {
      for (const n of Object.values(v.graph.nodes)) {
        if (n.type === 'goal') expect(n.params.goalCode === 'other' ? n.params.label : C.goalTypes.find((g) => g.code === n.params.goalCode)?.label).toBe(n.params.label)
        if (n.type === 'exit') expect(n.params.reasonCode === 'other' ? n.params.reason : C.exitReasons.find((g) => g.code === n.params.reasonCode)?.label).toBe(n.params.reason)
        if (n.type === 'handoff_human') expect(n.params.reasonCode).toBeTruthy()
        if (n.type === 'notify_team') expect(C.teamActions.some((a) => a.code === n.params.action)).toBe(true)
      }
    }
  })

  it('a missão das receitas usa só restrições do tipo dela', () => {
    for (const v of versoes) {
      for (const n of Object.values(v.graph.nodes).filter((x) => x.type === 'ai_mission')) {
        const tipo = C.missionTypes[String(n.params.missionType)]
        expect((n.params.restrictions as string[]).every((r) => tipo.restrictions.includes(r))).toBe(true)
      }
    }
  })

  it('as saídas dos passos continuam as mesmas e a validação não acusa campo vazio nos novos campos', () => {
    const v = jornadasDeExemplo().find((j) => j.id === 'j_cancelados')!.draft
    expect(saidasDoNo(v.graph.nodes.n_missao, C).map((s) => s.key)).toEqual(['concluiu', 'nao_concluiu', 'prazo'])
    const novos = new Set(['reason', 'label', 'stageId', 'focus', 'message'])
    const vazios = validarDesenho(v, C, APOIO_EXEMPLO).filter((p) => p.code === 'required' && novos.has(p.field ?? ''))
    expect(vazios).toEqual([])
  })
})

describe('universal, com texto livre e sugestões (17/11)', () => {
  it('o catálogo dos passos não fala só com clínicas (textos, exemplos, opções e missões)', () => {
    const textos: string[] = []
    for (const p of C.steps) {
      textos.push(p.label, p.description)
      for (const c of p.params) textos.push(c.label, c.help ?? '', c.placeholder ?? '', ...(c.options ?? []).flatMap((o) => [o.label, o.hint ?? '']))
    }
    for (const t of Object.values(C.missionTypes)) textos.push(t.label, t.hint, ...t.steps, ...t.options.flatMap((o) => [o.label, ...(o.options ?? []).map((x) => x.label)]))
    for (const l of [C.goalTypes, C.exitReasons, C.handoffReasons, C.teamActions, C.missionRestrictions]) textos.push(...l.flatMap((i) => [i.label, i.hint ?? '']))
    const presos = textos.filter((t) => /consulta|paciente|conv[eê]nio|m[eé]dic|cl[ií]nica|recep[cç][aã]o|especialidade|preparo|exame|unimed/i.test(t))
    expect(presos).toEqual([])
  })

  it('a missão personalizada pede o objetivo escrito e não mostra as escolhas testadas', () => {
    const v = desenho({ n_missao: { type: 'ai_mission', params: { missionType: 'custom', objective: '', successEvent: 'agent.mission_finished', deadline: { amount: 48, unit: 'hours' } }, outputs: { concluiu: null, nao_concluiu: null, prazo: null } } }, 'n_missao')
    const faltam = validarDesenho(v, C, APOIO_EXEMPLO).filter((p) => p.code === 'required' && p.nodeId === 'n_missao').map((p) => p.field)
    expect(faltam).toContain('objective')
    const opcoes = C.steps.find((s) => s.type === 'ai_mission')!.params.find((c) => c.key === 'missionOptions')!
    expect(opcoes.showIf?.equals).not.toContain('custom')
    expect(C.missionTypes.custom.successEvent).toBe('agent.mission_finished')
  })

  it('tocar numa sugestão põe a frase numa linha nova; tocar de novo tira, sem mexer no resto', () => {
    const texto = 'Confirme o endereço de entrega.'
    const comFrase = alternarFrase(texto, 'Fale de um jeito simples e curto.')
    expect(comFrase).toBe('Confirme o endereço de entrega.\nFale de um jeito simples e curto.')
    expect(temFrase(comFrase, 'fale de um jeito simples e curto.')).toBe(true)
    expect(alternarFrase(comFrase, 'Fale de um jeito simples e curto.')).toBe(texto)
    expect(alternarFrase('', 'Tente resolver ainda hoje.')).toBe('Tente resolver ainda hoje.')
  })

  it('as sugestões juntam as do segmento escolhido e as de qualquer negócio', () => {
    const imob = sugestoesPara('dados_extrair', 'imobiliaria')
    expect(imob).toContain('bairro')
    expect(imob).toContain('interesse')
    expect(imob).not.toContain('convênio')
    expect(sugestoesPara('dados_extrair', 'geral')).not.toContain('bairro')
    for (const s of SEGMENTOS) expect(sugestoesPara('missao_objetivo', s.id).length).toBeGreaterThan(0)
  })
})
