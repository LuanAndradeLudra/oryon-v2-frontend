import { useState } from 'react'
import { Search, Loader2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WhatsAppTemplate } from '@/types'

export function Step1Template({
  templates, loading, selected, onSelect, campaignName, onNameChange,
}: {
  templates: WhatsAppTemplate[]
  loading: boolean
  selected: WhatsAppTemplate | null
  onSelect: (t: WhatsAppTemplate) => void
  campaignName: string
  onNameChange: (v: string) => void
}) {
  const [search, setSearch] = useState('')
  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.body.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      {/* Info banner */}
      <div className="flex items-start gap-2.5 px-3 py-2.5 bg-brand-500/5 border border-brand-500/20 rounded-xl">
        <Info className="w-3.5 h-3.5 text-brand-400 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-surface-400 leading-relaxed">
          Apenas templates com status <strong className="text-brand-300">Aprovado</strong> pela Meta podem ser usados em campanhas.
          Crie e submeta novos modelos na aba <strong className="text-surface-300">Templates</strong>.
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-surface-400 mb-1.5 block">
          Nome da campanha <span className="text-danger">*</span>
        </label>
        <input
          value={campaignName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ex: Campanha Black Friday 2026"
          className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500 transition-colors"
        />
        <p className="text-[11px] text-surface-600 mt-1">Use um nome descritivo para identificar a campanha no histórico.</p>
      </div>

      <div>
        <label className="text-xs font-medium text-surface-400 mb-2 block">
          Selecione o template <span className="text-danger">*</span>
        </label>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou conteúdo..."
            className="w-full bg-surface-800 border border-surface-700 rounded-xl pl-8 pr-3 py-2 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <p className="text-sm text-surface-500">Nenhum template aprovado no Oryon</p>
            <p className="text-xs text-surface-600 max-w-xs mx-auto">
              Abra a aba Templates e use Sincronizar para importar os modelos ativos da Meta.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {filtered.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => onSelect(tpl)}
                className={cn(
                  'w-full text-left p-3 rounded-xl border transition-all',
                  selected?.id === tpl.id
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-surface-700 bg-surface-800/50 hover:border-surface-600'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium font-mono text-surface-100">{tpl.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-surface-500 bg-surface-700 px-1.5 py-0.5 rounded">{tpl.category}</span>
                    <span className="text-[11px] text-surface-600">{tpl.language}</span>
                  </div>
                </div>
                <p className="text-xs text-surface-500 line-clamp-1">{tpl.body.replace(/\n/g, ' ')}</p>
                {tpl.bodyVariables && tpl.bodyVariables.length > 0 && (
                  <p className="text-[11px] text-brand-400/70 mt-1">
                    {tpl.bodyVariables.length} variáve{tpl.bodyVariables.length === 1 ? 'l' : 'is'}: {tpl.bodyVariables.map((v, i) => `{{${i + 1}}} ${v}`).join(', ')}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
