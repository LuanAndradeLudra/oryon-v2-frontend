// ─── Skill Templates API (frontend) ────────────────────────────────────────
// Wraps the /agents/builder/skill-templates endpoints exposed by agent-server.
// All write endpoints + the tester require super_admin (Oryon staff). Read
// endpoints work for any tenant admin (the customer panel reuses the list).

import { apiFetch } from './agentsApi'
import type {
  SkillTemplate,
  CreateSkillTemplatePayload,
  UpdateSkillTemplatePayload,
  TesterRequest,
  TesterResult,
} from '@/types/skills'

export interface ListTemplatesOptions {
  /** Filter by category (e.g. 'clinic'). */
  category?: string
  /** Only enabled templates (excludes soft-deleted ones). */
  enabledOnly?: boolean
  /** Oryon staff only — show templates from every tenant, not just public + own. */
  all?: boolean
}

function qs(opts: ListTemplatesOptions): string {
  const params = new URLSearchParams()
  if (opts.category) params.set('category', opts.category)
  if (opts.enabledOnly) params.set('enabled_only', 'true')
  if (opts.all) params.set('all', 'true')
  const s = params.toString()
  return s ? `?${s}` : ''
}

export async function listSkillTemplates(opts: ListTemplatesOptions = {}): Promise<SkillTemplate[]> {
  return apiFetch<SkillTemplate[]>(`/skill-templates${qs(opts)}`)
}

export async function getSkillTemplate(id: string): Promise<SkillTemplate> {
  return apiFetch<SkillTemplate>(`/skill-templates/${id}`)
}

export async function createSkillTemplate(
  payload: CreateSkillTemplatePayload,
): Promise<SkillTemplate> {
  return apiFetch<SkillTemplate>('/skill-templates', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateSkillTemplate(
  id: string,
  patch: UpdateSkillTemplatePayload,
): Promise<SkillTemplate> {
  return apiFetch<SkillTemplate>(`/skill-templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export async function deleteSkillTemplate(id: string): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>(`/skill-templates/${id}`, {
    method: 'DELETE',
  })
}

export async function testSkillTemplate(
  id: string,
  payload: TesterRequest,
): Promise<TesterResult> {
  return apiFetch<TesterResult>(`/skill-templates/${id}/test`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
