import { useRef, useState, type KeyboardEvent } from 'react'

/**
 * O COMPORTAMENTO de uma lista de seleção, sem aparência (01/10): abrir,
 * andar, escolher e buscar por letra, no padrão "select-only combobox" do
 * WAI-ARIA. Extraído da lista suspensa da landing para o SelectMenu do app;
 * cada um desenha a sua lista por cima deste hook.
 *
 * O foco fica no gatilho e a opção ativa é só visual (o componente a anuncia
 * por `aria-activedescendant`). Teclado, com a lista FECHADA: ↓, Enter ou
 * Espaço abrem na opção escolhida; ↑ também (ou na última); Home e End abrem
 * na primeira e na última. ABERTA: ↑/↓ andam, PageUp/PageDown pulam dez,
 * Home/End vão às pontas, Enter ou Espaço escolhem, Esc fecha sem mudar e Tab
 * escolhe a ativa e segue adiante. Uma letra, aberta ou fechada, leva à opção
 * que começa com ela, sem acento ("e" acha "Educação"); repetir a letra anda
 * entre as que começam com ela e letras seguidas refinam ("sa" acha "Saúde").
 * Opções desabilitadas são puladas.
 */

export interface ItemDeLista {
  rotulo: string
  desabilitado?: boolean
}

export type OrigemDaEscolha = 'ponteiro' | 'teclado' | 'tab'

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
/** Pausa que encerra a busca por letra (o mesmo meio segundo da lista nativa). */
const PAUSA_BUSCA_MS = 500
const PULO_PAGINA = 10

export function useListaSelecao({ itens, escolhido, desabilitada = false, aoEscolher, aoAbrir }: {
  itens: readonly ItemDeLista[]
  /** A opção do valor atual, ou -1. */
  escolhido: number
  desabilitada?: boolean
  /** Uma opção confirmada — clique, Enter, Espaço ou Tab. A lista já fechou. */
  aoEscolher: (indice: number, origem: OrigemDaEscolha) => void
  /** Chamado ao abrir, ainda dentro do evento (o componente põe o foco no gatilho). */
  aoAbrir?: () => void
}) {
  const [aberta, setAberta] = useState(false)
  const [ativa, setAtiva] = useState(-1)
  const busca = useRef({ texto: '', ate: 0 })

  // Desabilitada com a lista aberta: fecha (ajuste durante o render, sem efeito).
  if (desabilitada && aberta) setAberta(false)

  const habilitado = (i: number) => i >= 0 && i < itens.length && !itens[i].desabilitado
  const primeiro = () => itens.findIndex((it) => !it.desabilitado)
  const ultimo = () => {
    for (let i = itens.length - 1; i >= 0; i--) if (!itens[i].desabilitado) return i
    return -1
  }
  /** Anda `passo` opções habilitadas a partir de `de`, parando na ponta. */
  const andar = (de: number, passo: number) => {
    const direcao = Math.sign(passo)
    let alvo = de
    let restam = Math.abs(passo)
    for (let i = de + direcao; i >= 0 && i < itens.length && restam > 0; i += direcao) {
      if (!itens[i].desabilitado) { alvo = i; restam-- }
    }
    return alvo
  }

  const abrir = (indice?: number) => {
    if (desabilitada) return
    setAtiva(indice !== undefined && habilitado(indice) ? indice : habilitado(escolhido) ? escolhido : primeiro())
    setAberta(true)
    aoAbrir?.()
  }
  const fechar = () => setAberta(false)
  const alternar = () => (aberta ? fechar() : abrir())
  const escolher = (indice: number, origem: OrigemDaEscolha) => {
    if (!habilitado(indice)) return
    setAberta(false)
    aoEscolher(indice, origem)
  }
  /** O ponteiro passou por cima: vira a ativa. */
  const apontar = (indice: number) => {
    if (indice !== ativa && habilitado(indice)) setAtiva(indice)
  }

  /** A opção que a letra digitada pede, ou -1. */
  const buscarPorLetra = (tecla: string) => {
    const agora = Date.now()
    const b = busca.current
    b.texto = (agora > b.ate ? '' : b.texto) + normalizar(tecla)
    b.ate = agora + PAUSA_BUSCA_MS
    // "sss" é "s" repetido: anda entre as opções com "s", não procura "sss".
    const repetida = [...b.texto].every((c) => c === b.texto[0])
    const termo = repetida ? b.texto[0] : b.texto
    const base = aberta ? ativa : escolhido
    // Uma letra começa da PRÓXIMA opção (para andar entre as iguais); várias
    // refinam a partir da atual.
    const inicio = termo.length === 1 ? base + 1 : Math.max(base, 0)
    for (let k = 0; k < itens.length; k++) {
      const i = (inicio + k) % itens.length
      if (habilitado(i) && normalizar(itens[i].rotulo).startsWith(termo)) return i
    }
    return -1
  }
  const buscando = () => busca.current.texto !== '' && Date.now() <= busca.current.ate

  const aoTeclar = (e: KeyboardEvent<HTMLElement>) => {
    if (desabilitada) return
    const tecla = e.key
    if (!aberta) {
      if (tecla === 'ArrowDown' || tecla === 'Enter' || (tecla === ' ' && !buscando())) { e.preventDefault(); abrir(); return }
      if (tecla === 'ArrowUp') { e.preventDefault(); abrir(habilitado(escolhido) ? escolhido : ultimo()); return }
      if (tecla === 'Home') { e.preventDefault(); abrir(primeiro()); return }
      if (tecla === 'End') { e.preventDefault(); abrir(ultimo()); return }
    } else {
      if (tecla === 'ArrowDown') { e.preventDefault(); setAtiva(e.altKey ? ativa : andar(ativa, 1)); return }
      if (tecla === 'ArrowUp') {
        e.preventDefault()
        if (e.altKey) escolher(ativa, 'teclado')
        else setAtiva(andar(ativa, -1))
        return
      }
      if (tecla === 'PageDown') { e.preventDefault(); setAtiva(andar(ativa, PULO_PAGINA)); return }
      if (tecla === 'PageUp') { e.preventDefault(); setAtiva(andar(ativa, -PULO_PAGINA)); return }
      if (tecla === 'Home') { e.preventDefault(); setAtiva(primeiro()); return }
      if (tecla === 'End') { e.preventDefault(); setAtiva(ultimo()); return }
      if (tecla === 'Enter' || (tecla === ' ' && !buscando())) { e.preventDefault(); escolher(ativa, 'teclado'); return }
      if (tecla === 'Escape') {
        // O Esc é da lista aberta, não do que está atrás dela: sem isto,
        // fechar a lista dentro de um diálogo fecharia o diálogo junto.
        e.preventDefault()
        e.stopPropagation()
        fechar()
        return
      }
      if (tecla === 'Tab') {
        if (habilitado(ativa)) escolher(ativa, 'tab')
        else fechar()
        return
      }
    }
    // Busca por letra (o Espaço conta como letra no meio de uma busca).
    if (tecla.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const achou = buscarPorLetra(tecla)
      if (achou >= 0) {
        e.preventDefault()
        if (aberta) setAtiva(achou)
        else abrir(achou)
      } else if (tecla === ' ') {
        e.preventDefault()
      }
    }
  }

  return { aberta, ativa, abrir, fechar, alternar, escolher, apontar, aoTeclar }
}
