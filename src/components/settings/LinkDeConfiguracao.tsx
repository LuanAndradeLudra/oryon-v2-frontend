import { Link, useSearchParams, type LinkProps } from 'react-router-dom'
import { preservarVolta } from '@/lib/voltarPara'

/**
 * Link de uma seção de Configurações para outra que mantém o "Voltar para…"
 * de quem veio de uma tela de trabalho (sem isto a faixa sumia no primeiro
 * link interno). Sem `voltarPara` na tela atual, é um Link comum.
 */
export function LinkDeConfiguracao({ to, ...resto }: Omit<LinkProps, 'to'> & { to: string }) {
  const [params] = useSearchParams()
  return <Link to={preservarVolta(to, params)} {...resto} />
}
