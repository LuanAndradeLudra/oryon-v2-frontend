// P6 (achado do relatório consolidado): arquivo grande demais no anexo do
// chat mostrava alert() nativo — trava a aba até o operador clicar OK, único
// lugar do MessageInput que ainda fazia isso. Vira toast (singleton global,
// mesmo padrão do resto do app — sem ToastContainer próprio aqui).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MessageInput } from './MessageInput'
import { ToastContainer } from '@/components/ui/Toast'
import { ContextMenuProvider } from '@/components/ui/ContextMenu'
import { useToast } from '@/hooks/useToast'
import type { SendMessageDto } from '@/types'

vi.mock('@/services/api', () => ({
  cannedResponsesApi: { fetchAll: vi.fn(async () => []) },
  templatesApi: { list: vi.fn(async () => []) },
  contactsApi: { sendTemplate: vi.fn() },
}))

// O compositor lê o papel para mostrar o atalho de gerenciar respostas rápidas
// (admin+). Padrão: atendente, que não vê o atalho.
const papel = vi.hoisted(() => ({ atual: 'agent' }))
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', role: papel.atual } }),
}))

function Harness() {
  const { toasts, dismiss } = useToast()
  return (
    <ContextMenuProvider>
      <MessageInput
        onSend={vi.fn(async () => {})}
        contactId="c1"
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
    render(<MemoryRouter><Harness /></MemoryRouter>)
    const textarea = screen.getByPlaceholderText('Escreva uma mensagem… / para respostas rápidas')
    const dropzone = textarea.closest('.msg-composer') as HTMLElement
    expect(dropzone).toBeTruthy()

    fireEvent.drop(dropzone, { dataTransfer: { types: ['Files'], files: [bigFile('contrato.pdf', 20)] } })

    await waitFor(() => expect(screen.getByText(/contrato\.pdf.*16MB/)).toBeInTheDocument())
    expect(alertSpy).not.toHaveBeenCalled()
  })

  it('2+ arquivos grandes: uma mensagem só, cita os nomes', async () => {
    render(<MemoryRouter><Harness /></MemoryRouter>)
    const textarea = screen.getByPlaceholderText('Escreva uma mensagem… / para respostas rápidas')
    const dropzone = textarea.closest('.msg-composer') as HTMLElement

    fireEvent.drop(dropzone, {
      dataTransfer: { types: ['Files'], files: [bigFile('a.pdf', 20), bigFile('b.pdf', 18)] },
    })

    await waitFor(() => expect(screen.getByText(/a\.pdf, b\.pdf.*16MB/)).toBeInTheDocument())
    expect(alertSpy).not.toHaveBeenCalled()
  })

  it('arquivo dentro do limite: anexa sem passar pelo caminho de erro (sem alert, sem novo toast de tamanho)', async () => {
    render(<MemoryRouter><Harness /></MemoryRouter>)
    const textarea = screen.getByPlaceholderText('Escreva uma mensagem… / para respostas rápidas')
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

// Achado 2026-09-23 (investigação pós-deploy): o SCRUM-1158 corrigiu o
// fallback do BACKEND (resolveMediaCaption), mas o MessageInput mandava
// `mediaCaption: file.name` incondicionalmente pra QUALQUER anexo — pro
// backend, um mediaCaption não-vazio é indistinguível de legenda digitada de
// verdade, então a regra por tipo nunca chegava a rodar e a imagem continuava
// mostrando o nome do arquivo como legenda.
describe('MessageInput — mediaCaption só pra documento (achado pós SCRUM-1158)', () => {
  function HarnessSend({ onSend }: { onSend: (dto: SendMessageDto) => Promise<void> }) {
    return (
      <ContextMenuProvider>
        <MessageInput onSend={onSend} contactId="c1" windowOpen />
      </ContextMenuProvider>
    )
  }

  const smallFile = (name: string, type: string) => new File([new Uint8Array(1)], name, { type })

  async function attachAndSend(file: File) {
    const onSend = vi.fn(async (_dto: SendMessageDto) => {})
    render(<MemoryRouter><HarnessSend onSend={onSend} /></MemoryRouter>)
    const textarea = screen.getByPlaceholderText('Escreva uma mensagem… / para respostas rápidas')
    const dropzone = textarea.closest('.msg-composer') as HTMLElement
    fireEvent.drop(dropzone, { dataTransfer: { types: ['Files'], files: [file] } })
    await waitFor(() => expect(screen.getByText(file.name)).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('Enviar mensagem'))
    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1))
    return onSend.mock.calls[0][0]
  }

  it('imagem: mediaCaption undefined — nome do arquivo NÃO vira legenda', async () => {
    const dto = await attachAndSend(smallFile('foto.png', 'image/png'))
    expect(dto.mediaCaption).toBeUndefined()
  })

  it('vídeo: mediaCaption undefined, mesmo motivo da imagem', async () => {
    const dto = await attachAndSend(smallFile('clipe.mp4', 'video/mp4'))
    expect(dto.mediaCaption).toBeUndefined()
  })

  it('documento: mediaCaption é o nome do arquivo — continua virando o título do card', async () => {
    const dto = await attachAndSend(smallFile('contrato.pdf', 'application/pdf'))
    expect(dto.mediaCaption).toBe('contrato.pdf')
  })
})

describe('MessageInput — gerenciar respostas rápidas sem sair da conversa', () => {
  beforeEach(() => { papel.atual = 'agent' })

  it('atendente não vê o atalho de gerenciar', async () => {
    render(<MemoryRouter><Harness /></MemoryRouter>)
    await waitFor(() => expect(screen.getByPlaceholderText('Escreva uma mensagem… / para respostas rápidas')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /Criar resposta rápida|Gerenciar/ })).toBeNull()
  })

  it('admin abre a mesma seção de Configurações num painel, com link de tela cheia que volta à conversa', async () => {
    papel.atual = 'admin'
    render(<MemoryRouter initialEntries={['/conversations?id=c9']}><Harness /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: /Criar resposta rápida/ }))
    const painel = await screen.findByRole('dialog', { name: 'Respostas rápidas' })
    const link = within(painel).getByRole('link', { name: /Abrir em Configurações/ })
    const href = new URL(link.getAttribute('href') ?? '', 'http://x')
    expect(href.pathname).toBe('/settings/quick-replies')
    expect(href.searchParams.get('voltarPara')).toBe('/conversations?id=c9')
  })
})
