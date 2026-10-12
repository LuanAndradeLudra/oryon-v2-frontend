/**
 * OS PERFIS DA DEMONSTRAÇÃO (02/10): a mesma história do Hero — a conversa
 * chega, a IA responde com o que a empresa cadastrou, o contato se organiza, o
 * negócio anda no funil e uma pessoa assume — contada em cada área da página
 * /solucoes. A clínica é o perfil de sempre (Hero, páginas de produto, "Como
 * funciona"); as outras quatro seguem a conversa "com a Oryon" dos iPhones da
 * seção "Por que a Oryon" (home/dorConversas.ts): a mesma pessoa e as mesmas
 * mensagens.
 *
 * O app de demonstração escolhe o perfil pelo endereço (`demo.html?setor=`);
 * sem ele — a landing, os testes — vale a clínica. Os ids internos (funil,
 * etapas, negócio, conversa) são os mesmos em todos os perfis: o diretor, as
 * rotas e os recortes não mudam de uma área para outra.
 *
 * As regras da IA valem em todos (ver heroRealData.ts): o negócio já nasce
 * com valor, aberto por uma PESSOA; a IA só avança para etapa não terminal;
 * quem fecha e quem pausa a IA é a pessoa.
 */

export type SetorDemo = 'clinica' | 'imobiliaria' | 'loja' | 'contabilidade' | 'juridico'

type Autor = 'cliente' | 'ia'
interface Etapa { key: string; label: string; color: string }
interface Conversa { nome: string; previa: string; min: number; naoLidas: number; ia: boolean }
interface Negocio { title: string; person: string; etapa: 0 | 1 | 2 | 3; cents: number; dias: number }
interface Produto { id: string; name: string; sku: string; category: string; description: string; precos: Array<{ id: string; label: string; cents: number }> }
interface Documento { id: string; nome: string; tipo: 'file' | 'text'; trechos: number; dias: number; previa: string; conteudo: string }
interface Regra { id: string; nome: string; palavras: string[]; departamento: string; resposta?: string }

export interface PerfilDemo {
  empresa: string
  cidade: string
  uf: string
  pessoa: { nome: string; primeiro: string; telefone: string; waId: string; email: string }
  agente: { nome: string; icone: string; setor: string; objetivo: string; prompt: string; outros: Array<{ id: string; nome: string; icone: string; setor: string; objetivo: string; status: 'active' | 'paused'; conversas: number }> }
  atendente: { primeiro: string; sobrenome: string; email: string }
  /** Quem mais aparece na equipe (o profissional da clínica, a gerência…). */
  profissional: string
  /** Duas etiquetas que o contato já tem e a que a IA põe na história. */
  etiquetas: [{ nome: string; cor: string }, { nome: string; cor: string }, { nome: string; cor: string }]
  /** Situação do contato: a de antes, a que a IA põe e a final. */
  situacoes: [Etapa, Etapa, Etapa]
  /** Funil: contato → qualificação (onde o negócio está) → a etapa para onde a
   *  IA leva → a seguinte → a de ganho (só a pessoa chega). */
  funil: { nome: string; etapas: [Etapa, Etapa, Etapa, Etapa, Etapa] }
  negocio: { titulo: string; cents: number; descricao: string; item: { produtoId: string; nome: string; variacao: string } }
  mensagens: {
    /** O histórico de ontem: a última é sempre da IA. */
    ontem: Array<[dir: 'inbound' | 'outbound', texto: string, hora: number, minuto: number]>
    demanda: string
    resposta: string
    confirma: string
    pedido: { texto: string; autor: Autor }
    humano: string
  }
  modelo: { nome: string; corpo: string; rodape: string; botoes: [string, string]; campanha: string; trecho: string; segmentoTag: number }
  conversas: Conversa[]
  negocios: Negocio[]
  produtos: Produto[]
  catalogoDoAgente: string[]
  conhecimento: Documento[]
  regras: Regra[]
  /** A outra notificação do sino (uma conversa atribuída antes). */
  atribuida: { contato: string; descricao: string }
  /** Textos que só existem quando a tela pintou (o diretor espera por eles)
   *  e o que a câmera aponta nas telas do agente. */
  sinais: { conhecimento: string; catalogo: string }
  /** O teste do agente no "Como funciona" (02/10): a pergunta é sobre o item
   *  que a cena acabou de liberar no catálogo, e a resposta sai dele. */
  testeDoAgente?: { pergunta: string; resposta: string }
}

const PROMPT_CLINICA = [
  'Você é o Agente Recepção da Clínica Vitalis, clínica de dermatologia em Joinville.',
  '',
  'Seu papel: atender pacientes pelo WhatsApp, informar valores e convênios, oferecer horários e marcar consultas e retornos.',
  '',
  'Como responder:',
  '- Use só valores e condições do catálogo liberado a você e da base de conhecimento.',
  '- Ofereça apenas horários que vieram da agenda da clínica; nunca invente um horário.',
  '- Convênios: só os da lista "Convênios aceitos"; com guia autorizada.',
  '- Seja direto e cordial; trate o paciente pelo primeiro nome.',
  '',
  'Quando chamar uma pessoa:',
  '- O paciente pede para falar com alguém, quer um encaixe ou diz que é urgente.',
  '- Dúvida clínica, pedido de desconto ou orientação sobre exames.',
].join('\n')

const CLINICA: PerfilDemo = {
  empresa: 'Clínica Vitalis',
  cidade: 'Joinville',
  uf: 'SC',
  pessoa: { nome: 'Marina Alves', primeiro: 'Marina', telefone: '+55 47 90000-0201', waId: '5547900000201', email: 'marina.alves@email.example' },
  agente: {
    nome: 'Agente Recepção', icone: '🩺', setor: 'Recepção',
    objetivo: 'Atende pacientes, informa valores e convênios, oferece horários da agenda e marca consultas. Chama uma pessoa para encaixes e urgências.',
    prompt: PROMPT_CLINICA,
    outros: [
      { id: 'ag-resultados', nome: 'Agente Resultados', icone: '📄', setor: 'Exames', objetivo: 'Avisa quando o resultado de exame está disponível e orienta a retirada.', status: 'active', conversas: 3_917 },
      { id: 'ag-posconsulta', nome: 'Agente Pós-consulta', icone: '🤝', setor: 'Cuidado continuado', objetivo: 'Acompanha o pós-consulta e lembra o retorno.', status: 'paused', conversas: 402 },
    ],
  },
  atendente: { primeiro: 'Ana', sobrenome: 'Prado', email: 'ana@clinicavitalis.example' },
  profissional: 'Dra. Helena',
  etiquetas: [{ nome: 'Unimed', cor: '#2DD4BF' }, { nome: 'Dermatologia', cor: '#60A5FA' }, { nome: 'retorno', cor: '#FBBF24' }],
  situacoes: [
    { key: 'novo', label: 'Novo', color: '#64748B' },
    { key: 'em-agendamento', label: 'Em agendamento', color: '#38BDF8' },
    { key: 'paciente', label: 'Paciente', color: '#22C55E' },
  ],
  funil: {
    nome: 'Consultas',
    etapas: [
      { key: 'contato', label: 'Contato', color: '#64748B' },
      { key: 'avaliacao', label: 'Avaliação', color: '#38BDF8' },
      { key: 'agendado', label: 'Agendado', color: '#A78BFA' },
      { key: 'guia', label: 'Aguardando guia', color: '#FBBF24' },
      { key: 'confirmado', label: 'Confirmado', color: '#22C55E' },
    ],
  },
  negocio: { titulo: 'Retorno · Dra. Helena', cents: 18_000, descricao: 'Dermatologia · retorno em até 30 dias', item: { produtoId: 'pr-retorno', nome: 'Consulta de retorno', variacao: 'Particular' } },
  mensagens: {
    ontem: [
      ['inbound', 'Bom dia! A Dra. Helena tem horário essa semana?', 9, 12],
      ['outbound', 'Bom dia, Marina! A Dra. Helena atende de terça a sexta, à tarde. Quer que eu veja um horário pra você?', 9, 13],
      ['inbound', 'Vou ver com o trabalho e te falo.', 9, 21],
      ['outbound', 'Combinado! Qualquer coisa é só chamar. 😊', 9, 22],
    ],
    demanda: 'Oi! Quero marcar o retorno com a Dra. Helena. Tem horário à tarde essa semana?',
    resposta: 'Oi, Marina! O retorno com a Dra. Helena custa R$ 180 no particular. Pela Unimed, basta levar a guia. Tenho quinta às 14h30 e sexta às 15h. Qual horário você prefere?',
    confirma: 'Perfeito! Quinta às 14h30.',
    pedido: { texto: 'Consigo falar com alguém? Queria ver se dá um encaixe antes, é meio urgente.', autor: 'cliente' },
    humano: 'Oi, Marina! Aqui é a Ana, da recepção. Consegui um encaixe amanhã às 9h com a Dra. Helena. Já deixei reservado pra você.',
  },
  modelo: {
    nome: 'retorno_setembro',
    corpo: 'Olá, {{1}}! Já está na hora do seu retorno com a Dra. Helena. Abrimos novos horários para setembro. Quer que eu procure um para você?',
    rodape: 'Clínica Vitalis', botoes: ['Quero marcar', 'Agora não'], campanha: 'Retorno · setembro', trecho: 'Já está na hora do seu retorno', segmentoTag: 1,
  },
  conversas: [
    { nome: 'Rafaela Couto', previa: 'Perfeito, obrigada!', min: 12, naoLidas: 0, ia: false },
    { nome: 'Bruno Antunes', previa: 'Consigo remarcar pra semana que vem?', min: 27, naoLidas: 2, ia: true },
    { nome: 'Joana Freitas', previa: 'Vocês atendem Bradesco Saúde?', min: 43, naoLidas: 0, ia: false },
    { nome: 'Diego Ramos', previa: 'Confirmado, até quinta!', min: 96, naoLidas: 0, ia: false },
    { nome: 'Lúcia Martins', previa: 'Obrigada pelo lembrete!', min: 150, naoLidas: 0, ia: true },
  ],
  negocios: [
    { title: 'Consulta · Dr. Paulo', person: 'Joana Freitas', etapa: 0, cents: 25_000, dias: 1 },
    { title: 'Avaliação estética', person: 'Bruno Antunes', etapa: 0, cents: 15_000, dias: 3 },
    { title: 'Check-up · 3 exames', person: 'Diego Ramos', etapa: 1, cents: 42_000, dias: 2 },
    { title: 'Consulta · Dra. Helena', person: 'Carla Mendes', etapa: 1, cents: 25_000, dias: 1 },
    { title: 'Laser · 3 sessões', person: 'Rafaela Couto', etapa: 2, cents: 135_000, dias: 3 },
    { title: 'Consulta pediátrica', person: 'Lúcia Martins', etapa: 3, cents: 22_000, dias: 2 },
    { title: 'Retorno · Dr. Paulo', person: 'Otávio Lima', etapa: 1, cents: 18_000, dias: 4 },
    { title: 'Peeling · 2 sessões', person: 'Beatriz Nunes', etapa: 2, cents: 70_000, dias: 1 },
    { title: 'Consulta · Dra. Helena', person: 'Sérgio Tavares', etapa: 3, cents: 25_000, dias: 5 },
    { title: 'Mapeamento de pintas', person: 'Helena Duarte', etapa: 0, cents: 32_000, dias: 1 },
    { title: 'Consulta · Dr. Paulo', person: 'Renata Souza', etapa: 1, cents: 25_000, dias: 2 },
    { title: 'Consulta pediátrica', person: 'Paula Andrade', etapa: 2, cents: 22_000, dias: 2 },
    { title: 'Consulta · Dra. Helena', person: 'Eduardo Pires', etapa: 3, cents: 25_000, dias: 1 },
  ],
  produtos: [
    { id: 'pr-consulta', name: 'Consulta dermatológica', sku: 'CONS', category: 'Consultas', description: 'Primeira consulta, com avaliação completa.',
      precos: [{ id: 'pv-cons-part', label: 'Particular', cents: 25_000 }, { id: 'pv-cons-conv', label: 'Convênio · com guia', cents: 0 }] },
    { id: 'pr-retorno', name: 'Consulta de retorno', sku: 'RET', category: 'Consultas', description: 'Retorno em até 30 dias após a consulta.',
      precos: [{ id: 'pv-ret-part', label: 'Particular', cents: 18_000 }, { id: 'pv-ret-conv', label: 'Convênio · com guia', cents: 0 }] },
    { id: 'pr-laser', name: 'Laser fracionado', sku: 'LAS', category: 'Procedimentos', description: 'Sessão avulsa ou pacote de três.',
      precos: [{ id: 'pv-laser', label: 'Por sessão', cents: 45_000 }] },
  ],
  catalogoDoAgente: ['pr-consulta', 'pr-retorno'],
  conhecimento: [
    { id: 'kd-tabela', nome: 'Tabela de consultas 2026.pdf', tipo: 'file', trechos: 6, dias: 40,
      previa: 'Consulta dermatológica: R$ 250 (particular). Retorno em até 30 dias: R$ 180. Laser fracionado: R$ 450 por sessão…',
      conteudo: 'Consulta dermatológica — R$ 250 no particular.\nConsulta de retorno (até 30 dias após a consulta) — R$ 180.\nLaser fracionado — R$ 450 por sessão; pacote de três sessões com desconto.' },
    { id: 'kd-convenios', nome: 'Convênios aceitos', tipo: 'text', trechos: 3, dias: 12,
      previa: 'Atendemos Unimed, Bradesco Saúde e SulAmérica, com guia autorizada. Procedimentos estéticos só no particular…',
      conteudo: 'Convênios aceitos: Unimed, Bradesco Saúde e SulAmérica, sempre com guia autorizada antes da consulta. Procedimentos estéticos (laser, peeling) são atendidos só no particular.' },
    { id: 'kd-preparo', nome: 'Preparo e orientações', tipo: 'text', trechos: 4, dias: 40,
      previa: 'Chegar com 10 minutos de antecedência; trazer documento com foto e a carteirinha do convênio…',
      conteudo: 'Chegar com 10 minutos de antecedência. Trazer documento com foto e, no convênio, a carteirinha e a guia. Para mapeamento de pintas, vir sem maquiagem e sem esmalte.' },
    { id: 'kd-cancelamento', nome: 'Política de cancelamento.pdf', tipo: 'file', trechos: 5, dias: 64,
      previa: 'Cancelamentos e remarcações com até 24 horas de antecedência, sem custo…',
      conteudo: 'Cancelamentos e remarcações com até 24 horas de antecedência não têm custo. O agente não oferece desconto nem exceção fora desta política.' },
  ],
  regras: [
    { id: 'hr-encaixe', nome: 'Encaixe ou urgência', palavras: ['encaixe', 'urgente', 'hoje', 'dor', 'sangrando'], departamento: 'Recepção',
      resposta: 'Claro! Já chamei a recepção para ver o encaixe com você por aqui mesmo.' },
    { id: 'hr-clinica', nome: 'Dúvida clínica', palavras: ['sintoma', 'remédio', 'resultado de exame', 'posso tomar'], departamento: 'Dra. Helena' },
    { id: 'hr-humano', nome: 'Pedido de uma pessoa', palavras: ['falar com alguém', 'atendente', 'pessoa', 'humano'], departamento: 'Recepção' },
  ],
  atribuida: { contato: 'Joana Freitas', descricao: 'Joana Freitas · Consulta · Dr. Paulo' },
  sinais: { conhecimento: 'Convênios aceitos', catalogo: 'Consulta de retorno' },
  testeDoAgente: {
    pergunta: 'Quanto custa o laser fracionado?',
    resposta: 'O laser fracionado custa R$ 450 por sessão, e também tem o pacote de três. A avaliação é com a Dra. Helena: quer que eu veja um horário para você?',
  },
}

// ─── Imobiliária: Rafael, o apartamento no Centro e o corretor Marcos ────────

const IMOBILIARIA: PerfilDemo = {
  empresa: 'Casa Nova Imóveis',
  cidade: 'Joinville',
  uf: 'SC',
  pessoa: { nome: 'Rafael Souza', primeiro: 'Rafael', telefone: '+55 47 90000-0202', waId: '5547900000202', email: 'rafael.souza@email.example' },
  agente: {
    nome: 'Agente Imóveis', icone: '🏠', setor: 'Atendimento',
    objetivo: 'Responde sobre os imóveis cadastrados, o condomínio e as regras de cada prédio. Chama o corretor do imóvel para combinar a visita.',
    prompt: [
      'Você é o Agente Imóveis da Casa Nova Imóveis, imobiliária em Joinville.',
      '',
      'Seu papel: atender pelo WhatsApp quem procura imóvel para alugar ou comprar, apresentar os imóveis cadastrados e registrar o interesse de cada cliente.',
      '',
      'Como responder:',
      '- Use só valores e condições do catálogo liberado a você e da base de conhecimento.',
      '- Pet, condomínio e IPTU: só o que está nas regras de cada prédio.',
      '- Nunca marque a visita sozinho: quem combina o horário é o corretor do imóvel.',
      '- Seja direto e cordial; trate o cliente pelo primeiro nome.',
      '',
      'Quando chamar uma pessoa:',
      '- O cliente quer visitar, fazer proposta ou negociar valor.',
      '- Dúvidas de contrato, fiador ou documentação fora da lista.',
    ].join('\n'),
    outros: [
      { id: 'ag-captacao', nome: 'Agente Captação', icone: '🔑', setor: 'Proprietários', objetivo: 'Atende proprietários que querem anunciar o imóvel e pede fotos e documentos.', status: 'active', conversas: 1_208 },
      { id: 'ag-contratos', nome: 'Agente Contratos', icone: '📄', setor: 'Locação', objetivo: 'Lembra vencimentos e envia a segunda via do boleto.', status: 'paused', conversas: 640 },
    ],
  },
  atendente: { primeiro: 'Marcos', sobrenome: 'Teixeira', email: 'marcos@casanovaimoveis.example' },
  profissional: 'Paula Rezende',
  etiquetas: [{ nome: 'Centro', cor: '#2DD4BF' }, { nome: 'Aluguel', cor: '#60A5FA' }, { nome: 'visita', cor: '#FBBF24' }],
  situacoes: [
    { key: 'novo', label: 'Novo', color: '#64748B' },
    { key: 'quer-visitar', label: 'Quer visitar', color: '#38BDF8' },
    { key: 'cliente', label: 'Cliente', color: '#22C55E' },
  ],
  funil: {
    nome: 'Locação',
    etapas: [
      { key: 'contato', label: 'Contato', color: '#64748B' },
      { key: 'qualificacao', label: 'Qualificação', color: '#38BDF8' },
      { key: 'visita', label: 'Visita', color: '#A78BFA' },
      { key: 'proposta', label: 'Proposta', color: '#FBBF24' },
      { key: 'contrato', label: 'Contrato assinado', color: '#22C55E' },
    ],
  },
  negocio: { titulo: 'Apto 2 quartos · Centro', cents: 230_000, descricao: 'Aluguel · aceita pet · condomínio R$ 480', item: { produtoId: 'pr-apto-centro', nome: 'Apto 2 quartos · Centro', variacao: 'Aluguel mensal' } },
  mensagens: {
    ontem: [
      ['inbound', 'Boa tarde! Vocês têm apartamento para alugar no Centro?', 17, 40],
      ['outbound', 'Boa tarde, Rafael! Temos, sim. Quantos quartos você procura?', 17, 41],
      ['inbound', 'Dois quartos. E tenho um cachorro pequeno.', 17, 46],
      ['outbound', 'Anotado! Te aviso assim que entrar um com esse perfil. 😊', 17, 47],
    ],
    demanda: 'Oi! O apartamento de 2 quartos no Centro ainda está disponível? Aceita pet?',
    resposta: 'Oi, Rafael! Está disponível, sim, e o prédio aceita pet. O condomínio fica R$ 480. Quer visitar?',
    confirma: 'Quero! Pode ser amanhã à tarde?',
    pedido: { texto: 'Vou chamar o Marcos, corretor desse imóvel, para combinar o horário com você.', autor: 'ia' },
    humano: 'Oi, Rafael! Aqui é o Marcos. Amanhã às 15h te espero no prédio. Combinado?',
  },
  modelo: {
    nome: 'novidades_centro',
    corpo: 'Olá, {{1}}! Entrou um apartamento de 2 quartos no Centro, do jeito que você procurava. Quer saber mais?',
    rodape: 'Casa Nova Imóveis', botoes: ['Quero saber', 'Agora não'], campanha: 'Novidades · Centro', trecho: 'Entrou um apartamento de 2 quartos', segmentoTag: 0,
  },
  conversas: [
    { nome: 'Camila Rocha', previa: 'Pode me mandar mais fotos da sala?', min: 12, naoLidas: 0, ia: false },
    { nome: 'Henrique Dias', previa: 'Qual o valor do IPTU?', min: 27, naoLidas: 2, ia: true },
    { nome: 'Larissa Gomes', previa: 'Vocês aceitam seguro-fiança?', min: 43, naoLidas: 0, ia: false },
    { nome: 'Tiago Nunes', previa: 'Visita confirmada, obrigado!', min: 96, naoLidas: 0, ia: false },
    { nome: 'Sônia Prado', previa: 'Vou conversar com meu marido e retorno.', min: 150, naoLidas: 0, ia: true },
  ],
  negocios: [
    { title: 'Casa 3 quartos · Glória', person: 'Camila Rocha', etapa: 0, cents: 380_000, dias: 1 },
    { title: 'Studio · América', person: 'Henrique Dias', etapa: 0, cents: 150_000, dias: 3 },
    { title: 'Apto 3 quartos · Atiradores', person: 'Larissa Gomes', etapa: 1, cents: 320_000, dias: 2 },
    { title: 'Apto 1 quarto · Bucarein', person: 'Felipe Araújo', etapa: 1, cents: 140_000, dias: 1 },
    { title: 'Casa com quintal · Floresta', person: 'Tiago Nunes', etapa: 2, cents: 290_000, dias: 3 },
    { title: 'Sala comercial · Centro', person: 'Sônia Prado', etapa: 3, cents: 210_000, dias: 2 },
    { title: 'Apto 2 quartos · Anita', person: 'Juliana Costa', etapa: 1, cents: 240_000, dias: 4 },
    { title: 'Cobertura · Saguaçu', person: 'Roberto Silva', etapa: 2, cents: 520_000, dias: 1 },
    { title: 'Casa geminada · Iririú', person: 'Aline Moreira', etapa: 3, cents: 190_000, dias: 5 },
    { title: 'Kitnet · Centro', person: 'Gustavo Lima', etapa: 0, cents: 110_000, dias: 1 },
    { title: 'Apto 2 quartos · Glória', person: 'Patrícia Melo', etapa: 1, cents: 250_000, dias: 2 },
    { title: 'Sobrado · Costa e Silva', person: 'Vinícius Ramos', etapa: 2, cents: 340_000, dias: 2 },
    { title: 'Apto 3 quartos · Centro', person: 'Débora Castro', etapa: 3, cents: 360_000, dias: 1 },
  ],
  produtos: [
    { id: 'pr-apto-centro', name: 'Apto 2 quartos · Centro', sku: 'AP-204', category: 'Aluguel', description: 'Edifício Aurora, 68 m², uma vaga, aceita pet.',
      precos: [{ id: 'pv-apto-aluguel', label: 'Aluguel mensal', cents: 230_000 }, { id: 'pv-apto-cond', label: 'Condomínio', cents: 48_000 }] },
    { id: 'pr-casa-gloria', name: 'Casa 3 quartos · Glória', sku: 'CA-118', category: 'Aluguel', description: 'Casa térrea com quintal e duas vagas.',
      precos: [{ id: 'pv-casa-aluguel', label: 'Aluguel mensal', cents: 380_000 }] },
    { id: 'pr-sala-centro', name: 'Sala comercial · Centro', sku: 'SL-031', category: 'Comercial', description: 'Sala de 42 m² com banheiro privativo.',
      precos: [{ id: 'pv-sala-aluguel', label: 'Aluguel mensal', cents: 210_000 }] },
  ],
  catalogoDoAgente: ['pr-apto-centro', 'pr-casa-gloria'],
  conhecimento: [
    { id: 'kd-imoveis', nome: 'Imóveis disponíveis · setembro.pdf', tipo: 'file', trechos: 7, dias: 6,
      previa: 'Apto 2 quartos no Centro: R$ 2.300 de aluguel e R$ 480 de condomínio, aceita pet. Casa 3 quartos na Glória: R$ 3.800…',
      conteudo: 'Apto 2 quartos no Centro (Ed. Aurora) — aluguel R$ 2.300, condomínio R$ 480, aceita pet.\nCasa 3 quartos na Glória — aluguel R$ 3.800, duas vagas.\nSala comercial no Centro — aluguel R$ 2.100.' },
    { id: 'kd-regras', nome: 'Regras dos prédios', tipo: 'text', trechos: 3, dias: 20,
      previa: 'Ed. Aurora (Centro): aceita pet de pequeno e médio porte; mudança de segunda a sábado, das 8h às 18h…',
      conteudo: 'Ed. Aurora (Centro): aceita pet de pequeno e médio porte. Mudança de segunda a sábado, das 8h às 18h. Ed. Jardim (Glória): não aceita pet.' },
    { id: 'kd-documentos', nome: 'Documentos para locação', tipo: 'text', trechos: 4, dias: 40,
      previa: 'RG, CPF, comprovante de renda de três vezes o aluguel e fiador ou seguro-fiança…',
      conteudo: 'Para alugar: RG, CPF, comprovante de renda de três vezes o valor do aluguel e fiador com imóvel na cidade ou seguro-fiança.' },
    { id: 'kd-visitas', nome: 'Como marcamos visitas.pdf', tipo: 'file', trechos: 5, dias: 64,
      previa: 'Visitas de segunda a sábado, das 9h às 18h, sempre com o corretor responsável pelo imóvel…',
      conteudo: 'Visitas de segunda a sábado, das 9h às 18h, sempre com o corretor responsável pelo imóvel. O agente registra o interesse e chama o corretor para combinar o horário.' },
  ],
  regras: [
    { id: 'hr-visita', nome: 'Visita ou proposta', palavras: ['visita', 'visitar', 'proposta', 'conhecer o imóvel'], departamento: 'Corretores',
      resposta: 'Ótimo! Já chamei o corretor do imóvel para combinar com você por aqui mesmo.' },
    { id: 'hr-valor', nome: 'Negociação de valor', palavras: ['desconto', 'baixar', 'negociar', 'contraproposta'], departamento: 'Paula Rezende' },
    { id: 'hr-humano', nome: 'Pedido de uma pessoa', palavras: ['falar com alguém', 'atendente', 'pessoa', 'humano'], departamento: 'Corretores' },
  ],
  atribuida: { contato: 'Camila Rocha', descricao: 'Camila Rocha · Casa 3 quartos · Glória' },
  sinais: { conhecimento: 'Regras dos prédios', catalogo: 'Apto 2 quartos · Centro' },
}

// ─── Loja: a Bia, o Runner branco no 37 e a Lu, da loja ───────────────────────

const LOJA: PerfilDemo = {
  empresa: 'Loja Aurora',
  cidade: 'Joinville',
  uf: 'SC',
  pessoa: { nome: 'Beatriz Lima', primeiro: 'Bia', telefone: '+55 47 90000-0203', waId: '5547900000203', email: 'bia.lima@email.example' },
  agente: {
    nome: 'Agente Vendas', icone: '🛍️', setor: 'Vendas',
    objetivo: 'Responde sobre estoque, preço, pagamento e retirada dos produtos cadastrados. Chama uma vendedora para separar e concluir a venda.',
    prompt: [
      'Você é o Agente Vendas da Loja Aurora, loja de calçados e acessórios em Joinville.',
      '',
      'Seu papel: atender clientes pelo WhatsApp, informar estoque, preço, formas de pagamento e retirada, e registrar cada interesse.',
      '',
      'Como responder:',
      '- Use só valores e condições do catálogo liberado a você e da base de conhecimento.',
      '- Estoque: só o que está cadastrado; nunca prometa um tamanho que não aparece.',
      '- Quem separa o produto e fecha a venda é a equipe da loja.',
      '- Seja direto e cordial; trate o cliente pelo primeiro nome.',
      '',
      'Quando chamar uma pessoa:',
      '- O cliente quer separar, reservar ou pagar.',
      '- Troca, defeito ou pedido de desconto.',
    ].join('\n'),
    outros: [
      { id: 'ag-pos-venda', nome: 'Agente Pós-venda', icone: '📦', setor: 'Entregas', objetivo: 'Avisa quando o pedido sai para entrega e responde sobre o rastreio.', status: 'active', conversas: 2_846 },
      { id: 'ag-trocas', nome: 'Agente Trocas', icone: '🔁', setor: 'Trocas', objetivo: 'Explica a política de trocas e abre o pedido de troca.', status: 'paused', conversas: 515 },
    ],
  },
  atendente: { primeiro: 'Luana', sobrenome: 'Prates', email: 'lu@lojaaurora.example' },
  profissional: 'Sérgio Matos',
  etiquetas: [{ nome: 'Calçados', cor: '#2DD4BF' }, { nome: 'Retirada', cor: '#60A5FA' }, { nome: 'reserva', cor: '#FBBF24' }],
  situacoes: [
    { key: 'novo', label: 'Novo', color: '#64748B' },
    { key: 'comprando', label: 'Comprando', color: '#38BDF8' },
    { key: 'cliente', label: 'Cliente', color: '#22C55E' },
  ],
  funil: {
    nome: 'Vendas',
    etapas: [
      { key: 'contato', label: 'Contato', color: '#64748B' },
      { key: 'interesse', label: 'Interesse', color: '#38BDF8' },
      { key: 'reservado', label: 'Reservado', color: '#A78BFA' },
      { key: 'retirada', label: 'Aguardando retirada', color: '#FBBF24' },
      { key: 'vendido', label: 'Vendido', color: '#22C55E' },
    ],
  },
  negocio: { titulo: 'Tênis Runner branco · 37', cents: 34_900, descricao: 'Retirada na loja · Pix', item: { produtoId: 'pr-runner', nome: 'Tênis Runner', variacao: 'Branco · 37' } },
  mensagens: {
    ontem: [
      ['inbound', 'Oi! Vocês têm o tênis Runner?', 18, 5],
      ['outbound', 'Oi, Bia! Temos, sim, em branco, preto e cinza. Qual número você usa?', 18, 5],
      ['inbound', 'Uso 37. Vou ver se passo aí essa semana.', 18, 12],
      ['outbound', 'Combinado! Qualquer coisa é só chamar. 😊', 18, 13],
    ],
    demanda: 'Oi! Tem o tênis Runner branco no 37? Se tiver, consigo retirar hoje?',
    resposta: 'Oi, Bia! Tem, sim: Runner branco, 37, por R$ 349. Dá para retirar hoje até as 20h. Quer que separe no seu nome?',
    confirma: 'Quero! Aceita Pix?',
    pedido: { texto: 'Aceita, sim. Vou chamar a Lu, da loja, para separar o seu.', autor: 'ia' },
    humano: 'Separado no seu nome, Bia! Aqui é a Lu. Te espero mais tarde.',
  },
  modelo: {
    nome: 'reposicao_runner',
    corpo: 'Olá, {{1}}! O Runner voltou ao estoque em todas as cores, com retirada no mesmo dia. Quer que eu veja o seu número?',
    rodape: 'Loja Aurora', botoes: ['Quero ver', 'Agora não'], campanha: 'Reposição · Runner', trecho: 'O Runner voltou ao estoque', segmentoTag: 0,
  },
  conversas: [
    { nome: 'Marcela Dias', previa: 'Ainda tem a bolsa preta?', min: 12, naoLidas: 0, ia: false },
    { nome: 'Caio Fernandes', previa: 'Qual o prazo de entrega pra Itajaí?', min: 27, naoLidas: 2, ia: true },
    { nome: 'Renata Alves', previa: 'Posso trocar o tamanho?', min: 43, naoLidas: 0, ia: false },
    { nome: 'Lucas Prado', previa: 'Obrigado, chegou certinho!', min: 96, naoLidas: 0, ia: false },
    { nome: 'Elisa Moura', previa: 'Vou buscar amanhã.', min: 150, naoLidas: 0, ia: true },
  ],
  negocios: [
    { title: 'Bolsa couro · preta', person: 'Marcela Dias', etapa: 0, cents: 45_900, dias: 1 },
    { title: 'Jaqueta jeans · M', person: 'Caio Fernandes', etapa: 0, cents: 28_900, dias: 3 },
    { title: 'Tênis Classic · 40', person: 'Renata Alves', etapa: 1, cents: 29_900, dias: 2 },
    { title: 'Kit 3 camisetas', person: 'Lucas Prado', etapa: 1, cents: 15_900, dias: 1 },
    { title: 'Mochila Trilha', person: 'Elisa Moura', etapa: 2, cents: 32_900, dias: 3 },
    { title: 'Sandália Verão · 36', person: 'Paula Reis', etapa: 3, cents: 18_900, dias: 2 },
    { title: 'Relógio Slim', person: 'André Moura', etapa: 1, cents: 54_900, dias: 4 },
    { title: 'Vestido linho · P', person: 'Clara Nogueira', etapa: 2, cents: 39_900, dias: 1 },
    { title: 'Tênis Runner preto · 39', person: 'Fábio Rocha', etapa: 3, cents: 34_900, dias: 5 },
    { title: 'Óculos Sol Aurora', person: 'Talita Freire', etapa: 0, cents: 24_900, dias: 1 },
    { title: 'Boné Aurora', person: 'Igor Santos', etapa: 1, cents: 8_900, dias: 2 },
    { title: 'Calça sarja · 42', person: 'Mateus Pinto', etapa: 2, cents: 21_900, dias: 2 },
    { title: 'Bolsa transversal', person: 'Sofia Andrade', etapa: 3, cents: 27_900, dias: 1 },
  ],
  produtos: [
    { id: 'pr-runner', name: 'Tênis Runner', sku: 'RUN', category: 'Calçados', description: 'Do 34 ao 44, em branco, preto e cinza.',
      precos: [{ id: 'pv-runner-branco', label: 'Branco', cents: 34_900 }, { id: 'pv-runner-preto', label: 'Preto', cents: 34_900 }] },
    { id: 'pr-classic', name: 'Tênis Classic', sku: 'CLA', category: 'Calçados', description: 'Couro, do 35 ao 44.',
      precos: [{ id: 'pv-classic', label: 'Único', cents: 29_900 }] },
    { id: 'pr-bolsa', name: 'Bolsa couro', sku: 'BOL', category: 'Acessórios', description: 'Couro legítimo, preta ou caramelo.',
      precos: [{ id: 'pv-bolsa', label: 'Único', cents: 45_900 }] },
  ],
  catalogoDoAgente: ['pr-runner', 'pr-classic'],
  conhecimento: [
    { id: 'kd-precos', nome: 'Tabela de preços · setembro.pdf', tipo: 'file', trechos: 6, dias: 8,
      previa: 'Tênis Runner: R$ 349, em branco, preto e cinza, do 34 ao 44. Tênis Classic: R$ 299…',
      conteudo: 'Tênis Runner — R$ 349, em branco, preto e cinza, do 34 ao 44.\nTênis Classic — R$ 299, do 35 ao 44.\nBolsa couro — R$ 459.' },
    { id: 'kd-retirada', nome: 'Retirada e entrega', tipo: 'text', trechos: 3, dias: 20,
      previa: 'Retirada na loja no mesmo dia, até as 20h. Entrega em Joinville em até dois dias úteis…',
      conteudo: 'Retirada na loja no mesmo dia, até as 20h, com o nome de quem reservou. Entrega em Joinville em até dois dias úteis.' },
    { id: 'kd-pagamento', nome: 'Formas de pagamento', tipo: 'text', trechos: 2, dias: 40,
      previa: 'Pix, cartão em até 3 vezes sem juros e dinheiro na retirada…',
      conteudo: 'Aceitamos Pix, cartão de crédito em até 3 vezes sem juros e dinheiro na retirada.' },
    { id: 'kd-trocas', nome: 'Trocas e devoluções.pdf', tipo: 'file', trechos: 4, dias: 64,
      previa: 'Troca em até 30 dias, com etiqueta e nota fiscal. Defeito: troca imediata…',
      conteudo: 'Troca em até 30 dias, com etiqueta e nota fiscal. Produto com defeito: troca imediata. O agente não oferece desconto.' },
  ],
  regras: [
    { id: 'hr-separar', nome: 'Separar ou reservar', palavras: ['separar', 'reservar', 'guardar', 'pagar'], departamento: 'Loja',
      resposta: 'Claro! Já chamei a equipe da loja para separar o seu.' },
    { id: 'hr-troca', nome: 'Troca ou defeito', palavras: ['troca', 'defeito', 'devolver'], departamento: 'Sérgio Matos' },
    { id: 'hr-humano', nome: 'Pedido de uma pessoa', palavras: ['falar com alguém', 'atendente', 'pessoa', 'humano'], departamento: 'Loja' },
  ],
  atribuida: { contato: 'Marcela Dias', descricao: 'Marcela Dias · Bolsa couro · preta' },
  sinais: { conhecimento: 'Retirada e entrega', catalogo: 'Tênis Runner' },
}

// ─── Contabilidade: o Paulo, o prazo do imposto e o contador Renato ──────────

const CONTABILIDADE: PerfilDemo = {
  empresa: 'Prisma Contábil',
  cidade: 'Joinville',
  uf: 'SC',
  pessoa: { nome: 'Paulo Mendes', primeiro: 'Paulo', telefone: '+55 47 90000-0204', waId: '5547900000204', email: 'paulo.mendes@email.example' },
  agente: {
    nome: 'Agente Atendimento', icone: '📊', setor: 'Atendimento',
    objetivo: 'Responde prazos e listas de documentos com o conteúdo do escritório e etiqueta cada conversa por assunto. Chama o contador quando o caso pede análise.',
    prompt: [
      'Você é o Agente Atendimento da Prisma Contábil, escritório de contabilidade em Joinville.',
      '',
      'Seu papel: responder pelo WhatsApp as dúvidas de rotina dos clientes — prazos, documentos e honorários — e organizar cada pedido por assunto.',
      '',
      'Como responder:',
      '- Use só valores e condições do catálogo liberado a você e da base de conhecimento.',
      '- Prazos: só os do calendário do escritório; nunca invente uma data.',
      '- Nunca oriente sobre um caso específico: nota fiscal, malha fina e planejamento são do contador.',
      '- Seja direto e cordial; trate o cliente pelo primeiro nome.',
      '',
      'Quando chamar uma pessoa:',
      '- Nota emitida com erro, multa, malha fina ou cobrança da Receita.',
      '- O cliente pede para falar com o contador.',
    ].join('\n'),
    outros: [
      { id: 'ag-folha', nome: 'Agente Folha', icone: '🧾', setor: 'Departamento pessoal', objetivo: 'Pede os dados da folha do mês e avisa quando os holerites estão prontos.', status: 'active', conversas: 1_932 },
      { id: 'ag-guias', nome: 'Agente Guias', icone: '📅', setor: 'Fiscal', objetivo: 'Envia as guias de imposto e lembra os vencimentos.', status: 'paused', conversas: 2_210 },
    ],
  },
  atendente: { primeiro: 'Renato', sobrenome: 'Cardoso', email: 'renato@prismacontabil.example' },
  profissional: 'Cláudia Neves',
  etiquetas: [{ nome: 'IRPF', cor: '#2DD4BF' }, { nome: 'Pessoa física', cor: '#60A5FA' }, { nome: 'nota fiscal', cor: '#FBBF24' }],
  situacoes: [
    { key: 'em-dia', label: 'Em dia', color: '#64748B' },
    { key: 'documentos', label: 'Aguardando documentos', color: '#38BDF8' },
    { key: 'entregue', label: 'Declaração entregue', color: '#22C55E' },
  ],
  funil: {
    nome: 'Declarações',
    etapas: [
      { key: 'contato', label: 'Contato', color: '#64748B' },
      { key: 'orientacao', label: 'Orientação', color: '#38BDF8' },
      { key: 'documentos', label: 'Aguardando documentos', color: '#A78BFA' },
      { key: 'analise', label: 'Em análise', color: '#FBBF24' },
      { key: 'entregue', label: 'Entregue', color: '#22C55E' },
    ],
  },
  negocio: { titulo: 'Declaração IR · Paulo', cents: 65_000, descricao: 'Pessoa física · prazo do escritório 15/05', item: { produtoId: 'pr-irpf', nome: 'Declaração de imposto de renda', variacao: 'Pessoa física' } },
  mensagens: {
    ontem: [
      ['inbound', 'Boa tarde! Esse ano vocês fazem minha declaração de novo?', 16, 20],
      ['outbound', 'Boa tarde, Paulo! Fazemos, sim. O Renato já abriu o seu atendimento.', 16, 21],
      ['inbound', 'Ótimo, obrigado!', 16, 25],
      ['outbound', 'Por nada! Qualquer coisa é só chamar. 😊', 16, 25],
    ],
    demanda: 'Bom dia! Até quando preciso mandar os documentos do imposto de renda? E quais documentos vocês precisam?',
    resposta: 'Bom dia, Paulo! O prazo do escritório para os documentos é 15/05. Precisamos dos informes de rendimentos, recibos médicos e do extrato da previdência. Mando a lista completa?',
    confirma: 'Manda! E a nota que emiti errado ontem, como resolvo?',
    pedido: { texto: 'Lista enviada. A nota precisa da análise do contador: já passei sua conversa para o Renato.', autor: 'ia' },
    humano: 'Oi, Paulo! Aqui é o Renato. Me manda o número da nota que eu vejo o cancelamento agora.',
  },
  modelo: {
    nome: 'documentos_irpf',
    corpo: 'Olá, {{1}}! Começou a temporada do imposto de renda. Quer receber a lista de documentos para a sua declaração?',
    rodape: 'Prisma Contábil', botoes: ['Quero a lista', 'Agora não'], campanha: 'Imposto de renda · documentos', trecho: 'Começou a temporada do imposto', segmentoTag: 0,
  },
  conversas: [
    { nome: 'Juliana Prates', previa: 'Recebi a guia do DAS, obrigada!', min: 12, naoLidas: 0, ia: false },
    { nome: 'Marcos Vieira', previa: 'Preciso do pró-labore de agosto.', min: 27, naoLidas: 2, ia: true },
    { nome: 'Cristina Lopes', previa: 'Qual o prazo da declaração do MEI?', min: 43, naoLidas: 0, ia: false },
    { nome: 'Eduardo Faria', previa: 'Documentos enviados por e-mail.', min: 96, naoLidas: 0, ia: false },
    { nome: 'Helena Barros', previa: 'Vou mandar os recibos amanhã.', min: 150, naoLidas: 0, ia: true },
  ],
  negocios: [
    { title: 'Abertura de MEI', person: 'Cristina Lopes', etapa: 0, cents: 30_000, dias: 1 },
    { title: 'Declaração IR · Helena', person: 'Helena Barros', etapa: 0, cents: 65_000, dias: 3 },
    { title: 'Folha de pagamento · setembro', person: 'Marcos Vieira', etapa: 1, cents: 120_000, dias: 2 },
    { title: 'Alteração contratual', person: 'Juliana Prates', etapa: 1, cents: 80_000, dias: 1 },
    { title: 'Declaração IR · Eduardo', person: 'Eduardo Faria', etapa: 2, cents: 85_000, dias: 3 },
    { title: 'Ganho de capital · imóvel', person: 'Sílvia Rocha', etapa: 3, cents: 95_000, dias: 2 },
    { title: 'Regularização de CPF', person: 'Otávio Reis', etapa: 1, cents: 25_000, dias: 4 },
    { title: 'Planejamento tributário', person: 'Márcia Duarte', etapa: 2, cents: 250_000, dias: 1 },
    { title: 'Baixa de empresa', person: 'Rogério Pires', etapa: 3, cents: 150_000, dias: 5 },
    { title: 'Carnê-leão', person: 'Bianca Teles', etapa: 0, cents: 40_000, dias: 1 },
    { title: 'Declaração IR · Leandro', person: 'Leandro Cruz', etapa: 1, cents: 65_000, dias: 2 },
    { title: 'Abertura de LTDA', person: 'Fernando Lima', etapa: 2, cents: 180_000, dias: 2 },
    { title: 'Declaração IR · Tânia', person: 'Tânia Souza', etapa: 3, cents: 85_000, dias: 1 },
  ],
  produtos: [
    { id: 'pr-irpf', name: 'Declaração de imposto de renda', sku: 'IRPF', category: 'Pessoa física', description: 'Declaração completa, com revisão do contador.',
      precos: [{ id: 'pv-irpf-pf', label: 'Pessoa física', cents: 65_000 }, { id: 'pv-irpf-dep', label: 'Com dependentes', cents: 85_000 }] },
    { id: 'pr-mei', name: 'Abertura de MEI', sku: 'MEI', category: 'Empresas', description: 'Cadastro, alvará e primeira guia.',
      precos: [{ id: 'pv-mei', label: 'Único', cents: 30_000 }] },
    { id: 'pr-folha', name: 'Folha de pagamento', sku: 'FOL', category: 'Empresas', description: 'Mensal, até dez funcionários.',
      precos: [{ id: 'pv-folha', label: 'Mensal', cents: 120_000 }] },
  ],
  catalogoDoAgente: ['pr-irpf', 'pr-mei'],
  conhecimento: [
    { id: 'kd-prazos', nome: 'Prazos do escritório 2026.pdf', tipo: 'file', trechos: 6, dias: 30,
      previa: 'Documentos do imposto de renda até 15/05. Folha de pagamento até o dia 25. Notas do mês até o dia 5…',
      conteudo: 'Documentos do imposto de renda: até 15/05.\nDados da folha de pagamento: até o dia 25 de cada mês.\nNotas fiscais do mês: até o dia 5 do mês seguinte.' },
    { id: 'kd-documentos', nome: 'Documentos do imposto de renda', tipo: 'text', trechos: 3, dias: 20,
      previa: 'Informes de rendimentos, recibos médicos e odontológicos, extrato da previdência privada…',
      conteudo: 'Informes de rendimentos de bancos e empregadores, recibos médicos e odontológicos, extrato da previdência privada e comprovantes de despesas com educação.' },
    { id: 'kd-honorarios', nome: 'Honorários', tipo: 'text', trechos: 2, dias: 40,
      previa: 'Declaração de pessoa física: R$ 650. Com dependentes: R$ 850. Abertura de MEI: R$ 300…',
      conteudo: 'Declaração de pessoa física: R$ 650. Com dependentes: R$ 850. Abertura de MEI: R$ 300.' },
    { id: 'kd-contador', nome: 'O que vai para o contador.pdf', tipo: 'file', trechos: 4, dias: 64,
      previa: 'Notas emitidas com erro, malha fina e planejamento tributário vão sempre para o contador…',
      conteudo: 'Notas emitidas com erro, malha fina, multas e planejamento tributário vão sempre para o contador. O agente não orienta sobre casos específicos.' },
  ],
  regras: [
    { id: 'hr-nota', nome: 'Nota fiscal ou malha fina', palavras: ['nota', 'malha fina', 'multa', 'receita'], departamento: 'Contadores',
      resposta: 'Esse caso precisa da análise do contador: já passei a sua conversa para ele.' },
    { id: 'hr-planejamento', nome: 'Planejamento', palavras: ['planejamento', 'abrir empresa', 'mudar de regime'], departamento: 'Cláudia Neves' },
    { id: 'hr-humano', nome: 'Pedido de uma pessoa', palavras: ['falar com alguém', 'contador', 'pessoa', 'humano'], departamento: 'Atendimento' },
  ],
  atribuida: { contato: 'Marcos Vieira', descricao: 'Marcos Vieira · Folha de pagamento · setembro' },
  sinais: { conhecimento: 'Documentos do imposto de renda', catalogo: 'Declaração de imposto de renda' },
}

// ─── Jurídico: a Fernanda, a rescisão e a Dra. Lima ─────────────────────────

const JURIDICO: PerfilDemo = {
  empresa: 'Moura & Lima Advocacia',
  cidade: 'Joinville',
  uf: 'SC',
  pessoa: { nome: 'Fernanda Costa', primeiro: 'Fernanda', telefone: '+55 47 90000-0205', waId: '5547900000205', email: 'fernanda.costa@email.example' },
  agente: {
    nome: 'Agente Triagem', icone: '⚖️', setor: 'Triagem',
    objetivo: 'Faz as perguntas de triagem definidas pelo escritório e pede os documentos de cada tipo de caso. Passa a triagem pronta para o advogado; não orienta sobre o caso.',
    prompt: [
      'Você é o Agente Triagem da Moura & Lima Advocacia, escritório em Joinville.',
      '',
      'Seu papel: receber pelo WhatsApp quem procura o escritório, fazer as perguntas de triagem e pedir os documentos de cada tipo de caso.',
      '',
      'Como responder:',
      '- Use só valores e condições do catálogo liberado a você e da base de conhecimento.',
      '- Faça só as perguntas de triagem cadastradas, uma ou duas por vez.',
      '- Nunca dê orientação jurídica nem diga se a pessoa tem direito: isso é do advogado.',
      '- Seja direto e acolhedor; trate a pessoa pelo primeiro nome.',
      '',
      'Quando chamar uma pessoa:',
      '- A triagem terminou: passe para o advogado da área.',
      '- Prazo correndo, audiência marcada ou pedido para falar com alguém.',
    ].join('\n'),
    outros: [
      { id: 'ag-processos', nome: 'Agente Processos', icone: '📁', setor: 'Clientes', objetivo: 'Avisa os clientes das movimentações do processo, em linguagem simples.', status: 'active', conversas: 1_377 },
      { id: 'ag-cobranca', nome: 'Agente Cobrança', icone: '💳', setor: 'Financeiro', objetivo: 'Envia boletos de honorários e lembra vencimentos.', status: 'paused', conversas: 298 },
    ],
  },
  atendente: { primeiro: 'Carolina', sobrenome: 'Lima', email: 'carolina@mouraelima.example' },
  profissional: 'Dr. Ricardo Moura',
  etiquetas: [{ nome: 'Trabalhista', cor: '#2DD4BF' }, { nome: 'Primeiro contato', cor: '#60A5FA' }, { nome: 'rescisão', cor: '#FBBF24' }],
  situacoes: [
    { key: 'novo', label: 'Novo', color: '#64748B' },
    { key: 'em-triagem', label: 'Em triagem', color: '#38BDF8' },
    { key: 'cliente', label: 'Cliente', color: '#22C55E' },
  ],
  funil: {
    nome: 'Casos',
    etapas: [
      { key: 'contato', label: 'Contato', color: '#64748B' },
      { key: 'triagem', label: 'Triagem', color: '#38BDF8' },
      { key: 'documentos', label: 'Documentos', color: '#A78BFA' },
      { key: 'reuniao', label: 'Reunião', color: '#FBBF24' },
      { key: 'contratado', label: 'Contratado', color: '#22C55E' },
    ],
  },
  negocio: { titulo: 'Rescisão · verbas trabalhistas', cents: 35_000, descricao: 'Trabalhista · consulta inicial', item: { produtoId: 'pr-consulta-inicial', nome: 'Consulta inicial', variacao: 'Trabalhista' } },
  mensagens: {
    ontem: [
      ['inbound', 'Boa noite! Preciso de ajuda com uma demissão. Amanhã explico melhor.', 20, 14],
      ['outbound', 'Boa noite, Fernanda! Pode contar com a gente. Amanhã seguimos por aqui.', 20, 14],
      ['inbound', 'Obrigada!', 20, 16],
      ['outbound', 'Até amanhã! 😊', 20, 16],
    ],
    demanda: 'Boa tarde! Fui demitida e não recebi minhas verbas. Vocês atendem esse tipo de caso? Preciso levar algum documento?',
    resposta: 'Boa tarde, Fernanda! Atendemos causas trabalhistas, sim. Vou te fazer duas perguntas rápidas: quando foi a demissão? Você tinha carteira assinada?',
    confirma: 'Semana passada. Tinha, sim, há 4 anos.',
    pedido: { texto: 'Obrigada! Separe a carteira de trabalho, o termo de rescisão e os últimos holerites. Já passei tudo para a Dra. Lima.', autor: 'ia' },
    humano: 'Oi, Fernanda! Aqui é a Dra. Lima. Vi seu caso. Podemos conversar amanhã às 10h?',
  },
  modelo: {
    nome: 'retomar_atendimento',
    corpo: 'Olá, {{1}}! Recebemos sua mensagem. Quando puder, conte o seu caso por aqui que já damos sequência.',
    rodape: 'Moura & Lima Advocacia', botoes: ['Contar agora', 'Mais tarde'], campanha: 'Retomada · contatos da semana', trecho: 'Recebemos sua mensagem', segmentoTag: 1,
  },
  conversas: [
    { nome: 'Rogério Alves', previa: 'Recebi o contrato, vou assinar.', min: 12, naoLidas: 0, ia: false },
    { nome: 'Tatiane Melo', previa: 'Tem novidade do meu processo?', min: 27, naoLidas: 2, ia: true },
    { nome: 'Anderson Reis', previa: 'Vocês fazem inventário?', min: 43, naoLidas: 0, ia: false },
    { nome: 'Lívia Campos', previa: 'Documentos enviados.', min: 96, naoLidas: 0, ia: false },
    { nome: 'Sílvio Teixeira', previa: 'Ok, aguardo a audiência.', min: 150, naoLidas: 0, ia: true },
  ],
  negocios: [
    { title: 'Inventário · imóvel', person: 'Anderson Reis', etapa: 0, cents: 35_000, dias: 1 },
    { title: 'Divórcio consensual', person: 'Lívia Campos', etapa: 0, cents: 35_000, dias: 3 },
    { title: 'Horas extras · rescisão', person: 'Rogério Alves', etapa: 1, cents: 35_000, dias: 2 },
    { title: 'Revisão de contrato', person: 'Tatiane Melo', etapa: 1, cents: 80_000, dias: 1 },
    { title: 'Pensão alimentícia', person: 'Sílvio Teixeira', etapa: 2, cents: 35_000, dias: 3 },
    { title: 'Acidente de trabalho', person: 'Joana Pires', etapa: 3, cents: 35_000, dias: 2 },
    { title: 'Usucapião', person: 'Mário Gomes', etapa: 1, cents: 35_000, dias: 4 },
    { title: 'Dano moral · consumidor', person: 'Priscila Neves', etapa: 2, cents: 35_000, dias: 1 },
    { title: 'Trabalhista · insalubridade', person: 'Cláudio Ramos', etapa: 3, cents: 35_000, dias: 5 },
    { title: 'Contrato de locação', person: 'Rita Moraes', etapa: 0, cents: 80_000, dias: 1 },
    { title: 'Guarda compartilhada', person: 'Daniel Souza', etapa: 1, cents: 35_000, dias: 2 },
    { title: 'Cobrança · empresa', person: 'Nádia Lopes', etapa: 2, cents: 150_000, dias: 2 },
    { title: 'Rescisão indireta', person: 'Wagner Lima', etapa: 3, cents: 35_000, dias: 1 },
  ],
  produtos: [
    { id: 'pr-consulta-inicial', name: 'Consulta inicial', sku: 'CONS', category: 'Atendimento', description: 'Primeira reunião com o advogado da área, com a triagem pronta.',
      precos: [{ id: 'pv-cons-trab', label: 'Trabalhista', cents: 35_000 }, { id: 'pv-cons-fam', label: 'Família', cents: 35_000 }] },
    { id: 'pr-revisao', name: 'Revisão de contrato', sku: 'REV', category: 'Contratos', description: 'Análise e parecer em até cinco dias úteis.',
      precos: [{ id: 'pv-revisao', label: 'Até 20 páginas', cents: 80_000 }] },
    { id: 'pr-acompanhamento', name: 'Acompanhamento de processo', sku: 'ACP', category: 'Processos', description: 'Honorário mensal durante o processo.',
      precos: [{ id: 'pv-acp', label: 'Mensal', cents: 50_000 }] },
  ],
  catalogoDoAgente: ['pr-consulta-inicial', 'pr-revisao'],
  conhecimento: [
    { id: 'kd-areas', nome: 'Áreas de atuação', tipo: 'text', trechos: 2, dias: 60,
      previa: 'Trabalhista, família e sucessões, contratos e direito do consumidor. Não atendemos área criminal…',
      conteudo: 'Atuamos em direito trabalhista, família e sucessões, contratos e direito do consumidor. Não atendemos a área criminal.' },
    { id: 'kd-triagem', nome: 'Perguntas de triagem · trabalhista', tipo: 'text', trechos: 3, dias: 20,
      previa: 'Data da demissão, tipo de contrato, tempo de empresa e se recebeu as verbas rescisórias…',
      conteudo: 'Perguntar: data da demissão, se tinha carteira assinada, tempo de empresa e se recebeu as verbas rescisórias. No máximo duas perguntas por mensagem.' },
    { id: 'kd-documentos', nome: 'Documentos por tipo de caso.pdf', tipo: 'file', trechos: 5, dias: 40,
      previa: 'Trabalhista: carteira de trabalho, termo de rescisão e os três últimos holerites…',
      conteudo: 'Trabalhista: carteira de trabalho, termo de rescisão e os três últimos holerites.\nFamília: certidão de casamento ou nascimento e comprovante de renda.' },
    { id: 'kd-limites', nome: 'Limites do atendimento.pdf', tipo: 'file', trechos: 3, dias: 64,
      previa: 'O agente não dá orientação jurídica: qualquer dúvida sobre o caso vai para um advogado…',
      conteudo: 'O agente não dá orientação jurídica nem avalia se a pessoa tem direito: qualquer dúvida sobre o caso vai para um advogado da área.' },
  ],
  regras: [
    { id: 'hr-orientacao', nome: 'Orientação sobre o caso', palavras: ['tenho direito', 'posso processar', 'quanto vou receber'], departamento: 'Advogados',
      resposta: 'Essa resposta é do advogado: já passei a sua triagem para a equipe.' },
    { id: 'hr-prazo', nome: 'Prazo ou audiência', palavras: ['prazo', 'audiência', 'intimação'], departamento: 'Dra. Lima' },
    { id: 'hr-humano', nome: 'Pedido de uma pessoa', palavras: ['falar com alguém', 'advogado', 'pessoa', 'humano'], departamento: 'Advogados' },
  ],
  atribuida: { contato: 'Tatiane Melo', descricao: 'Tatiane Melo · Revisão de contrato' },
  sinais: { conhecimento: 'Perguntas de triagem · trabalhista', catalogo: 'Consulta inicial' },
}

export const PERFIS: Record<SetorDemo, PerfilDemo> = {
  clinica: CLINICA,
  imobiliaria: IMOBILIARIA,
  loja: LOJA,
  contabilidade: CONTABILIDADE,
  juridico: JURIDICO,
}

/** A área do app de demonstração: `demo.html?setor=` — sem ele, a clínica. */
export function setorDaDemo(): SetorDemo {
  if (typeof location === 'undefined') return 'clinica'
  const s = new URLSearchParams(location.search).get('setor') ?? ''
  return s in PERFIS ? (s as SetorDemo) : 'clinica'
}

export const PERFIL: PerfilDemo = PERFIS[setorDaDemo()]
