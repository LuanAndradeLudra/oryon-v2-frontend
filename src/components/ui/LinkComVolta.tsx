import { Link, type LinkProps } from 'react-router-dom'
import { useComVolta } from '@/hooks/useComVolta'

/**
 * `Link` que leva ESTA tela como caminho de volta (`voltarPara`) — para os
 * atalhos que tiram a pessoa do trabalho para configurar algo (avisos de
 * "conecte uma linha", prontidão do workspace, preferências). Quem chega na
 * configuração vê "Voltar" e retorna com aba e filtros intactos.
 */
export function LinkComVolta({ to, rotulo, ...resto }: Omit<LinkProps, 'to'> & { to: string; rotulo?: string }) {
  const irCom = useComVolta()
  return <Link to={irCom(to, rotulo)} {...resto} />
}
