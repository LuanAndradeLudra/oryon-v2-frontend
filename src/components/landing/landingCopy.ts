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
  lead: 'Um Agente IA treinado no seu negócio responde cada conversa. Quando o cliente precisa de uma pessoa, ele chama a sua equipe com o contexto inteiro.',
  stageLabel: 'Demonstração animada do produto',
} as const

export const trust = {
  // Reposicionado (26/09) logo depois da Plataforma: quem acabou de ver a IA
  // agir pergunta primeiro "posso confiar?" — e só depois "dá trabalho?".
  eyebrow: 'Limites da IA',
  // 26/09 (PO): NENHUMA promessa de que a IA não erra ou não inventa — isso
  // acontece e não se garante na venda. A seção diz o contrário da concorrência:
  // nenhuma IA acerta sempre; a Oryon é feita para que o erro custe pouco.
  title: 'A IA trabalha dentro de limites.',
  titleCinza: 'Você define quais são.',
  /** A frase que prepara a tela real (aba Capacidades do agente). */
  lead: 'Nenhuma IA acerta sempre — e a gente não promete o contrário. A Oryon é feita para que um erro custe pouco: a IA só faz o que você liberou, tudo fica registrado, e a sua equipe vê e assume quando quiser.',
  tela: 'Oryon · Agentes IA',
  items: [
    {
      key: 'permissoes',
      title: 'Você liga o que ela pode fazer',
      text: 'Mudar a situação do contato, etiquetar, mover o negócio de etapa, chamar uma pessoa: cada capacidade tem o seu interruptor e os seus limites.',
    },
    {
      key: 'venda',
      title: 'Ganho ou perdido é de uma pessoa',
      text: 'A IA avança o negócio entre as etapas; marcar como ganho ou perdido, não. O sistema recusa, mesmo que alguém tente liberar.',
    },
    {
      key: 'historico',
      title: 'Tudo fica no histórico',
      text: 'Cada ação da IA entra na linha do tempo do contato, com o nome do agente — dá para ver o que ela fez e quando.',
    },
    {
      key: 'chamada',
      title: 'Quando não sabe, ela chama alguém',
      text: 'Pedido de encaixe, urgência, assunto fora do que você ensinou: a regra do agente é chamar uma pessoa da equipe em vez de improvisar — e a regra é sua, você escreve.',
    },
    {
      key: 'controle',
      title: 'A equipe assume quando quiser',
      text: 'Um clique em Assumir pausa a IA naquela conversa, pelo tempo que você definir na configuração do agente; Reativar IA devolve a conversa.',
    },
    {
      key: 'conexao',
      title: 'Conexão oficial, regras da Meta',
      text: 'A integração usa a API oficial do WhatsApp Business. Fora da janela de atendimento, a conversa só reabre com um modelo aprovado pela Meta.',
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
  /**
   * Os três ATOS (26/09): seis capítulos com a mesma anatomia cansavam no
   * terceiro; agrupados em três ideias, o visitante percebe blocos. Cada ato
   * abre com uma frase e agrupa os capítulos pelo id.
   */
  atos: [
    { id: 'ia',     numero: 'I',   titulo: 'A IA atende',        frase: 'Antes de responder, ela precisa conhecer o seu negócio.', blocos: ['conhecer', 'atender'] },
    { id: 'venda',  numero: 'II',  titulo: 'A venda acontece',   frase: 'O negócio anda com a conversa. Quem fecha é a sua equipe.', blocos: ['funil', 'equipe'] },
    { id: 'escala', numero: 'III', titulo: 'A operação cresce',  frase: 'Reative quem já comprou e veja tudo numa tela.', blocos: ['campanhas', 'medir'] },
  ],
  // Ordem (26/09, aprovada pelo PO): conhecer → atender → funil → equipe →
  // reativar → medir. O funil vem ANTES da equipe porque o clímax da história
  // (a pessoa confirma, e o negócio vai para a etapa final) pertence ao
  // capítulo da equipe — e ele precisa vir depois de o funil andar sozinho.
  blocos: [
    {
      id: 'conhecer',
      indice: 'Ensinar a IA',
      destaque: 'Ela responde com o que você ensinou.',
      texto: 'As instruções, a base de conhecimento e o catálogo liberado ficam na configuração de cada agente — é disso que sai cada resposta.',
      cartoes: [
        { titulo: 'A resposta sai daqui.', texto: 'O valor vem do catálogo; a regra do convênio, de um documento da base de conhecimento.' },
        { titulo: 'Mudou? Atualize e pronto.', texto: 'Edite um documento ou libere outro item do catálogo — as próximas respostas passam a seguir a versão nova.' },
      ],
    },
    {
      id: 'atender',
      indice: 'Atender com IA',
      destaque: 'Responde fora do expediente. E anota tudo.',
      texto: 'O cliente pede um horário à noite e recebe a resposta na hora — enquanto a situação e as etiquetas do contato mudam no CRM.',
      cartoes: [
        { titulo: 'Situação e etiquetas em dia.', texto: 'A IA atualiza a situação do contato e as etiquetas durante a conversa — cada mudança fica registrada com quem fez.' },
        { titulo: 'No WhatsApp de sempre.', texto: 'O cliente conversa pelo WhatsApp que já usa — sem aplicativo novo, link ou formulário.' },
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
      id: 'equipe',
      indice: 'Passar para a equipe',
      destaque: 'Quem confirma é uma pessoa.',
      texto: 'Quando o cliente quer falar com alguém, a IA chama a pessoa certa, com o histórico completo — e é ela quem marca o negócio como ganho.',
      cartoes: [
        { titulo: 'Avisada na hora.', texto: 'A atendente recebe a notificação e abre a conversa inteira — sem perguntar de novo ao cliente.' },
        { titulo: 'O fechamento fica com a sua equipe.', texto: 'A IA prepara e avança o negócio; marcar ganho ou perdido é sempre de uma pessoa.' },
      ],
    },
    {
      id: 'campanhas',
      indice: 'Reativar a base',
      destaque: 'Campanhas que viram conversas.',
      texto: 'Dispare um modelo aprovado pela Meta para a sua base e veja quem recebeu, leu e respondeu. Cada resposta cai no atendimento com IA.',
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
      entregas: [
        'O número de WhatsApp que vai atender',
        'A conta liberada pela Meta, na API oficial',
        'Quem da equipe atende, e em quais setores',
      ],
    },
    {
      quem: 'Nós',
      titulo: 'Configuramos a Oryon',
      texto: 'Toda a configuração é feita pela nossa equipe, a partir do jeito que a sua empresa já vende e atende.',
      entregas: [
        'Agentes IA com instruções, conhecimento e catálogo',
        'Funis com as etapas do seu atendimento',
        'Equipe, setores e regras de transferência',
      ],
    },
    {
      quem: 'Juntos',
      titulo: 'A IA começa a atender',
      texto: 'Antes de ligar, o agente passa pelo chat de teste. Depois, a IA atende no seu número e a equipe acompanha pelo painel.',
      entregas: [
        'Conversas de teste com o agente, antes de ligar',
        'Ajustes de respostas e capacidades com você',
        'A IA ligada no número, com a equipe no comando',
      ],
    },
  ],
  /** O que muda depois do ar — tudo na própria Oryon, sem depender de nós. */
  depois: {
    titulo: 'Depois de no ar, o ajuste é seu.',
    itens: [
      {
        key: 'ajuste',
        titulo: 'Mudou a condição? Atualize e salve.',
        texto: 'Instruções, base de conhecimento e catálogo ficam na tela de cada agente — as próximas respostas já seguem a versão nova.',
      },
      {
        key: 'crescer',
        titulo: 'Mais de um número, mais de um agente.',
        texto: 'Cada número de WhatsApp tem o seu Agente IA; atendimento, comercial e pós-venda podem ter o seu, cada um com a sua equipe.',
      },
      {
        key: 'acompanhar',
        titulo: 'A operação numa tela.',
        texto: 'O Dashboard mostra fila, conversas abertas, volume e equipe online — o mesmo do capítulo Medir o resultado.',
      },
    ],
  },
} as const

export const perguntas = {
  eyebrow: 'Perguntas',
  title: 'Perguntas frequentes.',
  titleCinza: 'O que quem está decidindo costuma perguntar.',
  // 26/09: de seis para treze perguntas, em três grupos — cada resposta
  // amarrada a um comportamento do produto que a página mostra ou que foi
  // conferido no código (chat de teste, espera por mensagens seguidas, linha
  // do tempo, relatório da campanha, ganho/perdido recusado para a IA).
  grupos: [
    {
      titulo: 'Implantação e WhatsApp',
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
          resposta: 'A parte do número: configurar o WhatsApp e deixá-lo liberado pela Meta, e dizer quem da equipe atende. Agentes IA, catálogo, funis, setores e regras ficam com a gente.',
        },
        {
          pergunta: 'É o WhatsApp oficial?',
          resposta: 'Sim. A Oryon usa a conexão oficial do WhatsApp Business, pela API da Meta.',
        },
        {
          pergunta: 'Posso conectar mais de um número?',
          resposta: 'Sim. Cada número conectado tem o seu Agente IA — atendimento, comercial e pós-venda podem ter números e agentes diferentes.',
        },
      ],
    },
    {
      titulo: 'Agente IA',
      itens: [
        {
          pergunta: 'De onde a IA tira as respostas?',
          resposta: 'Das instruções, da base de conhecimento e do catálogo configurados em cada agente. O que não está lá, ela não deveria afirmar — e a regra do agente é chamar uma pessoa quando o assunto sai disso.',
        },
        {
          pergunta: 'E quando a IA não souber responder?',
          resposta: 'Ela chama uma pessoa da equipe, com a conversa inteira à vista, em vez de improvisar. E a equipe pode assumir qualquer conversa a qualquer momento, com um clique.',
        },
        {
          pergunta: 'A IA pode fechar vendas sozinha?',
          resposta: 'Não. A IA avança o negócio entre as etapas do funil, mas marcar uma venda como ganha ou perdida é sempre decisão de uma pessoa — o sistema recusa, mesmo que alguém tente liberar.',
        },
        {
          pergunta: 'A IA pode errar?',
          resposta: 'Pode, como qualquer IA — e a gente não promete o contrário. A Oryon é construída para que um erro apareça e custe pouco: cada ação fica registrada com o nome do agente, a equipe acompanha em tempo real e assume quando quiser, e a IA nunca marca ganho ou perdido. Seguimos desenvolvendo, aos poucos, mecanismos para reduzir isso.',
        },
        {
          pergunta: 'A IA responde fora do horário da equipe?',
          resposta: 'Sim, assim que a mensagem chega. E, por padrão, se o cliente manda várias mensagens seguidas, o agente espera ele terminar de escrever para responder tudo de uma vez.',
        },
        {
          pergunta: 'Dá para testar o agente antes de ligar?',
          resposta: 'Sim. Cada agente tem um chat de teste: você conversa com ele como se fosse um cliente antes de colocá-lo no número.',
        },
      ],
    },
    {
      titulo: 'No dia a dia',
      itens: [
        {
          pergunta: 'Por onde a minha equipe atende?',
          resposta: 'Pela Oryon, no computador ou no celular. A caixa de Conversas reúne tudo, com as mensagens da IA e das pessoas no mesmo histórico.',
        },
        {
          pergunta: 'Consigo ver o que a IA fez em cada conversa?',
          resposta: 'Sim. Situação, etiquetas, etapa do negócio e transferências feitas pela IA entram na linha do tempo do contato, com o nome do agente.',
        },
        {
          pergunta: 'Posso disparar campanhas para a minha base?',
          resposta: 'Sim, com modelos aprovados pela Meta. O relatório de cada campanha mostra entregas, leituras e respostas — e cada resposta cai no atendimento com IA.',
        },
      ],
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
