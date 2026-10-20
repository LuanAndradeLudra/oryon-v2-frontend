// ─── Termos: publicação de versões (super_admin, 20/10) ───────────────────────
// Versão publicada é append-only no backend: não há editar nem apagar.

import { api } from './api'

export type TermsDocument = 'terms_of_use' | 'privacy_policy'
export type TermsVersionStatus = 'current' | 'scheduled' | 'previous'

export interface AdminTermsVersion {
  id: string
  document: TermsDocument
  version: string
  effectiveAt: string
  createdAt: string
  contentUrl: string | null
  hasContent: boolean
  contentHash: string
  status: TermsVersionStatus
  noticeSent: number
  noticeProblems: number
  acceptances: number
}

export interface PublishTermsBody {
  document: TermsDocument
  version: string
  effectiveAt: string
  contentUrl?: string
  content?: string
  notify?: boolean
}

export const TERMS_DOC_LABEL: Record<TermsDocument, string> = {
  terms_of_use: 'Termos de Uso',
  privacy_policy: 'Política de Privacidade',
}

export const adminTermsApi = {
  async list(): Promise<{ owners: number; versions: AdminTermsVersion[] }> {
    return (await api.get('/admin/terms/versions')).data
  },
  async publish(body: PublishTermsBody): Promise<{ version: { id: string }; notice: { recipients: number } | null }> {
    return (await api.post('/admin/terms/versions', body)).data
  },
  async notify(id: string): Promise<{ recipients: number }> {
    return (await api.post(`/admin/terms/versions/${id}/notify`)).data
  },
}
