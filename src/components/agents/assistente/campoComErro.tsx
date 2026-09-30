import { createContext, useContext } from 'react'
import type { CampoDoAssistente } from './especificacao'

/**
 * Campo que barrou o "Continuar". O assistente rola até ele (`data-campo`),
 * põe o foco e cada etapa mostra a mensagem embaixo do campo — antes o aviso
 * ia para o fim da página, fora da vista, e o botão parecia não fazer nada.
 */
export const CampoComErroContext = createContext<{ campo: CampoDoAssistente; mensagem: string } | null>(null)

/** Mensagem de erro deste campo, se foi ele que barrou o avanço. */
export function useErroDoCampo(campo: CampoDoAssistente): string | undefined {
  const atual = useContext(CampoComErroContext)
  return atual?.campo === campo ? atual.mensagem : undefined
}
