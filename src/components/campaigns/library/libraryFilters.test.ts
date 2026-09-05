import { describe, it, expect } from 'vitest'
import {
  EMPTY_CONTEXT,
  EMPTY_FILTERS,
  applyFilters,
  buildRail,
  reconcileFilters,
  sortKeyFor,
  sortTemplates,
  type LibraryContext,
  type LibraryFilters,
  type UsageMap,
} from './libraryFilters'
import type { TemplateCategoryType, TemplateStatus, WhatsAppTemplate } from '@/types'

let seq = 0

function tpl(patch: Partial<WhatsAppTemplate> = {}): WhatsAppTemplate {
  seq += 1
  return {
    id: `t${seq}`,
    tenantId: 'tenant',
    name: `template_${seq}`,
    language: 'pt_BR',
    category: 'MARKETING' as TemplateCategoryType,
    status: 'APPROVED' as TemplateStatus,
    body: 'Corpo padrão',
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
    ...patch,
  }
}

const languageLabel = (code: string) => (code === 'pt_BR' ? 'Português (Brasil)' : code === 'es' ? 'Español' : code)

function filters(patch: Partial<LibraryFilters> = {}): LibraryFilters {
  return { ...EMPTY_FILTERS, ...patch }
}

function ctx(patch: Partial<LibraryContext> = {}): LibraryContext {
  return { automationTemplateIds: new Set(), ...patch }
}

function usageMap(entries: [string, number][]): UsageMap {
  return new Map(entries.map(([id, usageCount]) => [id, { usageCount, lastUsedAt: null }]))
}

describe('applyFilters — busca', () => {
  const base = [
    tpl({ name: 'promocao_relampago', body: 'Só hoje, 50% de desconto' }),
    tpl({ name: 'carrinho_lembrete', body: 'Seu carrinho ainda espera' }),
  ]

  it('casa o corpo, não só o nome', () => {
    // O nome é `snake_case` técnico: quem lembra do texto e não do
    // identificador precisa achar assim mesmo.
    const achados = applyFilters(base, filters({ search: 'desconto' }), EMPTY_CONTEXT)
    expect(achados.map((t) => t.name)).toEqual(['promocao_relampago'])
  })

  it('ignora acento e caixa nos dois lados', () => {
    expect(applyFilters(base, filters({ search: 'PROMOÇÃO' }), EMPTY_CONTEXT)).toHaveLength(1)
    expect(applyFilters(base, filters({ search: 'promocao' }), EMPTY_CONTEXT)).toHaveLength(1)
    expect(applyFilters([tpl({ body: 'Sessão às 9h' })], filters({ search: 'sessao' }), EMPTY_CONTEXT)).toHaveLength(1)
  })

  it('busca em branco não filtra nada', () => {
    expect(applyFilters(base, filters({ search: '   ' }), EMPTY_CONTEXT)).toHaveLength(2)
  })
})

describe('applyFilters — eixos combinados', () => {
  it('combina status, categoria e idioma com E', () => {
    const alvo = tpl({ status: 'REJECTED', category: 'UTILITY', language: 'es' })
    const lista = [alvo, tpl({ status: 'REJECTED', category: 'UTILITY', language: 'pt_BR' }), tpl()]

    const achados = applyFilters(
      lista,
      filters({ status: 'REJECTED', category: 'UTILITY', language: 'es' }),
      EMPTY_CONTEXT,
    )
    expect(achados).toEqual([alvo])
  })

  it('mantém visível o template sem linha, para a lacuna legada não sumir', () => {
    // Mesma regra do `lineMatches`: esconder linha legada da Migration #045
    // tornaria invisível justamente o que precisa de atribuição.
    const semLinha = tpl({ whatsappNumberId: undefined })
    const deOutra = tpl({ whatsappNumberId: 'linha-2' })
    const daLinha = tpl({ whatsappNumberId: 'linha-1' })

    const achados = applyFilters([semLinha, deOutra, daLinha], filters({ line: 'linha-1' }), EMPTY_CONTEXT)
    expect(achados).toEqual([semLinha, daLinha])
  })
})

describe('applyFilters — uso', () => {
  it('"nunca usados" não responde nada quando o dado de uso não existe', () => {
    // Sem BE.8 a pergunta não tem resposta. Devolver a lista inteira seria
    // afirmar que ninguém usou nada, que é justamente o que não se sabe.
    const lista = [tpl(), tpl()]
    expect(applyFilters(lista, filters({ usage: 'never_used' }), EMPTY_CONTEXT)).toEqual([])
  })

  it('"nunca usados" separa por contagem quando o dado existe', () => {
    const usado = tpl()
    const nunca = tpl()
    const semRegistro = tpl()
    const comUso = ctx({ usage: usageMap([[usado.id, 12], [nunca.id, 0]]) })

    const achados = applyFilters([usado, nunca, semRegistro], filters({ usage: 'never_used' }), comUso)
    // Ausente do mapa conta como zero: o BE.8 só devolve linha para o que tem
    // uso, e não estar lá é a própria definição de nunca usado.
    expect(achados).toEqual([nunca, semRegistro])
  })

  it('"usados em automações" sai do vínculo real, que é o único que existe', () => {
    const naAutomacao = tpl()
    const solto = tpl()
    const comAutomacao = ctx({ automationTemplateIds: new Set([naAutomacao.id]) })

    expect(applyFilters([naAutomacao, solto], filters({ usage: 'used_by_automation' }), comAutomacao))
      .toEqual([naAutomacao])
  })
})

describe('buildRail — contagens por faceta', () => {
  const lista = [
    tpl({ status: 'APPROVED', category: 'MARKETING' }),
    tpl({ status: 'APPROVED', category: 'UTILITY' }),
    tpl({ status: 'REJECTED', category: 'MARKETING' }),
    tpl({ status: 'PENDING', category: 'MARKETING' }),
  ]

  it('conta cada eixo DENTRO do resto do filtro, excluindo o próprio eixo', () => {
    // Com "Marketing" ligado, o grupo Situação conta quantos marketing há em
    // cada situação. Contar sobre a base inteira faria os números do rail não
    // baterem com a grade — o erro clássico de rail de faceta.
    const rail = buildRail(lista, filters({ category: 'MARKETING' }), EMPTY_CONTEXT, { languageLabel })
    const status = rail.find((g) => g.axis === 'status')!

    expect(status.options.find((o) => o.value === 'all')!.count).toBe(3)
    expect(status.options.find((o) => o.value === 'APPROVED')!.count).toBe(1)
    expect(status.options.find((o) => o.value === 'REJECTED')!.count).toBe(1)

    // E o próprio grupo Categoria segue contando sobre todos os status,
    // senão selecionar "Marketing" zeraria as outras categorias e a pessoa
    // não teria como trocar de escolha.
    const categoria = rail.find((g) => g.axis === 'category')!
    expect(categoria.options.find((o) => o.value === 'UTILITY')!.count).toBe(1)
  })

  it('mostra pausado e desativado só quando existem', () => {
    const semPausado = buildRail(lista, filters(), EMPTY_CONTEXT, { languageLabel })
    const valores = semPausado.find((g) => g.axis === 'status')!.options.map((o) => o.value)
    expect(valores).toEqual(['all', 'APPROVED', 'PENDING', 'REJECTED'])

    const comPausado = buildRail([...lista, tpl({ status: 'PAUSED' })], filters(), EMPTY_CONTEXT, { languageLabel })
    expect(comPausado.find((g) => g.axis === 'status')!.options.map((o) => o.value)).toContain('PAUSED')
  })

  it('esconde o grupo Idioma quando só há um idioma', () => {
    const umIdioma = buildRail(lista, filters(), EMPTY_CONTEXT, { languageLabel })
    expect(umIdioma.some((g) => g.axis === 'language')).toBe(false)

    const dois = buildRail([...lista, tpl({ language: 'es' })], filters(), EMPTY_CONTEXT, { languageLabel })
    const idioma = dois.find((g) => g.axis === 'language')!
    expect(idioma.options.map((o) => o.label)).toEqual(['Português (Brasil)', 'Español'])
  })

  it('esconde o grupo Uso inteiro quando não há uso nem automação', () => {
    expect(buildRail(lista, filters(), EMPTY_CONTEXT, { languageLabel }).some((g) => g.axis === 'usage')).toBe(false)
  })

  it('oferece "nunca usados" só com BE.8, e automações só com vínculo real', () => {
    const soAutomacao = buildRail(
      lista,
      filters(),
      ctx({ automationTemplateIds: new Set([lista[0].id]) }),
      { languageLabel },
    )
    expect(soAutomacao.find((g) => g.axis === 'usage')!.options.map((o) => o.value)).toEqual(['used_by_automation'])

    const comBe8 = buildRail(lista, filters(), ctx({ usage: usageMap([[lista[0].id, 3]]) }), { languageLabel })
    expect(comBe8.find((g) => g.axis === 'usage')!.options.map((o) => o.value)).toEqual(['never_used'])
  })

  it('só oferece o grupo Linha em conta com mais de uma linha', () => {
    const umaLinha = buildRail(lista, filters(), EMPTY_CONTEXT, {
      languageLabel,
      lines: [{ id: 'l1', label: 'Principal' }],
    })
    expect(umaLinha.some((g) => g.axis === 'line')).toBe(false)

    const duas = buildRail(lista, filters(), EMPTY_CONTEXT, {
      languageLabel,
      lines: [{ id: 'l1', label: 'Principal' }, { id: 'l2', label: 'Suporte' }],
    })
    expect(duas.find((g) => g.axis === 'line')!.options.map((o) => o.label))
      .toEqual(['Todas as linhas', 'Principal', 'Suporte'])
  })
})

describe('sortTemplates', () => {
  it('sem dado de uso, ordena por atualização e diz que é isso que faz', () => {
    const antigo = tpl({ updatedAt: '2026-08-01T10:00:00Z' })
    const novo = tpl({ updatedAt: '2026-09-04T10:00:00Z' })

    expect(sortKeyFor(EMPTY_CONTEXT)).toBe('updated')
    expect(sortTemplates([antigo, novo], EMPTY_CONTEXT)).toEqual([novo, antigo])
  })

  it('com uso, ordena por uso e desempata pela atualização', () => {
    const muito = tpl({ updatedAt: '2026-08-01T10:00:00Z' })
    const pouco = tpl({ updatedAt: '2026-08-02T10:00:00Z' })
    const zeroAntigo = tpl({ updatedAt: '2026-08-03T10:00:00Z' })
    const zeroNovo = tpl({ updatedAt: '2026-09-04T10:00:00Z' })
    const comUso = ctx({ usage: usageMap([[muito.id, 96], [pouco.id, 3]]) })

    expect(sortKeyFor(comUso)).toBe('usage')
    expect(sortTemplates([zeroAntigo, pouco, zeroNovo, muito], comUso))
      .toEqual([muito, pouco, zeroNovo, zeroAntigo])
  })

  it('não altera a lista recebida', () => {
    const lista = [tpl({ updatedAt: '2026-08-01T10:00:00Z' }), tpl({ updatedAt: '2026-09-01T10:00:00Z' })]
    const copia = [...lista]
    sortTemplates(lista, EMPTY_CONTEXT)
    expect(lista).toEqual(copia)
  })
})

describe('reconcileFilters', () => {
  it('solta o filtro cujo valor sumiu do rail', () => {
    // A sincronização com a Meta aprova o último rejeitado: a opção some e o
    // filtro ficaria ligado e invisível, com a grade vazia sem explicação.
    const rail = buildRail([tpl({ status: 'APPROVED' })], filters(), EMPTY_CONTEXT, { languageLabel })
    const reconciliado = reconcileFilters(filters({ status: 'PAUSED' }), rail)
    expect(reconciliado.status).toBe('all')
  })

  it('solta o eixo cujo grupo inteiro desapareceu', () => {
    // O grupo "Uso" some quando o BE.8 cai; o filtro precisa cair junto.
    const rail = buildRail([tpl()], filters(), EMPTY_CONTEXT, { languageLabel })
    expect(reconcileFilters(filters({ usage: 'never_used' }), rail).usage).toBe('all')
  })

  it('não mexe no que continua válido', () => {
    const rail = buildRail([tpl({ status: 'APPROVED' })], filters(), EMPTY_CONTEXT, { languageLabel })
    const atual = filters({ status: 'APPROVED', search: 'promo' })
    expect(reconcileFilters(atual, rail)).toEqual(atual)
  })
})
