/**
 * TODA a copy da landing (`/`) — SCRUM-1097, fase "porta de entrada".
 *
 * Regras (docs/design/landing-2026/README.md):
 * - P14: nada falso. ZERO número (nenhuma métrica, preço, contagem, prazo), nenhum
 *   depoimento, nenhum logo de cliente, nenhum módulo desligado vendido como
 *   pronto (Agendamentos, Conectores, Copilot, Automações, Marketing, Nexus).
 * - P15: vocabulário do produto — Agente IA (nunca "bot"), Atendente, Conversas,
 *   Leads, Funis · Negócios, Disparos · Modelos de mensagem, Situação · Etapa ·
 *   Etiquetas, Setores, Assumir / Reativar IA (auditoria audit-D.md, 24/09: o
 *   botão do app é "Reativar IA", "Devolver à IA" não existe na interface).
 * - Cada frase abaixo descreve algo que o app faz hoje. Se deixar de ser
 *   verdade, muda aqui — as seções só renderizam.
 *
 * Única exceção numérica: o ano do © do rodapé (`footer.legal`).
 */

export const LANDING_ROUTES = {
  /** Único destino de rota da página: a entrada do app. */
  login: '/login',
} as const

/** Âncoras internas — cada uma corresponde a um `id` de seção. */
export const LANDING_ANCHORS = {
  produto: 'produto',
  comoFunciona: 'como-funciona',
} as const

export const nav = {
  homeLabel: 'Oryon — início',
  links: [
    { label: 'Como funciona', anchor: LANDING_ANCHORS.comoFunciona },
    { label: 'Produto', anchor: LANDING_ANCHORS.produto },
  ],
  themeToggleLabel: 'Alternar tema claro e escuro',
  cta: 'Entrar',
} as const

export const hero = {
  // H1 de 4 palavras (medição da Attio, 24/09: o deles também tem 4 — H1
  // maior deixa a tipografia atada só à altura da viewport ilegível em
  // celular, onde a viewport é alta E estreita). "O humano entra na hora
  // certa" migrou pra 1ª frase do lead.
  title: 'Seu WhatsApp atende sozinho.',
  lead: 'O humano entra na hora certa: Agentes IA respondem cada conversa e passam para um Atendente, com todo o contexto, quando o cliente precisa de uma pessoa.',
  stageLabel: 'Demonstração animada do produto',
} as const

export const howItWorks = {
  title: 'A IA começa a conversa. A sua equipe termina quando precisa.',
  // Sem lastro pra "toda linha tem um agente": em Configurações > Números
  // WhatsApp o agente é opcional por número (pode ficar "Nenhum agente —
  // atendimento humano"). A frase descreve a CAPACIDADE, não uma garantia.
  lead: 'Cada número do WhatsApp pode ter um Agente IA atribuído. As regras de transferência decidem o momento de chamar uma pessoa.',
  steps: [
    {
      key: 'ia',
      title: 'O Agente IA atende',
      text: 'Responde na hora, no tom que a sua equipe definiu, e registra no Lead o que descobriu na conversa.',
      posterLabel: 'Conversa sendo respondida pelo Agente IA',
    },
    {
      key: 'handoff',
      title: 'A conversa passa para uma pessoa',
      text: 'Quando uma regra pede um humano, o Atendente recebe o histórico e o resumo. Ele também pode Assumir a qualquer momento.',
      posterLabel: 'Conversa sendo transferida para um Atendente',
    },
    {
      key: 'humano',
      title: 'O Atendente conduz',
      text: 'A equipe responde do mesmo lugar e, quando o assunto volta ao simples, pode Reativar a IA.',
      posterLabel: 'Conversa sendo conduzida por um Atendente',
    },
  ],
} as const

export const productGrid = {
  title: 'Tudo o que o atendimento usa, em um só lugar.',
  lead: 'Da primeira mensagem ao fechamento, sem trocar de ferramenta.',
  /**
   * Uma seção inteira por capacidade — cada uma com o produto operando ao
   * lado (referência: Attio dedica uma seção por recurso, não um grid de
   * ícone+texto). `scene` é a cena do palco (`StageScene`); só existem as
   * três implementadas (inbox/funil/disparo) — Leads e Relatórios, sem cena
   * própria, ficam na lista compacta abaixo (nada de poster fingido).
   */
  capabilities: [
    {
      key: 'conversas',
      scene: 'inbox',
      frame: 'ia',
      title: 'Conversas com Agente de IA',
      text: 'Uma caixa de entrada para várias linhas do WhatsApp e Setores. Cada número pode ter um Agente IA com o tom de voz e as regras de transferência definidos pela sua equipe; a conversa passa para um Atendente com o histórico e o resumo.',
      posterLabel: 'Caixa de entrada de Conversas com o Agente IA respondendo',
    },
    {
      key: 'funis',
      scene: 'funil',
      frame: 'final',
      title: 'Funis',
      text: 'Negócios organizados em Funis, com Etapas, valor e responsável — do primeiro contato ao fechamento, arrastando o card entre as etapas.',
      posterLabel: 'Quadro de Funis com negócios organizados por etapa',
    },
    {
      key: 'disparos',
      scene: 'disparo',
      frame: 'final',
      title: 'Disparos',
      text: 'Envio de Modelos de mensagem aprovados pela Meta para listas de contatos, respeitando a janela de atendimento do WhatsApp.',
      posterLabel: 'Envio de um Disparo com Modelo de mensagem concluído',
    },
  ],
  /** Sem cena própria no palco — lista compacta, uma linha por item. */
  compact: [
    {
      key: 'leads',
      title: 'Leads',
      text: 'Cada contato com Situação, Etiquetas e o resumo da última interação gerado pela IA.',
    },
    {
      key: 'relatorios',
      title: 'Relatórios',
      text: 'Indicadores do atendimento em um painel: volume de conversas, desempenho dos agentes e andamento dos Funis.',
    },
  ],
} as const

export const trust = {
  title: 'Feito para operar o atendimento com segurança.',
  lead: 'A IA trabalha dentro de limites que a sua equipe enxerga e controla.',
  items: [
    {
      key: 'conexao',
      title: 'Conexão oficial',
      text: 'A integração usa a API oficial do WhatsApp Business, da Meta.',
    },
    {
      key: 'contexto',
      title: 'Transferência com contexto',
      text: 'Quando a IA passa a conversa, o Atendente recebe o histórico e o resumo, sem pedir tudo de novo ao cliente.',
    },
    {
      key: 'verificacao',
      title: 'Guarda de verificação',
      text: 'Valores, horários, nomes e ações citados pela IA são conferidos; o que não confere fica retido para revisão.',
    },
    {
      key: 'vocabulario',
      title: 'Vocabulário do seu negócio',
      text: 'A interface adota os termos do seu tipo de operação, em vez de obrigar a equipe a aprender os nossos.',
    },
    {
      key: 'tema',
      title: 'Tema claro e escuro',
      text: 'Alterne entre os dois temas a qualquer momento, sem perder o que está na tela.',
    },
  ],
} as const

export const finalCta = {
  title: 'Coloque a IA para atender, com a sua equipe no comando.',
  cta: 'Entrar',
} as const

export const footer = {
  homeLabel: 'Oryon',
  /** Único número da página: o ano do direito autoral. */
  legal: '© 2026 Oryon',
  cta: 'Entrar',
} as const
