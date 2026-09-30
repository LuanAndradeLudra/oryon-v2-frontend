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
//   - 'callout'  soft Banner for wizards — makes the target line the
//                first thing the operator notices above every field.

import { Phone } from 'lucide-react'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import { Banner } from '@/components/ui/Banner'
import { Select } from '@/components/ui/Select'

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
    // SCRUM-1097 (spec 1a MODAL-03 / vocabulário do handoff): banner SUAVE
    // (12% da cor + texto na cor), nunca fundo sólido — o bloco laranja cheio
    // com select branco translúcido era a maior divergência do wizard de
    // campanha contra o mock. Mantém a função: "linha não definida" é aviso
    // (warning) e a primeira coisa que o operador vê acima dos campos;
    // "criando na linha" confirma o alvo (success). O select é o primitivo
    // `Select` sm (28px) como ação à direita do banner.
    const select = onLineChange ? (
      <Select
        size="sm"
        aria-label="Linha do WhatsApp"
        value={whatsappNumberId ?? ''}
        onChange={(e) => onLineChange(e.target.value)}
        className="min-w-[200px] max-w-[280px]"
      >
        <option value="">Selecione a linha...</option>
        {numbers.map((n) => (
          <option key={n.id} value={n.id}>
            {n.label || formatPhone(n.displayPhoneNumber)}
            {n.isPrimary ? ' • Primária' : ''}
          </option>
        ))}
      </Select>
    ) : undefined
    return (
      <Banner variant={line ? 'success' : 'warning'} action={select}>
        {line ? (
          <>
            <span className="font-semibold">Criando na linha</span>{' '}
            <span className="font-medium">{line.label || formatPhone(line.displayPhoneNumber)}</span>
            {line.label && (
              <span className="opacity-80"> ({formatPhone(line.displayPhoneNumber)})</span>
            )}
          </>
        ) : (
          <>
            <span className="font-semibold">Linha não definida.</span>{' '}
            Este tenant tem {numbers.length} linhas ativas. Escolha uma antes de salvar.
          </>
        )}
      </Banner>
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
