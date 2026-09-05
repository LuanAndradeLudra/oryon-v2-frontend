import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { PromptArtifact } from '@/components/agents/PromptArtifact'

/**
 * Centered modal that opens automatically after the system prompt is generated
 * (and on demand from the inline summary card). Hosts a draft copy of the
 * prompt so cancelling discards edits without touching the wizard data.
 * Shared by Step7GerarPrompt.tsx and Step8Revisao.tsx.
 */
export function PromptReviewModal({
  open, initialPrompt, onConfirm, onClose, onRegenerate, regenerating,
}: {
  open: boolean
  initialPrompt: string
  onConfirm: (prompt: string) => void
  onClose: () => void
  onRegenerate?: () => void
  regenerating?: boolean
}) {
  const [draft, setDraft] = useState(initialPrompt)

  // Reset the draft whenever the modal opens or the underlying prompt changes
  // (e.g., after a regenerate triggered from inside the modal).
  // NOTA (extração W0.3): já violava react-hooks/set-state-in-effect no
  // arquivo original (AgentBuilderWizard.tsx) antes da extração — confirmado
  // via lint no commit-base do épico. Preservado como estava (Onda 0 não
  // corrige bugs/lint achados no caminho).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setDraft(initialPrompt)
  }, [open, initialPrompt])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Revisar System Prompt"
      // Fixed-height panel so the modal doesn't grow/shrink with prompt
      // length. fillHeight delegates scroll to PromptArtifact (in fillHeight
      // mode), avoiding the double scrollbar.
      className="max-w-3xl h-[88vh]"
      fillHeight
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-surface-300 hover:bg-surface-800 transition"
          >
            Cancelar
          </button>
          <button
            type="button" onClick={() => onConfirm(draft)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 text-surface-950 hover:bg-brand-500 transition"
          >
            <Check className="w-3.5 h-3.5" /> Confirmar e continuar
          </button>
        </div>
      }
    >
      <p className="text-xs text-surface-500 mb-4 flex-shrink-0">
        Revise o prompt gerado e edite se necessário. Após confirmar, você volta ao builder
        e segue para a revisão final do agente.
      </p>
      <PromptArtifact
        content={draft}
        onChange={setDraft}
        onRegenerate={onRegenerate}
        regenerating={regenerating}
        fillHeight
      />
    </Modal>
  )
}
