// P6 (achado do relatório consolidado): arquivo grande demais no anexo do
// chat mostrava alert() nativo — trava a aba até o operador clicar OK, único
// lugar do MessageInput que ainda fazia isso. Vira toast (singleton global,
// mesmo padrão do resto do app — sem ToastContainer próprio aqui).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MessageInput } from './MessageInput'
import { ToastContainer } from '@/components/ui/Toast'
import { ContextMenuProvider } from '@/components/ui/ContextMenu'
import { useToast } from '@/hooks/useToast'

vi.mock('@/services/api', () => ({
  cannedResponsesApi: { fetchAll: vi.fn(async () => []) },
  templatesApi: { list: vi.fn(async () => []) },
  contactsApi: { sendTemplate: vi.fn() },
}))

function Harness() {
  const { toasts, dismiss } = useToast()
  return (
    <ContextMenuProvider>
      <MessageInput
        onSend={vi.fn(async () => {})}
        contactId="c1"
        sending={false}
        windowOpen
      />
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ContextMenuProvider>
  )
}

const bigFile = (name: string, sizeMb: number) => {
  const file = new File([new Uint8Array(1)], name, { type: 'application/pdf' })
  Object.defineProperty(file, 'size', { value: sizeMb * 1024 * 1024 })
  return file
}

describe('MessageInput — anexo grande demais (P6, sem alert())', () => {
  let alertSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  it('arquivo acima de 16MB: mostra toast de erro explicando o limite, nunca window.alert', async () => {
    render(<Harness />)
    const textarea = screen.getByPlaceholderText('Digite uma mensagem ou / para respostas rápidas...')
    const dropzone = textarea.closest('.msg-composer') as HTMLElement
    expect(dropzone).toBeTruthy()

    fireEvent.drop(dropzone, { dataTransfer: { types: ['Files'], files: [bigFile('contrato.pdf', 20)] } })

    await waitFor(() => expect(screen.getByText(/contrato\.pdf.*16MB/)).toBeInTheDocument())
    expect(alertSpy).not.toHaveBeenCalled()
  })

  it('2+ arquivos grandes: uma mensagem só, cita os nomes', async () => {
    render(<Harness />)
    const textarea = screen.getByPlaceholderText('Digite uma mensagem ou / para respostas rápidas...')
    const dropzone = textarea.closest('.msg-composer') as HTMLElement

    fireEvent.drop(dropzone, {
      dataTransfer: { types: ['Files'], files: [bigFile('a.pdf', 20), bigFile('b.pdf', 18)] },
    })

    await waitFor(() => expect(screen.getByText(/a\.pdf, b\.pdf.*16MB/)).toBeInTheDocument())
    expect(alertSpy).not.toHaveBeenCalled()
  })

  it('arquivo dentro do limite: anexa sem passar pelo caminho de erro (sem alert, sem novo toast de tamanho)', async () => {
    render(<Harness />)
    const textarea = screen.getByPlaceholderText('Digite uma mensagem ou / para respostas rápidas...')
    const dropzone = textarea.closest('.msg-composer') as HTMLElement

    // `toast` é um singleton global (F9 · SCRUM-879, propositalmente — evita
    // containers duplicados) e o store não reseta entre testes deste
    // arquivo; por isso não afirmamos "nenhum toast na tela" aqui (um teste
    // anterior pode deixar um pendente até seu auto-dismiss), só que ESTE
    // drop não soma outra ocorrência da mensagem de tamanho.
    const before = screen.queryAllByText(/16MB/).length
    fireEvent.drop(dropzone, { dataTransfer: { types: ['Files'], files: [bigFile('foto.jpg', 2)] } })
    await new Promise((r) => setTimeout(r, 50))

    expect(alertSpy).not.toHaveBeenCalled()
    expect(screen.queryAllByText(/16MB/).length).toBe(before)
  })
})
