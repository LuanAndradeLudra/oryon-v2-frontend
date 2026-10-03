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
  /** A entrada do app. */
  login: '/login',
  /** As páginas públicas (30/09: home de venda + páginas de produto, modelo Attio). */
  home: '/',
  demonstracao: '/demonstracao',
  solucoes: '/solucoes',
  perguntas: '/perguntas',
} as const

/** Caminho de uma página de produto (menu Plataforma). */
export const rotaPlataforma = (slug: string) => `/plataforma/${slug}`

/** Âncoras internas — cada uma corresponde a um `id` de seção. */
export const LANDING_ANCHORS = {
  plataforma: 'plataforma',
  confianca: 'confianca',
  area: 'area',
  equipe: 'equipe-no-comando',
  resposta: 'resposta',
  implantacao: 'implantacao',
  perguntas: 'perguntas',
} as const

export const nav = {
  homeLabel: 'Oryon, início',
  links: [
    { label: 'Plataforma', anchor: LANDING_ANCHORS.plataforma },
    { label: 'Implantação', anchor: LANDING_ANCHORS.implantacao },
    { label: 'Perguntas', anchor: LANDING_ANCHORS.perguntas },
  ],
  platformMenuLabel: 'Abrir índice da plataforma',
  platformGroups: [
    {
      label: 'Produto',
      items: [
        { label: 'Visão geral', anchor: LANDING_ANCHORS.plataforma },
        { label: 'Ensinar a IA', anchor: 'plataforma-conhecer' },
        { label: 'Atender com IA', anchor: 'plataforma-atender' },
        { label: 'Organizar as vendas', anchor: 'plataforma-funil' },
        { label: 'Passar para a equipe', anchor: 'plataforma-equipe' },
        { label: 'Trazer clientes de volta', anchor: 'plataforma-campanhas' },
        { label: 'Acompanhar os resultados', anchor: 'plataforma-medir' },
      ],
    },
    {
      label: 'Para decidir',
      items: [
        { label: 'Limites da IA', anchor: LANDING_ANCHORS.confianca },
        { label: 'Para a sua área', anchor: LANDING_ANCHORS.area },
        { label: 'Equipe e acessos', anchor: LANDING_ANCHORS.equipe },
        { label: 'Fila e avisos', anchor: LANDING_ANCHORS.resposta },
        { label: 'Implantação', anchor: LANDING_ANCHORS.implantacao },
        { label: 'Perguntas', anchor: LANDING_ANCHORS.perguntas },
      ],
    },
  ],

  cta: 'Entrar',
} as const

export const hero = {
  // H1 curto, em duas frases: apresenta o trabalho da IA e o diferencial do
  // CRM sem depender do lead para explicar a categoria do produto.
  // 30/09 (PO): título 2 + subtítulo sobre o VALOR do agente — sem falar de
  // funil e sem prometer que ele não erra (a equipe assume quando precisa).
  // 02/10 (reescrita de vendas): a dor mais comum do dono — cliente sem
  // resposta — vira a promessa; o mecanismo (IA + organização + equipe) vai
  // para o apoio. "Vende" saiu do título: quem fecha a venda é uma pessoa.
  title: 'Nenhum cliente sem resposta no WhatsApp.',
  lead: 'Um agente de IA responde na hora, de dia ou de noite, com as informações da sua empresa. Organiza cada venda e chama sua equipe quando uma pessoa precisa assumir.',
  /** Celular (02/10, PO): o apoio em duas linhas, para o palco caber na primeira tela. */
  leadCurto: 'Um agente de IA responde na hora e chama sua equipe quando precisa.',
  /** A redução de risco logo abaixo dos botões: o diferencial que antes só
   *  aparecia na seção de implantação. Fatos do serviço, sem número. */
  garantias: ['Configuramos com você', 'Você testa antes de ligar', 'WhatsApp oficial da Meta'],
  stageLabel: 'Demonstração animada do produto',
} as const

export const trust = {
  // Reposicionado (26/09) logo depois da Plataforma: quem acabou de ver a IA
  // agir pergunta primeiro "posso confiar?" — e só depois "dá trabalho?".
  eyebrow: 'Você no controle',
  // 26/09 (PO): NENHUMA promessa de que a IA não erra ou não inventa — isso
  // acontece e não se garante na venda. A seção diz o contrário da concorrência:
  // nenhuma IA acerta sempre; a Oryon é feita para que o erro custe pouco.
  title: 'Você define os limites da IA.',
  titleCinza: 'Sua equipe decide quando assumir.',
  /** A frase que prepara a tela real (aba Capacidades do agente). */
  lead: 'A IA pode errar. Por isso, você escolhe o que ela pode fazer, vê tudo o que ela fez e assume a conversa quando quiser.',
  tela: 'Oryon · Agentes IA',
  /** As duas colunas (P7 da auditoria anti-genérico, 30/09): o que a IA pode
   *  fazer quando você liga, e o que só uma pessoa faz. Cada linha é um fato
   *  do produto (auditoria de capacidades, 25/09); a nota é o detalhe que
   *  prova. Cores do produto: teal = IA, âmbar = pessoa. */
  pode: {
    ia: {
      titulo: 'A IA pode, se você ligar',
      itens: [
        { texto: 'Responder com o que você cadastrou', nota: 'instruções, documentos e serviços' },
        { texto: 'Atualizar a ficha e as etiquetas do cliente', nota: 'fica no registro' },
        { texto: 'Avançar a venda para a próxima etapa', nota: 'nunca a última' },
        { texto: 'Chamar a sua equipe', nota: 'encaixes, urgências e fora do escopo' },
      ],
    },
    pessoa: {
      titulo: 'Só uma pessoa',
      itens: [
        { texto: 'Fechar a venda como ganha ou perdida', nota: 'bloqueado para a IA' },
        { texto: 'Assumir a conversa', nota: 'a IA pausa na hora' },
        { texto: 'Definir o que a IA pode fazer', nota: 'por agente' },
        { texto: 'Ligar o agente no número oficial', nota: 'depois do teste' },
      ],
    },
    legendaIa: 'ação da IA',
    legendaPessoa: 'ação de uma pessoa',
    legendaNota: 'o mesmo código de cor do app',
  },
} as const

export const footer = {
  homeLabel: 'Oryon',
  /** Único número da página: o ano do direito autoral. */
  legal: '© 2026 Oryon',
  /** O que a Oryon é, em uma frase, para quem chega ao fim da página. */
  frase: 'Atendimento com IA e organização de vendas no WhatsApp da sua empresa.',
  jaCliente: 'Já é cliente?',
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
  title: 'Veja o atendimento acontecer.',
  titleCinza: 'A conversa anda, e a ficha do cliente e as vendas se atualizam junto.',
  contexto: 'Demonstração completa · uma clínica atendendo pelo WhatsApp',
  /**
   * Os três ATOS (26/09): seis capítulos com a mesma anatomia cansavam no
   * terceiro; agrupados em três ideias, o visitante percebe blocos. Cada ato
   * abre com uma frase e agrupa os capítulos pelo id.
   */
  atos: [
    { id: 'ia',     numero: 'I',   titulo: 'A IA responde',           frase: 'Seu cliente é atendido na hora, com as informações da sua empresa.', blocos: ['conhecer', 'atender'] },
    { id: 'venda',  numero: 'II',  titulo: 'O atendimento avança',    frase: 'A venda anda durante a conversa, e sua equipe entra na hora de fechar.', blocos: ['funil', 'equipe'] },
    { id: 'escala', numero: 'III', titulo: 'Clientes voltam',        frase: 'Quem já comprou volta a conversar, e você vê o resultado.', blocos: ['campanhas', 'medir'] },
  ],
  // Ordem (26/09, aprovada pelo PO): conhecer → atender → funil → equipe →
  // reativar → medir. O funil vem ANTES da equipe porque o clímax da história
  // (a pessoa confirma, e o negócio vai para a etapa final) pertence ao
  // capítulo da equipe — e ele precisa vir depois de o funil andar sozinho.
  // 02/10 (reescrita de vendas): cada capítulo diz o que o dono ganha — a
  // promessa (`destaque`) cabe numa linha da lista de "Como funciona".
  blocos: [
    {
      id: 'conhecer',
      indice: 'Ensinar a IA',
      destaque: 'Ensine uma vez o que sua equipe repete todo dia.',
      texto: 'Serviços, valores, regras e dúvidas frequentes: você cadastra uma vez, e a IA usa em cada resposta. Mudou um valor, muda num lugar só.',
      cartoes: [
        { titulo: 'Respostas com as informações da sua empresa.', texto: 'Os valores saem da sua lista de serviços e produtos, e as regras, dos seus documentos.' },
        { titulo: 'Mudou o valor, muda a resposta.', texto: 'Atualize a informação uma vez, e as próximas conversas já usam o valor novo.' },
      ],
    },
    {
      id: 'atender',
      indice: 'Atender a qualquer hora',
      destaque: 'Quem chama à noite é atendido à noite.',
      texto: 'O cliente pede um horário tarde da noite. A IA responde na hora, e de manhã sua equipe já encontra o pedido organizado.',
      cartoes: [
        { titulo: 'A ficha do cliente se preenche durante a conversa.', texto: 'A IA marca em que pé o cliente está e coloca etiquetas. Sua equipe não precisa digitar isso depois, e o histórico mostra quem fez cada mudança.' },
        { titulo: 'O cliente não sai do WhatsApp.', texto: 'Nada de aplicativo novo ou formulário: ele fala com você onde já está.' },
      ],
    },
    {
      id: 'funil',
      indice: 'Ver as vendas',
      destaque: 'Saiba quanto está em negociação agora.',
      texto: 'Cada conversa vira uma venda no funil, com itens e valor. Se você permitir, a IA avança a etapa conforme a conversa anda, e você vê o total em aberto sem pedir relatório a ninguém.',
      cartoes: [
        { titulo: 'Itens e valores em cada venda.', texto: 'Produtos, quantidades e valores entram direto da sua lista de serviços e produtos.' },
        { titulo: 'Cada movimento com nome.', texto: 'Você sabe quando a venda mudou de etapa e se foi a IA ou alguém da equipe.' },
      ],
    },
    {
      id: 'equipe',
      indice: 'Passar para a equipe',
      destaque: 'Sua equipe entra sem perguntar tudo de novo.',
      texto: 'Quando o cliente precisa de uma pessoa, a IA chama quem cuida do assunto e deixa a conversa inteira à vista. O cliente não repete nada.',
      cartoes: [
        { titulo: 'O aviso vai para quem resolve.', texto: 'A atendente abre a conversa já sabendo o que foi pedido e o que foi respondido.' },
        { titulo: 'Quem fecha a venda é a sua equipe.', texto: 'A IA registra e avança as etapas. Marcar como ganha ou perdida é sempre de uma pessoa.' },
      ],
    },
    {
      id: 'campanhas',
      indice: 'Trazer clientes de volta',
      destaque: 'Quem já comprou é a venda mais fácil.',
      texto: 'Mande uma mensagem para quem já é seu cliente, com modelos aprovados pela Meta. Quem responde cai direto no atendimento.',
      cartoes: [
        { titulo: 'Cada cliente recebe pelo nome.', texto: 'A mensagem leva o nome da pessoa e botões para responder com um toque.' },
        { titulo: 'Você vê quem voltou.', texto: 'O relatório mostra quem recebeu, quem leu e quem respondeu a cada campanha.' },
      ],
    },
    {
      id: 'medir',
      indice: 'Acompanhar os resultados',
      destaque: 'Saiba agora quem está esperando resposta.',
      texto: 'Um painel mostra quem está sendo atendido, quem está na fila e como foi a semana, sem você abrir conversa por conversa.',
      cartoes: [
        { titulo: 'O dia de atendimento num olhar.', texto: 'Conversas ativas, na fila e resolvidas no dia.' },
        { titulo: 'Quem fez o quê.', texto: 'Transferências e conversas resolvidas ficam registradas com o nome de quem agiu.' },
      ],
    },
  ],
} as const

// ─── Rodada (b), 26/09: as seções que quebram as objeções que a Plataforma não
// quebra. Cada afirmação abaixo tem prova no código (ver RETOMADA-LANDING-LOOP.md).

/** "Perco o controle?" — setores, papéis, auditoria e chat interno: fatos do produto. */
export const equipe = {
  eyebrow: 'A equipe no comando',
  title: 'Saiba quem falou o quê com cada cliente.',
  titleCinza: 'Acessos por função e histórico de cada ação.',
  // 30/09 (PO): as permissões por setor vão ser corrigidas no produto — até
  // lá, a página não vende a matriz de permissões (o cartão "Setores" saiu).
  lead: 'Cada pessoa vê e faz só o que cabe à função dela. Cada mudança fica registrada com nome e hora, e a equipe combina o atendimento sem sair da Oryon.',
  cartoes: [
    { key: 'papeis', titulo: 'Acesso de acordo com a função', texto: 'Dono, administrador, supervisor e atendente têm acessos diferentes.' },
    { key: 'auditoria', titulo: 'Nada muda sem deixar rastro', texto: 'O histórico mostra quem alterou cada coisa e quando.' },
    { key: 'chat', titulo: 'A equipe conversa por dentro', texto: 'Canais, mensagens diretas e menções, separados da conversa com o cliente.' },
  ],
} as const

/** "E se ninguém responder?" — notificações, aviso de espera, fila, vários números. */
export const resposta = {
  eyebrow: 'Fila e avisos',
  title: 'Nenhuma conversa fica sem dono.',
  titleCinza: 'A fila mostra o que espera resposta, e os avisos chamam quem precisa agir.',
  lead: 'Quando a IA passa uma conversa para a equipe ou um cliente fica esperando, a Oryon mostra o caso no painel e avisa no celular de quem precisa responder, se essa opção estiver ligada.',
  cartoes: [
    { key: 'notificacoes', titulo: 'Cada aviso diz do que se trata.', texto: 'Transferências, conversas atribuídas, campanhas concluídas e menções aparecem no app e podem chegar ao celular.' },
    { key: 'espera', titulo: 'Demorou, o responsável fica sabendo.', texto: 'Se uma conversa atribuída passa do tempo que você definiu, quem cuida dela recebe um aviso.' },
    { key: 'fila', titulo: 'Toda conversa tem responsável', texto: 'O que a IA passa para a equipe entra na fila. Alguém assume, escolhe um responsável ou transfere para outro setor.' },
    // 30/09 (PO): mais de um número, sim — conforme o plano contratado.
    { key: 'numeros', titulo: 'Os clientes ficam com a empresa', texto: 'Conforme o plano, recepção, comercial e pós-venda usam números e agentes próprios, na mesma caixa de entrada. O histórico fica na Oryon, não no celular de quem atende.' },
  ],
} as const

export const implantacao = {
  eyebrow: 'Implantação',
  // Ciclo noturno (30/09): a objeção de quem não é de tecnologia vem primeiro;
  // o prazo continua com a ressalva da Meta.
  title: 'Você não precisa entender de tecnologia.',
  titleCinza: 'Nossa equipe configura a Oryon com você, em até 7 dias depois que a Meta libera o número.',
  /** Os passos como REGISTRO (auditoria anti-genérico, 30/09): quem fez cada
   *  um segue o código de cor do produto — 'voce' = âmbar (pessoa), 'oryon' =
   *  teal. Os carimbos de dia moram no componente (a copy não tem número). */
  passos: [
    {
      quem: 'voce',
      rotulo: 'Você',
      titulo: 'Você escolhe o número',
      texto: 'Informa o número de WhatsApp que vai atender e conclui a liberação na Meta.',
      entregas: [
        'Número que será usado no atendimento',
        'Conta aprovada pela Meta para a API oficial',
        'Pessoas e setores responsáveis pelo atendimento',
      ],
    },
    {
      quem: 'oryon',
      rotulo: 'Equipe Oryon',
      titulo: 'Configuramos a Oryon',
      texto: 'Cadastramos suas informações, montamos as etapas de venda e definimos quando o agente chama a sua equipe.',
      entregas: [
        'Agentes IA com instruções, conhecimento e catálogo',
        'Funis com as etapas do seu atendimento',
        'Equipe, setores e regras de transferência',
      ],
    },
    {
      quem: 'voce',
      rotulo: 'Você',
      titulo: 'Você testa como cliente',
      texto: 'Conversa com o agente no chat de teste, como se fosse um cliente, e pede os ajustes.',
      entregas: [
        'Cenários de teste antes da ativação',
        'Respostas e capacidades ajustadas com a sua equipe',
      ],
    },
    {
      quem: 'oryon',
      rotulo: 'No ar',
      titulo: 'O agente passa a atender no seu número',
      texto: 'Sua equipe acompanha tudo pelo painel e assume a conversa quando quiser.',
      entregas: [
        'Atendimento com IA ativado no número oficial',
      ],
    },
  ],
  /** O que muda depois do ar — tudo na própria Oryon, sem depender de nós. */
  depois: {
    titulo: 'Depois, sua equipe ajusta sozinha, sem depender de ninguém.',
    itens: [
      {
        key: 'ajuste',
        titulo: 'Mudou uma regra? Basta atualizar.',
        texto: 'Instruções, base de conhecimento e catálogo ficam na configuração de cada agente. As próximas respostas já usam a informação atualizada.',
      },
      {
        key: 'crescer',
        titulo: 'Mais números, conforme o plano.',
        texto: 'Conecte outros números de WhatsApp de acordo com o plano. Cada um pode ter seu próprio Agente IA, equipe e fluxo de atendimento.',
      },
      {
        key: 'acompanhar',
        titulo: 'Acompanhe pelo painel.',
        texto: 'Veja quem está na fila, o volume da semana e quem da equipe está online.',
      },
    ],
  },
} as const

export const perguntas = {
  eyebrow: 'Perguntas',
  title: 'O que todo dono pergunta antes de começar.',
  titleCinza: 'Respostas diretas.',
  /** As que abrem a home (ciclo noturno, 30/09): as objeções de quem decide a
   *  compra, na ordem em que costumam aparecer. */
  naHome: [
    'Quanto custa a Oryon?',
    'Preciso entender de tecnologia?',
    'A IA pode errar?',
    'Em quanto tempo começo a usar?',
    'A conexão com o WhatsApp é oficial?',
  ],
  // A página já demonstra boa parte do produto. O FAQ fica restrito às dez
  // objeções residuais que alguém precisa resolver antes de avançar.
  grupos: [
    {
      titulo: 'Implantação e WhatsApp',
      itens: [
        {
          pergunta: 'Quanto custa a Oryon?',
          resposta: 'O valor depende do volume de atendimento, do tamanho da equipe e da quantidade de números. Por isso, montamos uma proposta para cada operação. Peça uma demonstração para receber a sua.',
        },
        {
          pergunta: 'Preciso entender de tecnologia?',
          resposta: 'Não. Nossa equipe faz a configuração inicial com você. Depois, mudar um valor, uma regra ou uma resposta é só editar a informação dentro da Oryon, sem programação.',
        },
        {
          pergunta: 'Em quanto tempo começo a usar?',
          resposta: 'Depois que o número estiver liberado pela Meta, a implantação pode levar até 7 dias. Você informa o número e quem atende. Nossa equipe configura agentes, catálogo, funis, setores e regras de transferência.',
        },
        {
          pergunta: 'A conexão com o WhatsApp é oficial?',
          resposta: 'Sim. A Oryon se conecta pela API oficial do WhatsApp Business, fornecida pela Meta.',
        },
        {
          pergunta: 'Posso conectar mais de um número?',
          resposta: 'Sim, conforme o plano contratado. Cada número conectado pode ter seu próprio Agente IA, e atendimento, comercial e pós-venda podem usar números, equipes e fluxos diferentes.',
        },
      ],
    },
    {
      titulo: 'Agente IA',
      itens: [
        {
          pergunta: 'Quais informações o agente usa para responder?',
          resposta: 'O agente consulta as instruções, a base de conhecimento e o catálogo configurados pela sua equipe. Você também define quando ele deve chamar uma pessoa.',
        },
        {
          pergunta: 'A IA pode fechar vendas sozinha?',
          resposta: 'Não. A IA pode avançar o negócio entre as etapas do funil, mas marcar uma venda como ganha ou perdida é sempre decisão de uma pessoa. O sistema bloqueia essa ação para agentes de IA.',
        },
        {
          pergunta: 'A IA pode errar?',
          resposta: 'Sim. Por isso, você testa o agente antes de ativar, define o que ele pode fazer e acompanha suas ações. A equipe pode assumir a conversa e corrigir as informações a qualquer momento.',
        },
        {
          pergunta: 'Dá para testar o agente antes de ligar?',
          resposta: 'Sim. Cada agente tem um chat de teste. Você conversa com ele como se fosse um cliente antes de ativá-lo no número.',
        },
      ],
    },
    {
      titulo: 'No dia a dia',
      itens: [
        {
          pergunta: 'Como funcionam os modelos de mensagem da Meta?',
          resposta: 'Para iniciar uma conversa ou retomar uma conversa fora da janela de atendimento, o WhatsApp exige um modelo aprovado pela Meta. Você cria, envia para aprovação e acompanha o status dentro da Oryon.',
        },
        {
          pergunta: 'A IA marca horários na minha agenda?',
          resposta: 'Quando a agenda está integrada à Oryon, o agente pode consultar os horários livres e encaminhar a marcação. Quando não puder confirmar a disponibilidade, chama sua equipe.',
        },
      ],
    },
  ],
} as const

export const fecho = {
  title: 'Coloque a IA para atender e mantenha sua equipe no comando.',
  titleSemContato: 'Já usa a Oryon? Continue de onde parou.',
  lead: 'Fale com o Agente IA da Oryon pelo WhatsApp e experimente o mesmo atendimento que seus clientes vão usar.',
  /** Sem canal comercial configurado: nada de prometer conversa. */
  leadSemContato: 'Entre na sua conta e retome o atendimento.',
  entrar: 'Já sou cliente',
} as const

// ─── 30/09: home de venda + páginas de produto (modelo Attio) ────────────────
//
// Decisões do PO (30/09): a home vira página de VENDA — uma ideia por bloco,
// o detalhe mora nas páginas de produto; conversão = formulário de
// demonstração (o WhatsApp comercial ainda não tem número); a copy não fala só
// de clínicas — outras áreas aparecem com simulações; vários números de
// WhatsApp, conforme o plano; a matriz de permissões por setor não é vendida
// até ser corrigida no produto. E, como sempre: nunca prometer que a IA não
// erra ou não inventa.

/** As páginas de produto (menu Plataforma). `blocos` = capítulos da Plataforma;
 *  `extras` = seções de prova que moram na página. */
export const paginasPlataforma = [
  {
    slug: 'atendimento-ia',
    menu: 'Atendimento com IA',
    resumo: 'Respostas na hora, com o que sua empresa sabe.',
    titulo: 'Seu cliente atendido na hora, a qualquer hora.',
    cinza: 'E sua equipe decide quando assumir.',
    lead: 'A IA usa as instruções, os documentos e a lista de serviços da sua empresa, responde no WhatsApp e deixa a ficha de cada cliente em dia. Você testa antes de ligar e define o que ela pode fazer.',
    blocos: ['conhecer', 'atender'],
    extras: ['limites'],
  },
  {
    slug: 'funil',
    menu: 'Funil e vendas',
    resumo: 'Quanto está em negociação, agora.',
    titulo: 'Cada conversa vira uma venda que você acompanha.',
    cinza: 'E sua equipe entra na hora de fechar.',
    lead: 'A IA registra itens e valores, avança a venda para a próxima etapa e chama quem cuida do cliente quando é hora de fechar. Você vê o total em aberto sem pedir relatório.',
    blocos: ['funil', 'equipe'],
    extras: [],
  },
  {
    slug: 'disparos',
    menu: 'Campanhas e resultados',
    resumo: 'Clientes antigos de volta à conversa.',
    titulo: 'Traga de volta quem já comprou de você.',
    cinza: 'E veja quem respondeu.',
    lead: 'Mande mensagens para a sua base de clientes com modelos aprovados pela Meta e veja quem recebeu, leu e respondeu. O painel mostra onde o atendimento precisa de atenção.',
    blocos: ['campanhas', 'medir'],
    extras: [],
  },
  {
    slug: 'equipe',
    menu: 'Equipe e controle',
    resumo: 'Nenhuma conversa sem dono.',
    titulo: 'Saiba o que acontece no seu WhatsApp.',
    cinza: 'Mesmo quando você não está olhando.',
    lead: 'Cada pessoa com o acesso da sua função, uma fila do que espera resposta e avisos quando um cliente fica esperando.',
    blocos: [],
    extras: ['equipe', 'resposta'],
  },
] as const

export type PaginaPlataforma = (typeof paginasPlataforma)[number]

export const home = {
  ctaPrincipal: 'Agendar demonstração',
  ctaSecundario: 'Ver o que mais ela faz',
  /** A dor e a virada (ciclo noturno, 30/09): o que acontece hoje no WhatsApp
   *  de quem compra, em palavras simples, e o que muda. Sem números. */
  dor: {
    eyebrow: 'O mesmo cliente, duas respostas',
    /** O título muda com o setor do carrossel (PO, 30/09): cada segmento tem
     *  um valor próprio. Clínica e loja: agilidade com volume alto. Imobiliária:
     *  o interesse não esfria. Contabilidade e jurídico: triagem e menos carga
     *  operacional. As chaves são os ids de home/dorConversas.ts. */
    setores: {
      clinica: {
        titulo: 'Na clínica cheia, marca quem responde primeiro.',
        apoio: 'A resposta sai na hora, com os convênios, valores e horários da clínica, e a recepção só entra para confirmar.',
      },
      imobiliaria: {
        titulo: 'O interesse no imóvel não espera o corretor voltar.',
        apoio: 'A IA responde sobre os imóveis da sua carteira e chama o corretor do imóvel para combinar a visita.',
      },
      loja: {
        titulo: 'Na loja, quem demora a responder vende para o concorrente.',
        apoio: 'Estoque, valor e retirada respondidos na hora, enquanto a equipe atende o balcão.',
      },
      contabilidade: {
        titulo: 'Seu contador para de responder a mesma pergunta o dia todo.',
        apoio: 'Prazos e documentos respondidos com o conteúdo do escritório. O contador entra quando o caso pede análise.',
      },
      juridico: {
        titulo: 'O advogado já começa com a triagem pronta.',
        apoio: 'O agente faz as perguntas definidas pelo escritório e pede os documentos. Orientação sobre o caso fica com o advogado.',
      },
    },
    comOryon: 'Com a Oryon',
    semOryon: 'Sem a Oryon',
    /** Celular: a chave entre as duas conversas (um aparelho só, 02/10). */
    alternarLabel: 'Ver a conversa sem ou com a Oryon',
    /** As conversas têm hora e valor: dizem que são exemplo (lote 3, 30/09). */
    aviso: 'Conversas de exemplo.',
    /** O carrossel de setores (o roteiro de cada um mora em
     *  home/dorConversas.ts, fora da copy: tem hora e valor). */
    abasLabel: 'Escolher o tipo de empresa',
    resultado: 'Resultado',
    andamento: 'Conversa em andamento…',
    /** Celular: com as duas conversas vistas, o botão do setor seguinte ("Próximo: Imobiliária"). */
    proximo: 'Próximo:',
    /** /solucoes: com as duas conversas terminadas, recomeça a área. */
    verDeNovo: 'Ver de novo',
  },
  /** A chamada no meio da página, depois das áreas. */
  chamada: {
    titulo: 'Cada mensagem sem resposta é um cliente indo para o concorrente.',
    texto: 'Na demonstração, você vê a Oryon respondendo as perguntas que seus clientes fazem todo dia.',
  },
  comoFunciona: {
    // 02/10 (PO): só o que o Hero não mostra — a configuração da IA, as
    // campanhas e o painel.
    eyebrow: 'Além do atendimento',
    titulo: 'O que mais a Oryon faz por você.',
    cinza: 'Telas reais da Oryon, com dados de exemplo.',
    abasLabel: 'Recursos da Oryon',
    saibaMais: 'Ver os detalhes',
  },
  limites: {
    /** Link da versão curta para a página completa. */
    saibaMais: 'Ver como a IA é configurada',
  },
  perguntas: {
    verTodas: 'Ver todas as perguntas',
  },
} as const

/** A PÁGINA "PARA A SUA ÁREA" (/solucoes, 02/10): uma área por vez, com as
 *  mesmas áreas e conversas da seção "Por que a Oryon" da home. As chaves de
 *  `areas` são os ids de home/dorConversas.ts. Nada aqui é integração pronta
 *  que não exista: o que muda de uma área para outra é o conteúdo e as regras
 *  que a empresa cadastra. */
export const solucoes = {
  eyebrow: 'Para a sua área',
  paginaTitulo: 'A Oryon no dia a dia da sua área.',
  paginaCinza: 'Escolha a sua área e veja a mesma conversa duas vezes, sem a Oryon e com a Oryon.',
  abasLabel: 'Escolher a área',
  /** Os atos da página, na ordem: a cliente no celular, a equipe no computador, a IA. */
  atos: {
    dia: 'Um dia no WhatsApp',
    tela: 'Na tela da sua equipe',
    ia: 'O que a IA usa para responder',
  },
  /** As telas do app usam os dados de exemplo da demonstração (02/10): são
   *  outra conversa, não a dos iPhones — a copy não diz "a mesma conversa". */
  telaAviso: 'Telas reais da Oryon, com dados de exemplo.',
  /** Os momentos da tela do app: cada um leva a tela àquele trecho. */
  momentosLabel: 'Momentos do atendimento',
  /** O convite do fim (a área entra no título; o formulário vem preenchido). */
  ctaTexto: 'Mostramos na prática, com exemplos da sua área, e tiramos suas dúvidas.',
  areas: {
    clinica: {
      tela: {
        titulo: 'Cada conversa da clínica, organizada na Oryon.',
        /** Os quatro momentos da história do app (sincronizados com a tela). */
        marcos: [
          { titulo: 'A conversa chega na caixa de entrada', texto: 'A IA responde na hora, com os valores, convênios e horários da clínica.' },
          { titulo: 'O contato se organiza', texto: 'Situação e etiquetas mudam conforme a conversa anda.' },
          { titulo: 'A venda anda no funil', texto: 'De Avaliação para Agendado, com o histórico de cada movimento.' },
          { titulo: 'A recepção assume', texto: 'Com a conversa inteira à vista, quando a cliente pede uma pessoa.' },
        ],
      },
      ia: 'A IA responde com o que a clínica ensinou.',
      itens: ['Valores e convênios da tabela da clínica', 'Horários, quando a agenda está integrada à Oryon', 'Urgências e dúvidas clínicas vão direto para a recepção'],
      cta: 'Quer ver a Oryon com o conteúdo da sua clínica?',
    },
    imobiliaria: {
      tela: {
        titulo: 'Cada interesse em imóvel, organizado na Oryon.',
        marcos: [
          { titulo: 'A conversa chega na caixa de entrada', texto: 'A IA responde com o imóvel, o condomínio e as regras de cada prédio.' },
          { titulo: 'O contato se organiza', texto: 'Situação e etiquetas mudam conforme a conversa anda.' },
          { titulo: 'A venda anda no funil', texto: 'De Qualificação para Visita, com o histórico de cada movimento.' },
          { titulo: 'O corretor assume', texto: 'Com a conversa inteira à vista, para combinar a visita.' },
        ],
      },
      ia: 'A IA responde com os imóveis da sua carteira.',
      itens: ['Imóveis, condomínio e regras de cada prédio', 'Cada interesse vira uma venda em andamento', 'O corretor entra para combinar a visita'],
      cta: 'Quer ver a Oryon com os imóveis da sua imobiliária?',
    },
    loja: {
      tela: {
        titulo: 'Cada pedido da loja, organizado na Oryon.',
        marcos: [
          { titulo: 'A conversa chega na caixa de entrada', texto: 'A IA responde com o estoque, o valor e a retirada da loja.' },
          { titulo: 'O contato se organiza', texto: 'Situação e etiquetas mudam conforme a conversa anda.' },
          { titulo: 'A venda anda no funil', texto: 'De Interesse para Reservado, com o histórico de cada movimento.' },
          { titulo: 'A vendedora assume', texto: 'Com a conversa inteira à vista, para separar o produto.' },
        ],
      },
      ia: 'A IA responde com o estoque e as condições da loja.',
      itens: ['Produtos, valores e formas de pagamento da loja', 'Cada interesse registrado para a equipe acompanhar', 'A vendedora entra para separar e fechar a venda'],
      cta: 'Quer ver a Oryon com os produtos da sua loja?',
    },
    contabilidade: {
      tela: {
        titulo: 'Cada dúvida do escritório, organizada na Oryon.',
        marcos: [
          { titulo: 'A conversa chega na caixa de entrada', texto: 'A IA responde com os prazos e a lista de documentos do escritório.' },
          { titulo: 'O contato se organiza', texto: 'Situação e etiquetas mudam conforme a conversa anda.' },
          { titulo: 'O atendimento anda no funil', texto: 'De Orientação para Aguardando documentos, com o histórico de cada movimento.' },
          { titulo: 'O contador assume', texto: 'Só no caso que pede análise, com a conversa inteira à vista.' },
        ],
      },
      ia: 'A IA responde com os prazos e as listas do escritório.',
      itens: ['Prazos e documentos do calendário do escritório', 'Cada conversa etiquetada por assunto', 'O contador entra só quando o caso pede análise'],
      cta: 'Quer ver a Oryon com o conteúdo do seu escritório?',
    },
    juridico: {
      tela: {
        titulo: 'Cada triagem do escritório, organizada na Oryon.',
        marcos: [
          { titulo: 'A conversa chega na caixa de entrada', texto: 'A IA faz as perguntas de triagem que o escritório definiu.' },
          { titulo: 'O contato se organiza', texto: 'Situação e etiquetas mudam conforme a conversa anda.' },
          { titulo: 'O caso anda no funil', texto: 'De Triagem para Documentos, com o histórico de cada movimento.' },
          { titulo: 'A advogada assume', texto: 'Com a triagem pronta e a conversa inteira à vista.' },
        ],
      },
      ia: 'A IA faz a triagem do jeito do escritório.',
      itens: ['Perguntas de triagem definidas pelo escritório', 'Documentos pedidos antes da primeira reunião', 'Toda orientação sobre o caso fica com o advogado'],
      cta: 'Quer ver a Oryon com a triagem do seu escritório?',
    },
  },
} as const

/** O formulário de demonstração — a conversão da página enquanto o WhatsApp
 *  comercial não tem número. */
export const formDemo = {
  eyebrow: 'Demonstração',
  titulo: 'Veja a Oryon atendendo os seus clientes.',
  cinza: 'Mostramos na prática.',
  lead: 'Numa conversa curta, mostramos a Oryon respondendo as perguntas que seus clientes fazem e organizando as vendas do jeito da sua empresa.',
  depoisTitulo: 'O que acontece depois',
  mensagemExemplo: 'Ex.: respondemos muitas mensagens fora do horário…',
  /** A mensagem é opcional e começa recolhida (formulário compacto, 01/10). */
  mensagemAbrir: 'Contar o que você quer resolver',
  opcional: 'opcional',
  depois: [
    { titulo: 'Você envia o pedido', texto: 'Só os dados básicos da sua operação.' },
    { titulo: 'Nossa equipe fala com você', texto: 'Pelo WhatsApp ou pelo e-mail informado, para combinar o melhor horário.' },
    { titulo: 'Você vê a Oryon com o seu conteúdo', texto: 'As perguntas dos seus clientes, as etapas das suas vendas e tempo para todas as suas dúvidas.' },
  ],
  campos: {
    nome: 'Seu nome',
    empresa: 'Empresa',
    whatsapp: 'WhatsApp',
    email: 'E-mail',
    segmento: 'Área de atuação',
    equipe: 'Quantas pessoas atendem hoje?',
    mensagem: 'O que você quer resolver?',
  },
  segmentos: ['Clínica ou consultório', 'Contabilidade', 'Jurídico', 'Imobiliária', 'Varejo ou loja', 'Educação', 'Outra área'],
  tamanhos: ['Só eu', 'Até cinco pessoas', 'De seis a vinte pessoas', 'Mais de vinte pessoas'],
  selecione: 'Selecione',
  privacidade: 'Usamos esses dados só para falar com você sobre a demonstração.',
  // Lote 2 (30/09): um rótulo por intenção em toda a página.
  enviar: 'Agendar demonstração',
  enviando: 'Enviando…',
  sucessoTitulo: 'Pedido recebido.',
  sucessoTexto: 'Nossa equipe vai falar com você pelo WhatsApp ou pelo e-mail informado.',
  erro: 'Não foi possível enviar agora. Tente de novo em alguns minutos.',
  obrigatorio: 'Preencha este campo.',
  emailInvalido: 'Confira o e-mail.',
  whatsappInvalido: 'Confira o número com DDD.',
} as const

export const rodape = {
  grupos: [
    { titulo: 'Plataforma', links: paginasPlataforma.map((p) => ({ label: p.menu, to: rotaPlataforma(p.slug) })) },
    {
      titulo: 'Conheça',
      links: [
        { label: 'Para a sua área', to: LANDING_ROUTES.solucoes },
        { label: 'Perguntas', to: LANDING_ROUTES.perguntas },
        { label: 'Agendar demonstração', to: LANDING_ROUTES.demonstracao },
      ],
    },
  ],
} as const
