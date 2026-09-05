import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Step7GerarPrompt } from '@/components/agents/studio/steps/Step7GerarPrompt'
import { DEFAULT_DATA, type WizardData } from '@/components/agents/studio/types'

/**
 * Regressão do achado do Lince na revisão do #122 (W0.3).
 *
 * O original chamava `setReviewOpen(true)` incondicionalmente depois de um
 * `generateAgentPrompt` bem-sucedido. A extração trocou por `if (prompt)`, um
 * truthy check — mas o hook só devolve `null` quando a geração FALHA, e string
 * vazia é retorno de sucesso legal. Com o truthy check, prompt vazio parava o
 * spinner sem abrir modal e sem erro: um no-op silencioso, pior que a tela
 * vazia que o comportamento antigo mostrava.
 *
 * Mesma família do `bottomRef`/`inputRef`: delta de comportamento que dump de
 * DOM não pega, só leitura da fonte — por isso vira teste.
 */
function montar(generatePrompt: () => Promise<string | null>) {
  const setData = vi.fn<(u: React.SetStateAction<WizardData>) => void>()
  render(
    <Step7GerarPrompt
      data={DEFAULT_DATA}
      setData={setData}
      generating={false}
      generateError={null}
      generatePrompt={generatePrompt}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: /Gerar System Prompt com IA/i }))
}

const modalAberto = () => screen.queryByText('Revisar System Prompt')

describe('Step7GerarPrompt — abertura do modal de revisão', () => {
  it('abre o modal quando a geração devolve um prompt', async () => {
    montar(async () => 'Você é a Sofia, atendente da Nuvem Moda.')
    await waitFor(() => expect(modalAberto()).toBeInTheDocument())
  })

  it('abre o modal mesmo quando o prompt volta VAZIO (string vazia é sucesso)', async () => {
    montar(async () => '')
    await waitFor(() => expect(modalAberto()).toBeInTheDocument())
  })

  it('NÃO abre o modal quando a geração falha (null)', async () => {
    montar(async () => null)
    // Espera o suficiente para uma abertura indevida acontecer, se fosse.
    await new Promise(r => setTimeout(r, 50))
    expect(modalAberto()).not.toBeInTheDocument()
  })
})
