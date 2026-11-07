import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { followUpsApi } from '@/services/followUpsApi'

/**
 * Retomadas (06/11): o item "Planos de ação" do menu. Aparece para os admins de unidade que está
 * numa rede (ou que já recebeu plano), com o contador de casos ainda sem resultado. Sem a rota no
 * backend (versão anterior), o item não aparece. Relê ao trocar de tela e quando um plano muda.
 */
export function usePlanosDaUnidade(podeVer: boolean) {
  const [estado, setEstado] = useState({ enabled: false, openItems: 0 })
  const { pathname } = useLocation()
  const ler = useCallback(() => {
    if (!podeVer) return
    followUpsApi.resumo().then((r) => setEstado({ enabled: !!r.data.enabled, openItems: r.data.openItems ?? 0 })).catch(() => setEstado({ enabled: false, openItems: 0 }))
  }, [podeVer])
  useEffect(() => { ler() }, [ler, pathname])
  useEffect(() => {
    window.addEventListener('follow-ups:mudou', ler)
    return () => window.removeEventListener('follow-ups:mudou', ler)
  }, [ler])
  return podeVer ? estado : { enabled: false, openItems: 0 }
}
