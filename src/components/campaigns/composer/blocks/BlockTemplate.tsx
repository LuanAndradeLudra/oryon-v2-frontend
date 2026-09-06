// ─── BlockTemplate ─────────────────────────────────────────────────────────
// Conteúdo do bloco "Template" do Composer — mockup `p3-disparos.html` §D2.
//
// É a lista/busca do `steps/Step1Template.tsx` **sem o campo de nome da
// campanha**: no Composer o nome é editável inline no título do TopBar
// (decisão do Maestro, coord/D2-plano.md §3), do mesmo jeito que o nome do
// agente no `AgentWorkspacePage`. Manter os dois lugares editando o mesmo
// campo faria a página perguntar duas vezes a mesma coisa.
//
// O wizard antigo continua usando o `Step1Template` como está — este arquivo
// não o substitui, e por isso os dois coexistem enquanto o modal viver.
import { useState } from 'react'
import { Search, Loader2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WhatsAppTemplate } from '@/types'

interface BlockTemplateProps {
  templates: WhatsAppTemplate[]
  loading: boolean
  selected: WhatsAppTemplate | null
  onSelect: (t: WhatsAppTemplate) => void
}

export function BlockTemplate({ templates, loading, selected, onSelect }: BlockTemplateProps) {
  const [search, setSearch] = useState('')
  const term = search.trim().toLowerCase()
  const filtered = term
    ? templates.filter((t) =>
        t.name.toLowerCase().includes(term) || t.body.toLowerCase().includes(term))
    : templates

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 px-3 py-2.5 bg-brand-500/5 border border-brand-500/20 rounded-xl">
        <Info className="w-3.5 h-3.5 text-brand-400 mt-0.5 flex-shrink-0" aria-hidden />
        <p className="text-[11px] text-surface-400 leading-relaxed">
          Apenas templates com status <strong className="text-brand-300">Aprovado</strong> pela Meta
          podem ser usados em disparos. Crie e submeta novos modelos na aba{' '}
          <strong className="text-surface-300">Templates</strong>.
        </p>
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500"
          aria-hidden
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar template por nome ou conteúdo"
          placeholder="Buscar por nome ou conteúdo..."
          className="w-full bg-surface-800 border border-surface-700 rounded-lg pl-8 pr-3 py-2 text-[15.4px] text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500 transition-colors"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-24" role="status" aria-label="Carregando templates">
          <Loader2 className="w-4 h-4 text-brand-400 animate-spin" aria-hidden />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 space-y-2">
          <p className="text-sm text-surface-500">
            {term ? 'Nenhum template bate com a busca' : 'Nenhum template aprovado no Oryon'}
          </p>
          {!term && (
            <p className="text-xs text-surface-600 max-w-xs mx-auto">
              Abra a aba Templates e use Sincronizar para importar os modelos ativos da Meta.
            </p>
          )}
        </div>
      ) : (
        // `radiogroup` e não lista de botões: escolher um template é escolher
        // UM de vários, e o leitor de tela precisa anunciar "2 de 7", não
        // sete botões soltos.
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1" role="radiogroup" aria-label="Templates aprovados">
          {filtered.map((tpl) => {
            const isSelected = selected?.id === tpl.id
            return (
              <button
                key={tpl.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelect(tpl)}
                className={cn(
                  'w-full text-left p-3 rounded-2xl border transition-colors',
                  isSelected
                    ? 'border-brand-500 bg-brand-500/6 ring-1 ring-brand-500/35'
                    : 'border-surface-700 bg-surface-800 hover:border-surface-600',
                )}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[15.4px] font-semibold font-mono text-surface-100 truncate">{tpl.name}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[11px] text-surface-500 bg-surface-700 px-1.5 py-0.5 rounded">{tpl.category}</span>
                    <span className="text-[11px] text-surface-600">{tpl.language}</span>
                  </div>
                </div>
                <p className="text-xs text-surface-400 line-clamp-1">{tpl.body.replace(/\n/g, ' ')}</p>
                {tpl.bodyVariables && tpl.bodyVariables.length > 0 && (
                  <p className="text-[11px] text-brand-400/70 mt-1">
                    {tpl.bodyVariables.length} variáve{tpl.bodyVariables.length === 1 ? 'l' : 'is'}:{' '}
                    {tpl.bodyVariables.map((v, i) => `{{${i + 1}}} ${v}`).join(', ')}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

