import type { CampaignAnalytics, CampaignConversationSummary } from '@/types'

/**
 * O relatório da campanha "Renovação Pro" (`CampaignReport` real, aberto pela
 * cena de Disparos com `?report=`). Números coerentes com `heroCampaigns`:
 * 1.231 enviadas, 871 lidas, 138 respostas — e a Marina entre as conversões.
 */

const agora = () => Date.now()
const minAtras = (m: number) => new Date(agora() - m * 60_000).toISOString()

export const ANALYTICS_RENOVACAO: CampaignAnalytics = {
  campaignId: 'cp-renovacao',
  churnBreakdown: { optOut: 6, blocked: 1, invalidNumber: 9, undelivered: 18, noInteraction: 312 },
  conversionEvents: [
    { contactId: 'demo-c-0', contactName: 'Marina Alves', convertedAt: minAtras(4), type: 'replied', detail: 'Pediu uma proposta para 12 licenças' },
    { contactId: 'demo-dc-3', contactName: 'Móveis Aurora', convertedAt: minAtras(22), type: 'stage_changed', detail: 'Renovação · 8 licenças → Qualificação' },
    { contactId: 'demo-dc-5', contactName: 'Casa Verde', convertedAt: minAtras(41), type: 'clicked_link', detail: 'Abriu a página de planos' },
  ],
  engagementTimeline: [
    { label: '0h', read: 0, replied: 0, converted: 0 },
    { label: '1h', read: 402, replied: 51, converted: 9 },
    { label: '6h', read: 688, replied: 97, converted: 17 },
    { label: '12h', read: 812, replied: 124, converted: 22 },
    { label: '24h', read: 871, replied: 138, converted: 26 },
  ],
  attributionBreakdown: [
    { source: 'whatsapp', label: 'Base de clientes', contactCount: 1_012, readCount: 734, replyCount: 118, conversionCount: 23, readRate: 0.725, conversionRate: 0.023 },
    { source: 'import', label: 'Importação · feira de setembro', contactCount: 228, readCount: 137, replyCount: 20, conversionCount: 3, readRate: 0.601, conversionRate: 0.013 },
  ],
  aiInsights: [
    'As respostas se concentram na primeira hora: 37 % das leituras e das respostas vieram nesse intervalo.',
    'Clientes com a etiqueta VIP responderam 2,4× mais que a média da campanha.',
  ],
}

export const CONVERSAS_RENOVACAO: CampaignConversationSummary[] = [
  { contactId: 'demo-c-0', contactName: 'Marina Alves', conversationId: 'demo-conv-0', sentiment: 'positive', outcome: 'converted', lastMessageSnippet: 'Oi! Preciso de uma proposta pra 12 licenças do plano anual.', lastMessageAt: minAtras(4) },
  { contactId: 'demo-dc-3', contactName: 'Móveis Aurora', conversationId: 'demo-conv-x1', sentiment: 'positive', outcome: 'pending', lastMessageSnippet: 'Dá pra incluir mais duas lojas?', lastMessageAt: minAtras(22) },
  { contactId: 'demo-dc-5', contactName: 'Casa Verde', conversationId: 'demo-conv-x2', sentiment: 'neutral', outcome: 'pending', lastMessageSnippet: 'Vou ver com o financeiro.', lastMessageAt: minAtras(41) },
  { contactId: 'demo-dc-9', contactName: 'Padaria Aurora', conversationId: 'demo-conv-x3', sentiment: 'negative', outcome: 'churned', lastMessageSnippet: 'Por favor, não me enviem mais.', lastMessageAt: minAtras(58) },
]
