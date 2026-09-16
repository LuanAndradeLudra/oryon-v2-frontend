// UI estática de exemplo (SCRUM-1110, Leva 12 do épico SCRUM-1097) — tela
// NOVA, zero UI legada (README seção 3.10). Não existe hoje nenhum serviço
// real de catálogo/credenciais de conector no backend deste worktree
// (confirmado: grep por "connector" não encontrou nada além de um comentário
// solto em Stepper.tsx) — o catálogo, os schemas de credencial e o resultado
// de "Testar conexão" abaixo são dado de exemplo fixo, sem integração real.

export type ConnectorCategory =
  | 'Clínicas' | 'CRM & Leads' | 'Pagamentos' | 'Agenda' | 'Produtividade'
  | 'Marketing' | 'Comunicação' | 'E-commerce' | 'Documentos'

export const CONNECTOR_CATEGORIES: ConnectorCategory[] = [
  'Clínicas', 'CRM & Leads', 'Pagamentos', 'Agenda', 'Produtividade',
  'Marketing', 'Comunicação', 'E-commerce', 'Documentos',
]

export type ConnectorStatus = 'installed' | 'available' | 'business' | 'comingSoon'

export interface ConnectorCapability {
  title: string
  description: string
}

export type CredentialFieldSchema =
  | { key: string; kind: 'text'; label: string; placeholder?: string; hint?: string; optional?: boolean }
  | { key: string; kind: 'secret'; label: string; hint?: string }
  | { key: string; kind: 'select'; label: string; options: string[]; optional?: boolean }
  | { key: string; kind: 'segmented'; label: string; options: string[] }
  | { key: string; kind: 'permissions'; label: string; items: Array<{ id: string; label: string; defaultChecked: boolean; optional?: boolean }> }

export interface ConnectorCredentialSchema {
  fields: CredentialFieldSchema[]
  /** Resultado fixo do "Testar conexão" — sucesso ou erro, pra ilustrar os dois estados do mock. */
  testResult:
    | { ok: true; detail: string; ms: number }
    | { ok: false; code: number; message: string; fieldKey: string }
}

export interface Connector {
  id: string
  name: string
  vendor: string
  category: ConnectorCategory
  status: ConnectorStatus
  logoInitial: string
  /** Hex cru da marca — vira `--connector-tile-mix` no tile (dado, igual `--chip`). */
  brandColor: string
  description: string
  version?: string
  auth?: string
  dataAccessed?: string
  sync?: string
  planRequirement?: string
  /** Só para `installed`: quantos agentes já usam este conector. */
  agentsUsing?: number
  /** Só para `comingSoon`/`business`: fila de interesse. */
  requestCount?: number
  capabilities: ConnectorCapability[]
  howItWorks: string
  guideUrl?: string
  socialProof?: string
  credential?: ConnectorCredentialSchema
}

export const CONNECTORS: Connector[] = [
  {
    id: 'feegow',
    name: 'Feegow',
    vendor: 'Feegow',
    category: 'Clínicas',
    status: 'installed',
    logoInitial: 'F',
    brandColor: '#0EA5A4',
    description: 'ERP e agenda da clínica: horários livres, agendar e confirmar.',
    version: 'v2.4',
    auth: 'API key da clínica',
    dataAccessed: 'Agenda, profissionais, pacientes',
    sync: 'Webhook + 15 min',
    planRequirement: 'Todos',
    agentsUsing: 2,
    capabilities: [
      { title: 'Consultar horários', description: 'Por profissional, unidade e convênio.' },
      { title: 'Agendar e remarcar', description: 'Com confirmação do paciente na conversa.' },
      { title: 'Cancelar', description: 'Libera a vaga e avisa a recepção.' },
      { title: 'Pedir avaliação', description: 'Opcional, ligado por agente.' },
    ],
    howItWorks: 'Sincroniza a agenda da Feegow com o Oryon. Os agentes passam a consultar horários livres, agendar e confirmar consultas direto na conversa, sem o paciente sair do WhatsApp.',
    guideUrl: '#',
    socialProof: 'Usado por 41 clínicas no Oryon',
    credential: {
      fields: [
        { key: 'environment', kind: 'segmented', label: 'Ambiente', options: ['Produção', 'Sandbox'] },
        { key: 'apiUrl', kind: 'text', label: 'URL da API', placeholder: 'https://api.feegow.com/v1' },
        { key: 'accessToken', kind: 'secret', label: 'Token de acesso', hint: 'Feegow · Configurações › API' },
        { key: 'clinicId', kind: 'text', label: 'ID da clínica', placeholder: '48211' },
        { key: 'defaultUnit', kind: 'select', label: 'Unidade padrão', options: ['Todas', 'Unidade Centro', 'Unidade Norte'], optional: true },
      ],
      testResult: { ok: true, detail: '3 unidades, 14 profissionais', ms: 240 },
    },
  },
  {
    id: 'doctoralia',
    name: 'Doctoralia',
    vendor: 'Docplanner',
    category: 'Clínicas',
    status: 'business',
    logoInitial: 'D',
    brandColor: '#2DBE8C',
    description: 'Marketplace de agendamento — sincroniza agenda e avaliações.',
    version: 'v1.2',
    auth: 'API key da clínica',
    dataAccessed: 'Agenda, profissionais, pacientes',
    sync: 'Webhook + 15 min',
    planRequirement: 'Todos',
    capabilities: [
      { title: 'Consultar horários', description: 'Por profissional, unidade e convênio.' },
      { title: 'Agendar e remarcar', description: 'Com confirmação do paciente na conversa.' },
      { title: 'Cancelar', description: 'Libera a vaga e avisa a recepção.' },
      { title: 'Pedir avaliação', description: 'Opcional, ligado por agente.' },
    ],
    howItWorks: 'Sincroniza a agenda da Doctoralia com o Oryon. Os agentes passam a consultar horários livres, agendar e confirmar consultas direto na conversa, sem o paciente sair do WhatsApp.',
    guideUrl: '#',
    socialProof: 'Usado por 41 clínicas no Oryon',
    credential: {
      fields: [
        { key: 'apiKey', kind: 'secret', label: 'API key da clínica', hint: 'painel Doctoralia Pro › Integrações' },
        {
          key: 'permissions',
          kind: 'permissions',
          label: 'Permissões que o Oryon vai pedir',
          items: [
            { id: 'read', label: 'Ler agenda e profissionais', defaultChecked: true },
            { id: 'write', label: 'Criar, remarcar e cancelar consultas', defaultChecked: true },
            { id: 'reviews', label: 'Enviar pedidos de avaliação', defaultChecked: false, optional: true },
          ],
        },
      ],
      testResult: { ok: false, code: 401, message: 'Chave recusada pela Doctoralia (401). Confira se é a chave do plano Pro.', fieldKey: 'apiKey' },
    },
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    vendor: 'HubSpot',
    category: 'CRM & Leads',
    status: 'comingSoon',
    logoInitial: 'H',
    brandColor: '#FF7A59',
    description: 'Sincroniza contatos e negócios nos dois sentidos.',
    planRequirement: 'Pro ou superior',
    requestCount: 12,
    capabilities: [
      { title: 'Importar contatos', description: 'De listas e propriedades do HubSpot.' },
      { title: 'Exportar negócios', description: 'Cria e atualiza deals no HubSpot.' },
    ],
    howItWorks: 'Ainda não construída. Ao priorizar, você recebe um aviso quando ficar disponível — e o pedido conta na nossa fila.',
  },
  {
    id: 'activecampaign',
    name: 'ActiveCampaign',
    vendor: 'ActiveCampaign',
    category: 'Marketing',
    status: 'comingSoon',
    logoInitial: 'A',
    brandColor: '#1F6ED4',
    description: 'Automação de marketing e e-mail.',
    requestCount: 9,
    capabilities: [
      { title: 'Disparar automações', description: 'Aciona fluxos do ActiveCampaign por evento de conversa.' },
    ],
    howItWorks: 'Ainda não construída. Ao priorizar, você recebe um aviso quando ficar disponível — e o pedido conta na nossa fila.',
  },
  {
    id: 'amplimed',
    name: 'Amplimed',
    vendor: 'Amplimed',
    category: 'Clínicas',
    status: 'comingSoon',
    logoInitial: 'A',
    brandColor: '#7C3AED',
    description: 'Software de agendamento e prontuário.',
    requestCount: 8,
    capabilities: [
      { title: 'Consultar horários', description: 'Agenda por profissional e unidade.' },
    ],
    howItWorks: 'Ainda não construída. Ao priorizar, você recebe um aviso quando ficar disponível — e o pedido conta na nossa fila.',
  },
  {
    id: 'asaas',
    name: 'Asaas',
    vendor: 'Asaas',
    category: 'Pagamentos',
    status: 'comingSoon',
    logoInitial: 'A',
    brandColor: '#00A868',
    description: 'Cobranças, boletos e Pix pelo WhatsApp.',
    requestCount: 21,
    capabilities: [
      { title: 'Gerar cobrança', description: 'Boleto ou Pix direto na conversa.' },
    ],
    howItWorks: 'Ainda não construída. Ao priorizar, você recebe um aviso quando ficar disponível — e o pedido conta na nossa fila.',
  },
  {
    id: 'calendly',
    name: 'Calendly',
    vendor: 'Calendly',
    category: 'Agenda',
    status: 'comingSoon',
    logoInitial: 'C',
    brandColor: '#006BFF',
    description: 'Agendamento automático de reuniões.',
    requestCount: 6,
    capabilities: [
      { title: 'Enviar link de agendamento', description: 'Compartilha disponibilidade real na conversa.' },
    ],
    howItWorks: 'Ainda não construída. Ao priorizar, você recebe um aviso quando ficar disponível — e o pedido conta na nossa fila.',
  },
  {
    id: 'clinicorp',
    name: 'Clinicorp',
    vendor: 'Clinicorp',
    category: 'Clínicas',
    status: 'comingSoon',
    logoInitial: 'C',
    brandColor: '#F43F5E',
    description: 'ERP completo para clínicas odontológicas.',
    requestCount: 3,
    capabilities: [
      { title: 'Consultar horários', description: 'Agenda por profissional e convênio.' },
    ],
    howItWorks: 'Ainda não construída. Ao priorizar, você recebe um aviso quando ficar disponível — e o pedido conta na nossa fila.',
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    vendor: 'Google',
    category: 'Agenda',
    status: 'comingSoon',
    logoInitial: 'G',
    brandColor: '#4285F4',
    description: 'Agenda do Google — cria e lê eventos.',
    planRequirement: 'Pro ou superior',
    requestCount: 34,
    auth: 'OAuth 2.0 (Google)',
    capabilities: [
      { title: 'Ler disponibilidade', description: 'De várias agendas ao mesmo tempo.' },
      { title: 'Criar evento', description: 'Com link do Meet e convidados.' },
    ],
    howItWorks: 'Ainda não construída. Ao priorizar, você recebe um aviso quando ficar disponível — e o pedido conta na nossa fila.',
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    vendor: 'Google',
    category: 'Produtividade',
    status: 'comingSoon',
    logoInitial: 'G',
    brandColor: '#34A853',
    description: 'Planilhas — exporta e consulta linhas.',
    requestCount: 17,
    capabilities: [
      { title: 'Exportar linhas', description: 'Envia dados de conversas/negócios pra uma planilha.' },
    ],
    howItWorks: 'Ainda não construída. Ao priorizar, você recebe um aviso quando ficar disponível — e o pedido conta na nossa fila.',
  },
  {
    id: 'iclinic',
    name: 'iClinic',
    vendor: 'iClinic',
    category: 'Clínicas',
    status: 'comingSoon',
    logoInitial: 'I',
    brandColor: '#0891B2',
    description: 'Prontuário eletrônico e agenda.',
    requestCount: 5,
    capabilities: [
      { title: 'Consultar horários', description: 'Agenda por profissional e unidade.' },
    ],
    howItWorks: 'Ainda não construída. Ao priorizar, você recebe um aviso quando ficar disponível — e o pedido conta na nossa fila.',
  },
  {
    id: 'rd-station',
    name: 'RD Station',
    vendor: 'RD Station',
    category: 'CRM & Leads',
    status: 'available',
    logoInitial: 'R',
    brandColor: '#2DD4BF',
    description: 'Automação de marketing e funil de leads.',
    auth: 'OAuth 2.0 (RD Station)',
    dataAccessed: 'Leads, funis, e-mails',
    sync: 'Tempo real (webhook)',
    planRequirement: 'Todos',
    capabilities: [
      { title: 'Criar lead', description: 'A cada novo contato qualificado na conversa.' },
      { title: 'Atualizar funil', description: 'Move o lead de etapa conforme o agente avança.' },
    ],
    howItWorks: 'Sincroniza leads e etapas de funil com o RD Station. Todo contato qualificado pelo agente vira lead lá, com o histórico da conversa.',
    guideUrl: '#',
    credential: {
      fields: [
        { key: 'clientId', kind: 'text', label: 'Client ID', placeholder: 'rd_live_...' },
        { key: 'clientSecret', kind: 'secret', label: 'Client secret' },
      ],
      testResult: { ok: true, detail: 'Conta conectada · 3 funis', ms: 180 },
    },
  },
  {
    id: 'zapier',
    name: 'Zapier',
    vendor: 'Zapier',
    category: 'Produtividade',
    status: 'available',
    logoInitial: 'Z',
    brandColor: '#FF4A00',
    description: 'Conecta o Oryon a milhares de outros apps.',
    auth: 'Chave de API do workspace',
    dataAccessed: 'Eventos de conversa e negócio',
    sync: 'Webhook',
    planRequirement: 'Todos',
    capabilities: [
      { title: 'Disparar zap', description: 'Em qualquer evento de conversa ou negócio.' },
    ],
    howItWorks: 'Publica eventos do Oryon (nova conversa, negócio fechado, agendamento) num webhook que qualquer Zap pode consumir.',
    guideUrl: '#',
    credential: {
      fields: [
        { key: 'webhookUrl', kind: 'text', label: 'URL do webhook Zapier', placeholder: 'https://hooks.zapier.com/...' },
      ],
      testResult: { ok: true, detail: 'Webhook respondeu 200', ms: 96 },
    },
  },
]
