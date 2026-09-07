import { useState, useMemo } from 'react'
import { Users } from 'lucide-react'
import { getReadableTextColor } from '@/lib/colorPalette'
import { CATEGORY_LABELS } from '../../constants'
import { CONTACT_FIELDS, INTENT_OPTIONS, SOURCE_OPTIONS, SENTIMENT_OPTIONS } from '../constants'
import { TemplatePreview } from '../../TemplatePreview'
import { ContactListModal } from '../ContactListModal'
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

  // A segmentacao em memoria era feita DENTRO do modal; com o modal recebendo
  // itens ja' paginados por props (D2-plano §4), ela volta para quem tem os
  // filtros. O wizard carrega a base inteira, entao aqui ela continua exata —
  // e o modal recebe "pagina unica com tudo".
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
      <ContactListModal
        open={showContactsModal}
        items={segmented}
        total={segmented.length}
        page={1}
        limit={Math.max(1, segmented.length)}
        stages={stages}
        onPageChange={() => {}}
        onClose={() => setShowContactsModal(false)}
      />
    </div>
  )
}
