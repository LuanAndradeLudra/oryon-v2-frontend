// ─── useOnboardingState ────────────────────────────────────────────────────
// A ponte entre os dados e a função pura. Busca o que falta, chama
// `computeOnboardingState` e expõe a ação de importar da Meta.
//
// A contagem de campanhas NÃO vem daqui: ela é do gate, que vive na página
// (é ela quem decide entre mostrar o onboarding e mostrar a lista). O hook a
// recebe, e aceita `null` para dizer "ainda não sei".
import { useCallback, useEffect, useMemo, useState } from 'react'
import { templatesApi } from '@/services/api'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import { formatPhone } from '@/lib/phone'
import { computeOnboardingState, type OnboardingState } from './onboardingState'
import type { WhatsAppTemplate } from '@/types'

export interface UseOnboardingStateResult {
  state: OnboardingState
  /** `true` enquanto qualquer fonte ainda não respondeu. Ver a nota abaixo:
   *  quem consome NÃO pode tratar isto como "não tem nada". */
  loading: boolean
  importing: boolean
  importFromMeta: () => Promise<void>
}

export function useOnboardingState(campaignCount: number | null): UseOnboardingStateResult {
  const { numbers, loading: numbersLoading } = useWorkspaceNumber()
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [importing, setImporting] = useState(false)

  const fetchTemplates = useCallback(async () => {
    try {
      const r = await templatesApi.list()
      return r.data
    } catch {
      // Lista indisponível não é lista vazia. Devolver `[]` faria o passo 2
      // parecer pendente para quem já tem template aprovado, e mandaria a
      // pessoa criar um segundo. Melhor manter o que já havia.
      return null
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchTemplates()
      .then((data) => { if (!cancelled && data) setTemplates(data) })
      .finally(() => { if (!cancelled) setTemplatesLoading(false) })
    return () => { cancelled = true }
  }, [fetchTemplates])

  /** "Importar da Meta" é o mesmo `pullFromMeta` que a aba de templates usa.
   *  Não navega: puxa, recarrega a lista e o passo 2 se resolve sozinho se
   *  algum dos importados já vier aprovado. */
  const importFromMeta = useCallback(async () => {
    setImporting(true)
    try {
      await templatesApi.pullFromMeta()
      const data = await fetchTemplates()
      if (data) setTemplates(data)
    } catch {
      // Falha de importação não trava o checklist: os outros caminhos do
      // passo 2 (criar template) continuam de pé, e o erro da Meta já é
      // mostrado na aba de templates, que é onde ele tem contexto.
    } finally {
      setImporting(false)
    }
  }, [fetchTemplates])

  const state = useMemo(
    () => computeOnboardingState(
      { numbers, templates, campaignCount: campaignCount ?? 0 },
      formatPhone,
    ),
    [numbers, templates, campaignCount],
  )

  return {
    state,
    // ATENÇÃO A QUEM CONSOME: enquanto isto é `true`, `numbers` é `[]` e
    // `campaignCount` é `null` — verdadeiros por IGNORÂNCIA, não por fato.
    // Renderizar o onboarding aqui mostraria o checklist por um instante para
    // quem já tem tudo pronto. O gate da página trata `loading` como "não
    // decide ainda" e mantém a vista normal, que é o estado mais provável.
    loading: numbersLoading || templatesLoading || campaignCount === null,
    importing,
    importFromMeta,
  }
}
