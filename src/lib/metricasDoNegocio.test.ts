// SCRUM-1465: a resposta de /home/metrics vira o cartão do painel sem rede.
import { describe, it, expect } from 'vitest'
import { apoioDoNegocio, atributosLegiveis, juntarMetricasDoNegocio, kpiDoServidor, type MetricaDoCatalogo, type MetricaDoServidor } from './metricasDoNegocio'
import { buildEmptySnapshot } from '@/types/dashboard'

function metrica(extra: Partial<MetricaDoServidor> = {}): MetricaDoServidor {
  return {
    chave: 'appointments_scheduled', rotulo: 'Agendamentos marcados', grupo: 'Do seu negócio', unidade: 'count', sentido: 'up',
    ajuda: 'Consultas que a IA marcou.', selos: ['pela_ia'], versao: 1, publicadaEm: '2026-11-03T12:00:00.000Z',
    estado: 'ok', valor: 12, anterior: 10, comparavel: true, partes: { total: 12, semDetalhe: 0 }, quebra: [],
    serie: { granularidade: 'dia', pontos: [{ data: '2026-11-01', valor: 5 }, { data: '2026-11-02', valor: 7 }] },
    desde: '2026-11-01T03:00:00.000Z', explicacao: '12 consultas marcadas de 01/11 até agora.',
    ...extra,
  }
}

const catalogo = (chave: string): MetricaDoCatalogo => ({
  chave, rotulo: chave, grupo: 'Do seu negócio', unidade: 'count', sentido: 'up', ajuda: null, selos: [], versao: 1, publicadaEm: null,
})

describe('kpiDoServidor', () => {
  it('contagem: valor, variação em % sobre o cru, série e "Como calculamos" na ajuda', () => {
    const k = kpiDoServidor(metrica())
    expect(k).toMatchObject({ id: 'appointments_scheduled', category: 'Do seu negócio', unit: 'count', value: 12, trend: 20, trendUnit: '%', sparkline: [5, 7] })
    expect(k.help).toContain('Consultas que a IA marcou.')
    expect(k.help).toContain('Como calculamos: 12 consultas marcadas')
    expect(k.negocio?.estado).toBe('ok')
  })

  it('sem comparação honesta (período anterior antes do 1º dado): sem variação', () => {
    expect(kpiDoServidor(metrica({ comparavel: false, anterior: 3 })).trend).toBeNull()
  })

  it('taxa: diferença em pontos percentuais sobre o valor cru (41,6 × 42,4 não é "estável")', () => {
    const k = kpiDoServidor(metrica({ unidade: 'percent', valor: 42.4, anterior: 41.6, partes: { convertidos: 53, base: 125, dentroDoPrazo: 0 } }))
    expect(k.trend).toBe(0.8)
    expect(k.trendUnit).toBe('pp')
    expect(k.detail).toBe('53 de 125')
  })

  it('moeda: centavos viram reais UMA vez — no valor, na série e na quebra (A42)', () => {
    const k = kpiDoServidor(metrica({
      unidade: 'currency', valor: 125050, anterior: 100000, selos: ['estimado'], partes: { consideradas: 10, semPreco: 2, semEspecialidade: 1 },
      serie: { granularidade: 'dia', pontos: [{ data: 'a', valor: 25050 }, { data: 'b', valor: 100000 }] },
      quebra: [{ chave: 'Cardiologia', rotulo: 'Cardiologia', valor: 30000, partes: { consultas: 1 } }],
    }))
    expect(k.value).toBe(1250.5)
    expect(k.sparkline).toEqual([250.5, 1000])
    expect(k.negocio!.quebra[0].valor).toBe(300)
    expect(k.trend).toBe(25.1)
    // "estimado" fica no selo do cartão, não repetido no apoio (A42).
    expect(k.detail).toBe('2 sem preço · 1 sem detalhe')
  })

  it('conversão com prazo fixo: o cartão diz de quando é a coorte (A6)', () => {
    const k = kpiDoServidor(metrica({
      unidade: 'percent', valor: 40, partes: { convertidos: 8, base: 20, dentroDoPrazo: 6 },
      janela: { inicio: '2026-11-07T03:00:00.000Z', fim: '2026-11-14T03:00:00.000Z' },
    }))
    expect(k.detail).toBe('pedidos de 07/11 a 13/11 · 8 de 20 · 6 dentro do prazo')
    expect(k.negocio!.janela).toEqual({ inicio: '2026-11-07T03:00:00.000Z', fim: '2026-11-14T03:00:00.000Z' })
  })

  it('base pequena: sem %, sem variação, e as partes — inclusive dentro do prazo (A16)', () => {
    const k = kpiDoServidor(metrica({ unidade: 'percent', estado: 'base_pequena', valor: null, anterior: null, partes: { convertidos: 3, base: 5, dentroDoPrazo: 40 } }))
    expect(k.value).toBeNull()
    expect(k.trend).toBeNull()
    expect(k.detail).toBe('3 de 5 · base pequena para % · 40 dentro do prazo')
  })

  it('série com semana sem base (null) não desenha linha', () => {
    const k = kpiDoServidor(metrica({ serie: { granularidade: 'semana', pontos: [{ data: 'a', valor: 40 }, { data: 'b', valor: null }] } }))
    expect(k.sparkline).toEqual([])
  })
})

describe('apoioDoNegocio', () => {
  it('cada estado diz o que houve; nulo nunca vira zero', () => {
    expect(apoioDoNegocio({ estado: 'sem_dado', partes: {} })).toBe('sem dado ainda')
    expect(apoioDoNegocio({ estado: 'erro', partes: {} })).toBe('não foi possível calcular agora')
    expect(apoioDoNegocio({ estado: 'tempo_esgotado', partes: {} })).toMatch(/demorou demais/)
    expect(apoioDoNegocio({ estado: 'periodo_curto', partes: {} })).toBe('precisa de 7 dias ou mais')
    expect(apoioDoNegocio({ estado: 'ok', partes: { convertidos: 8, base: 20, dentroDoPrazo: 12, semLigacao: 2 } })).toBe('8 de 20 · 12 dentro do prazo · 2 sem contato')
    expect(apoioDoNegocio({ estado: 'ok', partes: { total: 4, semDetalhe: 0 } })).toBeNull()
  })
})

describe('juntarMetricasDoNegocio', () => {
  const fixos = buildEmptySnapshot().kpis

  it('a de mesmo id substitui o card fixo no lugar dele; as novas entram no fim', () => {
    const out = juntarMetricasDoNegocio(fixos, {
      escopo: 'empresa',
      metricas: [metrica(), metrica({ chave: 'clinica_pedidos_sem_vaga', rotulo: 'Pedidos sem vaga', valor: 3, anterior: null })],
    })
    expect(out).toHaveLength(fixos.length + 1)
    const i = fixos.findIndex((k) => k.id === 'appointments_scheduled')
    expect(out[i]).toMatchObject({ id: 'appointments_scheduled', category: 'Do seu negócio', value: 12 })
    expect(out[out.length - 1]).toMatchObject({ id: 'clinica_pedidos_sem_vaga', value: 3 })
  })

  it('A2: /home/metrics falhou — os ids do catálogo aparecem em ERRO, nunca o card fixo com a fórmula antiga', () => {
    const out = juntarMetricasDoNegocio(fixos, null, [catalogo('appointments_scheduled'), catalogo('clinica_valor_tabela')])
    const i = fixos.findIndex((k) => k.id === 'appointments_scheduled')
    expect(out[i]).toMatchObject({ id: 'appointments_scheduled', value: null, detail: 'indisponível agora', negocio: { estado: 'erro' } })
    expect(out[out.length - 1]).toMatchObject({ id: 'clinica_valor_tabela', negocio: { estado: 'erro' } })
    // Ainda carregando: o mesmo card, em "carregando".
    expect(juntarMetricasDoNegocio(fixos, null, [catalogo('appointments_scheduled')], 'carregando')[i].negocio!.estado).toBe('carregando')
  })

  it('sem catálogo nem valores (atendente, cliente sem métrica): ficam os fixos', () => {
    expect(juntarMetricasDoNegocio(fixos, null)).toBe(fixos)
    expect(juntarMetricasDoNegocio(fixos, { escopo: 'minhas', metricas: [] })).toBe(fixos)
  })
})

describe('atributosLegiveis', () => {
  it('só os atributos conhecidos, com booleano em português e a data no fuso de Brasília', () => {
    expect(atributosLegiveis({ especialidade_canonica: 'cardiologia', havia_horario: false, medico_id: 'x', data_consulta: '2026-11-10T13:30:00.000Z' })).toEqual([
      { rotulo: 'Especialidade', valor: 'cardiologia' },
      { rotulo: 'Havia horário', valor: 'não' },
      { rotulo: 'Consulta', valor: '10/11, 10:30' },
    ])
  })

  it('A18: só a data veio do sistema (hora desconhecida) — mostra só o dia, nunca 23:59', () => {
    expect(atributosLegiveis({ data_consulta: '2026-11-11T02:59:59.000Z', hora_conhecida: false })).toEqual([{ rotulo: 'Consulta', valor: '10/11' }])
  })
})
