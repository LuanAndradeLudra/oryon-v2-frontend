import { useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { comVolta } from '@/lib/voltarPara'

/**
 * `irCom(destino, rotulo)` monta o endereço de uma tela que deve saber voltar
 * para ESTA (pathname + search: aba, filtro e seleção voltam juntos).
 * Uso: `<Link to={irCom('/settings/numbers', 'Voltar para a conversa')}>`.
 */
export function useComVolta() {
  const { pathname, search } = useLocation()
  return useCallback((destino: string, rotulo?: string) => comVolta(destino, `${pathname}${search}`, rotulo), [pathname, search])
}
