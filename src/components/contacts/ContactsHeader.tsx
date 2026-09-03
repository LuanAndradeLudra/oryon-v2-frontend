import { LayoutList, LayoutGrid, Plus, Upload, Settings2 } from 'lucide-react'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { cn } from '@/lib/utils'

type ViewMode = 'table' | 'kanban'

interface ContactsHeaderProps {
  total: number
  viewMode: ViewMode
  onViewModeChange: (v: ViewMode) => void
  onNewContact: () => void
  onImport: () => void
  onConfigure: () => void
}

export function ContactsHeader({ total, viewMode, onViewModeChange, onNewContact, onImport, onConfigure }: ContactsHeaderProps) {
  const { vocab } = useTenantVocab()
  return (
    <div className="flex items-center justify-between px-4 py-4 border-b border-surface-800 flex-shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-surface-50">{vocab.contacts}</h1>
        <span className="text-sm text-surface-500 bg-surface-800 px-2.5 py-0.5 rounded-full font-medium border border-surface-700">
          {total.toLocaleString('pt-BR')}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* View toggle */}
        <div className="flex items-center bg-surface-800 border border-surface-700 rounded-lg p-0.5">
          <button
            onClick={() => onViewModeChange('table')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
              viewMode === 'table'
                ? 'bg-surface-700 text-surface-100 shadow-sm'
                : 'text-surface-400 hover:text-surface-200'
            )}
          >
            <LayoutList className="w-3.5 h-3.5" />
            Tabela
          </button>
          <button
            onClick={() => onViewModeChange('kanban')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
              viewMode === 'kanban'
                ? 'bg-surface-700 text-surface-100 shadow-sm'
                : 'text-surface-400 hover:text-surface-200'
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Kanban
          </button>
        </div>

        <button
          onClick={onConfigure}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-surface-800 border border-surface-700 text-surface-300 hover:text-surface-100 hover:bg-surface-700 transition-all"
          title="Configurar situações e campos"
        >
          <Settings2 className="w-3.5 h-3.5" />
          Configurar
        </button>

        <button
          onClick={onImport}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-surface-800 border border-surface-700 text-surface-300 hover:text-surface-100 hover:bg-surface-700 transition-all"
        >
          <Upload className="w-3.5 h-3.5" />
          Importar
        </button>

        <button
          onClick={onNewContact}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-surface-950 transition-all shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Novo Contato
        </button>
      </div>
    </div>
  )
}
