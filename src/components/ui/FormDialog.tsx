// ─── Form Dialog ─────────────────────────────────────────────────────────────
// Modal de formulário padronizado: submit no Enter, banner de erro, botões
// Cancelar/Salvar consistentes e estado de loading. Substitui o chrome
// reimplementado em CreateUserDrawer, CustomFieldModal, StageModal,
// QuickReplyModal etc. — cada um com seu próprio footer/erro.

import type { FormEvent, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Modal } from './Modal'
import { Button } from './Button'

interface FormDialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Chamado no submit (botão ou Enter). Deve lançar/definir `error` em falha. */
  onSubmit: () => void | Promise<void>
  submitLabel?: string
  cancelLabel?: string
  /** Desabilita o submit (validação do caller). */
  submitDisabled?: boolean
  loading?: boolean
  /** Mensagem de erro humanizada exibida acima do footer. */
  error?: string | null
  danger?: boolean
  className?: string
}

export function FormDialog({
  open, onClose, title, children,
  onSubmit, submitLabel = 'Salvar', cancelLabel = 'Cancelar',
  submitDisabled, loading, error, danger, className,
}: FormDialogProps) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (loading || submitDisabled) return
    void onSubmit()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      className={className}
      footer={
        <div className="flex flex-col gap-3">
          {error && (
            <div role="alert" className="flex items-start gap-2 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={onClose} disabled={loading}>{cancelLabel}</Button>
            <Button
              variant={danger ? 'danger' : 'primary'}
              onClick={() => { if (!loading && !submitDisabled) void onSubmit() }}
              loading={loading}
              disabled={submitDisabled}
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {children}
        {/* Submit invisível: garante Enter-para-salvar em inputs */}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  )
}
