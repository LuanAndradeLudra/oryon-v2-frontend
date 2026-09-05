// ─── Command Deck · toggle do TopBar ──────────────────────────────────────
// Deck / Lista + "Novo agente", injetado no TopBar pela AgentsPage via
// `useRegisterTopBarActions`. O segmented é o `ui/SegmentedControl` (já usado
// em toolbars por todo o app) — não uma pílula nova.

import { LayoutGrid, List, Plus } from 'lucide-react'

import { SegmentedControl } from '@/components/ui/SegmentedControl'

export type AgentsView = 'deck' | 'list'

export interface DeckToolbarProps {
  view: AgentsView
  onViewChange: (view: AgentsView) => void
  onNewAgent: () => void
}

export function DeckToolbar({ view, onViewChange, onNewAgent }: DeckToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      <SegmentedControl<AgentsView>
        label="Modo de visualização dos agentes"
        value={view}
        onChange={onViewChange}
        options={[
          { value: 'deck', label: 'Deck', icon: LayoutGrid },
          { value: 'list', label: 'Lista', icon: List },
        ]}
      />
      <button
        onClick={onNewAgent}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-surface-950 text-xs font-medium transition"
      >
        <Plus className="w-3.5 h-3.5" />
        Novo agente
      </button>
    </div>
  )
}
