// Assign-a-WhatsApp-line modal. Opened from the WabaAssignmentBadge on
// template / campaign / automation cards whose Migration #045 carried
// them into a multi-WABA tenant without a line. Picking a line clears
// `needsWabaAssignment` server-side and unblocks the resource for send /
// dispatch (the scheduler + processor guards only let rows through when
// the flag is false).

import { useState } from 'react'
import { X, Phone, Star, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import { templatesApi, campaignsApi, automationsApi } from '@/services/api'

export type AssignWabaResourceType = 'template' | 'campaign' | 'automation'

function formatPhone(raw?: string | null): string {
  if (!raw) return ''
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 13 && digits.startsWith('55')) {
    return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`
  }
  if (digits.length === 12 && digits.startsWith('55')) {
    return `+55 ${digits.slice(2, 4)} ${digits.slice(4, 8)}-${digits.slice(8)}`
  }
  return raw
}

async function saveAssignment(
  resourceType: AssignWabaResourceType,
  resourceId: string,
  whatsappNumberId: string,
) {
  const payload = { whatsappNumberId, needsWabaAssignment: false } as Record<string, unknown>
  switch (resourceType) {
    case 'template':
      return templatesApi.update(resourceId, payload)
    case 'campaign':
      return campaignsApi.update(resourceId, payload)
    case 'automation':
      return automationsApi.update(resourceId, payload)
  }
}

const LABELS: Record<AssignWabaResourceType, { title: string; subtitle: string }> = {
  template: {
    title: 'Atribuir linha ao template',
    subtitle: 'Este template será submetido à Meta na linha escolhida. Não pode ser movido depois sem recriar.',
  },
  campaign: {
    title: 'Atribuir linha à campanha',
    subtitle: 'Esta campanha usará a linha escolhida para enviar as mensagens.',
  },
  automation: {
    title: 'Atribuir linha à automação',
    subtitle: 'Triggers sem conversa (scheduled, contact_created) enviarão pela linha escolhida.',
  },
}

export function AssignWabaModal({
  resourceType,
  resourceId,
  resourceName,
  currentNumberId,
  onClose,
  onSaved,
}: {
  resourceType: AssignWabaResourceType
  resourceId: string
  resourceName?: string
  currentNumberId?: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const { numbers } = useWorkspaceNumber()
  const [picked, setPicked] = useState<string | null>(currentNumberId ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { title, subtitle } = LABELS[resourceType]

  const handleSave = async () => {
    if (!picked || saving) return
    setSaving(true)
    setError(null)
    try {
      await saveAssignment(resourceType, resourceId, picked)
      onSaved()
    } catch (err) {
      const backendMessage = (err as {
        response?: { data?: { message?: string | string[] } }
      })?.response?.data?.message
      const text = Array.isArray(backendMessage) ? backendMessage.join('; ') : backendMessage
      setError(text?.trim() || 'Não foi possível atribuir a linha. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-900 rounded-2xl border border-surface-700/60 w-full max-w-md overflow-hidden"
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-surface-800/60">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-surface-100">{title}</h2>
            {resourceName && (
              <p className="text-xs text-surface-400 mt-0.5 truncate">"{resourceName}"</p>
            )}
            <p className="text-[11px] text-surface-500 mt-1.5">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ul className="py-1 max-h-80 overflow-y-auto">
          {numbers.map((n) => {
            const isPicked = picked === n.id
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => setPicked(n.id)}
                  disabled={saving}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-5 py-3 text-left transition-colors',
                    isPicked
                      ? 'bg-brand-500/10 text-surface-100'
                      : 'text-surface-300 hover:bg-surface-800/60',
                  )}
                >
                  <Phone className="w-4 h-4 text-surface-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">
                        {n.label || formatPhone(n.displayPhoneNumber)}
                      </span>
                      {n.isPrimary && (
                        <Star className="w-3 h-3 text-brand-cta flex-shrink-0" aria-label="Primária" />
                      )}
                    </div>
                    {n.label && (
                      <div className="text-[11px] text-surface-500 truncate">
                        {formatPhone(n.displayPhoneNumber)}
                      </div>
                    )}
                  </div>
                  {isPicked && <Check className="w-4 h-4 text-brand-400 flex-shrink-0" />}
                </button>
              </li>
            )
          })}
          {numbers.length === 0 && (
            <li className="px-5 py-6 text-center text-xs text-surface-500">
              Este tenant não tem linhas ativas. Conecte um número primeiro.
            </li>
          )}
        </ul>

        {error && (
          <div className="px-5 py-2.5 bg-danger/10 border-t border-danger/20 text-[11px] text-danger">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-surface-800/60 bg-surface-950/30">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!picked || saving || numbers.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-surface-950 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Atribuir linha
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
