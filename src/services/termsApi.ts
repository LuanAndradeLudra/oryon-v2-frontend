// ─── Termos da plataforma (SCRUM-666 / H3) ───────────────────────────────────
// Versões vigentes que o usuário ainda não aceitou, registro do aceite, e as
// versões já publicadas que ainda vão entrar em vigor (aviso prévio).

import { api } from './api'

export type TermsDocument = 'terms_of_use' | 'privacy_policy'

export interface TermsVersionInfo {
  id: string
  document: TermsDocument
  version: string
  contentUrl: string | null
  effectiveAt: string
}

/** Rótulo humano do documento. */
export const DOCUMENT_LABEL: Record<TermsDocument, string> = {
  terms_of_use: 'Termos de Uso',
  privacy_policy: 'Política de Privacidade',
}

export const termsApi = {
  async pending(): Promise<TermsVersionInfo[]> {
    const res = await api.get<{ pending: TermsVersionInfo[] }>('/terms/pending')
    return res.data?.pending ?? []
  },

  async upcoming(): Promise<Omit<TermsVersionInfo, 'id'>[]> {
    const res = await api.get<{ upcoming: Omit<TermsVersionInfo, 'id'>[] }>('/terms/upcoming')
    return res.data?.upcoming ?? []
  },

  async accept(termsVersionId: string): Promise<void> {
    await api.post('/terms/accept', { termsVersionId })
  },
}
