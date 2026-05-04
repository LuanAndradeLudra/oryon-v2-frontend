// ─── Scope Selector (admin) ────────────────────────────────────────────────
// Replaces the radio-buttons + raw UUID input for setting a template's scope.
// Two-step UX:
//   1. Segmented control: Público | Privado
//   2. When Privado, dropdown of customer tenants (from /organizations/admin/list)
//
// The tenant dropdown loads lazily on first switch to "Privado" so the cost
// is paid only when needed. A loading shimmer keeps the form layout stable.

import { useState, useEffect, useCallback } from 'react'
import { Globe, Lock, Loader2, AlertCircle } from 'lucide-react'
import { listAdminOrganizations, type AdminOrganization } from '@/services/adminApi'
import { Select } from '@/components/ui/Select'
import { cn } from '@/lib/utils'

export type ScopeValue =
  | { kind: 'public' }
  | { kind: 'private'; tenantId: string }

interface Props {
  value: ScopeValue
  onChange: (next: ScopeValue) => void
  /** Edit mode disables both the segmented control and the dropdown — scope
   *  is immutable post-create on the backend. */
  disabled?: boolean
}

export function ScopeSelector({ value, onChange, disabled }: Props) {
  const [orgs, setOrgs] = useState<AdminOrganization[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load orgs on first transition to "private" so public-only templates
  // never trigger the network round-trip.
  const loadOrgs = useCallback(async () => {
    if (orgs.length > 0 || loading) return
    setLoading(true)
    setError(null)
    try {
      setOrgs(await listAdminOrganizations())
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [orgs.length, loading])

  useEffect(() => {
    if (value.kind === 'private') void loadOrgs()
  }, [value.kind, loadOrgs])

  function pickPublic() {
    if (disabled) return
    onChange({ kind: 'public' })
  }

  function pickPrivate() {
    if (disabled) return
    // Default to empty tenant — the dropdown will surface the validation
    // error until a real one is chosen.
    onChange({
      kind: 'private',
      tenantId: value.kind === 'private' ? value.tenantId : '',
    })
  }

  return (
    <div className="space-y-3">
      {/* Segmented control */}
      <div
        role="radiogroup"
        aria-label="Escopo"
        className={cn(
          'inline-flex bg-surface-900 ring-1 ring-surface-700 rounded-lg p-1 gap-1',
          disabled && 'opacity-50',
        )}
      >
        <SegmentButton
          active={value.kind === 'public'}
          disabled={disabled}
          onClick={pickPublic}
          icon={<Globe className="w-3.5 h-3.5" />}
          label="Público"
          hint="Qualquer cliente pode ativar"
        />
        <SegmentButton
          active={value.kind === 'private'}
          disabled={disabled}
          onClick={pickPrivate}
          icon={<Lock className="w-3.5 h-3.5" />}
          label="Privado"
          hint="Visível só para o cliente escolhido"
        />
      </div>

      {/* Tenant dropdown — shown only when private */}
      {value.kind === 'private' && (
        <div>
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-surface-500 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Carregando clientes…
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 text-xs text-danger bg-danger/10 border border-danger/30 rounded-md px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-medium">Não foi possível carregar a lista de clientes</p>
                <p className="text-surface-400 break-words">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => void loadOrgs()}
                className="text-surface-300 hover:text-surface-100 underline"
              >
                tentar de novo
              </button>
            </div>
          ) : (
            <Select
              value={value.tenantId}
              onChange={(e) => onChange({ kind: 'private', tenantId: e.target.value })}
              disabled={disabled}
            >
              <option value="">— escolha o cliente —</option>
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>{org.businessName}</option>
              ))}
            </Select>
          )}
          <p className="text-[11px] text-surface-500 mt-1">
            Apenas o cliente escolhido vê esse template no catálogo.
          </p>
        </div>
      )}

      {disabled && (
        <p className="text-[11px] text-surface-500">
          Escopo não pode ser alterado depois de criado.
        </p>
      )}
    </div>
  )
}

// ─── Internals ─────────────────────────────────────────────────────────────

function SegmentButton({
  active,
  disabled,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  hint: string
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      title={hint}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
        active
          ? 'bg-surface-800 text-surface-100 ring-1 ring-surface-600'
          : 'text-surface-400 hover:text-surface-200',
        disabled && 'cursor-not-allowed',
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  )
}
