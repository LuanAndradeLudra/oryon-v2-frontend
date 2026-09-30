import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/hooks/useToast'
import { requestConnector } from '@/services/connectorsApi'

/**
 * Pedido de integração (SCRUM-1077): livre ("Solicitar integração") ou para
 * priorizar um conector da biblioteca que ainda não foi construído
 * (`defaultName`, nome travado). O pedido entra na fila de triagem da Oryon.
 */
export function ConnectorRequestModal({ defaultName, onClose }: { defaultName?: string; onClose: () => void }) {
  const { toast } = useToast()
  const [name, setName] = useState(defaultName ?? '')
  const [useCase, setUseCase] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const canSubmit = name.trim().length > 0 && useCase.trim().length > 0
  const locked = !!defaultName

  async function handleSubmit() {
    setSubmitting(true)
    try {
      await requestConnector(name.trim(), useCase.trim())
      toast(locked ? `Prioridade registrada — a Oryon vai avaliar ${name}.` : 'Solicitação registrada — a Oryon vai avaliar.', 'success')
      onClose()
    } catch (err) {
      toast(err instanceof Error ? err.message : String(err), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      className="max-w-[480px]"
      title={locked ? `Priorizar ${defaultName}` : 'Solicitar uma integração'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="neutral" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={() => void handleSubmit()} disabled={!canSubmit || submitting} loading={submitting}>
            Enviar solicitação
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {locked ? (
          <p className="text-xs text-surface-500">
            {defaultName} está na nossa lista de integrações pesquisadas, mas ainda não foi construído. Conte para que
            você usaria: isso ajuda a decidir o que construir primeiro.
          </p>
        ) : (
          <FormField label="Qual sistema você quer conectar?" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Sistema XPTO" />
          </FormField>
        )}
        <FormField label="Para que você usaria essa integração?" required>
          <Textarea rows={3} value={useCase} onChange={(e) => setUseCase(e.target.value)} placeholder="Descreva rapidamente o que você precisa fazer" />
        </FormField>
      </div>
    </Modal>
  )
}
