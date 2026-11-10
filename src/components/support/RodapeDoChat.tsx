import type { ReactNode } from 'react'
import { useSuporte } from './suporteDaConversa'
import { useMarcacao } from './marcacaoDoChamado'
import { SupportSelectionBar } from './SupportSelectionBar'
import './suporte.css'

/**
 * Celular: enquanto a pessoa escolhe as mensagens, a barra de marcação ocupa
 * o lugar do campo de texto (no computador o painel fica aberto ao lado e o
 * campo continua). O campo só é ESCONDIDO, nunca desmontado: o rascunho, os
 * anexos e a resposta citada continuam lá ao cancelar ou enviar o chamado.
 */
export function RodapeDoChat({ children }: { children: ReactNode }) {
  const s = useSuporte()
  const barra = useMarcacao(s.store, (e) => s.ligado && e.marcando && !e.painelAberto)
  if (!s.ligado) return <>{children}</>
  return (
    <>
      {barra && <SupportSelectionBar />}
      <div className={barra ? 'hidden' : 'contents'}>{children}</div>
    </>
  )
}
