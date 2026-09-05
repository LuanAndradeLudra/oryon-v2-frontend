// deckFormat (A1/SCRUM-1012) — formatação compartilhada do Deck.
//
// O que estes testes protegem é a diferença entre "zero" e "não sei": um
// denominador zerado vira "—", não "0%", e uma data ausente vira "—", não
// "agora". O Deck inteiro depende dessa distinção para não afirmar coisas
// falsas sobre um agente enquanto o BE.7 não existe.

import { describe, it, expect, vi, afterEach } from 'vitest'

import {
  daysSince,
  draftProgress,
  elapsedSince,
  formatDuration,
  formatPct,
  personaAccent,
  personaInitial,
  relativeTime,
  WIZARD_STEPS,
} from './deckFormat'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const ago = (ms: number) => new Date(Date.now() - ms).toISOString()

afterEach(() => { vi.useRealTimers() })

describe('elapsedSince / daysSince', () => {
  it('devolve null para data ausente ou inválida, em vez de tratar como agora', () => {
    expect(elapsedSince(null)).toBeNull()
    expect(elapsedSince(undefined)).toBeNull()
    expect(elapsedSince('nao-e-data')).toBeNull()
    expect(daysSince(null)).toBeNull()
  })

  it('conta dias inteiros decorridos', () => {
    expect(daysSince(ago(9 * DAY))).toBe(9)
    expect(daysSince(ago(2 * DAY + HOUR))).toBe(2)
    expect(daysSince(ago(HOUR))).toBe(0)
  })

  it('não devolve tempo negativo para data no futuro', () => {
    expect(elapsedSince(new Date(Date.now() + HOUR).toISOString())).toBe(0)
  })
})

describe('relativeTime', () => {
  it('cobre as faixas que o feed e a faixa ao vivo usam', () => {
    expect(relativeTime(ago(2 * SECOND))).toBe('agora')
    expect(relativeTime(ago(40 * SECOND))).toBe('há 40s')
    expect(relativeTime(ago(3 * MINUTE))).toBe('há 3 min')
    expect(relativeTime(ago(5 * HOUR))).toBe('há 5h')
    expect(relativeTime(ago(2 * DAY))).toBe('há 2d')
  })

  it('mostra "—" quando não há data, nunca "agora"', () => {
    expect(relativeTime(null)).toBe('—')
  })
})

describe('formatDuration', () => {
  it('formata a métrica "Resposta" como no mockup (58s, 1m42, 2h)', () => {
    expect(formatDuration(58)).toEqual({ value: '58', unit: 's' })
    expect(formatDuration(102)).toEqual({ value: '1m42', unit: undefined })
    expect(formatDuration(120)).toEqual({ value: '2', unit: 'm' })
    expect(formatDuration(7200)).toEqual({ value: '2', unit: 'h' })
  })

  it('sem valor, mostra "—"', () => {
    expect(formatDuration(null).value).toBe('—')
    expect(formatDuration(undefined).value).toBe('—')
    expect(formatDuration(Number.NaN).value).toBe('—')
    expect(formatDuration(Number.POSITIVE_INFINITY).value).toBe('—')
  })

  // Regressão (achado do Lince no #126): `avgResponseSec` é uma média e chega
  // fracionada do backend. Arredondar o resto DEPOIS de dividir produzia
  // carimbos que não existem no relógio.
  it('não produz "60s", "1m60" nem "59m60" com segundos fracionados', () => {
    expect(formatDuration(59.6)).toEqual({ value: '1', unit: 'm' })
    expect(formatDuration(119.6)).toEqual({ value: '2', unit: 'm' })
    expect(formatDuration(3599.8)).toEqual({ value: '1', unit: 'h' })
  })

  it('arredonda o total uma vez só, sem deslocar a faixa', () => {
    expect(formatDuration(59.4)).toEqual({ value: '59', unit: 's' })
    expect(formatDuration(102.4)).toEqual({ value: '1m42', unit: undefined })
    expect(formatDuration(3599.4)).toEqual({ value: '59m59', unit: undefined })
  })
})

describe('formatPct', () => {
  it('arredonda a taxa para inteiro com unidade separada', () => {
    expect(formatPct(82, 100)).toEqual({ value: '82', unit: '%' })
    expect(formatPct(46, 60)).toEqual({ value: '77', unit: '%' })
  })

  it('sem base, mostra "—" em vez de 0% (uma taxa sem denominador é desconhecida)', () => {
    expect(formatPct(0, 0)).toEqual({ value: '—' })
  })
})

describe('personaAccent / personaInitial', () => {
  it('dá a mesma cor ao mesmo agente sempre, e usa toda a paleta categórica', () => {
    expect(personaAccent('agente-1')).toBe(personaAccent('agente-1'))
    const cores = new Set(Array.from({ length: 40 }, (_, i) => personaAccent(`id-${i}`)))
    expect(cores.size).toBeGreaterThan(1)
    expect([...cores].every((c) => ['blue', 'violet', 'green', 'amber', 'rose', 'cyan'].includes(c))).toBe(true)
  })

  it('usa a inicial maiúscula do nome, com "?" para nome vazio', () => {
    expect(personaInitial('sofia')).toBe('S')
    expect(personaInitial('  Rafa')).toBe('R')
    expect(personaInitial('   ')).toBe('?')
  })
})

describe('draftProgress', () => {
  // O wizard grava `wizard_config` ANINHADO por seção (useStudioDraft), não
  // plano. Estes testes usam o shape real.
  const cheio = {
    identity: { name: 'Sofia', icon: 'bot', sector: 'Vendas', objective: 'vender' },
    personality: { persona_name: '', tone: 'entusiasmada', language: 'pt-BR', response_style: [] },
    scope: { can_do: ['responder'], cannot_do: [], faqs: [] },
    business: { company_name: 'Acme', company_description: 'loja', products_services: '' },
    deployment: { channels_whatsapp: true, channels_messenger: false, handoff_rules: [] },
  }

  // Regressão (achado do Lince no #126): a versão anterior contava CAMPOS
  // sobre denominador de ETAPAS e tratava qualquer valor não-vazio como
  // preenchido. Um rascunho recém-criado nascia com a barra quase cheia — no
  // estado inicial, que é onde o card de rascunho passa a vida.
  it('rascunho recém-criado começa em zero, não cheio', () => {
    const vazio = {
      identity: { name: '', icon: 'bot', sector: '', objective: '' },
      personality: { persona_name: '', tone: '', language: 'pt-BR', response_style: [] },
      scope: { can_do: [], cannot_do: [], faqs: [] },
      business: { company_name: '', company_description: '', products_services: '' },
      deployment: { channels_whatsapp: true, channels_messenger: false, handoff_rules: [] },
    }
    expect(draftProgress(vazio, '')).toEqual({ done: 0, total: 5 })
  })

  it('não conta `false` como preenchido (o canal desligado não é progresso)', () => {
    const soCanais = { deployment: { channels_whatsapp: true, channels_messenger: false }, identity: {} }
    expect(draftProgress(soCanais, '')).toEqual({ done: 0, total: 5 })
  })

  it('conta uma etapa só quando TODOS os campos que o wizard exige estão lá', () => {
    const meiaIdentidade = { ...cheio, identity: { name: 'Sofia', sector: '', objective: '' } }
    expect(draftProgress(meiaIdentidade, '')?.done).toBe(3) // personalidade, escopo, negócio
    expect(draftProgress(cheio, '')?.done).toBe(4)
  })

  it('a quinta etapa é o prompt gerado, que não vive no wizard_config', () => {
    expect(draftProgress(cheio, 'Você é a Sofia...')).toEqual({ done: 5, total: 5 })
  })

  it('espaço em branco não conta como preenchido', () => {
    const brancos = { ...cheio, personality: { tone: '   ' } }
    expect(draftProgress(brancos, '')?.done).toBe(3)
  })

  it('sem wizard_config, devolve null — o card some com a barra', () => {
    expect(draftProgress(undefined, '')).toBeNull()
  })

  it('com wizard_config de shape desconhecido, devolve null em vez de chutar', () => {
    expect(draftProgress({ foo: 'bar', baz: 1 }, '')).toBeNull()
  })

  it('WIZARD_STEPS é o total contado, não o número de telas do wizard', () => {
    expect(WIZARD_STEPS).toBe(5)
  })
})
