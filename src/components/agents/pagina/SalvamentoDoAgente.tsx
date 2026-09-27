import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AlertCircle, Check, Loader2, PencilLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SalvamentoCtx, useSalvamento, type ContextoDoSalvamento, type FaseDoSalvamento } from './salvamentoContexto'

/**
 * UMA política de salvamento para a página inteira do agente.
 *
 * Antes cada aba tinha o seu indicador (cinco, em cores diferentes) e o "Salvo
 * às" do cabeçalho prometia um auto-save global que não existia. Agora toda
 * gravação passa por `salvar()` e o cabeçalho mostra um estado só.
 *
 * Duas famílias de seção:
 *  - auto-save (capacidades, catálogo, regras, comportamento…): chamam
 *    `salvar()` a cada mudança;
 *  - texto que a IA lê ao vivo (Instruções, Critérios): ficam em RASCUNHO até
 *    a pessoa salvar. O rascunho sobrevive à troca de seção (guardado aqui, não
 *    no componente da seção) e o cabeçalho avisa que há alteração pendente.
 */

function mensagemDeErro(err: unknown): string {
  const api = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message
  if (typeof api === 'string' && api) return api
  if (err instanceof Error && err.message) return err.message
  return 'Não foi possível salvar.'
}

export function SalvamentoDoAgenteProvider({ ultimaAlteracao, children }: { ultimaAlteracao: string; children: ReactNode }) {
  const [fase, setFase] = useState<FaseDoSalvamento>('ocioso')
  const [salvoEm, setSalvoEm] = useState<Date | null>(() => new Date(ultimaAlteracao))
  const [erro, setErro] = useState<string | null>(null)
  const [pendentes, setPendentes] = useState<string[]>([])
  const emVoo = useRef(0)
  const textos = useRef(new Map<string, string>())

  const salvar = useCallback(async <T,>(tarefa: () => Promise<T>): Promise<T> => {
    emVoo.current += 1
    setFase('salvando')
    setErro(null)
    try {
      const r = await tarefa()
      emVoo.current -= 1
      if (emVoo.current === 0) {
        setFase('salvo')
        setSalvoEm(new Date())
      }
      return r
    } catch (err) {
      emVoo.current -= 1
      setFase('erro')
      setErro(mensagemDeErro(err))
      throw err
    }
  }, [])

  const marcarRascunho = useCallback((rotulo: string, sujo: boolean) => {
    setPendentes((atual) => {
      const tem = atual.includes(rotulo)
      if (sujo === tem) return atual
      return sujo ? [...atual, rotulo] : atual.filter((r) => r !== rotulo)
    })
  }, [])

  const lerTexto = useCallback((chave: string) => textos.current.get(chave), [])
  const guardarTexto = useCallback((chave: string, valor: string | undefined) => {
    if (valor === undefined) textos.current.delete(chave)
    else textos.current.set(chave, valor)
  }, [])

  // Fechar a aba com rascunho pendente pede confirmação do navegador.
  useEffect(() => {
    if (pendentes.length === 0) return
    const aviso = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [pendentes.length])

  const valor = useMemo<ContextoDoSalvamento>(() => ({
    fase, salvoEm, erro, pendentes, salvar, marcarRascunho, lerTexto, guardarTexto,
  }), [fase, salvoEm, erro, pendentes, salvar, marcarRascunho, lerTexto, guardarTexto])

  return <SalvamentoCtx.Provider value={valor}>{children}</SalvamentoCtx.Provider>
}

function hora(d: Date) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** O indicador único — cabeçalho da página. */
/** `curto`: a barra do celular não tem largura para "Alterações não salvas em…". */
export function IndicadorDeSalvamento({ className, curto = false }: { className?: string; curto?: boolean }) {
  const { fase, salvoEm, erro, pendentes } = useSalvamento()
  let conteudo: ReactNode
  if (fase === 'salvando') {
    conteudo = <><Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />Salvando…</>
  } else if (fase === 'erro') {
    conteudo = <span className="inline-flex items-center gap-1.5 text-danger" title={erro ?? undefined}><AlertCircle className="w-3.5 h-3.5" aria-hidden />{curto ? 'Erro ao salvar' : 'Não foi possível salvar'}</span>
  } else if (pendentes.length > 0) {
    conteudo = <span className="inline-flex items-center gap-1.5 text-status-pending"><PencilLine className="w-3.5 h-3.5" aria-hidden />{curto ? 'Não salvo' : <>Alterações não salvas em {pendentes.join(' e ')}</>}</span>
  } else if (salvoEm) {
    conteudo = <><Check className="w-3.5 h-3.5 text-status-active" aria-hidden />{curto ? 'Salvo' : 'Salvo às'} {hora(salvoEm)}</>
  } else {
    conteudo = null
  }
  return (
    <span role="status" aria-live="polite" className={cn('inline-flex items-center gap-1.5 text-xs text-surface-400 whitespace-nowrap', className)}>
      {conteudo}
    </span>
  )
}
