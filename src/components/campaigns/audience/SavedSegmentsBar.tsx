// ─── SavedSegmentsBar ──────────────────────────────────────────────────────
// Os chips do topo do mockup: os segmentos salvos da conta + "Personalizado".
// Escolher um chip carrega a definição gravada; qualquer edição manual depois
// disso volta para "Personalizado" (quem decide isso é o `AudienceBlock`, que
// solta o `segmentId` no primeiro `dispatch` de edição).
//
// Sem BE.3 no ar não existe `campaign_segments`, então a barra inteira some —
// mostrar um único chip "Personalizado" sozinho não informa nada.
import { Bookmark, PencilLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CampaignSegmentSaved } from '@/types/campaignsV2'

interface SavedSegmentsBarProps {
  segments: CampaignSegmentSaved[]
  /** `undefined` = "Personalizado" ativo. */
  activeId?: string
  onSelect: (segment: CampaignSegmentSaved) => void
  onSelectCustom: () => void
}

export function SavedSegmentsBar({ segments, activeId, onSelect, onSelectCustom }: SavedSegmentsBarProps) {
  if (segments.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {segments.map((s) => {
        const on = s.id === activeId
        return (
          <button
            key={s.id}
            type="button"
            aria-pressed={on}
            onClick={() => onSelect(s)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-xs transition-colors',
              on
                ? 'border-brand-500/40 bg-brand-500/15 text-brand-300'
                : 'border-surface-700 text-surface-300 hover:border-surface-600',
            )}
          >
            <Bookmark className="w-3 h-3" />
            {s.name}
          </button>
        )
      })}

      <button
        type="button"
        aria-pressed={!activeId}
        onClick={onSelectCustom}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-xs transition-colors',
          !activeId
            ? 'border-brand-500/40 bg-brand-500/15 text-brand-300'
            : 'border-surface-700 text-surface-300 hover:border-surface-600',
        )}
      >
        <PencilLine className="w-3 h-3" />
        Personalizado
      </button>
    </div>
  )
}
