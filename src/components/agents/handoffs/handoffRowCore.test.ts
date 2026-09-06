// ─── A6 / SCRUM-1017 — o núcleo puro da linha ────────────────────────────────
// `sla()` é o alvo obrigatório da rubrica da Onda 1. Por ser função pura, testo
// sem montar nada.
import { describe, it, expect } from 'vitest'
import { sla, motivo, maskPhone, formatarEspera, acentoDoNome, SLA_ESTOURADO, SLA_ATENCAO } from './handoffRowCore'
import type { HandoffItem } from '@/types/agentsOps'

const item = (over: Partial<HandoffItem> = {}): HandoffItem => ({
  id: 'he_1',
  conversationId: 'conv_1',
  contact: { id: 'c1', name: 'Marina Torres', phoneMasked: '+55 11 9******-71' },
  agent: { id: 'a1', name: null },      // D36: vem sempre null
  rule: { id: null, label: null },      // D9: null em quase todo evento real
  target: { type: null, id: null, label: null },
  intent: null,
  queue: 'geral',
  summary: null,
  waitingSeconds: 120,
  slaSeconds: 300,
  createdAt: '2026-09-06T14:00:00.000Z',
  ...over,
})

describe('formatarEspera', () => {
  it('formata mm:ss', () => {
    expect(formatarEspera(142)).toBe('02:22')
    expect(formatarEspera(0)).toBe('00:00')
    expect(formatarEspera(59)).toBe('00:59')
    expect(formatarEspera(600)).toBe('10:00')
  })

  it('passa a h:mm:ss acima de uma hora', () => {
    expect(formatarEspera(3600)).toBe('1:00:00')
    expect(formatarEspera(3742)).toBe('1:02:22')
  })

  it('trata negativo como zero em vez de imprimir lixo', () => {
    expect(formatarEspera(-5)).toBe('00:00')
  })
})

describe('sla — faixas de cor', () => {
  it('acima do SLA: rose E o sufixo visível', () => {
    const r = sla(760, 600)                       // 12:40 contra 10:00
    expect(r.tempo).toBe('12:40')
    expect(r.estado).toBe('estourado')
    expect(r.acento).toBe('rose')
    expect(r.sufixo).toBe('SLA 10:00')
  })

  it('perto do SLA: amber e SEM sufixo', () => {
    const r = sla(372, 600)                       // 06:12 -> 0,62
    expect(r.acento).toBe('amber')
    expect(r.sufixo).toBeNull()
  })

  it('dentro do SLA: green e sem sufixo', () => {
    const r = sla(168, 600)                       // 02:48 -> 0,28
    expect(r.acento).toBe('green')
    expect(r.sufixo).toBeNull()
  })

  it('os cortes são inclusivos à esquerda', () => {
    // Exatamente 0,6 é âmbar (não verde) e exatamente 1 é rose (não âmbar).
    expect(sla(600 * SLA_ATENCAO, 600).acento).toBe('amber')
    expect(sla(600 * SLA_ESTOURADO, 600).acento).toBe('rose')
    // E um fio abaixo cai para a faixa de baixo.
    expect(sla(600 * SLA_ATENCAO - 1, 600).acento).toBe('green')
    expect(sla(600 * SLA_ESTOURADO - 1, 600).acento).toBe('amber')
  })

  it('espera zero é 00:00 e verde', () => {
    const r = sla(0, 600)
    expect(r.tempo).toBe('00:00')
    expect(r.acento).toBe('green')
  })

  it('devolve NOME de acento, nunca hex — trava a Carta §7 no teste', () => {
    for (const [w, s] of [[760, 600], [372, 600], [168, 600]]) {
      expect(sla(w, s).acento).toMatch(/^(rose|amber|green)$/)
    }
  })
})

describe('sla — sem SLA configurado', () => {
  it.each([0, -1, Number.NaN])('slaSeconds = %s não pinta nada e não lança', (s) => {
    const r = sla(900, s as number)
    expect(r.estado).toBe('sem-sla')
    expect(r.acento).toBeNull()
    expect(r.sufixo).toBeNull()
    // O tempo continua sendo mostrado: o que falta é o SLA, não a espera.
    expect(r.tempo).toBe('15:00')
  })

  it('sem SLA não vira "estourado" — seria alarme falso por falta de config', () => {
    expect(sla(99999, 0).estado).not.toBe('estourado')
  })
})

describe('sla — acessibilidade', () => {
  it('a descrição diz o estado por extenso, não só por cor', () => {
    // A cor sozinha não pode carregar a informação (Carta de Padrões).
    expect(sla(760, 600).descricao).toBe('esperando 12 min 40 s, acima do SLA de 10 min')
    expect(sla(168, 600).descricao).toMatch(/dentro do SLA/)
    expect(sla(900, 0).descricao).toMatch(/sem SLA definido/)
  })

  it('a espera por extenso omite os segundos quando são zero', () => {
    expect(sla(600, 3600).descricao).toMatch(/esperando 10 min,/)
    expect(sla(45, 3600).descricao).toMatch(/esperando 45 s,/)
  })
})

describe('motivo — a degradação em cascata da célula .why', () => {
  it('com tudo, devolve os três pedaços', () => {
    const r = motivo(
      item({ rule: { id: 'r1', label: 'reembolso' }, target: { type: 'queue', id: 'q1', label: 'Financeiro' } }),
      'Sofia',
    )
    expect(r).toEqual({ agente: 'Sofia', regra: 'reembolso', destino: 'Financeiro', vazio: false })
  })

  it('só o agente: regra e destino ficam null, e NÃO viram travessão', () => {
    // É o caso real da maioria dos eventos (D9). O componente escreve
    // "via Sofia" e para aí — nunca "via Sofia · regra — → —".
    const r = motivo(item(), 'Sofia')
    expect(r.agente).toBe('Sofia')
    expect(r.regra).toBeNull()
    expect(r.destino).toBeNull()
    expect(r.vazio).toBe(false)
  })

  it('sem nada, marca vazio para a célula inteira virar um travessão só', () => {
    expect(motivo(item(), null).vazio).toBe(true)
  })

  it('o nome do agente vem do cliente, porque o backend manda null (D36)', () => {
    // Sem o rol resolvido, `agent.name` é null e não há nome nenhum.
    expect(motivo(item()).agente).toBeNull()
    // Com o rol, o nome aparece sem o backend ter mudado.
    expect(motivo(item(), 'Luna').agente).toBe('Luna')
  })

  it('rule.label null nunca produz a string "regra —"', () => {
    const r = motivo(item({ rule: { id: 'r1', label: null } }), 'Sofia')
    expect(r.regra).toBeNull()
    expect(JSON.stringify(r)).not.toContain('—')
  })
})

describe('maskPhone — DDD + 2 últimos dígitos', () => {
  it('mascara o meio de um celular brasileiro', () => {
    // A regra do CONTRATOS.md vence o exemplo do JSON e o mockup, que mostram 4.
    expect(maskPhone('+55 11 99988-7771')).toBe('+55 11 9******-71')
    expect(maskPhone('5511999887771')).toBe('+55 11 9******-71')
  })

  it('preserva o DDD e os 2 últimos, e nada mais', () => {
    const saida = maskPhone('5521988882210')
    expect(saida).toContain('21')      // DDD
    expect(saida.endsWith('10')).toBe(true)
    expect(saida).not.toContain('8888')
  })

  it('número curto ou vazio volta como veio, sem inventar máscara', () => {
    expect(maskPhone('')).toBe('')
    expect(maskPhone(null)).toBe('')
    expect(maskPhone(undefined)).toBe('')
    expect(maskPhone('1234')).toBe('1234')
  })

  it('não quebra com número fora do padrão brasileiro', () => {
    expect(() => maskPhone('12025550123')).not.toThrow()
    expect(maskPhone('12025550123')).toMatch(/\*/)
  })
})

describe('acentoDoNome', () => {
  it('é determinístico — a mesma pessoa não troca de cor a cada render', () => {
    expect(acentoDoNome('Marina Torres')).toBe(acentoDoNome('Marina Torres'))
  })

  it('devolve NOME de acento válido, nunca hex', () => {
    for (const nome of ['Marina Torres', 'Carlos F.', 'João P.', '', 'Ana']) {
      expect(acentoDoNome(nome)).toMatch(/^(rose|violet|green|amber|blue|cyan)$/)
      expect(acentoDoNome(nome)).not.toMatch(/#/)
    }
  })

  it('distribui nomes diferentes por acentos diferentes', () => {
    const nomes = ['Marina', 'Carlos', 'João', 'Renata', 'Aline', 'Bruno', 'Clara', 'Diego']
    expect(new Set(nomes.map(acentoDoNome)).size).toBeGreaterThan(1)
  })

  it('nome vazio não quebra', () => {
    expect(() => acentoDoNome('')).not.toThrow()
  })
})
