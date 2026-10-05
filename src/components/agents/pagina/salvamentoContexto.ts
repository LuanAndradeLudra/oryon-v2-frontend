import { createContext, useContext, useEffect } from 'react'

export type FaseDoSalvamento = 'ocioso' | 'salvando' | 'salvo' | 'erro'

export interface ContextoDoSalvamento {
  fase: FaseDoSalvamento
  salvoEm: Date | null
  erro: string | null
  /** Rótulos das seções com rascunho não salvo. */
  pendentes: string[]
  salvar: <T>(tarefa: () => Promise<T>) => Promise<T>
  marcarRascunho: (rotulo: string, sujo: boolean) => void
  lerTexto: (chave: string) => string | undefined
  guardarTexto: (chave: string, valor: string | undefined) => void
}

export const SalvamentoCtx = createContext<ContextoDoSalvamento | null>(null)

export function useSalvamento(): ContextoDoSalvamento {
  const c = useContext(SalvamentoCtx)
  if (!c) throw new Error('useSalvamento fora de SalvamentoDoAgenteProvider')
  return c
}

/** Registra (e limpa quando deixa de estar sujo) um rascunho pendente da seção. */
export function useRascunhoPendente(rotulo: string, sujo: boolean) {
  const { marcarRascunho } = useSalvamento()
  useEffect(() => {
    marcarRascunho(rotulo, sujo)
  }, [rotulo, sujo, marcarRascunho])
  // Ao sair da seção o rascunho continua guardado (e pendente) no contexto.
}

export const ROTULO_STATUS = {
  active: 'Ativo',
  paused: 'Pausado',
  draft: 'Rascunho',
} as const
