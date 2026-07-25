// Renders the resolved WhatsApp line inside a Copilot approval card OR a
// wizard form. Closes the visual loop the operator was missing in the
// 2026-04-20 `novos_clientes` incident: before, the approval card showed
// a UUID (or nothing), so the operator had no way to tell that the
// template was about to land on the wrong WABA.
//
// Contract:
//   - Pass the id you're about to save (wizard form state, Copilot tool
//     input). We render the line's label + formatted phone.
//   - Pass `null` for "not yet chosen" in multi-WABA tenants — we render
//     a warning so the operator picks before submitting. Single-line
//     tenants suppress the row entirely.
//   - Pass `onLineChange` (callout variant only) to embed a right-side
//     select directly inside the card, so the operator fixes the gap
//     without scrolling to find a separate field.
//
// Two rendering variants:
//   - 'inline'   (default) minimal subline for approval cards.
//   - 'callout'  highlighted box for wizards — makes the target line the
//                first thing the operator notices above every field.

import type { CSSProperties } from 'react'
import { Info, Phone } from 'lucide-react'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'

function formatPhone(raw?: string | null): string {
  if (!raw) return '—'
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`
  }
  if (digits.length === 12 && digits.startsWith('55')) {
    return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 8)}-${digits.slice(8)}`
  }
  return raw
}

export function WhatsappLineRow({
  whatsappNumberId,
  variant = 'inline',
  onLineChange,
}: {
  whatsappNumberId?: string | null
  variant?: 'inline' | 'callout'
  /**
   * When provided AND variant='callout', the row renders an inline
   * select on the right edge so the operator can fix a missing line
   * without scrolling to a separate field. Receives the chosen id
   * (or '' when cleared). Ignored on the `inline` variant.
   */
  onLineChange?: (id: string) => void
}) {
  const { numbers, findById } = useWorkspaceNumber()
  // Single-WABA tenants: nothing to disambiguate, keep the card lean.
  if (numbers.length < 2) return null

  const line = findById(whatsappNumberId)

  if (variant === 'callout') {
    // Padrão canônico saturado (.color-chip): fundo SÓLIDO da cor semântica +
    // texto/ícone branco nos dois temas — igual aos badges/banners. "Linha não
    // definida" é aviso (warning/laranja); "criando na linha" confirma o alvo
    // (brand/teal). O select embutido vira um controle branco translúcido,
    // legível sobre o fundo cheio. O aviso segue sendo a primeira coisa que o
    // operador nota, evitando o incidente `novos_clientes` de 2026-04-20.
    const chip = line ? 'var(--color-brand-500)' : 'var(--color-warning)'
    return (
      <div
        className="color-chip flex items-center gap-3 px-4 py-3 rounded-lg border"
        style={{ ['--chip']: chip } as CSSProperties}
      >
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wide opacity-90">
            {line ? 'Criando na linha' : 'Linha não definida'}
          </div>
          {line ? (
            <div className="text-sm font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
              {line.label || formatPhone(line.displayPhoneNumber)}
              {line.label && (
                <span className="text-[11px] opacity-80 font-normal">
                  ({formatPhone(line.displayPhoneNumber)})
                </span>
              )}
            </div>
          ) : (
            <div className="text-[11px] opacity-90 mt-0.5">
              Este tenant tem {numbers.length} linhas ativas. Escolha uma antes de salvar.
            </div>
          )}
        </div>

        {onLineChange && (
          <select
            value={whatsappNumberId ?? ''}
            onChange={(e) => onLineChange(e.target.value)}
            className="flex-shrink-0 min-w-[200px] max-w-[280px] rounded-lg px-3.5 py-2.5 text-sm font-medium text-white bg-white/15 border-2 border-white/25 hover:bg-white/25 hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer transition-colors"
          >
            <option value="" className="bg-surface-900 text-surface-200">Selecione a linha...</option>
            {numbers.map((n) => (
              <option key={n.id} value={n.id} className="bg-surface-900 text-surface-200">
                {n.label || formatPhone(n.displayPhoneNumber)}
                {n.isPrimary ? ' • Primária' : ''}
              </option>
            ))}
          </select>
        )}
      </div>
    )
  }

  if (!line) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-status-pending">
        <Phone className="w-3 h-3" />
        <span>
          Linha não definida — backend vai recusar (tenant tem {numbers.length} linhas).
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-surface-400">
      <Phone className="w-3 h-3 text-brand-400 flex-shrink-0" />
      <span className="text-surface-500">Linha:</span>
      <span className="text-surface-200 font-medium">
        {line.label || formatPhone(line.displayPhoneNumber)}
      </span>
      {line.label && (
        <span className="text-surface-500">({formatPhone(line.displayPhoneNumber)})</span>
      )}
    </div>
  )
}
