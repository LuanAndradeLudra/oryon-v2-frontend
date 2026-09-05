import { Briefcase, SmilePlus, GraduationCap, Heart, Flame } from 'lucide-react'

// ─── Shared input styles ───────────────────────────────────────────────────────

export const INPUT = 'w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2.5 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/40 transition'
export const TEXTAREA = INPUT + ' resize-none'

// ─── Picklists ──────────────────────────────────────────────────────────────

export const SECTORS = [
  { value: 'ecommerce', label: 'E-commerce / Varejo' },
  { value: 'saude', label: 'Saúde' },
  { value: 'educacao', label: 'Educação' },
  { value: 'imobiliario', label: 'Imobiliário' },
  { value: 'financeiro', label: 'Financeiro / Investimentos' },
  { value: 'juridico', label: 'Jurídico' },
  { value: 'restaurante', label: 'Restaurante / Delivery' },
  { value: 'beleza', label: 'Beleza / Estética' },
  { value: 'tecnologia', label: 'Tecnologia / SaaS' },
  { value: 'servicos', label: 'Serviços Gerais' },
  { value: 'turismo', label: 'Turismo / Viagens' },
  { value: 'automotivo', label: 'Automotivo' },
  { value: 'academias', label: 'Academia / Fitness' },
  { value: 'outro', label: 'Outro' },
]

export const TONES: { value: string; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: 'formal',       label: 'Formal',        desc: 'Profissional e objetivo',  icon: <Briefcase className="w-5 h-5" /> },
  { value: 'casual',       label: 'Casual',         desc: 'Amigável e próximo',       icon: <SmilePlus className="w-5 h-5" /> },
  { value: 'tecnico',      label: 'Técnico',        desc: 'Preciso e especializado',  icon: <GraduationCap className="w-5 h-5" /> },
  { value: 'empatico',     label: 'Empático',       desc: 'Acolhedor e paciente',     icon: <Heart className="w-5 h-5" /> },
  { value: 'entusiasmado', label: 'Entusiasmado',   desc: 'Energético e positivo',    icon: <Flame className="w-5 h-5" /> },
]

export const LANGUAGES = [
  { value: 'pt-BR', label: 'Português' },
  { value: 'en',    label: 'English'   },
  { value: 'es',    label: 'Español'   },
]

export const RESPONSE_STYLES = [
  'Respostas concisas',
  'Respostas detalhadas',
  'Usa emojis',
  'Usa exemplos práticos',
  'Faz perguntas de acompanhamento',
  'Usa listas e estrutura',
  'Linguagem simples e acessível',
  'Vocabulário técnico do setor',
]

export const CAN_DO_PRESETS = [
  'Responder perguntas sobre produtos/serviços',
  'Qualificar leads e coletar informações',
  'Agendar reuniões ou consultas',
  'Verificar status de pedidos',
  'Enviar links, catálogos e materiais',
  'Coletar dados de contato',
  'Responder perguntas frequentes (FAQ)',
  'Fazer follow-up de conversas',
  'Gerar orçamentos simples',
  'Registrar reclamações e sugestões',
  'Apresentar promoções e ofertas',
  'Auxiliar no rastreamento de entregas',
]

export const CANNOT_DO_PRESETS = [
  'Processar pagamentos diretamente',
  'Acessar dados bancários ou senhas',
  'Tomar decisões jurídicas ou médicas',
  'Garantir resultados específicos',
  'Compartilhar informações confidenciais',
  'Fazer promessas não autorizadas pela empresa',
  'Finalizar contratos ou acordos',
  'Substituir atendimento humano em emergências',
]
