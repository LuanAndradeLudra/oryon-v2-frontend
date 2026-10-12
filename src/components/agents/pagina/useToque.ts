import { useIsMobile } from '@/hooks/useIsMobile'

/**
 * Tamanho dos botões nas telas do agente: `sm` (28 px) no desktop, `md`
 * (36 px) no celular — o dedo precisa de alvo maior que o cursor.
 */
export function useTamanhoDeToque(): 'sm' | 'md' {
  return useIsMobile() ? 'md' : 'sm'
}
