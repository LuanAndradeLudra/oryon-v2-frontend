// ─── QuickStartShortcuts ───────────────────────────────────────────────────
// Os 3 atalhos do rodapé (`.qs` do mockup): "enquanto espera a aprovação,
// deixe um fluxo pronto".
//
// No mockup são `<div>`; aqui são `<button>` de verdade, porque executam ação.
// O componente NÃO sabe o que acontece depois do clique — devolve o id do
// preset e a casca decide. É o que permite os dois desfechos possíveis do
// contrato do `TemplateCreator` (`coord/D5-TemplateCreator-contrato.md`) sem
// mudar nada aqui: pré-preencher, ou só navegar.
import { Hand, RotateCcw, Rocket } from 'lucide-react'
import type { ComponentType } from 'react'
import { accentColor, tint, type Accent } from '@/components/ui/accentColor'
import type { PresetId } from './templatePresets'

interface Shortcut {
  id: PresetId
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
  accent: Accent
}

/** Cores do mockup (#3B82F6, #8B5CF6, #F59E0B) via token, nunca hex — são
 *  acento CATEGÓRICO, um por tipo de fluxo. */
const SHORTCUTS: Shortcut[] = [
  { id: 'welcome', icon: Hand,      title: 'Boas-vindas',    description: 'Novos contatos · utilidade', accent: 'blue' },
  { id: 'winback', icon: RotateCcw, title: 'Reengajamento',  description: 'Sem contato há 30 dias',     accent: 'violet' },
  { id: 'launch',  icon: Rocket,    title: 'Lançamento',     description: 'Toda a base com opt-in',     accent: 'amber' },
]

interface QuickStartShortcutsProps {
  onPick: (preset: PresetId) => void
}

export function QuickStartShortcuts({ onPick }: QuickStartShortcutsProps) {
  return (
    <section aria-labelledby="quickstart-title">
      <h3
        id="quickstart-title"
        className="text-3xs font-bold uppercase tracking-[0.1em] text-surface-500 text-center mt-[20px] mb-[10px]"
      >
        Enquanto espera a aprovação, deixe um fluxo pronto
      </h3>

      <div className="grid grid-cols-3 gap-[10px]">
        {SHORTCUTS.map(({ id, icon: Icon, title, description, accent }) => (
          <button
            key={id}
            type="button"
            onClick={() => onPick(id)}
            className="flex items-center gap-[12px] text-left py-[12px] px-[14px] rounded-[16px] border border-surface-700 bg-surface-800 hover:border-surface-600 transition-colors cursor-pointer"
          >
            <span
              aria-hidden="true"
              className="w-[36px] h-[36px] rounded-[10px] flex items-center justify-center shrink-0"
              style={{ backgroundColor: tint(accent, 15), color: accentColor(accent) }}
            >
              <Icon className="w-[18px] h-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-sm text-surface-100 truncate">{title}</span>
              <span className="block text-[12px] text-surface-400 truncate">{description}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
