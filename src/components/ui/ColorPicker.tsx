// ─── ColorPicker — palette curada + picker livre (estilo Canva) ────────────
//
// Drop-in replacement para os quatro mini-pickers que viviam inline em
// TagsSettings / Departments / StageModal / TagPicker. Mantém a API
// { value, onChange } daqueles para a troca ser trivial.
//
// UX: grade de swatches curados (escolha rápida) + botão "Personalizar"
// que expande, no lugar (sem portal — funciona dentro de modais/dropdowns
// sem clipping), o react-colorful HexColorPicker com um input de hex manual.
// O swatch ativo ganha um anel; quando o valor atual é um hex fora da
// palette, um 13º swatch "atual" aparece destacado para o usuário ver o que
// está selecionado.

import { useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { Pipette, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  CURATED_PALETTE,
  DEFAULT_ENTITY_COLOR,
  getReadableTextColor,
  isValidHex,
  normalizeHex,
} from '@/lib/colorPalette'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  /** Hide the "Personalizar" affordance, leaving only the curated swatches.
   *  Useful where total freedom isn't desirable. Defaults to false. */
  swatchesOnly?: boolean
  className?: string
}

export function ColorPicker({ value, onChange, swatchesOnly = false, className }: ColorPickerProps) {
  const [customOpen, setCustomOpen] = useState(false)
  // Local mirror of the manual hex input so the field can hold an
  // in-progress value ("#6") without spamming onChange with invalid hexes.
  const [hexDraft, setHexDraft] = useState(value)

  const current = isValidHex(value) ? value : DEFAULT_ENTITY_COLOR
  const isCustomValue = !CURATED_PALETTE.includes(current)

  const commitHex = (raw: string) => {
    setHexDraft(raw)
    const normalized = normalizeHex(raw, current)
    if (isValidHex(raw.trim().startsWith('#') ? raw.trim() : `#${raw.trim()}`)) {
      onChange(normalized)
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        {CURATED_PALETTE.map((color) => {
          const active = current.toLowerCase() === color.toLowerCase()
          return (
            <button
              key={color}
              type="button"
              onClick={() => { onChange(color); setHexDraft(color) }}
              className="w-6 h-6 rounded-full transition-all flex items-center justify-center"
              style={{
                backgroundColor: color,
                boxShadow: active ? `0 0 0 2px var(--tw-ring-offset-color, #0b0b0c), 0 0 0 4px ${color}` : 'none',
              }}
              aria-label={`Cor ${color}`}
            >
              {active && <Check className="w-3 h-3" style={{ color: getReadableTextColor(color) }} />}
            </button>
          )
        })}

        {/* When the active color isn't one of the curated swatches, surface
            it as an extra highlighted chip so the selection stays visible. */}
        {isCustomValue && (
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: current,
              boxShadow: `0 0 0 2px var(--tw-ring-offset-color, #0b0b0c), 0 0 0 4px ${current}`,
            }}
            title={`Cor personalizada ${current}`}
          >
            <Check className="w-3 h-3" style={{ color: getReadableTextColor(current) }} />
          </span>
        )}

        {!swatchesOnly && (
          <button
            type="button"
            onClick={() => { setCustomOpen((v) => !v); setHexDraft(current) }}
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center transition-all border border-dashed',
              customOpen
                ? 'border-brand-400 text-brand-300 bg-brand-600/10'
                : 'border-surface-600 text-surface-400 hover:border-surface-400 hover:text-surface-200',
            )}
            title="Personalizar cor"
            aria-label="Personalizar cor"
          >
            <Pipette className="w-3 h-3" />
          </button>
        )}
      </div>

      {!swatchesOnly && customOpen && (
        <div className="flex flex-col gap-2 p-2 rounded-lg border border-surface-700 bg-surface-900/60 w-fit">
          {/* react-colorful saturation/hue board + the global CSS we keep
              minimal — its default 200px square fits the modal width. */}
          <HexColorPicker
            color={current}
            onChange={(c) => { onChange(c); setHexDraft(c) }}
            style={{ width: 180, height: 140 }}
          />
          <div className="flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-md flex-shrink-0 border border-surface-700"
              style={{ backgroundColor: current }}
            />
            <div className="relative flex-1">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-surface-500">#</span>
              <input
                value={hexDraft.replace(/^#/, '')}
                onChange={(e) => commitHex(e.target.value)}
                placeholder="6366f1"
                maxLength={6}
                spellCheck={false}
                className="w-full pl-5 pr-2 py-1.5 text-xs font-mono bg-surface-800 border border-surface-700 rounded-lg text-surface-100 placeholder-surface-600 outline-none focus:border-brand-500 transition-colors uppercase"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
