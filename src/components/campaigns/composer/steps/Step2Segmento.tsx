import { useState } from 'react'
import { Search, Check, Info, Sparkles, MessageCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Banner } from '@/components/ui/Banner'
import { getReadableTextColor } from '@/lib/colorPalette'
import { SEGMENT_OPTIONS, INTENT_OPTIONS, SOURCE_OPTIONS, SENTIMENT_OPTIONS } from '../constants'
import type {
  Contact, ContactIntent, ContactSource, ContactSentiment, CampaignSegment, Tag,
} from '@/types'

export function Step2Segmento({
  segmentType, onSegmentType,
  tags, selectedTagIds, onTagIds,
  stages, selectedStages, onStages,
  contacts, loadingContacts, selectedContactIds, onContactIds,
  filterStages, onFilterStages,
  filterTagIds, onFilterTagIds,
  filterIntent, onFilterIntent,
  filterSource, onFilterSource,
  filterOptIn, onFilterOptIn,
  filterSentiment, onFilterSentiment,
  filterContactSearch, onFilterContactSearch,
  filterHasConversations, onFilterHasConversations,
  estimatedReach,
}: {
  segmentType: CampaignSegment['type']
  onSegmentType: (t: CampaignSegment['type']) => void
  tags: Tag[]
  selectedTagIds: string[]
  onTagIds: (ids: string[]) => void
  stages: { key: string; label: string; color: string }[]
  selectedStages: string[]
  onStages: (s: string[]) => void
  contacts: Contact[]
  loadingContacts: boolean
  selectedContactIds: string[]
  onContactIds: (ids: string[]) => void
  filterStages: string[]
  onFilterStages: (v: string[]) => void
  filterTagIds: string[]
  onFilterTagIds: (v: string[]) => void
  filterIntent: ContactIntent[]
  onFilterIntent: (v: ContactIntent[]) => void
  filterSource: ContactSource[]
  onFilterSource: (v: ContactSource[]) => void
  filterOptIn: boolean | undefined
  onFilterOptIn: (v: boolean | undefined) => void
  filterSentiment: ContactSentiment[]
  onFilterSentiment: (v: ContactSentiment[]) => void
  filterContactSearch: string
  onFilterContactSearch: (v: string) => void
  filterHasConversations: boolean | undefined
  onFilterHasConversations: (v: boolean | undefined) => void
  estimatedReach: number | null
}) {
  const [contactSearch, setContactSearch] = useState('')

  const toggleTag = (id: string) =>
    onTagIds(selectedTagIds.includes(id) ? selectedTagIds.filter((t) => t !== id) : [...selectedTagIds, id])

  const toggleStage = (key: string) =>
    onStages(selectedStages.includes(key) ? selectedStages.filter((s) => s !== key) : [...selectedStages, key])

  const toggleContact = (id: string) =>
    onContactIds(selectedContactIds.includes(id) ? selectedContactIds.filter((c) => c !== id) : [...selectedContactIds, id])

  const toggleFilterStage = (key: string) =>
    onFilterStages(filterStages.includes(key) ? filterStages.filter((s) => s !== key) : [...filterStages, key])

  const toggleFilterTag = (id: string) =>
    onFilterTagIds(filterTagIds.includes(id) ? filterTagIds.filter((t) => t !== id) : [...filterTagIds, id])

  const toggleFilterIntent = (v: ContactIntent) =>
    onFilterIntent(filterIntent.includes(v) ? filterIntent.filter((i) => i !== v) : [...filterIntent, v])

  const toggleFilterSource = (v: ContactSource) =>
    onFilterSource(filterSource.includes(v) ? filterSource.filter((s) => s !== v) : [...filterSource, v])

  const toggleFilterSentiment = (v: ContactSentiment) =>
    onFilterSentiment(filterSentiment.includes(v) ? filterSentiment.filter((s) => s !== v) : [...filterSentiment, v])

  const filteredContacts = contacts.filter((c) =>
    !contactSearch ||
    c.displayName.toLowerCase().includes(contactSearch.toLowerCase()) ||
    c.waId.includes(contactSearch)
  )

  const chipBase = 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all'
  const chipOn   = 'border-transparent text-white'
  const chipOff  = 'border-surface-700 text-surface-400 hover:border-surface-500 hover:text-surface-200'

  return (
    <div className="space-y-4">
      {/* Segment type cards */}
      <div>
        <label className="text-xs font-medium text-surface-400 mb-2 block">Como definir os destinatários?</label>
        <div className="grid grid-cols-1 gap-1.5">
          {SEGMENT_OPTIONS.map((opt) => {
            const Icon = opt.icon
            return (
              <button
                key={opt.value}
                onClick={() => onSegmentType(opt.value)}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-xl border transition-all flex items-center gap-3',
                  segmentType === opt.value
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-surface-700 bg-surface-800/50 hover:border-surface-600'
                )}
              >
                <div className={cn(
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                  segmentType === opt.value ? 'border-brand-500' : 'border-surface-600'
                )}>
                  {segmentType === opt.value && <div className="w-2 h-2 rounded-full bg-brand-500" />}
                </div>
                <Icon className={cn('w-4 h-4 flex-shrink-0', segmentType === opt.value ? 'text-brand-400' : 'text-surface-500')} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-surface-100">{opt.label}</p>
                  <p className="text-[11px] text-surface-500">{opt.description}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Reach estimate */}
      {estimatedReach !== null && (
        <Banner variant={estimatedReach === 0 ? 'danger' : 'success'}>
          {estimatedReach === 0
            ? 'Nenhum contato corresponde aos filtros selecionados'
            : `Alcance estimado: ${estimatedReach} contato${estimatedReach === 1 ? '' : 's'}`}
        </Banner>
      )}

      {/* Tag picker */}
      {segmentType === 'tag' && (
        <div>
          <label className="text-xs font-medium text-surface-400 mb-2 block">
            Selecione as tags <span className="text-[11px] text-surface-600">(contatos com qualquer uma serão incluídos)</span>
          </label>
          {tags.length === 0 ? (
            <p className="text-xs text-surface-600 py-2">Nenhuma tag cadastrada.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={cn(chipBase, selectedTagIds.includes(tag.id) ? chipOn : chipOff)}
                  style={selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stage picker */}
      {segmentType === 'stage' && (
        <div>
          <label className="text-xs font-medium text-surface-400 mb-2 block">
            Selecione os estágios <span className="text-[11px] text-surface-600">(contatos em qualquer um serão incluídos)</span>
          </label>
          {stages.length === 0 ? (
            <p className="text-xs text-surface-600 py-2">Nenhum estágio configurado no CRM.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {stages.map((stage) => (
                <button
                  key={stage.key}
                  onClick={() => toggleStage(stage.key)}
                  className={cn(chipBase, selectedStages.includes(stage.key) ? chipOn : chipOff)}
                  style={selectedStages.includes(stage.key) ? { backgroundColor: stage.color } : {}}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                  {stage.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual contact picker */}
      {segmentType === 'manual' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-surface-400">
              Buscar e selecionar contatos
            </label>
            {selectedContactIds.length > 0 && (
              <button onClick={() => onContactIds([])} className="text-[11px] text-surface-500 hover:text-surface-300 transition-colors">
                Limpar seleção ({selectedContactIds.length})
              </button>
            )}
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
            <input
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              placeholder="Buscar por nome ou número..."
              className="w-full bg-surface-800 border border-surface-700 rounded-xl pl-8 pr-3 py-2 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>
          {loadingContacts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <p className="text-xs text-surface-600 text-center py-6">Nenhum contato encontrado</p>
          ) : (
            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {filteredContacts.map((contact) => {
                const selected = selectedContactIds.includes(contact.id)
                const stageDef = stages.find((s) => s.key === contact.stage)
                return (
                  <button
                    key={contact.id}
                    onClick={() => toggleContact(contact.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all text-left',
                      selected ? 'border-brand-500/50 bg-brand-500/8' : 'border-surface-700/50 hover:border-surface-600 hover:bg-surface-800/60'
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                      selected ? 'bg-brand-600 border-brand-500' : 'border-surface-600'
                    )}>
                      {selected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <div className="w-7 h-7 rounded-full bg-brand-500/15 text-brand-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {contact.displayName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-surface-200 truncate">{contact.displayName}</p>
                      <p className="text-[11px] text-surface-500">{contact.waId}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {stageDef && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{ backgroundColor: stageDef.color, color: getReadableTextColor(stageDef.color) }}
                        >
                          {stageDef.label}
                        </span>
                      )}
                      {contact.tags && contact.tags.length > 0 && (
                        <span className="text-[10px] text-surface-500 bg-surface-700 px-1.5 py-0.5 rounded">
                          {contact.tags[0].name}
                          {contact.tags.length > 1 && ` +${contact.tags.length - 1}`}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
          {!loadingContacts && contacts.length > 0 && (
            <p className="text-[11px] text-surface-600 mt-2 text-center">
              {filteredContacts.length} de {contacts.length} contatos · {selectedContactIds.length} selecionados
            </p>
          )}
        </div>
      )}

      {/* Advanced filter */}
      {segmentType === 'filter' && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 px-3 py-2.5 bg-surface-800/60 border border-surface-700 rounded-xl">
            <Info className="w-3.5 h-3.5 text-surface-400 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-surface-400 leading-relaxed">
              Os critérios marcados são combinados com <strong className="text-surface-300">E</strong> —
              apenas contatos que atendem a <em>todos</em> os filtros ativos serão incluídos.
              Deixe um critério em branco para ignorá-lo.
            </p>
          </div>

          {/* Filter: stages */}
          {stages.length > 0 && (
            <FilterGroup label="Estágio do CRM">
              <div className="flex flex-wrap gap-1.5">
                {stages.map((stage) => (
                  <button
                    key={stage.key}
                    onClick={() => toggleFilterStage(stage.key)}
                    className={cn(chipBase, filterStages.includes(stage.key) ? chipOn : chipOff)}
                    style={filterStages.includes(stage.key) ? { backgroundColor: stage.color } : {}}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                    {stage.label}
                  </button>
                ))}
              </div>
            </FilterGroup>
          )}

          {/* Filter: tags */}
          {tags.length > 0 && (
            <FilterGroup label="Tags">
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleFilterTag(tag.id)}
                    className={cn(chipBase, filterTagIds.includes(tag.id) ? chipOn : chipOff)}
                    style={filterTagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                  </button>
                ))}
              </div>
            </FilterGroup>
          )}

          {/* Filter: intent */}
          <FilterGroup label="Intenção de compra">
            <div className="flex flex-wrap gap-1.5">
              {INTENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleFilterIntent(opt.value)}
                  className={cn(
                    chipBase,
                    filterIntent.includes(opt.value) ? 'color-chip' : chipOff
                  )}
                  style={filterIntent.includes(opt.value) ? ({ ['--chip']: opt.chip } as React.CSSProperties) : {}}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FilterGroup>

          {/* Filter: source */}
          <FilterGroup label="Origem do contato">
            <div className="flex flex-wrap gap-1.5">
              {SOURCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleFilterSource(opt.value)}
                  className={cn(
                    chipBase,
                    filterSource.includes(opt.value)
                      ? 'border-brand-500/50 bg-brand-500/15 text-brand-300'
                      : chipOff
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FilterGroup>

          {/* Filter: opt-in */}
          <FilterGroup label="Opt-in de marketing">
            <div className="flex gap-1.5">
              {([
                { value: undefined, label: 'Qualquer' },
                { value: true,      label: 'Com opt-in ✓' },
                { value: false,     label: 'Sem opt-in' },
              ] as const).map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => onFilterOptIn(opt.value)}
                  className={cn(
                    chipBase,
                    filterOptIn === opt.value
                      ? 'border-brand-500/50 bg-brand-500/15 text-brand-300'
                      : chipOff
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-surface-600 mt-1.5">
              Opt-in indica que o contato autorizou o envio de mensagens de marketing.
            </p>
          </FilterGroup>

          {/* Filter: sentiment */}
          <FilterGroup label={<span className="flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-brand-400" />Sentimento da IA</span>}>
            <div className="flex flex-wrap gap-1.5">
              {SENTIMENT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleFilterSentiment(opt.value)}
                  className={cn(
                    chipBase,
                    filterSentiment.includes(opt.value) ? 'color-chip' : chipOff
                  )}
                  style={filterSentiment.includes(opt.value) ? ({ ['--chip']: opt.chip } as React.CSSProperties) : {}}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FilterGroup>

          {/* Filter: contact search */}
          <FilterGroup label={<span className="flex items-center gap-1.5"><Search className="w-3 h-3 text-brand-400" />Busca por contato</span>}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-surface-500" />
              <input
                value={filterContactSearch}
                onChange={(e) => onFilterContactSearch(e.target.value)}
                placeholder="Buscar por nome ou número..."
                className="w-full bg-surface-700 border border-surface-600 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <p className="text-[10px] text-surface-600 mt-1">Inclui contatos cujo nome ou número de WhatsApp correspondam à busca.</p>
          </FilterGroup>

          {/* Filter: has conversations */}
          <FilterGroup label={<span className="flex items-center gap-1.5"><MessageCircle className="w-3 h-3 text-brand-400" />Engajamento</span>}>
            <div className="flex gap-1.5">
              {([
                { value: undefined, label: 'Qualquer' },
                { value: true,      label: 'Com conversas' },
                { value: false,     label: 'Sem conversas' },
              ] as const).map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => onFilterHasConversations(opt.value)}
                  className={cn(
                    chipBase,
                    filterHasConversations === opt.value
                      ? 'border-brand-500/50 bg-brand-500/15 text-brand-300'
                      : chipOff
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FilterGroup>
        </div>
      )}
    </div>
  )
}

function FilterGroup({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-surface-800/40 border border-surface-700/60 rounded-xl p-3 space-y-2">
      <p className="text-[11px] font-semibold text-surface-400 uppercase tracking-wide">{label}</p>
      {children}
    </div>
  )
}
