import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { X, Search, Users } from 'lucide-react'
import { getReadableTextColor } from '@/lib/colorPalette'
import { CATEGORY_LABELS } from '../../constants'
import { CONTACT_FIELDS, INTENT_OPTIONS, SOURCE_OPTIONS, SENTIMENT_OPTIONS } from '../constants'
import { TemplatePreview } from '../../TemplatePreview'
import { cn } from '@/lib/utils'
import type {
  Contact, ContactIntent, ContactSource, ContactSentiment,
  WhatsAppTemplate, CampaignSegment, CampaignVariableMapping, Tag,
  ContactCustomFieldDef,
} from '@/types'

export function Step5Revisao({
  template, mappings, fieldDefs, segmentType,
  tags, stages, contacts,
  selectedTagIds, selectedStages, selectedContactIds,
  filterStages, filterTagIds, filterIntent, filterSource, filterOptIn,
  filterSentiment, filterContactSearch, filterHasConversations,
  estimatedReach, scheduleMode, scheduledAt, campaignName,
}: {
  template: WhatsAppTemplate
  mappings: CampaignVariableMapping[]
  fieldDefs: ContactCustomFieldDef[]
  segmentType: CampaignSegment['type']
  tags: Tag[]
  stages: { key: string; label: string; color: string }[]
  contacts: Contact[]
  selectedTagIds: string[]
  selectedStages: string[]
  selectedContactIds: string[]
  filterStages: string[]
  filterTagIds: string[]
  filterIntent: ContactIntent[]
  filterSource: ContactSource[]
  filterOptIn: boolean | undefined
  filterSentiment: ContactSentiment[]
  filterContactSearch: string
  filterHasConversations: boolean | undefined
  estimatedReach: number | null
  scheduleMode: 'now' | 'later'
  scheduledAt: string
  campaignName: string
}) {
  const [showContactsModal, setShowContactsModal] = useState(false)

  const segmentLabels: Record<CampaignSegment['type'], string> = {
    all:    'Toda a base',
    tag:    'Por tags selecionadas',
    stage:  'Por estágio do CRM',
    manual: 'Seleção manual',
    filter: 'Filtro avançado',
  }

  // Build preview vars from mappings
  const previewVars: Record<string, string> = {}
  mappings.forEach((m) => {
    const val = m.source === 'literal'       ? (m.literal ?? '') :
                m.source === 'contact_field' ? (CONTACT_FIELDS.find((f) => f.value === m.contactField)?.label ?? m.contactField ?? '') :
                fieldDefs.find((f) => f.key === m.customFieldKey)?.label ?? m.customFieldKey ?? ''
    previewVars[String(m.position)] = val || `{{${m.position}}}`
  })

  // Build active filter pills for the "filter" segment type
  const filterPills: { label: string; color?: string }[] = []
  if (segmentType === 'filter') {
    filterStages.forEach((key) => {
      const stage = stages.find((s) => s.key === key)
      if (stage) filterPills.push({ label: `Estágio: ${stage.label}`, color: stage.color })
    })
    filterTagIds.forEach((id) => {
      const tag = tags.find((t) => t.id === id)
      if (tag) filterPills.push({ label: `Tag: ${tag.name}`, color: tag.color })
    })
    filterIntent.forEach((v) => {
      const opt = INTENT_OPTIONS.find((o) => o.value === v)
      filterPills.push({ label: `Intenção: ${opt?.label ?? v}` })
    })
    filterSource.forEach((v) => {
      const opt = SOURCE_OPTIONS.find((o) => o.value === v)
      filterPills.push({ label: `Origem: ${opt?.label ?? v}` })
    })
    if (filterOptIn !== undefined) filterPills.push({ label: filterOptIn ? 'Com opt-in' : 'Sem opt-in' })
    filterSentiment.forEach((v) => {
      const opt = SENTIMENT_OPTIONS.find((o) => o.value === v)
      filterPills.push({ label: `Sentimento: ${opt?.label ?? v}` })
    })
    if (filterContactSearch.trim()) filterPills.push({ label: `Busca: "${filterContactSearch.trim()}"` })
    if (filterHasConversations !== undefined) filterPills.push({ label: filterHasConversations ? 'Com conversas' : 'Sem conversas' })
  }

  const scheduleDisplay = scheduleMode === 'now'
    ? 'Imediatamente após criar'
    : scheduledAt
      ? new Date(scheduledAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
      : '—'

  return (
    <div className="flex gap-5">
      {/* Left column */}
      <div className="flex-1 space-y-4">
        {/* Card: Campaign info */}
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-surface-300 uppercase tracking-wider">Campanha</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500">Nome</span>
              <span className="text-xs font-medium text-surface-100">{campaignName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500">Template</span>
              <span className="text-xs font-mono text-brand-300 bg-brand-400/10 px-2 py-0.5 rounded">{template.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500">Categoria</span>
              <span className="text-xs text-surface-300 bg-surface-700 px-2 py-0.5 rounded">{CATEGORY_LABELS[template.category] ?? template.category}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500">Envio</span>
              <span className="text-xs text-surface-300">{scheduleDisplay}</span>
            </div>
            {mappings.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-500">Variáveis</span>
                <span className="text-xs text-surface-300">{mappings.length} variáve{mappings.length === 1 ? 'l' : 'is'} mapeada{mappings.length === 1 ? '' : 's'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card: Segment info */}
        <div className="bg-surface-800/50 border border-surface-700 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-surface-300 uppercase tracking-wider">Segmento</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-surface-500">Tipo</span>
            <span className="text-xs text-surface-300">{segmentLabels[segmentType]}</span>
          </div>
          {estimatedReach !== null && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500">Alcance estimado</span>
              <span className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded-full',
                estimatedReach === 0
                  ? 'text-danger bg-danger/10'
                  : 'text-status-active bg-status-active-bg'
              )}>
                {estimatedReach} contato{estimatedReach === 1 ? '' : 's'}
              </span>
            </div>
          )}

          {/* Manual contacts preview */}
          {segmentType === 'manual' && selectedContactIds.length > 0 && (
            <div>
              <p className="text-[11px] text-surface-500 mb-1.5">Contatos selecionados:</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedContactIds.slice(0, 5).map((id) => {
                  const c = contacts.find((ct) => ct.id === id)
                  return (
                    <span key={id} className="text-[10px] text-surface-300 bg-surface-700 px-1.5 py-0.5 rounded">
                      {c?.displayName ?? id}
                    </span>
                  )
                })}
                {selectedContactIds.length > 5 && (
                  <span className="text-[10px] text-surface-500">+{selectedContactIds.length - 5} mais</span>
                )}
              </div>
            </div>
          )}

          {/* Tag segment */}
          {segmentType === 'tag' && selectedTagIds.length > 0 && (
            <div>
              <p className="text-[11px] text-surface-500 mb-1.5">Tags:</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedTagIds.map((id) => {
                  const tag = tags.find((t) => t.id === id)
                  return tag ? (
                    <span key={id} className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ backgroundColor: tag.color, color: getReadableTextColor(tag.color) }}>
                      {tag.name}
                    </span>
                  ) : null
                })}
              </div>
            </div>
          )}

          {/* Stage segment */}
          {segmentType === 'stage' && selectedStages.length > 0 && (
            <div>
              <p className="text-[11px] text-surface-500 mb-1.5">Estágios:</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedStages.map((key) => {
                  const stage = stages.find((s) => s.key === key)
                  return stage ? (
                    <span key={key} className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ backgroundColor: stage.color, color: getReadableTextColor(stage.color) }}>
                      {stage.label}
                    </span>
                  ) : null
                })}
              </div>
            </div>
          )}

          {/* Filter pills */}
          {segmentType === 'filter' && filterPills.length > 0 && (
            <div>
              <p className="text-[11px] text-surface-500 mb-1.5">{filterPills.length} filtro{filterPills.length === 1 ? '' : 's'} ativo{filterPills.length === 1 ? '' : 's'}:</p>
              <div className="flex flex-wrap gap-1.5">
                {filterPills.map((pill, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded font-medium"
                    style={pill.color
                      ? { backgroundColor: pill.color, color: '#fff' }
                      : { backgroundColor: 'color-mix(in srgb, var(--color-accent-violet) 15%, transparent)', color: 'var(--color-accent-violet)', border: '1px solid color-mix(in srgb, var(--color-accent-violet) 30%, transparent)' }
                    }
                  >
                    {pill.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Verify contacts button */}
          {estimatedReach !== null && estimatedReach > 0 && (
            <button
              onClick={() => setShowContactsModal(true)}
              className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-surface-600 text-xs text-surface-400 hover:border-brand-500/50 hover:text-brand-300 transition-all"
            >
              <Users className="w-3.5 h-3.5" />
              Verificar lista de contatos ({estimatedReach} contato{estimatedReach === 1 ? '' : 's'})
            </button>
          )}
        </div>
      </div>

      {/* Right column: message preview */}
      <div className="w-[240px] flex-shrink-0">
        <p className="text-xs text-surface-500 mb-3 text-center">Prévia da mensagem</p>
        <TemplatePreview template={template} variables={previewVars} compact />
      </div>

      {/* Contact list modal */}
      {showContactsModal && (
        <ContactListModal
          contacts={contacts}
          segmentType={segmentType}
          selectedContactIds={selectedContactIds}
          selectedTagIds={selectedTagIds}
          selectedStages={selectedStages}
          filterStages={filterStages}
          filterTagIds={filterTagIds}
          filterIntent={filterIntent}
          filterSource={filterSource}
          filterOptIn={filterOptIn}
          filterSentiment={filterSentiment}
          filterContactSearch={filterContactSearch}
          filterHasConversations={filterHasConversations}
          stages={stages}
          tags={tags}
          onClose={() => setShowContactsModal(false)}
        />
      )}
    </div>
  )
}

// ─── Contact List Modal ────────────────────────────────────────────────────────
// Aninhado aqui de propósito: só é consumido por Step5Revisao.

function ContactListModal({
  contacts, segmentType,
  selectedContactIds, selectedTagIds, selectedStages,
  filterStages, filterTagIds, filterIntent, filterSource, filterOptIn,
  filterSentiment, filterContactSearch, filterHasConversations,
  stages, tags, onClose,
}: {
  contacts: Contact[]
  segmentType: CampaignSegment['type']
  selectedContactIds: string[]
  selectedTagIds: string[]
  selectedStages: string[]
  filterStages: string[]
  filterTagIds: string[]
  filterIntent: ContactIntent[]
  filterSource: ContactSource[]
  filterOptIn: boolean | undefined
  filterSentiment: ContactSentiment[]
  filterContactSearch: string
  filterHasConversations: boolean | undefined
  stages: { key: string; label: string; color: string }[]
  tags: Tag[]
  onClose: () => void
}) {
  const [search, setSearch] = useState('')

  const segmented = useMemo(() => {
    if (segmentType === 'all') return contacts
    if (segmentType === 'tag')
      return contacts.filter((c) => c.tags?.some((t) => selectedTagIds.includes(t.id)))
    if (segmentType === 'stage')
      return contacts.filter((c) => selectedStages.includes(c.stage ?? ''))
    if (segmentType === 'manual')
      return contacts.filter((c) => selectedContactIds.includes(c.id))
    // filter
    let f = contacts
    if (filterStages.length)  f = f.filter((c) => filterStages.includes(c.stage ?? ''))
    if (filterTagIds.length)  f = f.filter((c) => c.tags?.some((t) => filterTagIds.includes(t.id)))
    if (filterIntent.length)  f = f.filter((c) => filterIntent.includes(c.intent ?? 'unknown'))
    if (filterSource.length)  f = f.filter((c) => filterSource.includes(c.source ?? 'other'))
    if (filterOptIn !== undefined) f = f.filter((c) => c.optIn === filterOptIn)
    if (filterSentiment.length) f = f.filter((c) => filterSentiment.includes(c.aiSentiment ?? 'unknown'))
    if (filterContactSearch.trim()) {
      const q = filterContactSearch.toLowerCase()
      f = f.filter((c) => c.displayName.toLowerCase().includes(q) || c.waId.includes(q))
    }
    if (filterHasConversations !== undefined)
      f = f.filter((c) => filterHasConversations ? (c.conversationCount ?? 0) > 0 : (c.conversationCount ?? 0) === 0)
    return f
  }, [contacts, segmentType, selectedContactIds, selectedTagIds, selectedStages,
      filterStages, filterTagIds, filterIntent, filterSource, filterOptIn,
      filterSentiment, filterContactSearch, filterHasConversations])

  const displayed = search.trim()
    ? segmented.filter((c) =>
        c.displayName.toLowerCase().includes(search.toLowerCase()) ||
        c.waId.includes(search)
      )
    : segmented

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.15 }}
        className="relative bg-surface-900 overlay-frame border rounded-2xl w-full max-w-lg flex flex-col max-h-[80vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800 flex-shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-surface-50">Lista de contatos</h3>
            <p className="text-xs text-surface-500 mt-0.5">{segmented.length} contato{segmented.length === 1 ? '' : 's'} na segmentação</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-surface-800 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nesta lista..."
              className="w-full bg-surface-800 border border-surface-700 rounded-xl pl-8 pr-3 py-2 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2">
          {displayed.length === 0 ? (
            <p className="text-xs text-surface-500 text-center py-8">Nenhum contato encontrado</p>
          ) : (
            <div className="space-y-0.5">
              {displayed.map((c) => {
                const stageDef = stages.find((s) => s.key === c.stage)
                return (
                  <div key={c.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-surface-800/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-brand-500/15 text-brand-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {c.displayName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-100 truncate">{c.displayName}</p>
                      <p className="text-xs text-surface-500">{c.waId}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {stageDef && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: stageDef.color, color: getReadableTextColor(stageDef.color) }}>
                          {stageDef.label}
                        </span>
                      )}
                      {c.tags && c.tags.length > 0 && (
                        <span className="text-[10px] text-surface-500 bg-surface-700 px-1.5 py-0.5 rounded">
                          {c.tags[0].name}{c.tags.length > 1 ? ` +${c.tags.length - 1}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-800 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-surface-950 text-sm font-medium transition-all"
          >
            Fechar e continuar
          </button>
        </div>
      </motion.div>
    </div>
  )
}
