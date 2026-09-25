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
  // "atende sozinho" (até 26/09) prometia o que o próprio lead desmentia — a
  // equipe entra quando precisa. "na hora" é o que a demonstração mostra.
  title: 'Seu WhatsApp atende na hora.',
  lead: 'Agentes IA respondem cada conversa com o que você ensinou a eles — e chamam um Atendente, com todo o contexto, quando o cliente precisa de uma pessoa.',
  stageLabel: 'Demonstração animada do produto',
} as const

export const trust = {
  // Reposicionado (25/09) como o "posso confiar?" da escada de consciência:
  // vem depois da Implantação e antes das Perguntas, e fala dos LIMITES da IA.
  eyebrow: 'Limites da IA',
  // 26/09: sem promessa absoluta ("Nada inventado") e sem repetir o capítulo
  // "Passar para a equipe"; o que é EXCLUSIVO desta seção: verificação,
  // permissões por agente, a pausa manual e a conexão oficial.
  title: 'A IA trabalha dentro de limites.',
  titleCinza: 'Você define quais são.',
  items: [
    {
      key: 'verificacao',
      title: 'Resposta conferida antes de sair',
      text: 'Valores, horários, nomes e ações citados pela IA são conferidos com os seus dados; o que não confere fica retido para revisão da equipe.',
    },
    {
      key: 'permissoes',
      title: 'Você decide o que ela pode fazer',
      text: 'Ferramentas e regras de transferência ficam na configuração de cada agente. Fechar negócios, por exemplo, só se a sua empresa liberar.',
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
// próprio Agente IA da Oryon; SEM prova social por enquanto; SEM planos e
// preços (tudo por proposta comercial); implantação em conjunto, em até 7 dias
// — o único prazo afirmado na página, autorizado pelo PO.

/**
 * O CONTATO COMERCIAL — a ação de conversão da página.
 *
 * `whatsapp`: número no formato internacional, só dígitos (ex.: 5547999999999).
 * PENDENTE: o PO vai informar o número que o Agente IA da Oryon atende.
 * Enquanto estiver vazio, NENHUM botão de conversa aparece (26/09): a página
 * não pode prometer um canal que ainda não atende. "Entrar" assume o destaque.
 */
export const contato = {
  whatsapp: '',
  mensagem: 'Olá! Vim pelo site e quero ver a Oryon funcionando no meu WhatsApp.',
  cta: 'Falar com a gente',
  ctaLongo: 'Conversar pelo WhatsApp',
} as const

/** Há um canal comercial de verdade para oferecer? */
export const contatoDisponivel = (contato.whatsapp as string).length > 0

if (import.meta.env.DEV && !contatoDisponivel) {
  console.info('[landing] Número do WhatsApp comercial não configurado (landingCopy.ts → contato.whatsapp): botões de conversa ocultos.')
}

export function linkContato(): string {
  if (!contato.whatsapp) return '#contato'
  return `https://wa.me/${contato.whatsapp}?text=${encodeURIComponent(contato.mensagem)}`
}

// Plataforma (25/09, 3ª rodada): `destaque` é a PROMESSA (o H3, curto); `texto`
// é a explicação, num parágrafo à parte, e prepara a leitura da demonstração —
// diz o que o visitante vai ver acontecer. Os cartões aprofundam, sem repetir.
export const plataforma = {
  eyebrow: 'Plataforma',
  title: 'Do primeiro "oi" ao resultado medido.',
  titleCinza: 'Cada etapa acontecendo na própria Oryon.',
  // Ordem (26/09): de onde vem o que a IA sabe → como ela atende → quando a
  // equipe assume → como o negócio avança → como a base é reativada → como a
  // operação mede o resultado.
  blocos: [
    {
      id: 'conhecer',
      indice: 'Ensinar a IA',
      destaque: 'Ela responde com o que você ensinou.',
      texto: 'As instruções, a base de conhecimento e o catálogo liberado ficam na configuração de cada agente — é disso que sai cada resposta.',
      cartoes: [
        { titulo: 'A resposta sai daqui.', texto: 'O valor da proposta vem do catálogo; a condição de setembro, de um documento da base de conhecimento.' },
        { titulo: 'Mudou? Atualize e pronto.', texto: 'Edite um documento ou libere outro produto — as próximas respostas passam a seguir a versão nova.' },
      ],
    },
    {
      id: 'atender',
      indice: 'Atender com IA',
      destaque: 'Resposta na hora, a qualquer hora.',
      texto: 'A cliente pede uma proposta e recebe a resposta na hora, de dia ou de madrugada — enquanto o contato é atualizado no CRM.',
      cartoes: [
        { titulo: 'Situação e etiquetas em dia.', texto: 'O Agente IA atualiza a situação do contato e as etiquetas durante a conversa — cada mudança fica registrada com quem fez.' },
        { titulo: 'No WhatsApp de sempre.', texto: 'A cliente conversa pelo WhatsApp que já usa — sem aplicativo novo, link ou formulário.' },
      ],
    },
    {
      id: 'equipe',
      indice: 'Passar para a equipe',
      destaque: 'A pessoa certa, no momento certo.',
      texto: 'Quando a cliente pede para falar com alguém, a IA chama a pessoa certa, com o histórico completo, e sai de cena enquanto ela atende.',
      cartoes: [
        { titulo: 'Avisada na hora.', texto: 'A atendente recebe a notificação e abre a conversa inteira — sem perguntar de novo ao cliente.' },
        { titulo: 'A venda fica com a sua equipe.', texto: 'A IA prepara e avança o negócio; por padrão, quem fecha é uma pessoa — a IA só fecha se você liberar.' },
      ],
    },
    {
      id: 'funil',
      indice: 'Vender pelo funil',
      destaque: 'O funil anda junto com a conversa.',
      texto: 'O negócio muda de etapa conforme a conversa avança — sem ninguém arrastar card nem lembrar de atualizar.',
      cartoes: [
        { titulo: 'Itens e valor no negócio.', texto: 'Itens, quantidades e valores entram no negócio a partir do catálogo.' },
        { titulo: 'Histórico de cada movimento.', texto: 'Quem moveu, quando e por quê — a IA e a equipe, lado a lado.' },
      ],
    },
    {
      id: 'campanhas',
      indice: 'Reativar a base',
      destaque: 'Campanhas que viram conversas.',
      texto: 'Dispare um modelo aprovado pela Meta para a base inteira e veja quem recebeu, leu e respondeu. Cada resposta cai no atendimento com IA.',
      cartoes: [
        { titulo: 'Do jeito que o cliente vê.', texto: 'O modelo chega com o nome dele e botões de resposta — um toque e a conversa começa.' },
        { titulo: 'Leituras e respostas contadas.', texto: 'Entregues, lidas, respostas e conversões de cada campanha, num relatório só.' },
      ],
    },
    {
      id: 'medir',
      indice: 'Medir o resultado',
      destaque: 'A operação inteira numa tela.',
      texto: 'O Dashboard mostra, numa tela, quantas conversas estão em atendimento, quem espera na fila, o volume da semana e a equipe online.',
      cartoes: [
        { titulo: 'Onde está cada conversa.', texto: 'Ativas, na fila e resolvidas hoje — o retrato do atendimento agora.' },
        { titulo: 'O que acabou de acontecer.', texto: 'Transferências e conversas resolvidas entram no feed de atividade, com quem fez.' },
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
      titulo: 'Configuramos a Oryon',
      texto: 'Agentes IA, catálogo, base de conhecimento, funis, equipe e regras de transferência: toda a configuração é feita pela nossa equipe.',
    },
    {
      quem: 'Juntos',
      titulo: 'A IA começa a atender',
      texto: 'Você recebe a Oryon pronta, com a IA atendendo e a sua equipe no comando.',
    },
  ],
} as const

export const perguntas = {
  eyebrow: 'Perguntas',
  title: 'Perguntas frequentes.',
  titleCinza: 'O que quem está decidindo costuma perguntar.',
  itens: [
    {
      pergunta: 'Quanto custa a Oryon?',
      resposta: 'Cada operação é diferente, por isso trabalhamos com proposta comercial, montada para o seu volume de atendimento e a sua equipe. Fale com a gente e receba a sua.',
      /** Sem canal comercial publicado, não mandamos "falar com a gente". */
      respostaSemContato: 'Cada operação é diferente, por isso trabalhamos com proposta comercial, montada para o seu volume de atendimento e a sua equipe.',
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
      resposta: 'Sim. A Oryon usa a conexão oficial do WhatsApp Business, pela API da Meta.',
    },
    {
      pergunta: 'A IA pode fechar vendas sozinha?',
      resposta: 'Só se a sua empresa liberar. Por padrão, o Agente IA avança o negócio de etapa e quem fecha a venda é uma pessoa da sua equipe.',
    },
    {
      pergunta: 'De onde a IA tira as respostas?',
      resposta: 'Das instruções, da base de conhecimento e do catálogo configurados em cada agente — e valores citados são conferidos antes de a resposta sair.',
    },
  ],
} as const

export const fecho = {
  title: 'Coloque a IA para atender, com a sua equipe no comando.',
  lead: 'Converse com o nosso Agente IA pelo WhatsApp — é a própria Oryon te mostrando como funciona.',
  /** Sem canal comercial configurado: nada de prometer conversa. */
  leadSemContato: 'Já usa a Oryon? Entre e continue de onde parou.',
  entrar: 'Já sou cliente',
} as const
