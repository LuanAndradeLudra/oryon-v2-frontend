// ─── Pausar / retomar / cancelar (BE.2) ────────────────────────────────────
// Os três endpoints ainda não existem em produção. `withFallback` devolve
// `available:false` no primeiro 404/501, a Agenda ESCONDE os três controles
// pelo resto da sessão e avisa por que sumiram — não deixa um botão
// desabilitado sem explicação nem tenta de novo a cada render.
//
// LIMITAÇÃO CONHECIDA, assumida de propósito: os três endpoints da BE.2 são
// mutações (`POST pause|resume|cancel`), então NÃO existe sondagem sem efeito
// colateral que descubra a disponibilidade antes do primeiro clique. O
// resultado é que, enquanto a BE.2 não subir, o primeiro clique em "Pausar"
// não pausa nada: ele responde 404, o controle some e a pessoa lê o aviso.
// Isso custa um clique enganoso por sessão, e só para quem tem disparo em
// envio no momento. A alternativa — esconder até provar que existe — deixaria
// o botão invisível PARA SEMPRE, inclusive depois de a BE.2 subir, porque a
// prova só chegaria de um clique que nunca aconteceria. Some com um
// `GET /campaigns/capabilities` (ou um campo em contrato já existente) — está
// anotado para a Onda 2.
import { useCallback, useRef, useState } from 'react'
import { campaignLifecycleApi } from '@/services/campaignsV2Api'
import { withFallback } from '@/services/withFallback'
import { showToast } from '@/hooks/useToast'
import type { Campaign } from '@/types'

export type LifecycleAction = 'pause' | 'resume' | 'cancel'

export interface CampaignLifecycle {
  /** `false` assim que o backend responde 404/501 num dos três. */
  available: boolean
  /** id da campanha com ação em curso, ou `null`. */
  busy: string | null
  /**
   * NUNCA rejeita: erro vira toast aqui dentro e a chamada devolve `null`.
   * O erro é tratado no hook, e não em cada chamador, por dois motivos:
   * o `ConfirmModal` tipa `onConfirm` como `() => void` e DESCARTA a promessa,
   * então uma rejeição vinda de dentro de um modal não teria quem a pegasse; e
   * os cartões chamam com `void run(...)`, que engole a rejeição e devolve o
   * botão ao normal como se a ação tivesse funcionado. Uma ação que falha sem
   * dizer nada convida ao segundo clique.
   */
  run: (action: LifecycleAction, id: string) => Promise<Campaign | null>
}

const FAILURE_MESSAGE: Record<LifecycleAction, string> = {
  pause:  'Não deu para pausar o disparo. Ele continua enviando.',
  resume: 'Não deu para retomar o disparo. Ele continua pausado.',
  cancel: 'Não deu para cancelar o disparo. Nada mudou.',
}

export function useCampaignLifecycle(onUpdated: (c: Campaign) => void): CampaignLifecycle {
  const [available, setAvailable] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  // Espelho síncrono: duas ações disparadas no mesmo tique não podem cada uma
  // ler o `available` velho do estado.
  const availableRef = useRef(true)

  const run = useCallback(async (action: LifecycleAction, id: string) => {
    if (!availableRef.current) return null
    setBusy(id)
    try {
      const res = await withFallback(() => campaignLifecycleApi[action](id), null)
      if (!res.available) {
        availableRef.current = false
        setAvailable(false)
        showToast(
          'Pausar, retomar e cancelar chegam com a próxima atualização do servidor.',
          'info',
        )
        return null
      }
      const updated = res.data?.data ?? null
      if (updated) onUpdated(updated)
      return updated
    } catch {
      // `withFallback` cobre 404/501 (o endpoint não existe); 500 e rede caída
      // chegam aqui. A mensagem diz o que NÃO mudou, porque é isso que a pessoa
      // precisa saber para decidir o próximo passo.
      showToast(FAILURE_MESSAGE[action], 'error')
      return null
    } finally {
      setBusy(null)
    }
  }, [onUpdated])

  return { available, busy, run }
}
