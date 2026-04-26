// Clone a template onto another WhatsApp line. Multi-WABA convenience —
// previously admins had to manually recreate each template per line
// (risk of typo; no audit trail). Backend returns the new PENDING row
// with a deterministic name suffix; operator can override newName if
// they want something else.
//
// Hidden in single-line tenants (only one line to clone TO and the
// backend rejects same-line duplicates). Lists only lines other than
// the source.

import { useState } from 'react'
import { X, Phone, Star, Loader2, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import { templatesApi } from '@/services/api'
import type { WhatsAppTemplate } from '@/types'

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

export function DuplicateTemplateModal({
  template,
  onClose,
  onDuplicated,
}: {
  template: WhatsAppTemplate
  onClose: () => void
  onDuplicated: (newTemplate: WhatsAppTemplate) => void
}) {
  const { numbers } = useWorkspaceNumber()
  const otherLines = numbers.filter((n) => n.id !== template.whatsappNumberId)
  const [pickedLineId, setPickedLineId] = useState<string | null>(null)
  const [newName, setNewName] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!pickedLineId || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await templatesApi.duplicateToLine(
        template.id,
        pickedLineId,
        newName.trim() || undefined,
      )
      onDuplicated(res.data)
    } catch (err) {
      const backendMessage = (err as {
        response?: { data?: { message?: string | string[] } }
      })?.response?.data?.message
      const text = Array.isArray(backendMessage) ? backendMessage.join('; ') : backendMessage
      setError(text?.trim() || 'Não foi possível duplicar o template.')
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
            <h2 className="text-sm font-semibold text-surface-100">Duplicar template</h2>
            <p className="text-xs text-surface-400 mt-0.5 truncate">"{template.name}"</p>
            <p className="text-[11px] text-surface-500 mt-1.5">
              O novo template será submetido à Meta na linha escolhida e entra em análise.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {otherLines.length === 0 ? (
            <p className="text-xs text-surface-500">
              Este tenant só tem uma linha WhatsApp ativa — nada para duplicar. Conecte outra linha antes.
            </p>
          ) : (
            <>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-surface-400 mb-1.5">
                  Linha de destino <span className="text-danger">*</span>
                </label>
                <ul className="rounded-xl border border-surface-700/60 overflow-hidden divide-y divide-surface-800/60">
                  {otherLines.map((n) => {
                    const isPicked = pickedLineId === n.id
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => setPickedLineId(n.id)}
                          disabled={saving}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors',
                            isPicked ? 'bg-brand-500/10 text-surface-100' : 'text-surface-300 hover:bg-surface-800/60',
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
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wide text-surface-400 mb-1.5">
                  Novo nome <span className="text-surface-600 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={`Padrão: "${template.name}_linha"`}
                  disabled={saving}
                  className="w-full px-3 py-2 rounded-lg border border-surface-700/60 bg-surface-800/60 text-xs text-surface-200 placeholder:text-surface-600 focus:outline-none focus:border-brand-500/50"
                />
                <p className="mt-1 text-[10px] text-surface-500">
                  Snake_case, sem espaços. Use para evitar conflitos de nome.
                </p>
              </div>
            </>
          )}

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[11px] text-danger">
              {error}
            </div>
          )}
        </div>

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
            onClick={handleSubmit}
            disabled={!pickedLineId || saving || otherLines.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-surface-950 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Duplicando...
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Duplicar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
