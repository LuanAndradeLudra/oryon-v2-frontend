import type { CampaignAnalytics, CampaignConversationSummary } from '@/types'

/**
 * O relatório da campanha "Renovação Pro" (`CampaignReport` real, aberto pela
 * cena de Disparos com `?report=`). Números coerentes com `heroCampaigns`:
 * 477 enviadas, 341 lidas, 54 respostas — e a Marina entre as conversões.
 */

const agora = () => Date.now()
const minAtras = (m: number) => new Date(agora() - m * 60_000).toISOString()

export const ANALYTICS_RENOVACAO: CampaignAnalytics = {
  campaignId: 'cp-retorno',
  churnBreakdown: { optOut: 3, blocked: 1, invalidNumber: 7, undelivered: 2, noInteraction: 127 },
  conversionEvents: [
    { contactId: 'demo-c-0', contactName: 'Marina Alves', convertedAt: minAtras(4), type: 'replied', detail: 'Pediu horário de retorno com a Dra. Helena' },
    { contactId: 'demo-dc-3', contactName: 'Carla Mendes', convertedAt: minAtras(22), type: 'stage_changed', detail: 'Consulta · Dra. Helena → Avaliação' },
    { contactId: 'demo-dc-5', contactName: 'Lúcia Martins', convertedAt: minAtras(41), type: 'clicked_link', detail: 'Abriu a página de convênios' },
  ],
  engagementTimeline: [
    { label: '0h', read: 0, replied: 0, converted: 0 },
    { label: '1h', read: 158, replied: 21, converted: 4 },
    { label: '6h', read: 271, replied: 38, converted: 7 },
    { label: '12h', read: 318, replied: 48, converted: 9 },
    { label: '24h', read: 341, replied: 54, converted: 11 },
  ],
  attributionBreakdown: [
    { source: 'whatsapp', label: 'Base de clientes', contactCount: 402, readCount: 287, replyCount: 47, conversionCount: 10, readRate: 0.714, conversionRate: 0.025 },
    { source: 'import', label: 'Importação · feira de setembro', contactCount: 84, readCount: 54, replyCount: 7, conversionCount: 1, readRate: 0.643, conversionRate: 0.012 },
  ],
  aiInsights: [
    'As respostas se concentram na primeira hora: 37 % das leituras e das respostas vieram nesse intervalo.',
    'Clientes com a etiqueta VIP responderam 2,4× mais que a média da campanha.',
  ],
  // Relatório novo (T2): falhas por motivo somam as 9 de `heroCampaigns`; as
  // respostas são as mesmas pessoas das conversas abaixo.
  failures: [
    { code: '131026', reason: 'Mensagem não pôde ser entregue (número inválido ou sem WhatsApp)', count: 7 },
    { code: '131049', reason: 'A Meta limitou mensagens de marketing para este número', count: 2 },
  ],
  replies: [
    { contactId: 'demo-c-0', name: 'Marina Alves', text: 'Oi! Quero marcar o retorno com a Dra. Helena. Tem horário à tarde essa semana?', at: minAtras(4) },
    { contactId: 'demo-dc-3', name: 'Carla Mendes', text: 'Tem horário de manhã também?', at: minAtras(22) },
    { contactId: 'demo-dc-5', name: 'Lúcia Martins', text: 'Vou ver se o convênio cobre.', at: minAtras(41) },
  ],
  readHeatmap: [],
  avgTimeToReadMinutes: 38,
}

export const CONVERSAS_RENOVACAO: CampaignConversationSummary[] = [
  { contactId: 'demo-c-0', contactName: 'Marina Alves', conversationId: 'demo-conv-0', sentiment: 'positive', outcome: 'converted', lastMessageSnippet: 'Oi! Quero marcar o retorno com a Dra. Helena. Tem horário à tarde essa semana?', lastMessageAt: minAtras(4) },
  { contactId: 'demo-dc-3', contactName: 'Carla Mendes', conversationId: 'demo-conv-x1', sentiment: 'positive', outcome: 'pending', lastMessageSnippet: 'Tem horário de manhã também?', lastMessageAt: minAtras(22) },
  { contactId: 'demo-dc-5', contactName: 'Lúcia Martins', conversationId: 'demo-conv-x2', sentiment: 'neutral', outcome: 'pending', lastMessageSnippet: 'Vou ver se o convênio cobre.', lastMessageAt: minAtras(41) },
  { contactId: 'demo-dc-9', contactName: 'Padaria Aurora', conversationId: 'demo-conv-x3', sentiment: 'negative', outcome: 'churned', lastMessageSnippet: 'Por favor, não me enviem mais.', lastMessageAt: minAtras(58) },
]
