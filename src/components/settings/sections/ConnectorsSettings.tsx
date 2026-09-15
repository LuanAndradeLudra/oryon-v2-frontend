// ─── Connectors Settings — the integrations hub (Settings → Conectores) ────
// Redesigned 2026-09-14 into the two-level hub+toggle model (this file), then
// restyled 2026-09-15 (round 1) into a marketplace-grade catalog using each
// brand's OWN official color (src/data/brandIcons.ts), then structurally
// redone 2026-09-15 (round 2 — "A+B combo") after visual feedback that a top
// accent line + rounded corners wasn't a real redesign:
//
//   A — Vercel/Intercom "header band": a SOLID brand-color band across the
//       top of the card (not a thin line) with the logo floating in an
//       always-white circle straddling the band/content boundary.
//   B — Raycast/Segment "icon-forward minimal": the content zone below the
//       band drops the description and vendor line entirely — just the name
//       and a button-styled CTA. Full descriptions moved to the new
//       ConnectorDetailModal (ClickUp-style: opens on card click, shows
//       long_description + capabilities before any credential form).
//
// Category filtering is a single dropdown (Linear/Raycast-style) instead of
// a pill row — a pill row scales badly past ~8 categories and this catalog
// has 9. The grid itself is full-width (see SettingsLayout's `fullWidth`
// prop) since the previous max-w-4xl reading column wasted the two side
// margins on what is fundamentally a wide marketplace grid, not prose.
//
// This is the ONLY place a credential gets typed in. Big players converge on
// this exact two-level shape — Anthropic's Connectors and OpenAI's ChatGPT
// Connectors both install once at the workspace level, then let each
// assistant/project/GPT opt in with a toggle. `SkillsTab`'s "Conectores"
// section only toggles what's installed here (see `ConnectorTogglesSection.tsx`).
//
// Reachable only for owner-tier (business_admin/super_admin) — SettingsPage
// redirects everyone else before this ever mounts, so no in-component role
// branching is needed here.

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Plug, AlertCircle, CheckCircle2, Lock, Beaker, Inbox, Search, Clock, ArrowRight,
  ChevronDown, ListFilter, ExternalLink,
} from 'lucide-react'
import {
  listConnectors,
  getConnectorDetail,
  installConnector,
  updateConnectorInstallation,
  testConnectorInstallation,
  requestConnector,
} from '@/services/connectorsApi'
import type { ConnectorSummary, ConnectorDetail, TestConnectorResult } from '@/types/connectors'
import type { JsonSchemaObject, JsonSchemaProperty } from '@/types/skills'
import { SectionHeader } from '../SectionHeader'
import { CategoryIcon, getCategoryIcon, getCategoryAccent } from '@/components/skills/CategoryIcon'
import { getBrandIcon } from '@/data/brandIcons'
import { Modal } from '@/components/ui/Modal'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { DynamicSchemaFormFields } from '@/components/shared/DynamicSchemaFormFields'
import { useToast } from '@/hooks/useToast'
import { usePlanGate } from '@/hooks/usePlanGate'
import { PLANS } from '@/config/plans'
import { cn } from '@/lib/utils'

const CATEGORY_LABELS: Record<string, string> = {
  clinic: 'Clínicas',
  crm: 'CRM & Leads',
  calendar: 'Agenda',
  payments: 'Pagamentos',
  ecommerce: 'E-commerce',
  productivity: 'Produtividade',
  forms: 'Formulários',
  tasks: 'Tarefas',
  custom: 'Outros',
}

const INSTALLABLE_STATUSES = new Set(['live', 'pilot'])

export function ConnectorsSettings() {
  const { allowed: planAllowed, upgrade } = usePlanGate('integrations')
  const [rows, setRows] = useState<ConnectorSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [managing, setManaging] = useState<ConnectorSummary | null>(null)
  const [prioritizing, setPrioritizing] = useState<ConnectorSummary | null>(null)
  const [requesting, setRequesting] = useState(false)
  const [viewingDetail, setViewingDetail] = useState<ConnectorSummary | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false)

  const reload = useCallback(() => {
    if (!planAllowed) { setLoading(false); return }
    setLoading(true)
    setLoadError(null)
    listConnectors()
      .then(setRows)
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [planAllowed])

  useEffect(reload, [reload])

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const c of rows) counts.set(c.category, (counts.get(c.category) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((c) => {
      if (categoryFilter && c.category !== categoryFilter) return false
      if (!q) return true
      return (
        c.name.toLowerCase().includes(q) ||
        (c.vendor ?? '').toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      )
    })
  }, [rows, search, categoryFilter])

  const installedCount = useMemo(() => rows.filter((c) => c.installed).length, [rows])

  return (
    <div>
      <SectionHeader
        title="Conectores"
        description="Conecte sistemas externos aos agentes de IA do seu negócio. Depois de instalar aqui, ative por agente na aba Skills de cada um."
        action={
          planAllowed ? (
            <Button variant="secondary" onClick={() => setRequesting(true)}>
              <Inbox className="w-3.5 h-3.5 mr-1.5 inline" /> Solicitar integração
            </Button>
          ) : undefined
        }
      />

      {!planAllowed ? (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-surface-900/40 border border-surface-800 text-sm">
          <Lock className="w-4 h-4 text-surface-500 flex-shrink-0 mt-0.5" />
          <p className="text-surface-400">
            Disponível a partir do plano <strong className="text-surface-200">{upgrade ? PLANS[upgrade].name : 'Business'}</strong>.
            Fale com seu gerente de conta para fazer upgrade.
          </p>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }, (_, i) => <SkeletonCard key={i} lines={2} />)}
        </div>
      ) : loadError ? (
        <ErrorState hint={loadError} onRetry={reload} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Plug}
          title="Nenhum conector disponível ainda"
          hint="Assim que a Oryon liberar uma integração pro seu plano, ela aparece aqui."
          action={{ label: 'Solicitar uma integração', onClick: () => setRequesting(true) }}
        />
      ) : (
        <>
          {/* Stat strip — quick orientation before scrolling a 30-card grid. */}
          <div className="flex items-center gap-4 mb-4 text-xs text-surface-500">
            <span><strong className="text-surface-200 font-semibold">{rows.length}</strong> no catálogo</span>
            {installedCount > 0 && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-status-active" />
                <strong className="text-surface-200 font-semibold">{installedCount}</strong> instalado{installedCount !== 1 && 's'}
              </span>
            )}
          </div>

          {/* Search + single category dropdown — a pill row scales badly
              past ~8 categories (this catalog has 9); Linear/Raycast solve
              this with one filter button that opens a menu instead. */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, fornecedor ou o que faz…"
                aria-label="Buscar conector"
                className="w-full bg-surface-900/60 border border-surface-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 transition-colors"
              />
            </div>
            <Dropdown
              open={categoryMenuOpen}
              onClose={() => setCategoryMenuOpen(false)}
              align="right"
              anchor={
                <button
                  type="button"
                  onClick={() => setCategoryMenuOpen((v) => !v)}
                  className={cn(
                    'inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium ring-1 transition-colors whitespace-nowrap',
                    categoryFilter
                      ? 'bg-surface-100 text-surface-950 ring-surface-100'
                      : 'bg-surface-900/60 text-surface-300 ring-surface-800 hover:ring-surface-700',
                  )}
                >
                  <ListFilter className="w-4 h-4" />
                  {categoryFilter ? (CATEGORY_LABELS[categoryFilter] ?? categoryFilter) : 'Categoria'}
                  <span className={cn('tabular-nums text-xs', categoryFilter ? 'text-surface-600' : 'text-surface-500')}>
                    {categoryFilter ? filtered.length : rows.length}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 -mr-0.5" />
                </button>
              }
            >
              <DropdownItem onClick={() => { setCategoryFilter(null); setCategoryMenuOpen(false) }} active={categoryFilter === null}>
                Todas as categorias
                <span className="ml-auto text-xs text-surface-500 tabular-nums">{rows.length}</span>
              </DropdownItem>
              {categories.map(([cat, count]) => (
                <DropdownItem
                  key={cat}
                  icon={getCategoryIcon(cat)}
                  active={categoryFilter === cat}
                  onClick={() => { setCategoryFilter(cat === categoryFilter ? null : cat); setCategoryMenuOpen(false) }}
                >
                  {CATEGORY_LABELS[cat] ?? cat}
                  <span className="ml-auto text-xs text-surface-500 tabular-nums">{count}</span>
                </DropdownItem>
              ))}
            </Dropdown>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-surface-500">
              Nenhum conector
              {search.trim() && <> bate com "{search}"</>}
              {categoryFilter && <> em {CATEGORY_LABELS[categoryFilter] ?? categoryFilter}</>}.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {filtered.map((c) => (
                <ConnectorCard
                  key={c.id}
                  connector={c}
                  onOpenDetail={() => setViewingDetail(c)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {viewingDetail && (
        <ConnectorDetailModal
          connector={viewingDetail}
          onClose={() => setViewingDetail(null)}
          onManage={() => { setManaging(viewingDetail); setViewingDetail(null) }}
          onPrioritize={() => { setPrioritizing(viewingDetail); setViewingDetail(null) }}
        />
      )}

      {managing && (
        <ConnectorManageModal
          connector={managing}
          onClose={() => setManaging(null)}
          onSaved={() => { setManaging(null); reload() }}
        />
      )}

      {(requesting || prioritizing) && (
        <RequestConnectorModal
          defaultName={prioritizing?.name}
          onClose={() => { setRequesting(false); setPrioritizing(null) }}
        />
      )}
    </div>
  )
}

// ─── Accent resolution — the brand's OWN color when we have it, category
// color as fallback. Drives the logo tint, the card's top strip, and the
// hover glow — one color per card, not a fixed grayscale/generic palette. ──

function getConnectorAccentColor(connector: ConnectorSummary): string {
  return getBrandIcon(connector.slug)?.hex ?? getCategoryAccent(connector.category)
}

// ─── Logo — inline SVG rendered in the brand's real color, on a light
// neutral chip (deliberately NOT tinted by the brand color itself: several
// official colors are near-black — Notion #000, Typeform #262627, Slack's
// dark aubergine — and a same-hue tint would nearly disappear against the
// app's dark card surfaces exactly the way the old black-only silhouette
// did). The chip's only job is guaranteed contrast for ANY brand color;
// the mark itself carries all the real identity. Falls back to an `<img>`
// (for any future non-vector logo_url) and finally to the category-accent
// glyph for the ~12 connectors with no confirmed brand asset yet. ─────────

function ConnectorLogo({ connector, size = 48 }: { connector: ConnectorSummary; size?: number }) {
  const [imgErrored, setImgErrored] = useState(false)
  const brand = getBrandIcon(connector.slug)

  if (brand) {
    return (
      <div
        className="rounded-2xl bg-white flex items-center justify-center flex-shrink-0 ring-1 ring-black/[0.06] shadow-sm"
        style={{ width: size, height: size }}
      >
        <svg viewBox={brand.viewBox} style={{ width: size * 0.52, height: size * 0.52 }} fill={brand.hex} aria-hidden="true">
          <path d={brand.path} />
        </svg>
      </div>
    )
  }

  if (connector.logo_url && !imgErrored) {
    return (
      <div
        className="rounded-2xl bg-white flex items-center justify-center flex-shrink-0 ring-1 ring-black/[0.06] shadow-sm"
        style={{ width: size, height: size }}
      >
        <img
          src={connector.logo_url}
          alt=""
          className="object-contain"
          style={{ width: size * 0.58, height: size * 0.58 }}
          onError={() => setImgErrored(true)}
        />
      </div>
    )
  }

  return <CategoryIcon category={connector.category} tone="accent" size={size} />
}

// ─── Card — structural "A+B" combo (2026-09-15 round 2) ─────────────────────
// A (header band): a SOLID brand-color band across the card's top third,
// not a decorative line — this is the actual structural change from the
// previous version, which only added a 1px gradient strip. The logo sits in
// an always-white circle straddling the band/content seam (Vercel/Intercom's
// signature move — it visually "pins" the two zones together).
// B (minimal content): everything below the seam is just the name, a small
// category eyebrow, and a button-styled CTA. No description, no vendor line
// — both read better in the new ConnectorDetailModal, which opens on ANY
// card click (installable or not) instead of jumping straight to a form.

function ConnectorCard({
  connector,
  onOpenDetail,
}: {
  connector: ConnectorSummary
  onOpenDetail: () => void
}) {
  const installable = INSTALLABLE_STATUSES.has(connector.status)
  const accent = getConnectorAccentColor(connector)
  const comingSoon = !installable

  return (
    <button
      type="button"
      onClick={onOpenDetail}
      style={{ '--card-accent': accent } as React.CSSProperties}
      className={cn(
        'group relative flex flex-col text-left rounded-2xl border overflow-hidden transition-all duration-200',
        'hover:-translate-y-1 hover:shadow-[0_20px_44px_-18px_var(--card-accent)]',
        connector.installed
          ? 'bg-surface-900 border-surface-700'
          : installable
            ? 'bg-surface-900/70 border-surface-800 hover:border-surface-700'
            : 'bg-surface-900/40 border-surface-800/70 hover:border-surface-700/70',
      )}
    >
      {/* A — header band. Coming-soon connectors get the brand hue blended
          toward the surface (still recognizably tinted, but visibly
          secondary to what's actually installable today). */}
      <div
        className="relative h-[72px] flex-shrink-0"
        style={{
          background: comingSoon
            ? 'color-mix(in srgb, var(--card-accent) 32%, var(--color-surface-800))'
            : 'var(--card-accent)',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-black/15 pointer-events-none" />

        {(connector.installed || comingSoon) && (
          <span
            className={cn(
              'absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/95 shadow-sm',
              connector.installed ? 'text-status-active' : 'text-surface-600',
            )}
          >
            {connector.installed ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
            {connector.installed ? 'Instalado' : 'Em breve'}
          </span>
        )}

        <div className="absolute left-1/2 -bottom-6 -translate-x-1/2">
          <ConnectorLogo connector={connector} size={48} />
        </div>
      </div>

      {/* B — minimal content zone. Description is a single truncated line
          (not the old 2-line block) — enough to say WHAT it does without
          bringing back the clutter the "B" direction removed; the full copy
          lives in the detail modal. */}
      <div className="flex flex-col items-center flex-1 pt-9 pb-3.5 px-3 text-center">
        <p className="text-[13.5px] font-bold text-surface-100 tracking-tight leading-snug line-clamp-2 min-h-[2.1rem] flex items-center">
          {connector.name}
        </p>
        <span className="text-[10px] uppercase tracking-wider text-surface-600 font-semibold mt-0.5 mb-1.5">
          {CATEGORY_LABELS[connector.category] ?? connector.category}
        </span>
        <p className="text-[11px] leading-snug text-surface-500 line-clamp-1 mb-3 w-full px-0.5">
          {connector.description}
        </p>

        <span
          className={cn(
            'mt-auto inline-flex items-center justify-center gap-1 w-full py-1.5 rounded-lg text-[11px] font-semibold transition-colors',
            connector.installed
              ? 'bg-surface-800 text-surface-300 group-hover:bg-surface-700 group-hover:text-surface-100'
              : installable
                ? 'bg-brand-500/10 text-brand-300 ring-1 ring-brand-500/25 group-hover:bg-brand-500/15'
                : 'bg-surface-800/50 text-surface-500 group-hover:text-surface-300',
          )}
        >
          {connector.installed ? 'Gerenciar' : installable ? 'Conectar' : 'Ver detalhes'}
          <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  )
}

// ─── Detail modal (ClickUp-style) ───────────────────────────────────────────
// Opens on ANY card click — installable or "Em breve" — before the user ever
// sees a credential form. Shows the same rich copy ClickUp shows when you
// open one of its integrations from the directory: what it is, what it does
// (a capability list), and a docs link, with the actual "Conectar"/
// "Priorizar" action as a footer CTA rather than the modal's whole purpose.

type DetailTab = 'overview' | 'howworks' | 'reqs'

interface SchemaFieldSummary {
  key: string
  label: string
  required: boolean
  description?: string
}

/** snake_case/kebab-case schema key → human label. Schemas don't carry a
 *  display title (see JsonSchemaProperty) — this is the same information a
 *  reader needs, just not shouted in `font-mono` the way the staff-only
 *  DynamicSchemaFormFields renders it. */
function humanizeFieldKey(key: string): string {
  return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function getSchemaFieldSummaries(schema: JsonSchemaObject | unknown[] | null | undefined): SchemaFieldSummary[] {
  if (!schema || Array.isArray(schema)) return []
  const obj = schema as JsonSchemaObject
  const required = new Set(obj.required ?? [])
  return Object.entries(obj.properties ?? {}).map(([key, prop]: [string, JsonSchemaProperty]) => ({
    key,
    label: humanizeFieldKey(key),
    required: required.has(key),
    description: prop.description,
  }))
}

function DetailTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'py-2.5 text-[13px] font-semibold border-b-2 -mb-px transition-colors',
        active ? 'text-surface-100 border-brand-400' : 'text-surface-500 border-transparent hover:text-surface-300',
      )}
    >
      {children}
    </button>
  )
}

// ClickUp-style large detail modal, redesigned 2026-09-15 (round 3) into the
// "hero editorial + abas" combo the user approved from a 6-way mock review:
// a tall abstract brand-pattern hero (no product screenshots — see the
// design-review artifact for why) carrying the logo/name/category directly
// on it, then tabs. The "Visão geral" tab carries EVERYTHING the earlier
// single-scroll version showed (description + capabilities) unchanged —
// tabs here only ADD content ("Como funciona", "Requisitos") that didn't
// exist before; they never split or hide what was already there.
function ConnectorDetailModal({
  connector,
  onClose,
  onManage,
  onPrioritize,
}: {
  connector: ConnectorSummary
  onClose: () => void
  onManage: () => void
  onPrioritize: () => void
}) {
  const [detail, setDetail] = useState<ConnectorDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<DetailTab>('overview')
  const installable = INSTALLABLE_STATUSES.has(connector.status)
  const accent = getConnectorAccentColor(connector)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    getConnectorDetail(connector.id)
      .then((d) => { if (!cancelled) setDetail(d) })
      .catch((err) => { if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err)) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [connector.id])

  const schemaFields = useMemo(() => getSchemaFieldSummaries(detail?.config_schema), [detail])

  return (
    <Modal
      open
      onClose={onClose}
      className="max-w-xl"
      bodyClassName="p-0"
      title={<span className="sr-only">{connector.name}</span>}
      footer={
        <div className="flex justify-between items-center gap-2 w-full">
          {connector.docs_url ? (
            <a
              href={connector.docs_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-surface-500 hover:text-surface-300 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Documentação
            </a>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Fechar</Button>
            {connector.installed ? (
              <Button onClick={onManage}>Gerenciar credencial</Button>
            ) : installable ? (
              <Button onClick={onManage}>Conectar</Button>
            ) : (
              <Button onClick={onPrioritize}>Priorizar essa integração</Button>
            )}
          </div>
        </div>
      }
    >
      {/* Hero — abstract brand-color pattern instead of a product
          screenshot (see design-review artifact for the rationale): three
          soft radial blobs in the brand's own color, a faint dot-grid for
          texture, and a scrim so the overlaid name/category stay legible
          regardless of how light or dark the brand's own color is. */}
      <div
        className="relative h-[168px] flex-shrink-0 overflow-hidden"
        style={{
          background: [
            `radial-gradient(circle at 18% 26%, color-mix(in srgb, ${accent} 60%, transparent) 0%, transparent 46%)`,
            `radial-gradient(circle at 82% 18%, color-mix(in srgb, ${accent} 42%, transparent) 0%, transparent 50%)`,
            `radial-gradient(circle at 60% 90%, color-mix(in srgb, ${accent} 34%, transparent) 0%, transparent 55%)`,
            'var(--color-surface-800)',
          ].join(', '),
        }}
      >
        <div
          className="absolute inset-0 opacity-55 mix-blend-overlay pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,.14) 1px, transparent 1.6px)', backgroundSize: '15px 15px' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/70 pointer-events-none" />

        {(connector.installed || !installable) && (
          <span
            className={cn(
              'absolute top-3 right-3 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/95 shadow-sm',
              connector.installed ? 'text-status-active' : 'text-surface-600',
            )}
          >
            {connector.installed ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {connector.installed ? 'Instalado' : 'Em breve'}
          </span>
        )}

        <div className="absolute left-6 right-6 bottom-4 z-10 flex items-center gap-3.5">
          <ConnectorLogo connector={connector} size={52} />
          <div className="min-w-0">
            <h3 className="text-lg font-display font-bold text-white tracking-tight truncate">{connector.name}</h3>
            <p className="text-xs text-white/80 truncate">
              {CATEGORY_LABELS[connector.category] ?? connector.category}
              {connector.vendor && connector.vendor !== connector.name && <> · {connector.vendor}</>}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-5 px-6 border-b border-surface-800">
        <DetailTabButton active={tab === 'overview'} onClick={() => setTab('overview')}>Visão geral</DetailTabButton>
        <DetailTabButton active={tab === 'howworks'} onClick={() => setTab('howworks')}>Como funciona</DetailTabButton>
        <DetailTabButton active={tab === 'reqs'} onClick={() => setTab('reqs')}>Requisitos</DetailTabButton>
      </div>

      <div className="px-6 py-5 min-h-[220px]">
        {loading ? (
          <div className="space-y-2 py-2">
            <div className="h-3.5 bg-surface-800 rounded animate-pulse w-full" />
            <div className="h-3.5 bg-surface-800 rounded animate-pulse w-5/6" />
            <div className="h-3.5 bg-surface-800 rounded animate-pulse w-2/3" />
          </div>
        ) : loadError ? (
          <p className="text-sm text-danger">{loadError}</p>
        ) : tab === 'overview' ? (
          <>
            {/* Everything the single-scroll version already showed — the
                new tabs only add content, they never split this. */}
            <p className="text-sm text-surface-300 leading-relaxed mb-5">
              {detail?.long_description || connector.description}
            </p>

            {detail?.capabilities && detail.capabilities.length > 0 && (
              <div className="grid grid-cols-2 gap-2.5">
                {detail.capabilities.map((cap, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-3 rounded-xl bg-surface-800/70 border border-surface-700/70 text-xs leading-snug text-surface-300"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-status-active flex-shrink-0 mt-0.5" />
                    {cap}
                  </div>
                ))}
              </div>
            )}

            {!installable && (
              <div className="mt-5 flex items-start gap-2.5 p-3 rounded-lg bg-surface-800/60 border border-surface-700/60 text-xs text-surface-400">
                <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <p>Essa integração está na biblioteca de conectores pesquisados, mas ainda não foi construída. Priorize se ela for importante para o seu negócio.</p>
              </div>
            )}
          </>
        ) : tab === 'howworks' ? (
          <ol className="space-y-3.5">
            <HowItWorksStep n={1}>Conecte a credencial aqui, uma vez por tenant.</HowItWorksStep>
            <HowItWorksStep n={2}>Ative o conector nos agentes que devem usá-lo, na aba Skills de cada um.</HowItWorksStep>
            <HowItWorksStep n={3}>{`O agente passa a consultar e atualizar o ${connector.name} durante as conversas.`}</HowItWorksStep>
          </ol>
        ) : schemaFields.length > 0 ? (
          <ul className="space-y-3">
            {schemaFields.map((f) => (
              <li key={f.key} className="flex items-start gap-2.5 text-sm text-surface-300">
                <span className="text-surface-600 mt-0.5">—</span>
                <span className="leading-snug">
                  <strong className="text-surface-100 font-medium">{f.label}</strong>
                  {f.required && <span className="text-danger ml-1">*</span>}
                  {f.description && <> — {f.description}</>}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-surface-500">
            Sem requisitos técnicos além de uma conta ativa {connector.vendor ? `no ${connector.vendor}` : 'no fornecedor'}.
          </p>
        )}
      </div>
    </Modal>
  )
}

function HowItWorksStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-sm text-surface-300 leading-relaxed">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-surface-800 ring-1 ring-surface-600 flex items-center justify-center text-[11px] font-bold text-surface-300">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  )
}

// ─── Manage modal (install or edit) ─────────────────────────────────────────

function hasUnsupportedFieldTypes(schema: JsonSchemaObject | unknown[] | null): boolean {
  if (!schema || Array.isArray(schema)) return false
  const props = (schema as JsonSchemaObject).properties ?? {}
  return Object.values(props).some((p) => p.type === 'object' || p.type === 'array')
}

function ConnectorManageModal({
  connector,
  onClose,
  onSaved,
}: {
  connector: ConnectorSummary
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [detail, setDetail] = useState<ConnectorDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestConnectorResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    getConnectorDetail(connector.id)
      .then((d) => {
        setDetail(d)
        if (d.current_config) setValues(d.current_config)
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [connector.id])

  const schema = detail?.config_schema ?? null
  const unsupported = hasUnsupportedFieldTypes(schema)
  const required = !schema || Array.isArray(schema) ? [] : (schema as JsonSchemaObject).required ?? []
  const canSubmit =
    !loading && !unsupported && required.every((k) => {
      const v = values[k]
      return v !== undefined && v !== null && v !== ''
    })

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      setTestResult(await testConnectorInstallation(connector.id, values))
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : String(err) })
    } finally {
      setTesting(false)
    }
  }

  async function handleSave() {
    setSubmitting(true)
    try {
      if (connector.installed) {
        await updateConnectorInstallation(connector.id, values)
        toast(`Credencial de ${connector.name} atualizada`, 'success')
      } else {
        await installConnector(connector.id, values)
        toast(`${connector.name} conectado — ative nos agentes que quiser usar`, 'success')
      }
      onSaved()
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <ConnectorLogo connector={connector} size={32} />
          <span>{connector.installed ? `Editar credencial — ${connector.name}` : `Conectar ${connector.name}`}</span>
        </div>
      }
      footer={
        !loading && !unsupported ? (
          <div className="flex justify-between items-center gap-2 w-full">
            <Button variant="ghost" onClick={handleTest} disabled={!canSubmit || testing || submitting}>
              <Beaker className="w-3.5 h-3.5 mr-1.5 inline" /> {testing ? 'Testando…' : 'Testar conexão'}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!canSubmit || submitting}>
                {submitting ? 'Salvando…' : connector.installed ? 'Salvar' : 'Conectar'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button variant="ghost" onClick={onClose}>Fechar</Button>
          </div>
        )
      }
    >
      {loading ? (
        <div className="py-6"><SkeletonCard lines={3} /></div>
      ) : loadError ? (
        <p className="text-sm text-danger">{loadError}</p>
      ) : unsupported ? (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/30 text-sm text-surface-300">
          <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <p>Esta integração ainda não pode ser configurada por aqui — fale com a Oryon para ativá-la.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {connector.installed && (
            <p className="text-xs text-surface-500">
              Deixe um campo de credencial como está se não quiser alterá-lo — só campos preenchidos de novo são atualizados.
            </p>
          )}
          {connector.docs_url && (
            <p className="text-xs text-surface-500">
              <a href={connector.docs_url} target="_blank" rel="noreferrer" className="underline hover:text-surface-300">
                Ver documentação da integração
              </a>
            </p>
          )}
          <DynamicSchemaFormFields
            schema={schema}
            values={values}
            onChange={(v) => { setValues(v); setTestResult(null) }}
          />
          {testResult && (
            <div
              className={cn(
                'flex items-start gap-2 p-3 rounded-lg border text-xs',
                testResult.success
                  ? 'bg-status-active/10 border-status-active/30 text-status-active'
                  : 'bg-danger/10 border-danger/30 text-danger',
              )}
            >
              {testResult.success
                ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

// ─── Request modal (demand signal, SCRUM-1077 — also used to "prioritize"
// one of the library's 29 not-yet-built connectors) ─────────────────────────

function RequestConnectorModal({
  defaultName,
  onClose,
}: {
  /** When set, the request is framed as "priorizar X" and the name field is
   *  locked — this is the click-through from a "Em breve" card, not a
   *  freeform request for something totally new. */
  defaultName?: string
  onClose: () => void
}) {
  const { toast } = useToast()
  const [name, setName] = useState(defaultName ?? '')
  const [useCase, setUseCase] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const canSubmit = name.trim().length > 0 && useCase.trim().length > 0
  const locked = !!defaultName

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await requestConnector(name.trim(), useCase.trim())
      toast(locked ? `Prioridade registrada — a Oryon vai avaliar ${name}` : 'Solicitação registrada — a Oryon vai avaliar', 'success')
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={locked ? `Priorizar ${defaultName}` : 'Solicitar uma integração'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? 'Enviando…' : 'Enviar solicitação'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {locked ? (
          <p className="text-xs text-surface-500">
            {defaultName} já está no nosso radar (biblioteca de conectores pesquisados) mas ainda não foi construído.
            Conte pra que você usaria e isso ajuda a priorizar o que constrói primeiro.
          </p>
        ) : (
          <FormField label="Qual sistema você quer conectar?" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Sistema XPTO" />
          </FormField>
        )}
        <FormField label="Pra que você usaria essa integração?" required>
          <Textarea
            rows={3}
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            placeholder="Descreva rapidamente o que você precisa fazer"
          />
        </FormField>
      </div>
    </Modal>
  )
}
