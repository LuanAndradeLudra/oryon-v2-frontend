import type { ComponentType } from 'react'
import {
  Megaphone, Wrench, ShieldCheck,
  CornerDownLeft, ExternalLink, Phone, GitBranch, Copy,
} from 'lucide-react'
import type { TemplateCategoryType, TemplateHeaderType, TemplateButtonType } from '@/types'
import type { SubCategory } from './SubcategoryPreview'

// ─── Shared template constants ────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<TemplateCategoryType, string> = {
  MARKETING:      'Marketing',
  UTILITY:        'Utilidade',
  AUTHENTICATION: 'Autenticação',
}

export const SUBCATEGORY_LABELS: Record<SubCategory, string> = {
  standard:      'Padrão',
  catalog:       'Catálogo',
  flows:         'Flow interativo',
  order_details: 'Detalhes do pedido',
  order_status:  'Status de entrega',
}

// `comingSoon` keeps the option visible (so the operator knows the feature
// exists) but the picker disables click. Categories that need a dedicated
// schema we don't generate yet — AUTHENTICATION uses a Meta-controlled body
// and an OTP button — should stay flagged until the flow is implemented.
export const CATEGORIES: { value: TemplateCategoryType; label: string; description: string; icon: ComponentType<{ className?: string }>; comingSoon?: boolean }[] = [
  { value: 'MARKETING',      label: 'Marketing',    icon: Megaphone,   description: 'Promoções, ofertas, boas‑vindas e conteúdo de engajamento' },
  { value: 'UTILITY',        label: 'Utilidade',    icon: Wrench,      description: 'Confirmações, lembretes e alertas transacionais' },
  { value: 'AUTHENTICATION', label: 'Autenticação', icon: ShieldCheck, description: 'Senhas de uso único (OTP) e verificações de conta', comingSoon: true },
]

export const SUBCATEGORIES: Record<TemplateCategoryType, { value: SubCategory; label: string; description: string }[]> = {
  MARKETING: [
    { value: 'standard',      label: 'Padrão',             description: 'Template genérico para qualquer finalidade de marketing' },
    { value: 'catalog',       label: 'Catálogo',            description: 'Exibe produtos do catálogo Meta vinculado à conta' },
    { value: 'flows',         label: 'Flows',               description: 'Inicia ou navega em um Meta Flow interativo' },
    { value: 'order_details', label: 'Detalhes do pedido',  description: 'Apresenta itens, valores e informações de um pedido' },
  ],
  UTILITY: [
    { value: 'standard',      label: 'Padrão',             description: 'Notificação utilitária genérica' },
    { value: 'flows',         label: 'Flows',               description: 'Inicia ou navega em um Meta Flow interativo' },
    { value: 'order_status',  label: 'Status do pedido',   description: 'Atualiza o cliente sobre o andamento da entrega' },
    { value: 'order_details', label: 'Detalhes do pedido', description: 'Apresenta itens e valores de um pedido' },
  ],
  AUTHENTICATION: [
    { value: 'standard', label: 'Padrão (OTP)', description: 'Código de verificação com botão "Copiar código"' },
  ],
}

export const HEADER_TYPES: { value: TemplateHeaderType | ''; label: string; desc: string }[] = [
  { value: '',         label: 'Nenhum',    desc: 'Sem cabeçalho' },
  { value: 'TEXT',     label: 'Texto',     desc: 'Uma linha de texto, pode conter {{1}}' },
  { value: 'IMAGE',    label: 'Imagem',    desc: 'JPG ou PNG (URL pública)' },
  { value: 'VIDEO',    label: 'Vídeo',     desc: 'MP4 (URL pública)' },
  { value: 'DOCUMENT', label: 'Documento', desc: 'PDF (URL pública)' },
]

// Meta supports ~60 languages for WhatsApp templates. We list the locales
// most likely to come up for our tenant base; if a tenant needs one outside
// this set, the backend accepts any well-formed BCP-47-ish code so the
// list can be extended without a backend change.
// Ordered: most-used first (pt/en/es variants), then alphabetical by label.
export const LANGUAGES = [
  { value: 'pt_BR', label: 'Português (Brasil)' },
  { value: 'pt_PT', label: 'Português (Portugal)' },
  { value: 'en_US', label: 'English (US)' },
  { value: 'en_GB', label: 'English (UK)' },
  { value: 'en',    label: 'English' },
  { value: 'es',    label: 'Español' },
  { value: 'es_AR', label: 'Español (Argentina)' },
  { value: 'es_ES', label: 'Español (España)' },
  { value: 'es_MX', label: 'Español (México)' },
  { value: 'ar',    label: 'العربية (Árabe)' },
  { value: 'bn',    label: 'বাংলা (Bengali)' },
  { value: 'zh_CN', label: '中文 (Simplificado)' },
  { value: 'zh_HK', label: '中文 (Hong Kong)' },
  { value: 'zh_TW', label: '中文 (Tradicional)' },
  { value: 'cs',    label: 'Čeština (Tcheco)' },
  { value: 'da',    label: 'Dansk (Dinamarquês)' },
  { value: 'de',    label: 'Deutsch (Alemão)' },
  { value: 'fil',   label: 'Filipino' },
  { value: 'fr',    label: 'Français' },
  { value: 'el',    label: 'Ελληνικά (Grego)' },
  { value: 'he',    label: 'עברית (Hebraico)' },
  { value: 'hi',    label: 'हिन्दी (Hindi)' },
  { value: 'id',    label: 'Bahasa Indonesia' },
  { value: 'it',    label: 'Italiano' },
  { value: 'ja',    label: '日本語 (Japonês)' },
  { value: 'ko',    label: '한국어 (Coreano)' },
  { value: 'ms',    label: 'Bahasa Melayu' },
  { value: 'nl',    label: 'Nederlands (Holandês)' },
  { value: 'pl',    label: 'Polski (Polonês)' },
  { value: 'ro',    label: 'Română (Romeno)' },
  { value: 'ru',    label: 'Русский (Russo)' },
  { value: 'sv',    label: 'Svenska (Sueco)' },
  { value: 'th',    label: 'ไทย (Tailandês)' },
  { value: 'tr',    label: 'Türkçe (Turco)' },
  { value: 'uk',    label: 'Українська (Ucraniano)' },
  { value: 'ur',    label: 'اردو (Urdu)' },
  { value: 'vi',    label: 'Tiếng Việt' },
]

// FLOW and COPY_CODE require backend support that doesn't exist yet — the
// Create/Update DTOs only know QUICK_REPLY/URL/PHONE_NUMBER, so picking
// either type would 400 on save. We keep them in the type list so old
// templates that already have these buttons still render in the editor,
// but `comingSoon` filters them out of the "add button" picker.
export const BUTTON_TYPES: {
  value: TemplateButtonType
  label: string
  description: string
  icon: ComponentType<{ className?: string }>
  forCategories?: TemplateCategoryType[]
  comingSoon?: boolean
}[] = [
  { value: 'QUICK_REPLY',  label: 'Resposta rápida', icon: CornerDownLeft, description: 'O cliente toca para enviar uma resposta pré-definida' },
  { value: 'URL',          label: 'Acessar o site',  icon: ExternalLink,   description: 'Abre uma URL no navegador do dispositivo' },
  { value: 'PHONE_NUMBER', label: 'Ligar',           icon: Phone,          description: 'Discagem automática para o número configurado' },
  { value: 'FLOW',         label: 'Flow',            icon: GitBranch,      description: 'Inicia ou cancela um Meta Flow interativo', forCategories: ['MARKETING', 'UTILITY'], comingSoon: true },
  { value: 'COPY_CODE',    label: 'Copiar código',   icon: Copy,           description: 'Copia o código OTP para a área de transferência', forCategories: ['AUTHENTICATION'], comingSoon: true },
]

// ─── Shared helper ────────────────────────────────────────────────────────────

export function extractVarPositions(text: string): number[] {
  const matches = text.match(/\{\{(\d+)\}\}/g) ?? []
  const nums = [...new Set(matches.map((m) => parseInt(m.replace(/\D/g, ''))))]
  return nums.sort((a, b) => a - b)
}
