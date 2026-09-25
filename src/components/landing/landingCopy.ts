/**
 * TODA a copy da landing (`/`) — SCRUM-1097, fase "porta de entrada".
 *
 * Regras (docs/design/landing-2026/README.md):
 * - P14: nada falso. ZERO número (nenhuma métrica, preço, contagem, prazo), nenhum
 *   (única exceção autorizada pelo PO em 25/09: o prazo de implantação, "até 7 dias")
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
  plataforma: 'plataforma',
  implantacao: 'implantacao',
  perguntas: 'perguntas',
} as const

export const nav = {
  homeLabel: 'Oryon — início',
  links: [
    { label: 'Plataforma', anchor: LANDING_ANCHORS.plataforma },
    { label: 'Implantação', anchor: LANDING_ANCHORS.implantacao },
    { label: 'Perguntas', anchor: LANDING_ANCHORS.perguntas },
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

export const trust = {
  // Reposicionado (25/09) como o "posso confiar?" da escada de consciência:
  // vem depois da Implantação e antes das Perguntas, e fala dos LIMITES da IA.
  eyebrow: 'Limites da IA',
  title: 'A IA trabalha dentro de limites.',
  titleCinza: 'E a sua equipe enxerga todos eles.',
  items: [
    {
      key: 'verificacao',
      title: 'Nada inventado',
      text: 'Valores, horários, nomes e ações citados pela IA são conferidos; o que não confere fica retido para revisão.',
    },
    {
      key: 'contexto',
      title: 'Transferência com contexto',
      text: 'Quando a IA passa a conversa, o Atendente recebe o histórico e o resumo, sem pedir tudo de novo ao cliente.',
    },
    {
      key: 'controle',
      title: 'A equipe assume quando quiser',
      text: 'Um clique em Assumir pausa a IA naquela conversa; Reativar IA devolve quando o Atendente terminar.',
    },
    {
      key: 'conexao',
      title: 'Conexão oficial',
      text: 'A integração usa a API oficial do WhatsApp Business, da Meta.',
    },
  ],
} as const

export const footer = {
  homeLabel: 'Oryon',
  /** Único número da página: o ano do direito autoral. */
  legal: '© 2026 Oryon',
  cta: 'Entrar',
} as const

// ─── Rodada de 25/09: página inteira no padrão da referência ─────────────────
//
// Decisões do PO (25/09): conversão = conversa no WhatsApp atendida pelo
// próprio Agente IA do Oryon; SEM prova social por enquanto; SEM planos e
// preços (tudo por proposta comercial); implantação em conjunto, em até 7 dias
// — o único prazo afirmado na página, autorizado pelo PO.

/**
 * O CONTATO COMERCIAL — a ação de conversão da página.
 *
 * `whatsapp`: número no formato internacional, só dígitos (ex.: 5547999999999).
 * PENDENTE: o PO vai informar o número que o Agente IA do Oryon atende.
 * Enquanto estiver vazio, os botões levam à seção de contato da própria página.
 */
export const contato = {
  whatsapp: '',
  mensagem: 'Olá! Vim pelo site e quero ver o Oryon funcionando no meu WhatsApp.',
  cta: 'Falar com a gente',
  ctaLongo: 'Conversar pelo WhatsApp',
} as const

export function linkContato(): string {
  if (!contato.whatsapp) return '#contato'
  return `https://wa.me/${contato.whatsapp}?text=${encodeURIComponent(contato.mensagem)}`
}

export const plataforma = {
  eyebrow: 'Plataforma',
  title: 'Tudo o que o atendimento precisa, trabalhando junto.',
  titleCinza: 'Do primeiro "oi" no WhatsApp à venda fechada — com a IA no trabalho repetitivo e a sua equipe no controle.',
  blocos: [
    {
      id: 'atender',
      indice: 'Atender com IA',
      destaque: 'Resposta na hora, a qualquer hora.',
      texto: 'O Agente IA responde cada mensagem com os valores e as condições do seu catálogo — e atualiza o CRM sem ninguém digitar nada.',
      cartoes: [
        { titulo: 'O CRM se preenche sozinho.', texto: 'Situação do contato e etiquetas mudam durante a conversa, com registro de quem fez.' },
        { titulo: 'Informação certa, não inventada.', texto: 'O agente responde com o que está na sua base de conhecimento e no catálogo liberado a ele.' },
      ],
    },
    {
      id: 'equipe',
      indice: 'Passar para a equipe',
      destaque: 'A pessoa certa, no momento certo.',
      texto: 'Quando o cliente pede um humano, a IA chama quem deve atender, com o histórico completo — e fica em pausa enquanto a sua equipe conversa.',
      cartoes: [
        { titulo: 'Avisada na hora.', texto: 'A atendente recebe a notificação com o contexto do pedido, sem precisar perguntar nada de novo.' },
        { titulo: 'Quem fecha é a sua equipe.', texto: 'A IA prepara e avança o negócio; a decisão de fechar a venda é sempre de uma pessoa.' },
      ],
    },
    {
      id: 'funil',
      indice: 'Vender pelo funil',
      destaque: 'O funil anda junto com a conversa.',
      texto: 'Cada negócio muda de etapa conforme o atendimento avança — o funil mostra o que está acontecendo agora, não o que alguém lembrou de atualizar.',
      cartoes: [
        { titulo: 'Proposta com o seu catálogo.', texto: 'Itens, quantidades e valores saem do catálogo, direto no negócio.' },
        { titulo: 'Histórico de cada movimento.', texto: 'Quem moveu, quando e por quê — a IA e a equipe, lado a lado.' },
      ],
    },
    {
      id: 'campanhas',
      indice: 'Reativar a base',
      destaque: 'Campanhas que viram conversas.',
      texto: 'Dispare modelos aprovados pela Meta para a base inteira e acompanhe quem recebeu, leu e respondeu — cada resposta cai no atendimento com IA.',
      cartoes: [
        { titulo: 'Modelos aprovados pela Meta.', texto: 'Mensagens com botões e variáveis, do jeito que o cliente vê no WhatsApp.' },
        { titulo: 'Retorno medido, não estimado.', texto: 'Entregas, leituras e respostas de cada campanha, num relatório só.' },
      ],
    },
  ],
} as const

export const implantacao = {
  eyebrow: 'Implantação',
  title: 'No ar em até 7 dias.',
  titleCinza: 'Você libera o número; a configuração da plataforma fica com a gente.',
  passos: [
    {
      quem: 'Você',
      titulo: 'Libera o seu número',
      texto: 'Você configura o número de WhatsApp e o deixa liberado pela Meta — a conexão é a oficial, pela API do WhatsApp Business.',
    },
    {
      quem: 'Nós',
      titulo: 'Configuramos o Oryon',
      texto: 'Agentes IA, catálogo, base de conhecimento, funis, equipe e regras de transferência: toda a configuração é feita pela nossa equipe.',
    },
    {
      quem: 'Juntos',
      titulo: 'Atendendo em até 7 dias',
      texto: 'Você recebe o Oryon pronto, com a IA atendendo e a sua equipe no comando.',
    },
  ],
} as const

export const perguntas = {
  eyebrow: 'Perguntas',
  title: 'Perguntas frequentes.',
  titleCinza: 'O que quem está decidindo costuma perguntar.',
  itens: [
    {
      pergunta: 'Quanto custa o Oryon?',
      resposta: 'Cada operação é diferente, por isso trabalhamos com proposta comercial, montada para o seu volume de atendimento e a sua equipe. Fale com a gente pelo WhatsApp e receba a sua.',
    },
    {
      pergunta: 'Em quanto tempo começo a usar?',
      resposta: 'Em até 7 dias. Você libera o seu número na Meta e nós configuramos toda a plataforma.',
    },
    {
      pergunta: 'O que eu preciso fazer na implantação?',
      resposta: 'Só a parte do número: configurar o WhatsApp e deixá-lo liberado pela Meta. Agentes IA, catálogo, funis, equipe e regras ficam com a gente.',
    },
    {
      pergunta: 'É o WhatsApp oficial?',
      resposta: 'Sim. O Oryon usa a conexão oficial do WhatsApp Business, pela API da Meta.',
    },
    {
      pergunta: 'A IA pode fechar vendas ou inventar valores?',
      resposta: 'Não. O Agente IA responde com o que está na sua base de conhecimento e no catálogo liberado a ele, e pode avançar um negócio de etapa — mas fechar a venda é sempre decisão de uma pessoa da sua equipe.',
    },
    {
      pergunta: 'E quando o cliente quer falar com uma pessoa?',
      resposta: 'O Agente IA chama quem deve atender, com o histórico completo da conversa, e fica em pausa enquanto a sua equipe conversa.',
    },
  ],
} as const

export const fecho = {
  title: 'Coloque a IA para atender, com a sua equipe no comando.',
  lead: 'Converse com o nosso Agente IA pelo WhatsApp — é o próprio Oryon te mostrando como funciona.',
  entrar: 'Já sou cliente',
} as const
