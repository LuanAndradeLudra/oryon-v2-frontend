import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Estado de tela na URL (regra do PO: aba, filtro, busca, ordem, página e
 * item aberto sobrevivem ao F5, ao "voltar" e ao link colado).
 *
 * Consolida o `setParam` que cada tela repetia (PipelinePage, PipelineBoardTab,
 * AbaAgora…). Três garantias que as versões soltas nem sempre tinham:
 *
 * 1. Sempre o updater funcional sobre a query ATUAL — nunca `setSearchParams({})`
 *    ou `{ tab }`, que apagavam `voltarPara` e os demais filtros da tela.
 * 2. O valor padrão não vai para a URL (endereço limpo; o link "cru" da tela
 *    continua sendo o estado inicial).
 * 3. `aliases`: chaves antigas (em inglês, de links já salvos/compartilhados)
 *    seguem sendo lidas; a escrita usa a chave nova e apaga as antigas.
 *
 * `historico`: 'replace' (padrão) para filtro, busca, aba, ordem, página — não
 * enche o histórico; 'push' para abrir um item/painel — o "voltar" do
 * navegador fecha.
 */
export interface OpcoesEstadoNaUrl<T> {
  padrao: T
  ler?: (valor: string | null) => T
  escrever?: (valor: T) => string | null
  historico?: 'replace' | 'push'
  aliases?: string[]
  /** Chaves a apagar quando este estado muda (ex.: ['pagina'] ao mudar filtro). */
  resetar?: string[]
}

type Atualizador<T> = T | ((atual: T) => T)

/**
 * O `setSearchParams` do React Router monta a query nova a partir da URL do
 * RENDER atual — duas mudanças no mesmo clique (ex.: `ordem` e `direcao`)
 * faziam a segunda partir da URL antiga e apagar a primeira. Aqui as mudanças
 * do mesmo tique se acumulam: a segunda parte do resultado da primeira. O
 * acumulado vale só até o fim do tique (microtask), para nunca reaplicar uma
 * mudança velha se a pessoa voltar depois para a mesma URL.
 */
let pendente: { de: string; params: URLSearchParams } | null = null
function baseDaMudanca(prev: URLSearchParams): URLSearchParams {
  if (pendente && pendente.de === prev.toString()) return new URLSearchParams(pendente.params)
  return new URLSearchParams(prev)
}
function registrarMudanca(prev: URLSearchParams, resultado: URLSearchParams) {
  const primeiraDoTique = pendente === null
  pendente = { de: prev.toString(), params: new URLSearchParams(resultado) }
  if (primeiraDoTique) queueMicrotask(() => { pendente = null })
}

export function useEstadoNaUrl<T>(chave: string, opcoes: OpcoesEstadoNaUrl<T>): [T, (valor: Atualizador<T>) => void] {
  const [params, setParams] = useSearchParams()
  const { padrao, historico = 'replace' } = opcoes
  const ler = opcoes.ler
  const escrever = opcoes.escrever
  const aliases = opcoes.aliases
  const resetar = opcoes.resetar

  const bruto = params.get(chave) ?? aliases?.map((a) => params.get(a)).find((v) => v !== null) ?? null

  const valor = useMemo<T>(() => {
    if (ler) return ler(bruto)
    if (bruto === null) return padrao
    return bruto as unknown as T
    // `padrao` é tratado como constante da tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bruto, ler])

  const definir = useCallback((proximo: Atualizador<T>) => {
    setParams((prev) => {
      const p = baseDaMudanca(prev)
      const atualBruto = p.get(chave) ?? aliases?.map((a) => p.get(a)).find((v) => v !== null) ?? null
      const atual = ler ? ler(atualBruto) : ((atualBruto ?? padrao) as unknown as T)
      const novo = typeof proximo === 'function' ? (proximo as (a: T) => T)(atual) : proximo
      const texto = escrever ? escrever(novo) : (novo === null || novo === undefined ? null : String(novo))
      const padraoTexto = escrever ? escrever(padrao) : (padrao === null || padrao === undefined ? null : String(padrao))
      aliases?.forEach((a) => p.delete(a))
      if (texto === null || texto === '' || texto === padraoTexto) p.delete(chave)
      else p.set(chave, texto)
      if (texto !== (atualBruto ?? padraoTexto)) resetar?.forEach((r) => p.delete(r))
      registrarMudanca(prev, p)
      return p
    }, { replace: historico === 'replace' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave, setParams, historico, ler, escrever])

  return [valor, definir]
}

/** Lista separada por vírgula (ex.: `etapa=lead,cliente`). */
export const lerLista = (v: string | null): string[] => (v ? v.split(',').filter(Boolean) : [])
export const escreverLista = (v: string[]): string | null => (v.length ? v.join(',') : null)

/** Booleano como `1` (ausente = false). */
export const lerBool = (v: string | null): boolean => v === '1' || v === 'true'
export const escreverBool = (v: boolean): string | null => (v ? '1' : null)

/** Um dentre valores permitidos; fora da lista cai no padrão (URL editada à mão). */
export function lerUmDe<T extends string>(permitidos: readonly T[], padrao: T) {
  return (v: string | null): T => (v !== null && (permitidos as readonly string[]).includes(v) ? (v as T) : padrao)
}

/** Página 1-based (ausente/inválida = 1). */
export const lerPaginaUrl = (v: string | null): number => {
  const n = Number(v)
  return Number.isInteger(n) && n > 1 ? n : 1
}
export const escreverPaginaUrl = (v: number): string | null => (v > 1 ? String(v) : null)
