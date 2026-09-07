// Esta página é o fio que faltava: o núcleo, os hooks de rede, o chassi e os
// quatro blocos já estavam mesclados e `/campaigns/new` continuava sendo o
// EmptyState da W0.1. Os testes prendem as três coisas que só existem AQUI, e
// que nenhum teste de componente pega:
//
//   1. os quatro blocos são montados de fato (não é mais o esqueleto);
//   2. o `?template=` da Biblioteca (D4 §6c) pré-seleciona — a escolha de quem
//      clicou em "Usar" não pode se perder no caminho;
//   3. a CONVERSÃO na fronteira do público: o construtor do Crivo fala em
//      `AudienceDefinition` (com ids de UI) e o contrato fala em
//      `CampaignSegmentDefinition` (sem). Se a conversão sumir, ids de editor
//      vazam para o `POST /campaigns` e para o corpo do `cost-estimate`.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import type { Contact, WhatsAppTemplate } from '@/types'

const setAudience = vi.fn()
const setSelectedTemplate = vi.fn()
const draftState: Record<string, unknown> = {}

vi.mock('@/components/campaigns/composer/useComposerDraft', async (orig) => {
  const actual = await orig<Record<string, unknown>>()
  return {
    ...actual,
    useComposerDraft: () => draftState,
  }
})

vi.mock('@/components/campaigns/composer/useCostEstimate', () => ({
  useCostEstimate: () => ({ estimate: null, loading: false, available: false }),
}))

vi.mock('@/components/campaigns/composer/useTestSend', () => ({
  useTestSend: () => ({ send: vi.fn(), sending: false, available: false, ready: false }),
}))

// O `AudienceBlock` real é do Crivo e tem rede própria; aqui interessa só o
// que a página faz com o que ele devolve.
vi.mock('@/components/campaigns/audience/AudienceBlock', () => ({
  AudienceBlock: ({ onChange }: { onChange: (d: unknown) => void }) => (
    <button
      type="button"
      onClick={() => onChange({
        definition: {
          groups: [{
            id: 'grp_1',                       // ← id de UI, não pode viajar
            op: 'and',
            conditions: [{ id: 'cond_1', field: 'tag', operator: 'in', values: ['vip'] }],
          }],
          exclude: { optOut: true },
        },
      })}
    >
      simular edição de público
    </button>
  ),
}))

const TPL = (over: Partial<WhatsAppTemplate> = {}): WhatsAppTemplate => ({
  id: 'tpl_1', name: 'novo_lancamento_v2', body: 'Oi {{1}}', category: 'MARKETING',
  language: 'pt_BR', status: 'APPROVED', bodyVariables: ['nome'], ...over,
} as WhatsAppTemplate)

const TEMPLATES = [TPL(), TPL({ id: 'tpl_2', name: 'lembrete_consulta' })]

// A prévia do telefone renderiza com um contato REAL da base carregada pelo
// núcleo; o mock precisa entregá-la, senão a página não monta.
const CONTACTS = [
  { id: 'c1', displayName: 'Marina Torres', waId: '5511999990001' },
  { id: 'c2', displayName: 'João Prado',    waId: '5511999990002' },
] as unknown as Contact[]

beforeEach(() => {
  setAudience.mockReset()
  setSelectedTemplate.mockReset()
  Object.assign(draftState, {
    templates: TEMPLATES, loadingTemplates: false, contacts: CONTACTS,
    selectedTemplate: null, setSelectedTemplate,
    campaignName: '', setCampaignName: vi.fn(),
    mappings: [], updateMapping: vi.fn(), mappingsComplete: true, fieldDefs: [],
    scheduleMode: 'now', setScheduleMode: vi.fn(), scheduledAt: '', setScheduledAt: vi.fn(),
    waNumbers: [], whatsappNumberId: null, setWhatsappNumberId: vi.fn(),
    audience: null, setAudience, onAudienceResolved: vi.fn(), audienceCount: null,
    blocks: { template: 'pending', publico: 'pending', variaveis: 'done', envio: 'pending' },
    firstPending: 'template', submit: vi.fn(), saving: false, error: '', setError: vi.fn(),
  })
})

async function renderAt(path: string) {
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/campaigns/new" element={<CampaignComposerPage />} />
        <Route path="/campaigns" element={<div data-testid="lista">lista de disparos</div>} />
      </Routes>
    </MemoryRouter>,
  )
  return view
}

const { CampaignComposerPage } = await import('./CampaignComposerPage')

describe('CampaignComposerPage — a tela existe', () => {
  it('monta os quatro blocos, e não o EmptyState "Composer em construção"', async () => {
    await renderAt('/campaigns/new')
    expect(screen.queryByText(/Composer em constru/i)).not.toBeInTheDocument()
    for (const titulo of ['Template', 'Público', 'Variáveis', 'Envio']) {
      expect(screen.getByRole('button', { name: new RegExp(titulo) })).toBeInTheDocument()
    }
  })

  it('o nome do disparo é editável no título, e não dentro do bloco Template', async () => {
    await renderAt('/campaigns/new')
    expect(screen.getByLabelText('Nome do disparo')).toBeInTheDocument()
  })

  it('mostra os pré-requisitos do disparo', async () => {
    await renderAt('/campaigns/new')
    expect(screen.getByText('Template aprovado')).toBeInTheDocument()
    expect(screen.getByText('Linha e horário definidos')).toBeInTheDocument()
  })
})

describe('CampaignComposerPage — ?template= da Biblioteca (D4 §6c)', () => {
  it('pré-seleciona o template que veio no parâmetro', async () => {
    await renderAt('/campaigns/new?template=tpl_2')
    await waitFor(() => expect(setSelectedTemplate).toHaveBeenCalledWith(TEMPLATES[1]))
  })

  it('sem parâmetro, não escolhe nada por conta própria', async () => {
    await renderAt('/campaigns/new')
    expect(setSelectedTemplate).not.toHaveBeenCalled()
  })

  it('id que não existe é ignorado em silêncio, sem culpar quem clicou', async () => {
    await renderAt('/campaigns/new?template=tpl_apagado')
    expect(setSelectedTemplate).not.toHaveBeenCalled()
    // A tela abre normalmente, no bloco Template.
    expect(screen.getByRole('button', { name: /Template/ })).toBeInTheDocument()
  })

  it('não sobrescreve um template já escolhido', async () => {
    Object.assign(draftState, { selectedTemplate: TEMPLATES[0] })
    await renderAt('/campaigns/new?template=tpl_2')
    expect(setSelectedTemplate).not.toHaveBeenCalled()
  })
})

describe('CampaignComposerPage — fronteira do público', () => {
  it('converte a definição do editor para a do contrato, sem os ids de UI', async () => {
    await renderAt('/campaigns/new')
    // O acordeao nasce no Template, entao o corpo do Publico esta' `hidden` —
    // e conteudo escondido nao e' alcancavel por papel, igual para o leitor de
    // tela. Abre o bloco antes, que e' o que a pessoa faria.
    fireEvent.click(screen.getByRole('button', { name: /Público/ }))
    fireEvent.click(screen.getByRole('button', { name: /simular edição de público/ }))

    expect(setAudience).toHaveBeenCalledTimes(1)
    const enviado = setAudience.mock.calls[0][0] as {
      definition: {
        groups: { id?: string; op: string; conditions: { id?: string }[] }[]
        exclude?: Record<string, unknown>
      }
    }

    // O que o contrato recebe não tem id de grupo nem de condição.
    expect(enviado.definition.groups[0].id).toBeUndefined()
    expect(enviado.definition.groups[0].conditions[0].id).toBeUndefined()
    // …e o que importa sobreviveu à conversão.
    expect(enviado.definition.groups[0].op).toBe('and')
    expect(enviado.definition.exclude).toEqual({ optOut: true })
  })
})
