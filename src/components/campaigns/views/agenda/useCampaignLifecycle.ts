// ─── Pausar / retomar / cancelar (BE.2) ────────────────────────────────────
// UMA BANDEIRA POR AÇÃO, e não uma para as três. O comentário anterior dizia
// "os três endpoints ainda não existem", e isso deixou de ser verdade quando a
// BE.2 subiu `cancel` e `pause` e NÃO subiu `resume`. Com uma bandeira só, o
// 404 de `resume` derrubava as outras duas: quem pausava um disparo (funciona),
// clicava em "Retomar" (404) e ficava com a campanha PRESA — sem retomar,
// porque a rota não existe, e sem cancelar, porque o botão sumiu por causa do
// erro de OUTRA rota. Só um refresh soltava. E o aviso ainda dizia que as três
// "chegam com a próxima atualização", com duas já no ar.
//
// `resume` nasce INDISPONÍVEL, por medição e não por suposição:
// `campaigns.controller.ts:150` do épico tem só o comentário
// "POST /campaigns/:id/resume saiu deste PR (achado B2 do Auditor)". A regra 1
// do épico manda esconder capacidade que não existe, e é isso que a tela faz —
// sem "em breve", sem botão morto. A rota está despachada (SCRUM-1043, Solda);
// quando entrar, apagar a entrada de `ROTA_AUSENTE` religa o botão.
//
// LIMITAÇÃO QUE PERMANECE: os endpoints são mutações, então não há sondagem sem
// efeito colateral. Para uma ação que EXISTE no contrato mas caiu, o primeiro
// clique ainda é o descobridor — ele responde 404, aquele controle some e a
// pessoa lê o aviso. Custa um clique enganoso por sessão e por ação. Some com
// um `GET /campaigns/capabilities`; anotado para a Onda 2.
import { useCallback, useRef, useState } from 'react'
import { campaignLifecycleApi } from '@/services/campaignsV2Api'
import { withFallback } from '@/services/withFallback'
import { showToast } from '@/hooks/useToast'
import type { Campaign } from '@/types'

export type LifecycleAction = 'pause' | 'resume' | 'cancel'

export interface CampaignLifecycle {
  /**
   * Esta ação pode ser oferecida? `false` quando a rota não existe (medido no
   * controller) ou quando ela respondeu 404/501 nesta sessão. Por AÇÃO: um
   * endpoint ausente não pode esconder os que estão no ar.
   */
  can: (action: LifecycleAction) => boolean
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

/**
 * Rotas que sabidamente NÃO existem no backend do 992. Medido, não suposto:
 * `cancel` está no `campaigns.controller.ts:136` e `pause` no `:143`; no `:150`
 * há apenas o comentário dizendo que o `resume` saiu do PR. Apagar a entrada
 * quando a SCRUM-1043 mesclar.
 */
const ROTA_AUSENTE: ReadonlySet<LifecycleAction> = new Set(['resume'])

/**
 * O preço de pausar enquanto `resume` não existe, dito ANTES do clique.
 * Pausar não é destrutivo, mas hoje é porta de mão única: o único caminho de
 * saída de uma pausada é cancelar. A doutrina do épico é que a promessa cede e
 * o dado não — então a tela diz o que a ação custa em vez de esconder o botão
 * de uma capacidade que EXISTE (regra 1: oculta-se o inexistente, não o que o
 * sistema faz).
 *
 * Some sozinha: ela só é oferecida quando `can('resume')` é falso, então apagar
 * a entrada de `ROTA_AUSENTE` quando a SCRUM-1043 mesclar tira a frase junto,
 * nas duas telas, sem segunda edição.
 */
export const PAUSE_SEM_VOLTA =
  'Retomar chega em breve; por enquanto, um disparo pausado só pode ser cancelado.'

/** O que a tela diz quando a ação some por 404 — uma frase por ação, nunca as três juntas. */
const GONE_MESSAGE: Record<LifecycleAction, string> = {
  pause:  'Pausar um disparo chega com a próxima atualização do servidor.',
  resume: 'Retomar um disparo chega com a próxima atualização do servidor.',
  cancel: 'Cancelar um disparo chega com a próxima atualização do servidor.',
}

const FAILURE_MESSAGE: Record<LifecycleAction, string> = {
  pause:  'Não deu para pausar o disparo. Ele continua enviando.',
  resume: 'Não deu para retomar o disparo. Ele continua pausado.',
  cancel: 'Não deu para cancelar o disparo. Nada mudou.',
}

export function useCampaignLifecycle(onUpdated: (c: Campaign) => void): CampaignLifecycle {
  const [gone, setGone] = useState<ReadonlySet<LifecycleAction>>(ROTA_AUSENTE)
  const [busy, setBusy] = useState<string | null>(null)
  // Espelho síncrono: duas ações disparadas no mesmo tique não podem cada uma
  // ler o conjunto velho do estado.
  const goneRef = useRef<Set<LifecycleAction>>(new Set(ROTA_AUSENTE))

  const can = useCallback((action: LifecycleAction) => !gone.has(action), [gone])

  const run = useCallback(async (action: LifecycleAction, id: string) => {
    if (goneRef.current.has(action)) return null
    setBusy(id)
    try {
      const res = await withFallback(() => campaignLifecycleApi[action](id), null)
      if (!res.available) {
        // SÓ esta ação sai do ar. As outras duas continuam onde estavam.
        goneRef.current.add(action)
        setGone(new Set(goneRef.current))
        showToast(GONE_MESSAGE[action], 'info')
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

  return { can, busy, run }
}
