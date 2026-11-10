import { aoSairDaSessao } from '@/lib/limpezaDaSessao'

/**
 * ATIVIDADE RECENTE do navegador (SCRUM-1390) — o "nível 1b" do contexto
 * técnico do chamado: as últimas chamadas ao servidor que falharam, os erros
 * da página e as trocas de tela. Fica SÓ EM MEMÓRIA, só dos últimos 15
 * minutos, e nada sai daqui sozinho: o formulário do chamado mostra o que achou
 * e a pessoa decide se vai junto.
 *
 * Sem dado pessoal: rota sem parâmetros de busca e com os ids trocados por
 * ":id"; nada de corpo de requisição nem de texto digitado; a mensagem do erro
 * vai curta e mascarada (o backend mascara de novo ao gravar).
 */
const JANELA_MS = 15 * 60_000
const LIMITE = { falhas: 20, erros: 10, telas: 15 } as const
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

export interface FalhaDeRede { em: string; tela: string; metodo: string; rota: string; status: number | null; requestId: string | null }
export interface ErroDaPagina { em: string; tela: string; tipo: string; mensagem: string }
export interface TrocaDeTela { em: string; tela: string; rota: string }
export interface AtividadeRecente { falhas: FalhaDeRede[]; erros: ErroDaPagina[]; telas: TrocaDeTela[] }

let falhas: FalhaDeRede[] = []
let erros: ErroDaPagina[] = []
let telas: TrocaDeTela[] = []
let telaAtual = 'não identificada'

const naJanela = <T extends { em: string }>(lista: T[]): T[] => {
  const corte = Date.now() - JANELA_MS
  return lista.filter((x) => Date.parse(x.em) >= corte)
}
const acrescentar = <T extends { em: string }>(lista: T[], item: T, max: number): T[] => [...naJanela(lista), item].slice(-max)

/** Caminho sem query nem fragmento, com os ids (UUID e números longos) trocados por ":id". */
export function rotaSemDados(url: string): string {
  let caminho = url.split('#')[0].split('?')[0]
  if (/^https?:\/\//i.test(caminho)) {
    try { caminho = new URL(caminho).pathname } catch { /* fica como veio */ }
  }
  return caminho.replace(UUID, ':id').replace(/\/\d{3,}(?=\/|$)/g, '/:id') || '/'
}

/**
 * Máscara simples do navegador: e-mail, CPF e números longos (o backend mascara
 * de novo). Corta ANTES e usa regex com teto: sem isso, uma mensagem de erro
 * longa numa linha só (40 KB) travava a aba (revisão do Portão 4).
 */
export function mascararNoNavegador(texto: string): string {
  return texto.slice(0, 400)
    .replace(/[\w.+-]{1,64}@[\w-]{1,63}(?:\.[\w-]{1,63}){1,8}/g, '[e-mail]')
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[cpf]')
    .replace(/\+?\(?\d[\d\s().-]{7,30}\d/g, '[número]')
}

/** A tela atual (chamado a cada troca de rota). Repetida, não conta. */
export function registrarTela(rota: string, tela: string): void {
  // Os tetos do backend (DTO): passar deles fazia o chamado voltar 400 (revisão do Portão 4).
  telaAtual = tela.slice(0, 120)
  const r = rotaSemDados(rota).slice(0, 200)
  if (telas.at(-1)?.rota === r) return
  telas = acrescentar(telas, { em: new Date().toISOString(), tela: telaAtual, rota: r }, LIMITE.telas)
}

/** Chamada ao servidor que falhou (5xx, sem resposta, 408, 429). */
export function registrarFalhaDeRede(f: { metodo: string; url: string; status: number | null; requestId: string | null }): void {
  const requestId = f.requestId && /^[0-9a-f-]{36}$/i.test(f.requestId) ? f.requestId : null
  falhas = acrescentar(falhas, {
    em: new Date().toISOString(), tela: telaAtual, metodo: f.metodo.toUpperCase().slice(0, 10), rota: rotaSemDados(f.url).slice(0, 200), status: f.status, requestId,
  }, LIMITE.falhas)
}

/** Erro da página (exceção não tratada ou promessa rejeitada sem tratamento). */
export function registrarErroDaPagina(tipo: string, mensagem: string): void {
  erros = acrescentar(erros, {
    em: new Date().toISOString(), tela: telaAtual, tipo: (tipo || 'Error').slice(0, 60), mensagem: mascararNoNavegador(mensagem.split('\n')[0] ?? '').slice(0, 160),
  }, LIMITE.erros)
}

/** O que está guardado agora (últimos 15 min). */
export function atividadeRecente(): AtividadeRecente {
  return { falhas: naJanela(falhas), erros: naJanela(erros), telas: naJanela(telas) }
}

export function limparAtividadeRecente(): void {
  falhas = []
  erros = []
  telas = []
  telaAtual = 'não identificada'
}
aoSairDaSessao(limparAtividadeRecente)

/**
 * A falha vai para o chamado? 5xx, sem resposta do servidor, 408 e 429. O 403
 * fica de fora: o app sonda rotas por papel (ex.: cobrança para quem não é o
 * dono) e o diagnóstico se enchia de negativas esperadas.
 */
export function falhaQueImporta(status: number | null): boolean {
  return status === null || status >= 500 || status === 408 || status === 429
}

/** Chamada do próprio app (API do backend ou dos agentes) — o resto (fontes, telemetria) não interessa. */
function doApp(url: string): boolean {
  return url.startsWith('/') || /\/(api|agents)\//.test(url)
}

let instalado = false
/**
 * Escuta os erros da página e as falhas do `fetch` (uma vez). Vários serviços
 * do app usam `fetch` direto em vez do cliente axios; o embrulho é
 * transparente: devolve a mesma resposta e repassa o mesmo erro.
 */
export function capturarErrosDaPagina(): void {
  if (instalado || typeof window === 'undefined') return
  instalado = true
  window.addEventListener('error', (e) => registrarErroDaPagina(e.error?.name ?? 'Error', e.message ?? ''))
  window.addEventListener('unhandledrejection', (e) => {
    const motivo = e.reason as { name?: string; message?: string } | string | undefined
    if (typeof motivo === 'string') registrarErroDaPagina('Promessa rejeitada', motivo)
    else registrarErroDaPagina(motivo?.name ?? 'Promessa rejeitada', motivo?.message ?? '')
  })
  if (typeof window.fetch !== 'function') return
  const original = window.fetch.bind(window)
  window.fetch = async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.toString() : entrada.url
    const metodo = init?.method ?? (entrada instanceof Request ? entrada.method : 'GET')
    try {
      const res = await original(entrada, init)
      if (!res.ok && falhaQueImporta(res.status) && doApp(url)) {
        registrarFalhaDeRede({ metodo, url, status: res.status, requestId: res.headers.get('x-correlation-id') })
      }
      return res
    } catch (err) {
      const cancelada = err instanceof DOMException && err.name === 'AbortError'
      if (!cancelada && doApp(url)) registrarFalhaDeRede({ metodo, url, status: null, requestId: null })
      throw err
    }
  }
}
