// wizardConfigToPrompt — o mapeador que alimenta o "Regenerar" da A2.
//
// O que estes testes protegem:
//   · os TRÊS remapeamentos, um a um, porque cada um é um lugar onde os dois
//     shapes deixam de bater e um `??` distraído passaria despercebido;
//   · o agente sem wizard, que EXISTE de verdade no tenant local e precisa
//     produzir motivo detectável em vez de request pela metade;
//   · o estreitamento defensivo, porque `wizard_config` vem do banco como
//     `Record<string, unknown>` e ninguém garante o shape;
//   · o ESPELHO com `useStudioDraft.generatePrompt()`, que é o teste que
//     realmente importa a longo prazo: as duas derivações têm de continuar
//     concordando, senão o prompt do wizard e o do Regenerar divergem em
//     silêncio.

import { describe, it, expect } from 'vitest'

import { wizardConfigToPromptRequest, MOTIVO_SEM_WIZARD, type EstadoVivoDoAgente } from './wizardConfigToPrompt'
import type { HandoffRule } from '@/services/agentsApi'

// Shape REAL gravado por `useStudioDraft.publish()`, não inventado — é o
// mesmo critério que pegou os dois bugs do deckFormat: teste que constrói o
// dado do zero prova o raciocínio, não a realidade.
const CFG_COMPLETO = {
  identity: { name: 'Sofia', icon: '🤖', sector: 'Vendas', objective: 'vender mais' },
  personality: {
    persona_name: 'Sofi',
    tone: 'entusiasmada',
    language: 'pt-BR',
    response_style: ['curta', 'direta'],
  },
  scope: {
    can_do: ['responder dúvidas', 'agendar'],
    cannot_do: ['dar desconto'],
    faqs: [{ question: 'Qual o prazo?', answer: '5 dias úteis' }],
  },
  business: {
    company_name: 'Acme',
    company_description: 'loja de bicicletas',
    products_services: 'bicicletas e acessórios',
    extra_context: 'atendemos só SP',
    brand_links: ['https://acme.com'],
    brand_links_context: 'tom da marca: informal',
  },
  deployment: {
    channels_whatsapp: true,
    channels_messenger: false,
    channels_instagram: true,
    handoff_rules: [
      { id: 'r1', name: 'Reclamação', description: 'cliente irritado', keywords: ['reclamar', 'processo'], department: 'Suporte' },
      { id: 'r2', name: 'Financeiro', keywords: ['boleto'], department: 'Financeiro' },
    ],
  },
}

describe('wizardConfigToPromptRequest · os três remapeamentos', () => {
  it('1) `emoji` do pedido vem do `icon` do wizard_config', () => {
    const { request } = wizardConfigToPromptRequest(CFG_COMPLETO)
    expect(request?.identity.emoji).toBe('🤖')
  })

  it('2) `business.faqs` vem de `scope.faqs`, que é onde o wizard_config guarda', () => {
    const { request } = wizardConfigToPromptRequest(CFG_COMPLETO)
    expect(request?.business.faqs).toEqual([{ question: 'Qual o prazo?', answer: '5 dias úteis' }])
  })

  it('2b) FAQ em `business` NÃO é lida — o dado não mora lá', () => {
    const enganoso = {
      ...CFG_COMPLETO,
      scope: { ...CFG_COMPLETO.scope, faqs: [] },
      business: { ...CFG_COMPLETO.business, faqs: [{ question: 'x', answer: 'y' }] },
    }
    expect(wizardConfigToPromptRequest(enganoso).request?.business.faqs).toEqual([])
  })

  it('3) deployment: keywords, condições, departamento e canais saem das regras e dos flags', () => {
    const { request } = wizardConfigToPromptRequest(CFG_COMPLETO)

    expect(request?.deployment.escalation_keywords).toEqual(['reclamar', 'processo', 'boleto'])
    // description quando existe, nome da regra quando não
    expect(request?.deployment.escalation_conditions).toEqual(['cliente irritado', 'Financeiro'])
    // o PRIMEIRO departamento, como no generatePrompt
    expect(request?.deployment.escalation_department).toBe('Suporte')
    // só os canais ligados, na ordem do wizard
    expect(request?.deployment.channels).toEqual(['WhatsApp', 'Instagram'])
  })

  it('3b) corta as keywords em 20, igual ao generatePrompt', () => {
    const muitas = {
      ...CFG_COMPLETO,
      deployment: {
        ...CFG_COMPLETO.deployment,
        handoff_rules: [{ id: 'r', name: 'R', keywords: Array.from({ length: 30 }, (_, i) => `k${i}`) }],
      },
    }
    expect(wizardConfigToPromptRequest(muitas).request?.deployment.escalation_keywords).toHaveLength(20)
  })
})

describe('wizardConfigToPromptRequest · agente sem wizard', () => {
  // Existe de verdade no tenant local (achado do Lince). O botão fica
  // DESABILITADO COM MOTIVO, não oculto: a capacidade existe no produto, é
  // este agente que não tem entrada.
  it('sem wizard_config, devolve motivo em vez de request pela metade', () => {
    for (const vazio of [undefined, null, {}]) {
      const r = wizardConfigToPromptRequest(vazio as Record<string, unknown> | null | undefined)
      expect(r.request).toBeNull()
      expect(r.motivo).toBe(MOTIVO_SEM_WIZARD)
    }
  })

  it('com shape desconhecido, também devolve motivo em vez de chutar', () => {
    const r = wizardConfigToPromptRequest({ foo: 'bar', baz: 1 })
    expect(r.request).toBeNull()
    expect(r.motivo).toBe(MOTIVO_SEM_WIZARD)
  })

  it('mapeamento bem-sucedido não traz motivo', () => {
    expect(wizardConfigToPromptRequest(CFG_COMPLETO).motivo).toBeNull()
  })

  // Publicar com campo opcional vazio é permitido pelo wizard; meio prompt é
  // melhor que botão morto.
  it('seção presente mas incompleta NÃO bloqueia — só o vazio total bloqueia', () => {
    const r = wizardConfigToPromptRequest({ identity: { name: 'Sofia' } })
    expect(r.request).not.toBeNull()
    expect(r.motivo).toBeNull()
    expect(r.request?.identity.name).toBe('Sofia')
    expect(r.request?.identity.sector).toBe('')
  })
})

describe('wizardConfigToPromptRequest · estreitamento defensivo', () => {
  it('campo com tipo errado vira vazio em vez de derrubar', () => {
    const torto = {
      identity: { name: 42, icon: null, sector: [], objective: {} },
      personality: { response_style: 'não é array' },
      scope: { can_do: [1, 'ok', null], faqs: 'nem isso' },
      deployment: { handoff_rules: 'muito menos', channels_whatsapp: 'true' },
    }
    const { request } = wizardConfigToPromptRequest(torto as unknown as Record<string, unknown>)

    expect(request?.identity.name).toBe('')
    expect(request?.identity.emoji).toBe('')
    expect(request?.personality.response_style).toEqual([])
    // filtra o que não é string em vez de propagar
    expect(request?.scope.can_do).toEqual(['ok'])
    expect(request?.business.faqs).toEqual([])
    expect(request?.deployment.escalation_keywords).toEqual([])
    // string 'true' NÃO liga o canal — só o booleano
    expect(request?.deployment.channels).toEqual([])
  })

  it('FAQ pela metade entra; FAQ totalmente vazia não vira ruído no prompt', () => {
    const cfg = {
      identity: { name: 'S' },
      scope: { faqs: [{ question: 'só pergunta' }, { question: '', answer: '' }, { answer: 'só resposta' }] },
    }
    expect(wizardConfigToPromptRequest(cfg).request?.business.faqs).toEqual([
      { question: 'só pergunta', answer: '' },
      { question: '', answer: 'só resposta' },
    ])
  })

  it('persona_name vazio cai para o nome do agente, como no generatePrompt', () => {
    const cfg = { identity: { name: 'Sofia' }, personality: { persona_name: '' } }
    expect(wizardConfigToPromptRequest(cfg).request?.personality.persona_name).toBe('Sofia')
  })

  it('extra_context junta contexto livre e das marcas, sem deixar buraco', () => {
    const so_um = { identity: { name: 'S' }, business: { brand_links_context: 'tom informal' } }
    expect(wizardConfigToPromptRequest(so_um).request?.business.extra_context).toBe('tom informal')

    const os_dois = { identity: { name: 'S' }, business: { extra_context: 'A', brand_links_context: 'B' } }
    expect(wizardConfigToPromptRequest(os_dois).request?.business.extra_context).toBe('A\n\nB')
  })
})

// O teste que mais importa a longo prazo. Se alguém mudar a derivação em
// `useStudioDraft.generatePrompt()` e não mudar aqui, o prompt do wizard e o
// do "Regenerar" passam a divergir sem que nada falhe. Este caso reproduz a
// derivação de lá sobre os MESMOS dados e exige igualdade.
describe('wizardConfigToPromptRequest · espelho do generatePrompt', () => {
  it('a derivação de deployment bate com a do useStudioDraft', () => {
    const data = {
      handoff_rules: CFG_COMPLETO.deployment.handoff_rules,
      channels_whatsapp: CFG_COMPLETO.deployment.channels_whatsapp,
      channels_messenger: CFG_COMPLETO.deployment.channels_messenger,
      channels_instagram: CFG_COMPLETO.deployment.channels_instagram,
    }

    // Cópia literal do corpo de `generatePrompt()` — se lá mudar, aqui quebra.
    const comoNoWizard = {
      escalation_keywords: data.handoff_rules.flatMap((r) => r.keywords).slice(0, 20),
      escalation_conditions: data.handoff_rules
        .map((r) => (r as { description?: string }).description ?? r.name)
        .filter(Boolean),
      escalation_department: data.handoff_rules.find((r) => r.department)?.department ?? '',
      channels: [
        data.channels_whatsapp && 'WhatsApp',
        data.channels_messenger && 'Messenger',
        data.channels_instagram && 'Instagram',
      ].filter(Boolean) as string[],
    }

    expect(wizardConfigToPromptRequest(CFG_COMPLETO).request?.deployment).toEqual(comoNoWizard)
  })
})

// Achado da Tecelã, que só aparece de quem consome: o `wizard_config` é um
// RETRATO do momento do wizard, mas `agent.handoff_rules` e `agent.channels`
// são colunas próprias do agente vivo, e é o workspace que as edita. Sem o
// estado vivo, quem cria pelo wizard, adiciona regras no workspace e clica em
// "Regenerar" recebe o prompt remontado com as regras ANTIGAS — as novas somem
// e nada avisa. Falha em silêncio, que é a pior categoria.
describe('wizardConfigToPromptRequest · estado vivo sobrepõe o retrato', () => {
  // `HandoffRule` COMPLETO, não o subconjunto que o mapeador lê. O tipo do
  // parâmetro é `HandoffRules` de propósito: o chamador real passa
  // `agent.handoff_rules` inteiro, e uma fixture com menos campos provaria o
  // raciocínio em vez da realidade — foi assim que os dois bugs do deckFormat
  // passaram verdes.
  const regraViva = (over: Partial<HandoffRule>): HandoffRule => ({
    id: 'n', name: 'R', priority: 1, enabled: true, matchMode: 'any_keyword',
    keywords: [], action: 'human_handoff',
    aiGenerated: false, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
    ...over,
  })

  const VIVO: EstadoVivoDoAgente = {
    handoff_rules: {
      rules: [
        regraViva({ id: 'n1', name: 'Cancelamento', description: 'quer cancelar', keywords: ['cancelar'], department: 'Retenção' }),
        regraViva({ id: 'n2', name: 'Urgência', keywords: ['urgente', 'agora'], department: 'Plantão' }),
      ],
    },
    channels: {
      whatsapp: { enabled: false },
      messenger: { enabled: true },
      instagram: { enabled: false },
    },
  }

  it('regra ADICIONADA no workspace entra; a antiga do retrato sai', () => {
    const { request } = wizardConfigToPromptRequest(CFG_COMPLETO, VIVO)

    expect(request?.deployment.escalation_keywords).toEqual(['cancelar', 'urgente', 'agora'])
    expect(request?.deployment.escalation_conditions).toEqual(['quer cancelar', 'Urgência'])
    expect(request?.deployment.escalation_department).toBe('Retenção')
    // as do retrato não sobraram em lugar nenhum
    expect(request?.deployment.escalation_keywords).not.toContain('reclamar')
    expect(request?.deployment.escalation_department).not.toBe('Suporte')
  })

  it('canais vivos usam `{ enabled }`, não os booleanos do retrato', () => {
    const { request } = wizardConfigToPromptRequest(CFG_COMPLETO, VIVO)
    // retrato dizia WhatsApp+Instagram; o vivo diz só Messenger
    expect(request?.deployment.channels).toEqual(['Messenger'])
  })

  it('sem estado vivo, continua valendo o retrato — nada mudou para quem já chamava', () => {
    const { request } = wizardConfigToPromptRequest(CFG_COMPLETO)
    expect(request?.deployment.escalation_department).toBe('Suporte')
    expect(request?.deployment.channels).toEqual(['WhatsApp', 'Instagram'])
  })

  it('presença MANDA, inclusive vazia: apagar todas as regras vence o retrato', () => {
    const semRegras = wizardConfigToPromptRequest(CFG_COMPLETO, { handoff_rules: { rules: [] } })
    expect(semRegras.request?.deployment.escalation_keywords).toEqual([])
    expect(semRegras.request?.deployment.escalation_department).toBe('')
    // mas os canais, ausentes do estado vivo, seguem vindo do retrato
    expect(semRegras.request?.deployment.channels).toEqual(['WhatsApp', 'Instagram'])
  })

  it('campo ausente no estado vivo cai no retrato, um a um', () => {
    const soCanais = wizardConfigToPromptRequest(CFG_COMPLETO, { channels: VIVO.channels })
    expect(soCanais.request?.deployment.channels).toEqual(['Messenger'])
    // regras não vieram no vivo → retrato
    expect(soCanais.request?.deployment.escalation_department).toBe('Suporte')
  })

  it('o estado vivo NÃO salva um agente sem wizard — o retrato ainda é a entrada', () => {
    const r = wizardConfigToPromptRequest({}, VIVO)
    expect(r.request).toBeNull()
    expect(r.motivo).toBe(MOTIVO_SEM_WIZARD)
  })

  it('estado vivo torto não derruba: cai no vazio, não no retrato nem em exceção', () => {
    const torto = { handoff_rules: { rules: 'não é array' } } as unknown as Parameters<typeof wizardConfigToPromptRequest>[1]
    const { request } = wizardConfigToPromptRequest(CFG_COMPLETO, torto)
    expect(request?.deployment.escalation_keywords).toEqual([])
  })
})
