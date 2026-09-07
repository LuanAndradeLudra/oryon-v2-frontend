// ─── useTemplateUsage ──────────────────────────────────────────────────────
// Quem usa cada template — as duas fontes, cada uma com o próprio destino se
// não existir.
//
// 1. `useTemplateUsage` (BE.8, `GET /templates?withUsage=1`): quantas vezes o
//    template foi disparado e quando foi a última. **O mapa INTEIRO ausente**
//    é o sinal de "BE.8 não está no ar", diferente de um mapa vazio, que
//    diria "nenhum template foi usado". A diferença decide se o grupo "Uso"
//    existe no rail e se a linha de metadados fala de uso — por isso o hook
//    devolve `undefined`, e não `new Map()`, no fallback.
//
// 2. `useAutomationLinks` (`GET /automations`, que já existe): qual automação
//    dispara qual template. É o ÚNICO vínculo real do produto — agente não
//    referencia template em lugar nenhum, e é por isso que o grupo do mockup
//    virou "Usados em automações" em vez de "Usados por agentes".
import { useEffect, useState } from 'react'
import { automationsApi } from '@/services/api'
import { templatesV2Api } from '@/services/campaignsV2Api'
import { withFallback } from '@/services/withFallback'
import type { UsageMap } from './libraryFilters'

export interface UseTemplateUsageResult {
  /** `undefined` = BE.8 fora do ar. Nunca um mapa vazio nesse caso. */
  usage?: UsageMap
  loading: boolean
}

/** Pede a lista com uso só para extrair o uso: a lista de templates continua
 *  vindo do `templatesApi.list()` da aba, que é quem também puxa da Meta antes.
 *  Duas chamadas quando o BE.8 existe, e nenhuma dependência quando ele não
 *  existe — o contrário (a aba passar a carregar por aqui) trocaria o caminho
 *  de dados principal por um que ainda não está no ar. */
export function useTemplateUsage(): UseTemplateUsageResult {
  const [usage, setUsage] = useState<UsageMap | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    withFallback(() => templatesV2Api.listWithUsage().then((r) => r.data), null)
      .then(({ data }) => {
        if (cancelled) return
        if (!data) return setUsage(undefined)
        setUsage(new Map(data.map((t) => [t.id, { usageCount: t.usageCount, lastUsedAt: t.lastUsedAt }])))
      })
      .catch(() => {
        // Erro real (500, rede) não é "BE.8 não existe": em ambos os casos a
        // tela fica sem uso, e inventar zero seria pior que omitir.
        if (!cancelled) setUsage(undefined)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return { usage, loading }
}

export interface AutomationLink {
  /** Nome da automação, para a linha `Automação "carrinho 2h"` do card. */
  automationName: string
}

/** `templateId` → automação que o dispara. Um template pode estar em mais de
 *  uma; o card mostra a primeira, porque a linha do mockup tem uma frase só. */
export function useAutomationLinks(): Map<string, AutomationLink> {
  const [links, setLinks] = useState<Map<string, AutomationLink>>(new Map())

  useEffect(() => {
    let cancelled = false
    automationsApi.list()
      .then(({ data }) => {
        if (cancelled) return
        const next = new Map<string, AutomationLink>()
        for (const automation of data) {
          for (const action of automation.actions) {
            if (action.type !== 'send_message' || !action.templateId) continue
            if (!next.has(action.templateId)) {
              next.set(action.templateId, { automationName: automation.name })
            }
          }
        }
        setLinks(next)
      })
      // Atribuição é acessório: sem ela o card perde uma linha, não a função.
      .catch(() => { /* silêncio proposital */ })
    return () => { cancelled = true }
  }, [])

  return links
}
