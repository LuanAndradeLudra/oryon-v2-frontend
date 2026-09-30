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
        { label: 'Vender pelo funil', anchor: 'plataforma-funil' },
        { label: 'Passar para a equipe', anchor: 'plataforma-equipe' },
        { label: 'Reativar a base', anchor: 'plataforma-campanhas' },
        { label: 'Medir o resultado', anchor: 'plataforma-medir' },
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
  themeToggleLabel: 'Alternar tema claro e escuro',
  cta: 'Entrar',
} as const

export const hero = {
  // H1 curto, em duas frases: apresenta o trabalho da IA e o diferencial do
  // CRM sem depender do lead para explicar a categoria do produto.
  // 30/09 (PO): título 2 + subtítulo sobre o VALOR do agente — sem falar de
  // funil e sem prometer que ele não erra (a equipe assume quando precisa).
  selo: 'Para quem atende pelo WhatsApp',
  title: 'Seu WhatsApp atende, vende e organiza.',
  lead: 'Um agente de inteligência artificial responde seus clientes a qualquer hora, com as informações da sua empresa, e chama sua equipe quando uma pessoa precisa assumir.',
  stageLabel: 'Demonstração animada do produto',
} as const

export const trust = {
  // Reposicionado (26/09) logo depois da Plataforma: quem acabou de ver a IA
  // agir pergunta primeiro "posso confiar?" — e só depois "dá trabalho?".
  eyebrow: 'Limites da IA',
  // 26/09 (PO): NENHUMA promessa de que a IA não erra ou não inventa — isso
  // acontece e não se garante na venda. A seção diz o contrário da concorrência:
  // nenhuma IA acerta sempre; a Oryon é feita para que o erro custe pouco.
  title: 'Você define os limites da IA.',
  titleCinza: 'Sua equipe decide quando assumir.',
  /** A frase que prepara a tela real (aba Capacidades do agente). */
  lead: 'A IA pode errar. Por isso, sua equipe define o que ela pode fazer, acompanha o histórico e assume a conversa sempre que precisar.',
  tela: 'Oryon · Agentes IA',
  items: [
    {
      key: 'permissoes',
      title: 'Escolha o que o agente pode fazer',
      text: 'Ative apenas as capacidades necessárias, como mudar a situação do contato, aplicar etiquetas, mover negócios e chamar a equipe.',
    },
    {
      key: 'venda',
      title: 'Só uma pessoa conclui a venda',
      text: 'A IA pode avançar o negócio entre as etapas. Marcar uma venda como ganha ou perdida continua sendo uma decisão da equipe.',
    },
    {
      key: 'chamada',
      title: 'Defina o que exige uma pessoa',
      text: 'Configure situações como encaixes, urgências e assuntos fora do escopo para chamar a equipe. A pessoa responsável recebe a conversa com o histórico.',
    },
    {
      key: 'conexao',
      title: 'Conexão oficial com o WhatsApp',
      text: 'A integração usa a API oficial do WhatsApp Business. Para iniciar uma conversa fora da janela de atendimento, a Oryon usa um modelo aprovado pela Meta.',
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
  title: 'Veja o atendimento acontecer.',
  titleCinza: 'A conversa avança enquanto o CRM e o funil se atualizam.',
  contexto: 'Demonstração completa · uma clínica atendendo pelo WhatsApp',
  /**
   * Os três ATOS (26/09): seis capítulos com a mesma anatomia cansavam no
   * terceiro; agrupados em três ideias, o visitante percebe blocos. Cada ato
   * abre com uma frase e agrupa os capítulos pelo id.
   */
  atos: [
    { id: 'ia',     numero: 'I',   titulo: 'A IA responde',           frase: 'Seu conteúdo orienta cada resposta no WhatsApp.', blocos: ['conhecer', 'atender'] },
    { id: 'venda',  numero: 'II',  titulo: 'O atendimento avança',    frase: 'A IA atualiza o funil e chama sua equipe quando é hora de assumir.', blocos: ['funil', 'equipe'] },
    { id: 'escala', numero: 'III', titulo: 'Você reativa a base',     frase: 'Campanhas reabrem conversas e o painel mostra o resultado.', blocos: ['campanhas', 'medir'] },
  ],
  // Ordem (26/09, aprovada pelo PO): conhecer → atender → funil → equipe →
  // reativar → medir. O funil vem ANTES da equipe porque o clímax da história
  // (a pessoa confirma, e o negócio vai para a etapa final) pertence ao
  // capítulo da equipe — e ele precisa vir depois de o funil andar sozinho.
  blocos: [
    {
      id: 'conhecer',
      indice: 'Ensinar a IA',
      destaque: 'Suas informações orientam cada resposta.',
      texto: 'O agente consulta as instruções, os documentos e os itens de catálogo liberados pela sua equipe.',
      cartoes: [
        { titulo: 'Resposta baseada no que você cadastrou.', texto: 'Os valores vêm do catálogo. As regras de convênio vêm da base de conhecimento.' },
        { titulo: 'Informação mudou? Atualize uma vez.', texto: 'Edite o documento ou o item do catálogo. As próximas respostas já usam a versão atualizada.' },
      ],
    },
    {
      id: 'atender',
      indice: 'Atender com IA',
      destaque: 'A IA atende mesmo quando a equipe está offline.',
      texto: 'O cliente pede um horário à noite. O agente responde e atualiza a situação e as etiquetas do contato no CRM.',
      cartoes: [
        { titulo: 'O CRM se atualiza durante a conversa.', texto: 'Situação e etiquetas mudam durante o atendimento. O histórico mostra o que aconteceu e quem fez.' },
        { titulo: 'O cliente continua no WhatsApp.', texto: 'Sem instalar outro aplicativo ou preencher um formulário.' },
      ],
    },
    {
      id: 'funil',
      indice: 'Vender pelo funil',
      destaque: 'A IA mantém o funil em dia.',
      texto: 'Com essa capacidade ativa, o agente move o negócio conforme a conversa avança. A equipe acompanha etapa, itens e valor no mesmo registro.',
      cartoes: [
        { titulo: 'O negócio reúne itens e valores.', texto: 'Produtos, quantidades e valores entram no registro a partir do catálogo.' },
        { titulo: 'Histórico de cada movimento.', texto: 'Veja quando a etapa mudou e se a ação foi feita pelo agente ou por uma pessoa.' },
      ],
    },
    {
      id: 'equipe',
      indice: 'Passar para a equipe',
      destaque: 'A equipe assume com todo o contexto.',
      texto: 'Quando o cliente pede ajuda, a IA transfere a conversa, avisa a pessoa certa e mantém o histórico à vista.',
      cartoes: [
        { titulo: 'A pessoa certa recebe o aviso.', texto: 'A atendente abre a conversa já sabendo o que foi pedido e respondido.' },
        { titulo: 'A decisão final continua humana.', texto: 'A IA registra e avança as etapas. Só uma pessoa marca o negócio como ganho ou perdido.' },
      ],
    },
    {
      id: 'campanhas',
      indice: 'Reativar a base',
      destaque: 'Campanhas trazem contatos de volta.',
      texto: 'Envie modelos aprovados pela Meta e acompanhe entregas, leituras e respostas. Quem responde entra direto na caixa de entrada.',
      cartoes: [
        { titulo: 'Mensagem personalizada no WhatsApp.', texto: 'Use o nome do cliente e botões de resposta para facilitar o retorno.' },
        { titulo: 'Resultados reunidos em um relatório.', texto: 'Entregas, leituras, respostas e conversões ficam reunidas no relatório.' },
      ],
    },
    {
      id: 'medir',
      indice: 'Medir o resultado',
      destaque: 'Veja onde a operação precisa de atenção.',
      texto: 'O painel reúne conversas em atendimento, fila, volume da semana e equipe online.',
      cartoes: [
        { titulo: 'Status de cada conversa.', texto: 'Veja quantas estão ativas, na fila ou resolvidas no dia.' },
        { titulo: 'Atividade recente, com responsável.', texto: 'Transferências e conversas resolvidas entram no histórico com quem fez cada ação.' },
      ],
    },
  ],
} as const

// ─── Rodada (b), 26/09: as seções que quebram as objeções que a Plataforma não
// quebra. Cada afirmação abaixo tem prova no código (ver RETOMADA-LANDING-LOOP.md).

/** "Serve para mim?" — clínicas como caso completo (a vertical de hoje);
 *  os outros segmentos como cenários, sem prometer o que não foi feito. */
export const area = {
  eyebrow: 'Para a sua área',
  title: 'Veja como uma clínica usa a Oryon.',
  titleCinza: 'O mesmo fluxo pode atender outros negócios de serviço.',
  lead: 'Na clínica, o agente consulta informações sobre consultas, convênios e agenda. Em outras operações, você configura o conteúdo, o catálogo, o funil e as regras de transferência.',
  caso: {
    rotulo: 'Caso completo',
    titulo: 'Clínicas e consultórios',
    texto: 'O agente responde às dúvidas recorrentes e organiza cada novo atendimento. A recepção assume encaixes, urgências e dúvidas clínicas.',
    itens: [
      'Informa valores e convênios a partir do catálogo e da base de conhecimento',
      'Consulta horários quando a agenda está integrada à Oryon',
      'Encaminha a marcação e registra o atendimento no funil',
      'Chama a recepção para encaixes, urgências e dúvidas clínicas',
      'Reativa pacientes com campanhas de retorno',
    ],
    /** Honesto: a agenda só entra com a integração feita na implantação. */
    nota: 'A consulta à agenda depende da integração com o sistema da clínica, feita na implantação.',
  },
  cenarios: [
    {
      titulo: 'Contabilidade',
      exemplo: '“Qual o prazo pra mandar as notas de agosto?”',
      texto: 'Responde dúvidas sobre prazos e documentos usando o conteúdo do escritório. O contador entra quando o caso é específico.',
    },
    {
      titulo: 'Jurídico',
      exemplo: '“Preciso de orientação sobre uma rescisão.”',
      texto: 'Faz a triagem inicial e pede os documentos definidos pelo escritório. O advogado assume quando o assunto exige análise.',
    },
    {
      titulo: 'Serviços em geral',
      exemplo: '“Vocês fazem entrega no sábado?”',
      texto: 'Consulta o catálogo e as regras de atendimento, organiza o primeiro contato e chama a equipe quando alguém precisa assumir.',
    },
  ],
} as const

/** "Perco o controle?" — setores, papéis, auditoria e chat interno: fatos do produto. */
export const equipe = {
  eyebrow: 'A equipe no comando',
  title: 'Dê a cada pessoa o acesso certo.',
  titleCinza: 'Permissões, responsáveis e histórico no mesmo lugar.',
  // 30/09 (PO): as permissões por setor vão ser corrigidas no produto — até
  // lá, a página não vende a matriz de permissões (o cartão "Setores" saiu).
  lead: 'Organize o atendimento por setor, defina o acesso de cada perfil e consulte o histórico das ações da equipe.',
  cartoes: [
    { key: 'papeis', titulo: 'Acessos por perfil', texto: 'Dono, administrador, supervisor e agente têm acessos diferentes de acordo com a função.' },
    { key: 'auditoria', titulo: 'Quem mudou o quê', texto: 'A linha do tempo mostra quem alterou o quê e quando.' },
    { key: 'chat', titulo: 'Chat interno da equipe', texto: 'A equipe usa canais, mensagens diretas e menções sem sair da Oryon.' },
  ],
} as const

/** "E se ninguém responder?" — notificações, aviso de espera, fila, vários números. */
export const resposta = {
  eyebrow: 'Fila e avisos',
  title: 'A equipe vê o que precisa de resposta.',
  titleCinza: 'Transferências, fila e avisos aparecem juntos.',
  lead: 'Quando a IA transfere uma conversa ou alguém fica esperando, a Oryon destaca o caso no painel e envia um alerta ao celular quando essa opção está ativa.',
  cartoes: [
    { key: 'notificacoes', titulo: 'Cada aviso chega com contexto.', texto: 'Transferências, conversas atribuídas, campanhas concluídas, menções e alertas de conexão aparecem no app e podem chegar ao celular.' },
    { key: 'espera', titulo: 'Aviso quando a resposta atrasa.', texto: 'Se uma conversa atribuída fica sem resposta além do tempo definido, o responsável recebe um aviso.' },
    { key: 'fila', titulo: 'Fila e atribuição', texto: 'As conversas transferidas pela IA entram na fila. A equipe pode assumir, escolher um responsável ou transferir para outro setor.' },
    // 30/09 (PO): mais de um número, sim — conforme o plano contratado.
    { key: 'numeros', titulo: 'Números diferentes, uma caixa de entrada', texto: 'Conforme o plano, recepção, comercial e pós-atendimento podem usar números e agentes diferentes na mesma tela de Conversas.' },
  ],
} as const

export const implantacao = {
  eyebrow: 'Implantação',
  title: 'Sua operação no ar em até 7 dias.',
  titleCinza: 'O prazo começa depois que a Meta libera o número.',
  passos: [
    {
      quem: 'Você',
      titulo: 'Prepare o número de atendimento',
      texto: 'Você informa o número e conclui a autorização na Meta. A Oryon se conecta pela API oficial do WhatsApp Business.',
      entregas: [
        'Número que será usado no atendimento',
        'Conta aprovada pela Meta para a API oficial',
        'Pessoas e setores responsáveis pelo atendimento',
      ],
    },
    {
      quem: 'Nós',
      titulo: 'Configuramos a Oryon',
      texto: 'Nossa equipe configura a plataforma de acordo com o jeito que sua empresa vende e atende.',
      entregas: [
        'Agentes IA com instruções, conhecimento e catálogo',
        'Funis com as etapas do seu atendimento',
        'Equipe, setores e regras de transferência',
      ],
    },
    {
      quem: 'Juntos',
      titulo: 'Teste antes de ativar',
      texto: 'Você conversa com o agente no chat de teste, ajusta o que for preciso e só então ativa o atendimento no seu número.',
      entregas: [
        'Cenários de teste antes da ativação',
        'Respostas e capacidades ajustadas com a sua equipe',
        'Atendimento com IA ativado no número oficial',
      ],
    },
  ],
  /** O que muda depois do ar — tudo na própria Oryon, sem depender de nós. */
  depois: {
    titulo: 'Depois da implantação, sua equipe faz os ajustes.',
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
        texto: 'Veja fila, conversas abertas, volume de atendimento e equipe online em um só lugar.',
      },
    ],
  },
} as const

export const perguntas = {
  eyebrow: 'Perguntas',
  title: 'Dúvidas comuns antes de começar.',
  titleCinza: 'Respostas sobre implantação, IA e WhatsApp.',
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
    resumo: 'A IA responde com o que você cadastrou.',
    titulo: 'A IA atende com o conteúdo da sua empresa.',
    cinza: 'Sua equipe decide quando assumir.',
    lead: 'O agente consulta instruções, documentos e catálogo, responde no WhatsApp e atualiza o CRM durante a conversa. Você testa antes de ativar e define o que ele pode fazer.',
    blocos: ['conhecer', 'atender'],
    extras: ['limites'],
  },
  {
    slug: 'funil',
    menu: 'Funil e vendas',
    resumo: 'O negócio avança durante a conversa.',
    titulo: 'O funil se atualiza enquanto a conversa acontece.',
    cinza: 'A equipe assume com todo o contexto.',
    lead: 'O agente move o negócio entre as etapas, registra itens e valores e chama a pessoa certa quando é hora de fechar.',
    blocos: ['funil', 'equipe'],
    extras: [],
  },
  {
    slug: 'disparos',
    menu: 'Disparos e resultados',
    resumo: 'Campanhas que reabrem conversas.',
    titulo: 'Traga contatos de volta pelo WhatsApp.',
    cinza: 'E acompanhe o resultado no painel.',
    lead: 'Envie modelos aprovados pela Meta, acompanhe entregas, leituras e respostas, e veja no painel onde a operação precisa de atenção.',
    blocos: ['campanhas', 'medir'],
    extras: [],
  },
  {
    slug: 'equipe',
    menu: 'Equipe e controle',
    resumo: 'Acessos, fila e avisos.',
    titulo: 'Sua equipe no comando do atendimento.',
    cinza: 'Acessos, fila e avisos no mesmo lugar.',
    lead: 'Cada pessoa com o acesso certo, a fila do que precisa de resposta e avisos quando alguém fica esperando.',
    blocos: [],
    extras: ['equipe', 'resposta'],
  },
] as const

export type PaginaPlataforma = (typeof paginasPlataforma)[number]

export const home = {
  ctaPrincipal: 'Agendar demonstração',
  ctaSecundario: 'Ver como funciona',
  /** A faixa de fatos logo depois do Hero — só o que dá para afirmar hoje. */
  fatos: [
    { key: 'oficial', titulo: 'API oficial do WhatsApp Business', texto: 'Conexão fornecida pela Meta.' },
    { key: 'prazo', titulo: 'No ar em até 7 dias', texto: 'Depois que a Meta libera o número.' },
    { key: 'controle', titulo: 'Sua equipe no comando', texto: 'Você define o que a IA faz e quando uma pessoa assume.' },
  ],
  comoFunciona: {
    eyebrow: 'Como funciona',
    titulo: 'Da primeira mensagem ao negócio fechado.',
    cinza: 'Cada etapa na Oryon real, em modo demonstração.',
    abasLabel: 'Etapas do atendimento',
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

/** As áreas (30/09): a mesma plataforma em operações diferentes, cada uma com
 *  uma simulação (dados fictícios). Nada aqui é integração pronta que não
 *  exista: o que muda de uma área para outra é o conteúdo e as regras que a
 *  empresa cadastra. */
export const solucoes = {
  eyebrow: 'Para a sua área',
  titulo: 'Um jeito de atender, várias áreas.',
  cinza: 'Veja simulações em operações diferentes.',
  lead: 'O que muda de uma área para outra é o conteúdo, o catálogo, o funil e as regras que sua equipe cadastra. A IA pode errar: por isso, quem define quando uma pessoa assume é você.',
  aviso: 'Simulação com dados fictícios.',
  verTodas: 'Ver todas as áreas',
  abasLabel: 'Escolher área',
  paginaTitulo: 'A Oryon em operações diferentes.',
  paginaCinza: 'O mesmo atendimento, com o conteúdo de cada área.',
  areas: [
    {
      id: 'clinicas',
      nome: 'Clínicas e consultórios',
      titulo: 'Valores, convênios e horários sem fila de espera.',
      texto: 'O agente informa valores e convênios a partir do catálogo e da base de conhecimento, e chama a recepção para encaixes, urgências e dúvidas clínicas.',
      itens: ['Valores e convênios vindos do que a clínica cadastrou', 'Horários quando a agenda está integrada à Oryon', 'Recepção chamada para urgências e dúvidas clínicas'],
    },
    {
      id: 'contabilidade',
      nome: 'Contabilidade',
      titulo: 'Prazos e documentos respondidos na hora.',
      texto: 'O agente responde dúvidas recorrentes sobre prazos e documentos com o conteúdo do escritório e passa para o contador quando o caso é específico.',
      itens: ['Prazos e listas de documentos do próprio escritório', 'Etiqueta por assunto para organizar a demanda', 'Contador chamado quando o caso exige análise'],
    },
    {
      id: 'juridico',
      nome: 'Jurídico',
      titulo: 'Triagem organizada antes do advogado entrar.',
      texto: 'O agente faz a triagem inicial, pede os documentos definidos pelo escritório e não dá orientação sobre o caso: quem analisa é o advogado.',
      itens: ['Perguntas de triagem definidas pelo escritório', 'Lista de documentos antes da primeira reunião', 'Advogado chamado para qualquer orientação'],
    },
    {
      id: 'imobiliarias',
      nome: 'Imobiliárias',
      titulo: 'Imóveis certos para cada pedido.',
      texto: 'O agente consulta os imóveis cadastrados no catálogo, cria o negócio no funil e chama o corretor para combinar a visita.',
      itens: ['Imóveis vindos do catálogo cadastrado', 'Negócio criado no funil a cada interesse', 'Corretor chamado para combinar a visita'],
    },
    {
      id: 'varejo',
      nome: 'Varejo e lojas',
      titulo: 'Estoque, tamanho e reserva pelo WhatsApp.',
      texto: 'O agente consulta produtos e condições do catálogo, registra o interesse no funil e chama um vendedor para concluir a venda.',
      itens: ['Produtos e condições do catálogo', 'Interesse registrado como negócio no funil', 'Vendedor chamado para concluir a venda'],
    },
  ],
} as const

export type AreaSolucao = (typeof solucoes.areas)[number]

/** O formulário de demonstração — a conversão da página enquanto o WhatsApp
 *  comercial não tem número. */
export const formDemo = {
  eyebrow: 'Demonstração',
  titulo: 'Veja a Oryon no seu atendimento.',
  cinza: 'Conte um pouco da sua operação e mostramos na prática.',
  lead: 'Nossa equipe entra em contato para marcar uma demonstração com o conteúdo da sua área.',
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
  enviar: 'Pedir demonstração',
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
