// TemplatePicker (SCRUM-1097): lista de templates APROVADOS, extraída do
// SendTemplateDrawer — carregando / erro / vazio / lista / filtro por texto.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TemplatePicker } from './TemplatePicker'
import { templatesApi } from '@/services/api'
import type { WhatsAppTemplate } from '@/types'

vi.mock('@/services/api', () => ({ templatesApi: { list: vi.fn() } }))

const tpl = (id: string, name: string, body: string, extra: Partial<WhatsAppTemplate> = {}) =>
  ({ id, tenantId: 'x', name, language: 'pt_BR', category: 'UTILITY', status: 'APPROVED', body, createdAt: '', updatedAt: '', ...extra }) as WhatsAppTemplate

const BOAS_VINDAS = tpl('t1', 'boas_vindas', 'Olá {{1}}, seja bem-vindo!', { footer: 'Equipe Oryon' })
const COBRANCA = tpl('t2', 'lembrete_cobranca', 'Sua fatura vence amanhã.')

describe('TemplatePicker', () => {
  beforeEach(() => {
    vi.mocked(templatesApi.list).mockReset()
  })

  it('carrega só os APROVADOS e mostra carregando antes da lista', async () => {
    vi.mocked(templatesApi.list).mockResolvedValue({ data: [BOAS_VINDAS] } as never)
    render(<TemplatePicker onSelect={vi.fn()} />)
    expect(screen.getByRole('status', { name: 'Carregando templates' })).toBeInTheDocument()
    expect(await screen.findByText('boas vindas')).toBeInTheDocument()
    expect(templatesApi.list).toHaveBeenCalledWith('APPROVED')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('mostra nome sem underscores, idioma, corpo e rodapé; clicar chama onSelect com o template', async () => {
    vi.mocked(templatesApi.list).mockResolvedValue({ data: [BOAS_VINDAS, COBRANCA] } as never)
    const onSelect = vi.fn()
    render(<TemplatePicker onSelect={onSelect} />)

    expect(await screen.findByText('lembrete cobranca')).toBeInTheDocument()
    expect(screen.getByText('Olá {{1}}, seja bem-vindo!')).toBeInTheDocument()
    expect(screen.getByText('Equipe Oryon')).toBeInTheDocument()
    expect(screen.getAllByText('pt_BR')).toHaveLength(2)

    fireEvent.click(screen.getByText('boas vindas'))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(BOAS_VINDAS)
  })

  it('sem templates aprovados: estado vazio com a orientação de criar em Disparos', async () => {
    vi.mocked(templatesApi.list).mockResolvedValue({ data: [] } as never)
    render(<TemplatePicker onSelect={vi.fn()} />)
    expect(await screen.findByText('Nenhum template aprovado disponível.')).toBeInTheDocument()
    expect(screen.getByText(/Crie templates em Disparos/)).toBeInTheDocument()
  })

  it('resposta que não é lista vira vazio (não quebra)', async () => {
    vi.mocked(templatesApi.list).mockResolvedValue({ data: null } as never)
    render(<TemplatePicker onSelect={vi.fn()} />)
    expect(await screen.findByText('Nenhum template aprovado disponível.')).toBeInTheDocument()
  })

  it('filtra por nome e por corpo, sem acento nem caixa', async () => {
    vi.mocked(templatesApi.list).mockResolvedValue({ data: [BOAS_VINDAS, COBRANCA] } as never)
    const { rerender } = render(<TemplatePicker onSelect={vi.fn()} query="COBRANCA" />)
    expect(await screen.findByText('lembrete cobranca')).toBeInTheDocument()
    expect(screen.queryByText('boas vindas')).not.toBeInTheDocument()

    // corpo: "Olá" casa com "ola"
    rerender(<TemplatePicker onSelect={vi.fn()} query="ola" />)
    expect(screen.getByText('boas vindas')).toBeInTheDocument()
    expect(screen.queryByText('lembrete cobranca')).not.toBeInTheDocument()

    // vazio = tudo
    rerender(<TemplatePicker onSelect={vi.fn()} query="  " />)
    expect(screen.getByText('boas vindas')).toBeInTheDocument()
    expect(screen.getByText('lembrete cobranca')).toBeInTheDocument()
  })

  it('busca sem resultado diz o termo — e não "nenhum template aprovado"', async () => {
    vi.mocked(templatesApi.list).mockResolvedValue({ data: [BOAS_VINDAS] } as never)
    render(<TemplatePicker onSelect={vi.fn()} query="zzz" />)
    expect(await screen.findByText(/Nenhum template encontrado para/)).toHaveTextContent('“zzz”')
    expect(screen.queryByText('Nenhum template aprovado disponível.')).not.toBeInTheDocument()
  })

  it('falha ao carregar NÃO diz que não há templates: mostra erro e "Tentar novamente" refaz a busca', async () => {
    vi.mocked(templatesApi.list)
      .mockRejectedValueOnce(new Error('rede'))
      .mockResolvedValueOnce({ data: [BOAS_VINDAS] } as never)
    render(<TemplatePicker onSelect={vi.fn()} />)

    expect(await screen.findByText('Não foi possível carregar os templates.')).toBeInTheDocument()
    expect(screen.queryByText('Nenhum template aprovado disponível.')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(await screen.findByText('boas vindas')).toBeInTheDocument()
    await waitFor(() => expect(templatesApi.list).toHaveBeenCalledTimes(2))
  })

  it('desmontar antes da resposta não atualiza estado (sem aviso de setState em componente desmontado)', async () => {
    let resolve!: (v: unknown) => void
    vi.mocked(templatesApi.list).mockReturnValue(new Promise((r) => { resolve = r }) as never)
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { unmount } = render(<TemplatePicker onSelect={vi.fn()} />)
    unmount()
    resolve({ data: [BOAS_VINDAS] })
    await Promise.resolve()
    expect(err).not.toHaveBeenCalled()
    err.mockRestore()
  })
})
