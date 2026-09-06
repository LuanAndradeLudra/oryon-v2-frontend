// ─── A5 / SCRUM-1016 — o dado dos 3 arquétipos ───────────────────────────────
// O que estes testes protegem não é "o objeto existe", é o critério firmado
// pelo Maestro: **o chip tem de bater com o dado**. Número que mente é pior que
// número ausente.
import { describe, it, expect } from 'vitest'
import { ARCHETYPES, chipLabel, type Archetype } from '@/components/agents/archetypes/archetypes'
import { CAN_DO_PRESETS, CANNOT_DO_PRESETS, SECTORS, TONES, RESPONSE_STYLES } from '@/components/agents/studio/steps/constants'
import { CRM_CAPABILITIES_CATALOG } from '@/components/agents/crmCapabilitiesCatalog'
import { accentColor } from '@/components/ui/accentColor'

const porId = (id: Archetype['id']) => ARCHETYPES.find((a) => a.id === id)!

describe('ARCHETYPES — os 3 do mockup', () => {
  it('são exatamente Vendas, Suporte e Pós-venda, nessa ordem', () => {
    expect(ARCHETYPES.map((a) => a.id)).toEqual(['vendas', 'suporte', 'posvenda'])
    expect(ARCHETYPES.map((a) => a.nome)).toEqual(['Vendas', 'Suporte', 'Pós-venda'])
  })

  it('não ganha um quarto arquétipo sem decisão — o grid é de 3', () => {
    // Decisão 2 do plano. Se alguém acrescentar um 4º, este teste cai e a
    // conversa acontece antes do merge, não depois no layout quebrado.
    expect(ARCHETYPES).toHaveLength(3)
  })

  it('só Vendas tem o selo "Mais usado", e só ele é o botão primário', () => {
    expect(porId('vendas').destaque).toBe('Mais usado')
    expect(porId('suporte').destaque).toBeUndefined()
    expect(porId('posvenda').destaque).toBeUndefined()
    expect(ARCHETYPES.filter((a) => a.enfase === 'primary').map((a) => a.id)).toEqual(['vendas'])
  })

  it.each(ARCHETYPES)('$nome — acento é um nome válido do mapa, nunca hex', (arquetipo) => {
    // Carta de Padrões §7: cor categórica só por `accentColor`.
    expect(accentColor(arquetipo.acento)).toMatch(/^var\(--color-accent-/)
    expect(arquetipo.acento).not.toMatch(/#/)
  })

  it('os acentos são os 3 do mockup', () => {
    expect(ARCHETYPES.map((a) => a.acento)).toEqual(['blue', 'violet', 'green'])
  })

  it.each(ARCHETYPES)('$nome — tem exatamente 2 chips e o par de bolhas do exemplo', (arquetipo) => {
    expect(arquetipo.chips).toHaveLength(2)
    expect(arquetipo.exemplo).toHaveLength(2)
    // A primeira bolha é sempre do cliente: é a pergunta que dá contexto à
    // resposta do agente. Invertido, o exemplo não se lê.
    expect(arquetipo.exemplo[0].autor).toBe('cliente')
    expect(arquetipo.exemplo[1].autor).toBe('agente')
    for (const bolha of arquetipo.exemplo) expect(bolha.texto.trim().length).toBeGreaterThan(0)
  })
})

describe('chipLabel — o chip não pode mentir', () => {
  it('os 6 chips saem com o texto do mockup', () => {
    const textos = ARCHETYPES.map((a) => a.chips.map((c) => chipLabel(c, a)))
    expect(textos).toEqual([
      ['3 capacidades', '2 regras'],
      ['base obrigatória', '3 regras'],
      ['tags automáticas', 'follow-up'],
    ])
  })

  it.each(ARCHETYPES)('$nome — todo chip de contagem bate com o tamanho real do dado', (arquetipo) => {
    for (const chip of arquetipo.chips) {
      if (chip.tipo !== 'contagem') continue
      const n = arquetipo[chip.de].length
      expect(chipLabel(chip, arquetipo)).toBe(`${n} ${n === 1 ? chip.substantivo[0] : chip.substantivo[1]}`)
      // Um chip que anuncia zero é pior que chip nenhum.
      expect(n).toBeGreaterThan(0)
    }
  })

  it('concorda em número: 1 vira singular', () => {
    const posvenda = porId('posvenda')
    expect(posvenda.handoff_rules).toHaveLength(1)
    // Pós-venda não usa chip de contagem, mas a regra de concordância vale para
    // quem vier depois — é o caso que quebraria se alguém trocasse o chip dele.
    const chipRegras = porId('vendas').chips[1]
    expect(chipLabel(chipRegras, posvenda)).toBe('1 regra')
  })

  it('todo chip de rótulo tem lastro verdadeiro no dado do arquétipo', () => {
    // "tags automáticas" só pode aparecer se `tag_contact` estiver ligada;
    // "follow-up" só se estiver em `can_do`. O lastro nomeia o campo, o teste
    // confere que ele existe de fato em algum lugar do arquétipo.
    for (const arquetipo of ARCHETYPES) {
      for (const chip of arquetipo.chips) {
        if (chip.tipo !== 'rotulo') continue
        const sustentado =
          arquetipo.can_do.includes(chip.lastro) ||
          arquetipo.crm_capabilities.includes(chip.lastro as never)
        expect(sustentado, `chip "${chip.texto}" de ${arquetipo.nome} sem lastro em ${chip.lastro}`).toBe(true)
      }
    }
  })
})

describe('conteúdo — vem do vocabulário que o produto já usa', () => {
  it.each(ARCHETYPES)('$nome — can_do e cannot_do saem dos presets', (arquetipo) => {
    // Decisão 3 do plano: nada de frase nova inventada aqui. Se o PO trocar os
    // presets, o arquétipo acompanha em vez de divergir em silêncio.
    for (const item of arquetipo.can_do) expect(CAN_DO_PRESETS).toContain(item)
    for (const item of arquetipo.cannot_do) expect(CANNOT_DO_PRESETS).toContain(item)
    expect(arquetipo.can_do.length).toBeGreaterThan(0)
    expect(arquetipo.cannot_do.length).toBeGreaterThan(0)
  })

  it.each(ARCHETYPES)('$nome — setor, tom e estilos são valores válidos do wizard', (arquetipo) => {
    // Um `sector` fora da picklist entraria no rascunho e apareceria como campo
    // vazio no passo 1 — falha silenciosa que só a pessoa usando descobriria.
    expect(SECTORS.map((s) => s.value)).toContain(arquetipo.sector)
    expect(TONES.map((t) => t.value)).toContain(arquetipo.tone)
    for (const estilo of arquetipo.response_style) expect(RESPONSE_STYLES).toContain(estilo)
  })

  it.each(ARCHETYPES)('$nome — as capacidades existem no catálogo e não se repetem', (arquetipo) => {
    const ids = CRM_CAPABILITIES_CATALOG.map((c) => c.id)
    for (const id of arquetipo.crm_capabilities) expect(ids).toContain(id)
    expect(new Set(arquetipo.crm_capabilities).size).toBe(arquetipo.crm_capabilities.length)
  })

  it.each(ARCHETYPES)('$nome — as regras têm palavras-chave e id único', (arquetipo) => {
    const ids = arquetipo.handoff_rules.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const regra of arquetipo.handoff_rules) {
      expect(regra.keywords.length).toBeGreaterThan(0)
      // Regra sem palavra-chave nunca dispara: seria uma promessa vazia na tela.
      for (const k of regra.keywords) expect(k.trim()).not.toBe('')
      expect(regra.name.trim()).not.toBe('')
    }
  })
})
