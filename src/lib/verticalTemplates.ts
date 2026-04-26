import type { TenantVocabulary, VerticalTemplate } from '@/types'

// ─── Vocabulários padrão por vertical ─────────────────────────────────────────

const GENERIC_VOCAB: TenantVocabulary = {
  contact:   'Lead',
  contacts:  'Leads',
  deal:      'Negócio',
  deals:     'Negócios',
  agent:     'Agente',
  agents:    'Agentes',
  leadScore: 'Lead Score',
  intent:    'Intenção de compra',
  pipeline:  'Funil',
  company:   'Empresa',
  jobTitle:  'Cargo',
}

// ─── Templates de vertical ────────────────────────────────────────────────────

export const VERTICAL_TEMPLATES: VerticalTemplate[] = [
  {
    id: 'generic',
    label: 'Genérico / Vendas',
    description: 'Vocabulário padrão para times comerciais B2B e B2C.',
    emoji: '💼',
    color: '#6366f1',
    vocabulary: GENERIC_VOCAB,
    suggestedStages: [
      { label: 'Lead',           color: '#64748b', order: 0, isTerminal: false },
      { label: 'Qualificado',    color: '#3b82f6', order: 1, isTerminal: false },
      { label: 'Em Negociação',  color: '#f59e0b', order: 2, isTerminal: false },
      { label: 'Proposta',       color: '#8b5cf6', order: 3, isTerminal: false },
      { label: 'Fechado',        color: '#10b981', order: 4, isTerminal: true  },
      { label: 'Perdido',        color: '#ef4444', order: 5, isTerminal: true  },
    ],
    suggestedFields: [
      { label: 'Empresa',        type: 'text',   required: false, order: 0 },
      { label: 'Cargo',          type: 'text',   required: false, order: 1 },
      { label: 'Orçamento',      type: 'number', required: false, order: 2 },
      { label: 'Prazo de decisão', type: 'date', required: false, order: 3 },
    ],
  },

  {
    id: 'health',
    label: 'Saúde / Clínicas',
    description: 'Para clínicas, consultórios, laboratórios e operadoras de saúde.',
    emoji: '🏥',
    color: '#10b981',
    vocabulary: {
      contact:   'Paciente',
      contacts:  'Pacientes',
      deal:      'Consulta',
      deals:     'Consultas',
      agent:     'Recepcionista',
      agents:    'Recepcionistas',
      leadScore: 'Prioridade',
      intent:    'Urgência',
      pipeline:  'Agenda',
      company:   'Clínica / Convênio',
      jobTitle:  'Especialidade',
    },
    suggestedStages: [
      { label: 'Novo Contato',        color: '#64748b', order: 0, isTerminal: false },
      { label: 'Aguardando Agendamento', color: '#3b82f6', order: 1, isTerminal: false },
      { label: 'Consulta Agendada',   color: '#f59e0b', order: 2, isTerminal: false },
      { label: 'Confirmado',          color: '#8b5cf6', order: 3, isTerminal: false },
      { label: 'Atendido',            color: '#10b981', order: 4, isTerminal: true  },
      { label: 'Cancelado',           color: '#ef4444', order: 5, isTerminal: true  },
    ],
    suggestedFields: [
      { label: 'Convênio',         type: 'text',   required: false, order: 0 },
      { label: 'Especialidade',    type: 'text',   required: false, order: 1 },
      { label: 'Data de Nascimento', type: 'date', required: false, order: 2 },
      { label: 'Primeira Consulta', type: 'boolean', required: false, order: 3 },
      { label: 'Observações Médicas', type: 'textarea', required: false, order: 4 },
    ],
  },

  {
    id: 'realestate',
    label: 'Imobiliário',
    description: 'Para imobiliárias, corretores autônomos e incorporadoras.',
    emoji: '🏠',
    color: '#f59e0b',
    vocabulary: {
      contact:   'Cliente',
      contacts:  'Clientes',
      deal:      'Imóvel',
      deals:     'Imóveis',
      agent:     'Corretor',
      agents:    'Corretores',
      leadScore: 'Temperatura',
      intent:    'Interesse',
      pipeline:  'Pipeline',
      company:   'Imobiliária',
      jobTitle:  'Perfil',
    },
    suggestedStages: [
      { label: 'Novo Lead',        color: '#64748b', order: 0, isTerminal: false },
      { label: 'Qualificado',      color: '#3b82f6', order: 1, isTerminal: false },
      { label: 'Visita Agendada',  color: '#f59e0b', order: 2, isTerminal: false },
      { label: 'Proposta Enviada', color: '#8b5cf6', order: 3, isTerminal: false },
      { label: 'Em Financiamento', color: '#06b6d4', order: 4, isTerminal: false },
      { label: 'Fechado',          color: '#10b981', order: 5, isTerminal: true  },
      { label: 'Desistiu',         color: '#ef4444', order: 6, isTerminal: true  },
    ],
    suggestedFields: [
      { label: 'Tipo de Imóvel',   type: 'select',  options: ['Apartamento', 'Casa', 'Terreno', 'Comercial'], required: false, order: 0 },
      { label: 'Faixa de Preço',   type: 'text',    required: false, order: 1 },
      { label: 'Bairros de Interesse', type: 'text', required: false, order: 2 },
      { label: 'Quantidade de Quartos', type: 'number', required: false, order: 3 },
      { label: 'Financiamento',    type: 'boolean', required: false, order: 4 },
    ],
  },

  {
    id: 'legal',
    label: 'Jurídico',
    description: 'Para escritórios de advocacia, departamentos jurídicos e consultorias legais.',
    emoji: '⚖️',
    color: '#8b5cf6',
    vocabulary: {
      contact:   'Cliente',
      contacts:  'Clientes',
      deal:      'Processo',
      deals:     'Processos',
      agent:     'Advogado',
      agents:    'Advogados',
      leadScore: 'Relevância',
      intent:    'Urgência',
      pipeline:  'Fila',
      company:   'Escritório',
      jobTitle:  'Área',
    },
    suggestedStages: [
      { label: 'Triagem',          color: '#64748b', order: 0, isTerminal: false },
      { label: 'Consulta Inicial', color: '#3b82f6', order: 1, isTerminal: false },
      { label: 'Proposta',         color: '#f59e0b', order: 2, isTerminal: false },
      { label: 'Contratado',       color: '#8b5cf6', order: 3, isTerminal: false },
      { label: 'Em Andamento',     color: '#06b6d4', order: 4, isTerminal: false },
      { label: 'Encerrado',        color: '#10b981', order: 5, isTerminal: true  },
      { label: 'Recusado',         color: '#ef4444', order: 6, isTerminal: true  },
    ],
    suggestedFields: [
      { label: 'Área Jurídica',    type: 'select',  options: ['Trabalhista', 'Civil', 'Tributário', 'Criminal', 'Empresarial', 'Família'], required: false, order: 0 },
      { label: 'Número do Processo', type: 'text',  required: false, order: 1 },
      { label: 'Tribunal',         type: 'text',    required: false, order: 2 },
      { label: 'Valor da Causa',   type: 'number',  required: false, order: 3 },
    ],
  },

  {
    id: 'education',
    label: 'Educação',
    description: 'Para escolas, cursos, faculdades e plataformas de e-learning.',
    emoji: '🎓',
    color: '#06b6d4',
    vocabulary: {
      contact:   'Aluno',
      contacts:  'Alunos',
      deal:      'Matrícula',
      deals:     'Matrículas',
      agent:     'Consultor',
      agents:    'Consultores',
      leadScore: 'Probabilidade',
      intent:    'Interesse',
      pipeline:  'Funil',
      company:   'Instituição',
      jobTitle:  'Curso de Interesse',
    },
    suggestedStages: [
      { label: 'Novo Contato',     color: '#64748b', order: 0, isTerminal: false },
      { label: 'Qualificado',      color: '#3b82f6', order: 1, isTerminal: false },
      { label: 'Visita / Prova',   color: '#f59e0b', order: 2, isTerminal: false },
      { label: 'Proposta Enviada', color: '#8b5cf6', order: 3, isTerminal: false },
      { label: 'Matriculado',      color: '#10b981', order: 4, isTerminal: true  },
      { label: 'Desistiu',         color: '#ef4444', order: 5, isTerminal: true  },
    ],
    suggestedFields: [
      { label: 'Curso de Interesse', type: 'text',  required: false, order: 0 },
      { label: 'Modalidade',       type: 'select',  options: ['Presencial', 'EAD', 'Híbrido'], required: false, order: 1 },
      { label: 'Turno',            type: 'select',  options: ['Manhã', 'Tarde', 'Noite', 'Integral'], required: false, order: 2 },
      { label: 'Precisa de Financiamento', type: 'boolean', required: false, order: 3 },
    ],
  },

  {
    id: 'ecommerce',
    label: 'E-commerce / Varejo',
    description: 'Para lojas virtuais, marketplaces e varejo físico com WhatsApp.',
    emoji: '🛒',
    color: '#f97316',
    vocabulary: {
      contact:   'Cliente',
      contacts:  'Clientes',
      deal:      'Pedido',
      deals:     'Pedidos',
      agent:     'Atendente',
      agents:    'Atendentes',
      leadScore: 'Engajamento',
      intent:    'Intenção de compra',
      pipeline:  'Funil',
      company:   'Empresa',
      jobTitle:  'Segmento',
    },
    suggestedStages: [
      { label: 'Novo Visitante',   color: '#64748b', order: 0, isTerminal: false },
      { label: 'Interesse',        color: '#3b82f6', order: 1, isTerminal: false },
      { label: 'Carrinho Aberto',  color: '#f59e0b', order: 2, isTerminal: false },
      { label: 'Pedido Feito',     color: '#8b5cf6', order: 3, isTerminal: false },
      { label: 'Entregue',         color: '#10b981', order: 4, isTerminal: true  },
      { label: 'Devolvido',        color: '#ef4444', order: 5, isTerminal: true  },
    ],
    suggestedFields: [
      { label: 'Produto de Interesse', type: 'text', required: false, order: 0 },
      { label: 'Ticket Médio',     type: 'number',  required: false, order: 1 },
      { label: 'Frequência de Compra', type: 'select', options: ['Primeira compra', 'Recorrente', 'Inativo'], required: false, order: 2 },
      { label: 'Revendedor',       type: 'boolean', required: false, order: 3 },
    ],
  },
]

export function getTemplateById(id: string): VerticalTemplate | undefined {
  return VERTICAL_TEMPLATES.find((t) => t.id === id)
}

export { GENERIC_VOCAB }
