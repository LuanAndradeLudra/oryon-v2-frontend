import { useCallback } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { SETORES, type Setor } from '../home/dorConversas'
import { solucoes } from '../landingCopy'

/**
 * AS ÁREAS da página /solucoes (02/10): as mesmas cinco da seção "Por que a
 * Oryon" da home, na mesma ordem e com as mesmas conversas.
 *
 * A área escolhida mora no endereço (`/solucoes?area=imobiliaria`): a home e
 * os anúncios linkam direto, e voltar para a página volta para a área.
 */

/** As chaves da copy da página (landingCopy `solucoes.areas`) = os ids dos setores. */
export type AreaId = keyof typeof solucoes.areas

export const AREAS: { id: AreaId; rotulo: string; setor: Setor }[] = SETORES
  .filter((s) => s.id in solucoes.areas)
  .map((s) => ({ id: s.id as AreaId, rotulo: s.rotulo, setor: s }))

const IDS = new Set<string>(AREAS.map((a) => a.id))
const PADRAO: AreaId = 'clinica'

/** O segmento do formulário de demonstração que corresponde a cada área. */
export const SEGMENTO_DO_FORM: Record<AreaId, string> = {
  clinica: 'Clínica ou consultório',
  imobiliaria: 'Imobiliária',
  loja: 'Varejo ou loja',
  contabilidade: 'Contabilidade',
  juridico: 'Jurídico',
}

/** A área da página e como trocá-la. A troca substitui o endereço (não empilha
 *  histórico a cada aba) e preserva a âncora (#demonstracao) e a rolagem. */
export function useAreaDaPagina() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const pedida = params.get('area') ?? ''
  const area: AreaId = IDS.has(pedida) ? (pedida as AreaId) : PADRAO
  const escolher = useCallback((id: string) => {
    if (!IDS.has(id)) return
    const novos = new URLSearchParams(location.search)
    novos.set('area', id)
    navigate({ pathname: location.pathname, search: `?${novos}`, hash: location.hash }, { replace: true, preventScrollReset: true })
  }, [navigate, location.pathname, location.search, location.hash])
  return { area, escolher }
}
