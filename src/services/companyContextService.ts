// ─── Company Context Hub ──────────────────────────────────────────────────────
// Single source of truth for business context.
// Persisted in PostgreSQL via backend API (GET/PATCH /api/context/brain).
// Used by: Agent Builder, CRM Onboarding, Settings → Contexto da IA, Copilot.

import type { BusinessContext } from '@/services/anthropicService'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface BrandFile {
  id: string
  name: string
  size: number
  mimeType: string
  extractedText: string
  addedAt: string
}

export interface CompanyHubData {
  companyName: string
  industry: string
  businessType: string[]
  teamSize: string
  description: string
  productsServices: string
  website: string
  instagram: string
  facebook: string
  linkedin: string
  twitter: string
  whatsapp: string
  brandFiles: BrandFile[]
  lastUpdatedAt: string
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_HUB: CompanyHubData = {
  companyName: '',
  industry: '',
  businessType: [],
  teamSize: '',
  description: '',
  productsServices: '',
  website: '',
  instagram: '',
  facebook: '',
  linkedin: '',
  twitter: '',
  whatsapp: '',
  brandFiles: [],
  lastUpdatedAt: '',
}

// ─── API helpers ─────────────────────────────────────────────────────────────

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

function getToken(): string {
  try {
    const raw = localStorage.getItem('oryon:session')
    if (!raw) return ''
    return (JSON.parse(raw) as { token?: string }).token ?? ''
  } catch { return '' }
}

function headers() {
  return { 'Content-Type': 'application/json' }
}

// In-memory cache to avoid redundant API calls within the same session
let cachedHub: CompanyHubData | null = null
let cachedTenantId: string | null = null

// ─── Load / Save ─────────────────────────────────────────────────────────────

export function loadHub(tenantId: string | undefined): CompanyHubData {
  if (!tenantId) return { ...DEFAULT_HUB }

  // Return cached data if available for this tenant
  if (cachedHub && cachedTenantId === tenantId) return { ...cachedHub }

  // Trigger async fetch (non-blocking — returns defaults immediately)
  fetchHubFromBackend(tenantId).then((data) => {
    if (data) {
      cachedHub = data
      cachedTenantId = tenantId
      window.dispatchEvent(new CustomEvent('oryon:hub:updated', { detail: { tenantId } }))
    }
  })

  return { ...DEFAULT_HUB }
}

export async function loadHubAsync(tenantId: string | undefined): Promise<CompanyHubData> {
  if (!tenantId) return { ...DEFAULT_HUB }
  const data = await fetchHubFromBackend(tenantId)
  if (data) {
    cachedHub = data
    cachedTenantId = tenantId
  }
  return data ?? { ...DEFAULT_HUB }
}

export function saveHub(tenantId: string | undefined, data: CompanyHubData): void {
  if (!tenantId) return

  // Update cache immediately
  cachedHub = { ...data, lastUpdatedAt: new Date().toISOString() }
  cachedTenantId = tenantId

  // Persist to backend (async)
  saveHubToBackend(tenantId, data).catch(() => {
    console.error('[hub] Failed to save to backend')
  })

  window.dispatchEvent(new CustomEvent('oryon:hub:updated', { detail: { tenantId } }))
}

// ─── Backend API ─────────────────────────────────────────────────────────────

async function fetchHubFromBackend(tenantId: string): Promise<CompanyHubData | null> {
  try {
    const res = await fetch(`${API}/context/brain`, { headers: headers(), credentials: 'include' })
    if (!res.ok) return null
    const data = await res.json()
    return { ...DEFAULT_HUB, ...data }
  } catch {
    return null
  }
}

async function saveHubToBackend(tenantId: string, data: CompanyHubData): Promise<void> {
  await fetch(`${API}/context/brain`, {
    method: 'PATCH',
    headers: headers(),
    credentials: 'include',
    body: JSON.stringify(data),
  })
}

// ─── RAG Sync ───────────────────────────────────────────────────────────────

export async function syncBrainToRag(): Promise<{ synced: number; total: number }> {
  const res = await fetch(`${API}/context/brain/sync-to-rag`, {
    method: 'POST',
    headers: headers(),
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Erro ao sincronizar')
  return res.json()
}

// ─── Utilities ───────────────────────────────────────────────────────────────

export function hubHasContent(hub: CompanyHubData): boolean {
  return !!(hub.companyName.trim() || hub.industry.trim() || hub.description.trim())
}

export function bootstrapFromBusinessContext(
  tenantId: string | undefined,
  ctx: BusinessContext,
): void {
  if (!tenantId) return
  loadHubAsync(tenantId).then((existing) => {
    saveHub(tenantId, {
      companyName:      existing.companyName     || ctx.companyName,
      industry:         existing.industry        || ctx.industry,
      businessType:     existing.businessType.length ? existing.businessType : ctx.businessType,
      teamSize:         existing.teamSize        || ctx.teamSize,
      description:      existing.description     || ctx.productDescription,
      productsServices: existing.productsServices,
      website:          existing.website,
      instagram:        existing.instagram,
      facebook:         existing.facebook,
      linkedin:         existing.linkedin,
      twitter:          existing.twitter,
      whatsapp:         existing.whatsapp,
      brandFiles:       existing.brandFiles,
      lastUpdatedAt:    '',
    })
  })
}

// ─── Hub block markers ────────────────────────────────────────────────────────

const HUB_BLOCK_START = '<!-- oryon:hub:start -->'
const HUB_BLOCK_END   = '<!-- oryon:hub:end -->'

export function buildHubContextBlock(hub: CompanyHubData): string {
  if (!hubHasContent(hub)) return ''
  return `\n\n────────────────────────────────\nIDENTIDADE DA EMPRESA:\n${buildHubLines(hub).join('\n')}`
}

export function buildHubBlockForAgent(hub: CompanyHubData): string {
  if (!hubHasContent(hub)) return ''
  const lines = buildHubLines(hub)
  return `${HUB_BLOCK_START}\n## IDENTIDADE DA EMPRESA\n${lines.join('\n')}\n${HUB_BLOCK_END}`
}

function buildHubLines(hub: CompanyHubData): string[] {
  const lines: string[] = []
  if (hub.companyName)         lines.push(`- Empresa: ${hub.companyName}`)
  if (hub.industry)            lines.push(`- Setor: ${hub.industry}`)
  if (hub.businessType.length) lines.push(`- Modelo: ${hub.businessType.join(', ')}`)
  if (hub.teamSize)            lines.push(`- Tamanho da equipe: ${hub.teamSize}`)
  if (hub.description)         lines.push(`- Sobre: ${hub.description.trim()}`)
  if (hub.productsServices)    lines.push(`- Produtos/Serviços: ${hub.productsServices.trim()}`)

  const presence = [
    hub.website   && `Site: ${hub.website}`,
    hub.instagram && `Instagram: ${hub.instagram}`,
    hub.facebook  && `Facebook: ${hub.facebook}`,
    hub.linkedin  && `LinkedIn: ${hub.linkedin}`,
    hub.twitter   && `Twitter/X: ${hub.twitter}`,
    hub.whatsapp  && `WhatsApp: ${hub.whatsapp}`,
  ].filter(Boolean)
  if (presence.length) lines.push(`- Presença online: ${presence.join(' · ')}`)

  const files = (hub.brandFiles ?? []).filter(f => f.extractedText.trim())
  files.forEach(f => {
    lines.push(`- Material da marca (${f.name}):\n${f.extractedText.trim()}`)
  })

  return lines
}

export function injectHubIntoPrompt(currentPrompt: string, hub: CompanyHubData): string {
  const hubBlock = buildHubBlockForAgent(hub)
  const startIdx = currentPrompt.indexOf(HUB_BLOCK_START)
  const endIdx   = currentPrompt.indexOf(HUB_BLOCK_END)
  let stripped = currentPrompt
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = currentPrompt.slice(0, startIdx).trimEnd()
    const after  = currentPrompt.slice(endIdx + HUB_BLOCK_END.length).trimStart()
    stripped = [before, after].filter(Boolean).join('\n\n')
  }
  if (!hubBlock) return stripped
  return `${hubBlock}\n\n${stripped}`
}

export function isAgentStale(agentUpdatedAt: string, hub: CompanyHubData): boolean {
  if (!hub.lastUpdatedAt || !hubHasContent(hub)) return false
  return new Date(hub.lastUpdatedAt) > new Date(agentUpdatedAt)
}

export function hubToBrandLinks(hub: CompanyHubData): string[] {
  return [hub.website, hub.instagram, hub.facebook, hub.linkedin, hub.twitter]
    .map(url => url.trim())
    .filter(url => {
      try { new URL(url); return true } catch { return false }
    })
}
