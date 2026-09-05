// ─── Campaigns V2 API ────────────────────────────────────────────────────
// Contratos do redesign (SCRUM-992 — Agenda/Board/Composer/Público/
// Relatório/Biblioteca), shapes finais em
// design-system/fluxos-src/coord/CONTRATOS.md (BE.1/BE.2/BE.3/BE.4/BE.5/
// BE.8). Mesma instância axios `api` de services/api.ts (congelado, não
// editar) — funções novas ficam aqui.
//
// Blocos por história — na Onda 1, cada dono edita só o seu bloco.

import { api } from '@/services/api'
import type { Campaign, WhatsAppTemplate, CampaignAnalytics } from '@/types'
import type {
  SegmentEvaluateRequest,
  SegmentEvaluateResult,
  SegmentPreviewRequest,
  SegmentPreviewResponse,
  CampaignSegmentSaved,
  CampaignSegmentDefinition,
  CampaignTestSendRequest,
  CampaignTestSendResult,
  CampaignAnalyticsV2Extra,
  CampaignRecipientsParams,
  CampaignRecipientsResponse,
  CampaignRecurrence,
  WhatsAppNumberUsage,
  CampaignCostEstimateRequest,
  CampaignCostEstimate,
  TemplateUsageInfo,
  TemplateRewriteRequest,
  TemplateRewriteResult,
} from '@/types/campaignsV2'

// ── [D6] segments (BE.3) ───────────────────────────────────────────────────

export const segmentsApi = {
  evaluate(body: SegmentEvaluateRequest) {
    return api.post<SegmentEvaluateResult>('/campaigns/segments/evaluate', body)
  },
  /** Paginação real ("ver os N") — separado do `evaluate` (Decisão D26). */
  preview(body: SegmentPreviewRequest) {
    return api.post<SegmentPreviewResponse>('/campaigns/segments/preview', body)
  },
  // CRUD de segmentos salvos — o corpo HTTP vem envelopado em `{ data }`
  // (diferente de evaluate/preview, que respondem sem envelope). Mesmo
  // padrão de desembrulho de campaignsApi.list() em services/api.ts:
  // devolve algo com a forma de resposta do axios (`.data` + resto), só que
  // com `.data` já limpo — quem chama continua fazendo `(await ...).data`.
  list() {
    return api.get<{ data: CampaignSegmentSaved[] }>('/campaigns/segments')
      .then((r) => ({ ...r, data: r.data.data }))
  },
  create(name: string, definition: CampaignSegmentDefinition) {
    return api.post<{ data: CampaignSegmentSaved }>('/campaigns/segments', { name, definition })
      .then((r) => ({ ...r, data: r.data.data }))
  },
  update(id: string, patch: { name?: string; definition?: CampaignSegmentDefinition }) {
    return api.patch<{ data: CampaignSegmentSaved }>(`/campaigns/segments/${id}`, patch)
      .then((r) => ({ ...r, data: r.data.data }))
  },
  delete(id: string) {
    return api.delete<{ data: { ok: true } }>(`/campaigns/segments/${id}`)
      .then((r) => ({ ...r, data: r.data.data }))
  },
}

// ── [D2] enviar teste (Composer "Enviar teste") — BE.10/SCRUM-1025 ──────────

// Erros: 404 template ou linha WhatsApp não encontrados; 409 template não
// aprovado (mesma regra do processor de campanhas — nunca envia template
// não aprovado, nem em teste); 422 `to` ausente + usuário sem telefone
// cadastrado; 429 limite de 5 envios/min/usuário (UserRateLimitGuard, não
// por IP). Não passa pela fila `campaign-send` nem grava
// campaign_recipients/messages.campaignId — não é uma campanha, não
// aparece em relatório nenhum.
export const campaignComposerApi = {
  testSend(body: CampaignTestSendRequest) {
    return api.post<CampaignTestSendResult>('/campaigns/test-send', body)
  },
}

// ── [D1][D1b] cancel/pause/resume (BE.2) ───────────────────────────────────

export const campaignLifecycleApi = {
  cancel(id: string) {
    return api.post<Campaign>(`/campaigns/${id}/cancel`)
  },
  pause(id: string) {
    return api.post<Campaign>(`/campaigns/${id}/pause`)
  },
  resume(id: string) {
    return api.post<Campaign>(`/campaigns/${id}/resume`)
  },
}

// ── [D3] analytics estendido + recipients (BE.1) ────────────────────────────

export const campaignReportApi = {
  getAnalyticsV2(id: string) {
    return api.get<CampaignAnalytics & CampaignAnalyticsV2Extra>(`/campaigns/${id}/analytics`)
  },
  getRecipients(id: string, params: CampaignRecipientsParams = {}) {
    return api.get<CampaignRecipientsResponse>(`/campaigns/${id}/recipients`, { params })
  },
}

// ── [D2][D1] recorrência (BE.4) + cota/custo (BE.5) ─────────────────────────

export const campaignSchedulingApi = {
  /** Estende o PATCH /campaigns/:id já existente (campaignsApi.update, em
   *  services/api.ts) com o campo `recurrence` — `null` limpa a recorrência. */
  setRecurrence(id: string, recurrence: CampaignRecurrence | null) {
    return api.patch<Campaign>(`/campaigns/${id}`, { recurrence })
  },
  getNumberUsage(whatsappNumberId: string) {
    return api.get<WhatsAppNumberUsage>(`/meta/numbers/${whatsappNumberId}/usage`)
  },
  /** POST, não GET (Decisão D8) — corpo estruturado (segmento salvo OU
   *  inline). Valores monetários em centavos, moeda BRL (Decisão D20). */
  costEstimate(body: CampaignCostEstimateRequest) {
    return api.post<CampaignCostEstimate>('/campaigns/cost-estimate', body)
  },
}

// ── [D4] templates (BE.8) ──────────────────────────────────────────────────

export const templatesV2Api = {
  listWithUsage() {
    return api.get<Array<WhatsAppTemplate & TemplateUsageInfo>>('/templates', { params: { withUsage: 1 } })
  },
  rewrite(id: string, body: TemplateRewriteRequest = {}) {
    return api.post<TemplateRewriteResult>(`/templates/${id}/rewrite`, body)
  },
}
