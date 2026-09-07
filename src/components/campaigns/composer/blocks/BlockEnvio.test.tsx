// O que este bloco tem de arriscado não é o layout: é o que ele esconde. Três
// capacidades do produto ainda não existem (BE.4 recorrência, BE.5 cota) ou
// dependem de histórico (o insight de melhor horário), e a regra do §6/§8 do
// D2-plano é *não renderizar* em vez de desabilitar. Um controle desabilitado
// anuncia uma capacidade que o produto não tem; um campo com "0 / 0 hoje"
// inventa um número. Os testes abaixo prendem as três ausências, que são
// justamente o que some sem ninguém notar quando alguém "melhora" a tela.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BlockEnvio } from './BlockEnvio'
import { formatDuration, envioSummary } from './summaries'
import type { WhatsAppNumber } from '@/types'
import type { WhatsAppNumberUsage } from '@/types/campaignsV2'

const LINHA: WhatsAppNumber = {
  id: 'l1', displayPhoneNumber: '+55 11 90000-1234',
  label: 'WhatsApp Comercial', status: 'CONNECTED', isActive: true,
}
const LINHA_OFF: WhatsAppNumber = {
  id: 'l2', displayPhoneNumber: '+55 11 90000-9999',
  label: 'WhatsApp Promo', status: 'DISCONNECTED', isActive: false,
}

const USAGE: WhatsAppNumberUsage = {
  dailyQuota: 10_000, usedToday: 8_760, remaining: 1_240,
  resetsAt: '2026-09-07T03:00:00.000Z', qualityRating: 'green',
}

function setup(over: Partial<React.ComponentProps<typeof BlockEnvio>> = {}) {
  const props = {
    scheduleMode: 'now' as const,
    onScheduleMode: vi.fn(),
    scheduledAt: '',
    onScheduledAt: vi.fn(),
    lines: [LINHA],
    whatsappNumberId: null,
    onLineChange: vi.fn(),
    usageByLine: null,
    audienceCount: null,
    ...over,
  }
  render(<BlockEnvio {...props} />)
  return props
}

describe('BlockEnvio — o que fica oculto porque ainda não existe', () => {
  it('não oferece "Recorrente": o BE.4 não existe e opção morta mente', () => {
    setup()
    expect(screen.getByRole('tab', { name: 'Agora' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Agendar' })).toBeInTheDocument()
    expect(screen.queryByText(/recorrente/i)).not.toBeInTheDocument()
  })

  it('sem BE.5, a linha mostra nome e telefone e NENHUMA cota inventada', () => {
    setup({ usageByLine: null })
    expect(screen.getByText('WhatsApp Comercial')).toBeInTheDocument()
    expect(screen.getByText(/\+55 11 90000-1234/)).toBeInTheDocument()
    // O que não pode aparecer é uma cota zerada fingindo ser dado real.
    expect(screen.queryByText(/hoje/)).not.toBeInTheDocument()
    expect(screen.queryByText(/qualidade/)).not.toBeInTheDocument()
  })

  it('com BE.5, a cota e a qualidade aparecem', () => {
    setup({ usageByLine: { l1: USAGE } })
    expect(screen.getByText(/8\.760 \/ 10\.000 hoje/)).toBeInTheDocument()
    expect(screen.getByText('alta')).toBeInTheDocument()
  })

  it('o insight de melhor horário só existe quando há histórico', () => {
    setup()
    expect(screen.queryByText(/melhor horário/i)).not.toBeInTheDocument()
  })

  it('…e aparece quando o analytics manda um', () => {
    setup({ bestHour: { title: 'Melhor horário para essa base: 18h–20h', detail: '61% das leituras.' } })
    expect(screen.getByText(/Melhor horário para essa base/)).toBeInTheDocument()
  })
})

describe('BlockEnvio — agendamento', () => {
  it('o campo de data só existe no modo "Agendar"', () => {
    const { unmount } = render(
      <BlockEnvio
        scheduleMode="now" onScheduleMode={vi.fn()} scheduledAt="" onScheduledAt={vi.fn()}
        lines={[LINHA]} whatsappNumberId={null} onLineChange={vi.fn()}
        usageByLine={null} audienceCount={null}
      />,
    )
    expect(screen.queryByLabelText('Data e hora do envio')).not.toBeInTheDocument()
    unmount()

    setup({ scheduleMode: 'later' })
    expect(screen.getByLabelText('Data e hora do envio')).toBeInTheDocument()
  })
})

describe('BlockEnvio — escolha de linha', () => {
  it('escolher uma linha avisa quem monta a página', () => {
    const props = setup({ lines: [LINHA, LINHA_OFF] })
    fireEvent.click(screen.getByRole('radio', { name: /WhatsApp Comercial/ }))
    expect(props.onLineChange).toHaveBeenCalledWith('l1')
  })

  it('linha desconectada não pode ser escolhida', () => {
    const props = setup({ lines: [LINHA, LINHA_OFF] })
    const off = screen.getByRole('radio', { name: /WhatsApp Promo/ })
    expect(off).toBeDisabled()
    fireEvent.click(off)
    expect(props.onLineChange).not.toHaveBeenCalled()
  })

  it('sem nenhuma linha conectada, diz onde conectar em vez de ficar vazio', () => {
    setup({ lines: [] })
    expect(screen.getByText(/Nenhuma linha do WhatsApp conectada/)).toBeInTheDocument()
  })
})

describe('BlockEnvio — duração estimada', () => {
  it('não estima nada enquanto o público é desconhecido', () => {
    setup({ audienceCount: null })
    expect(screen.queryByText(/de envio/)).not.toBeInTheDocument()
  })

  it('mostra a conta do mockup: 1.226 msgs a ~3/s → ~7 min', () => {
    setup({ audienceCount: 1226 })
    expect(screen.getByText(/1\.226 msgs a ~3\/s/)).toBeInTheDocument()
    expect(screen.getByText('~7 min')).toBeInTheDocument()
  })
})

describe('formatDuration — arredonda para cima', () => {
  // Prometer menos tempo do que o envio leva é pior que prometer mais: quem
  // agenda para 18h conta com a janela inteira.
  it.each([
    [1, '~1 s'],
    [90, '~30 s'],
    [1226, '~7 min'],      // 408,67s → 409s → 6,8min → 7
    [180, '~1 min'],       // exatamente 60s
    [181, '~2 min'],       // 60,3s → 61s → 1,02min → 2
    [10_800, '~1 h'],      // 3600s = 60min exatos
    [11_000, '~1 h 2 min'],
  ])('%i contatos → %s', (count, expected) => {
    expect(formatDuration(count)).toBe(expected)
  })
})

describe('envioSummary', () => {
  it('sem linha escolhida, repete a pergunta do mockup', () => {
    expect(envioSummary('now', '', null)).toBe('Quando e por qual linha.')
  })

  it('modo agora diz "Agora" e a linha', () => {
    expect(envioSummary('now', '', LINHA)).toBe('Agora · WhatsApp Comercial')
  })

  it('agendado sem data ainda não inventa data', () => {
    expect(envioSummary('later', '', LINHA)).toBe('Agendar · WhatsApp Comercial')
  })

  it('linha sem rótulo cai no telefone', () => {
    expect(envioSummary('now', '', { ...LINHA, label: undefined }))
      .toBe('Agora · +55 11 90000-1234')
  })
})
