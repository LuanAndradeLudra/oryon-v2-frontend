/**
 * O DIRETOR — traduz o roteiro da landing em acontecimentos do "servidor".
 *
 * A landing (o `HeroPalco`) é dona do relógio e manda, por `postMessage`, o
 * passo corrente: `{ estado, cena }`. Aqui dentro isso vira exatamente o que o
 * backend real faria:
 *
 *  • o banco de demonstração muda de estado (`definirEstado`) — o que as
 *    telas buscarem daqui em diante já vem atualizado;
 *  • os eventos de tempo real que o backend emite para aquela mudança são
 *    disparados no socket falso — e os HANDLERS DE PRODUÇÃO reagem (a
 *    mensagem entra no chat, a linha do tempo recarrega, o quadro do funil
 *    recarrega e o card muda de coluna);
 *  • trocar de cena é trocar de rota, como um clique no menu.
 *
 * Nada aqui toca no DOM do app. Se uma tela não reage a um evento no produto
 * real, ela também não reage aqui — é o que mantém a demonstração honesta.
 */
import { definirEstado, estadoAtual } from './backend'
import { emitirDoServidor } from './preparar'
import {
  HERO, HERO_USER, heroContact, heroConversation, heroDeal, heroMessages, heroNotifications, reached,
} from '@/components/landing/stage/hero/heroRealData'
import { HERO_ROTAS, type HeroCena, type HeroState } from '@/components/landing/stage/hero/heroStory'

export const CANAL = 'oryon-hero'

export type MensagemParaDemo =
  | { canal: typeof CANAL; tipo: 'passo'; estado: HeroState; cena: HeroCena }
  | { canal: typeof CANAL; tipo: 'tema'; tema: 'dark' | 'light' }
export type MensagemDaDemo =
  | { canal: typeof CANAL; tipo: 'pronta' }
  | { canal: typeof CANAL; tipo: 'rota'; rota: string }
  /** O alvo em foco, a cada quadro em que muda (id = a tomada). `visivel`:
   *  falso quando o alvo saiu da área rolável ou ficou coberto. */
  | { canal: typeof CANAL; tipo: 'foco'; id: number; rect: { x: number; y: number; w: number; h: number }; raio: number; visivel: boolean }
  | { canal: typeof CANAL; tipo: 'foco-fim'; id: number }

type Janela = { __demoNavegar?: (to: string) => void; __demoRota?: () => string; __demoFecharPainel?: () => void }

const CONVERSA = 'demo-conv-0'

function avisarPai(msg: MensagemDaDemo) {
  if (window.parent && window.parent !== window) window.parent.postMessage(msg, location.origin)
}

/** Os eventos que o backend real emite quando a história passa de `de` para `para`. */
function emitirTransicao(de: HeroState, para: HeroState) {
  const antes = new Set(heroMessages(de).map((m) => m.id))
  const contato = heroContact(para)
  const conversa = heroConversation(para)

  // Mensagens novas: `message:new`, como o webhook do WhatsApp e o envio fazem.
  for (const m of heroMessages(para)) {
    if (antes.has(m.id)) continue
    const humana = m.senderKind === 'operator'
    emitirDoServidor('message:new', {
      conversationId: CONVERSA,
      message: m,
      contact: contato,
      unreadCount: 0,
      // A mensagem da PESSOA pausa a IA e atribui a conversa a quem escreveu
      // (fase 32) — o backend manda os dois no mesmo evento.
      ...(humana ? {
        aiPausedUntil: conversa.aiPausedUntil ?? null,
        assignedUser: { id: HERO_USER.id, firstName: HERO_USER.firstName, lastName: HERO_USER.lastName ?? null },
      } : {}),
    })
  }

  const passou = (k: HeroState) => reached(para, k) && !reached(de, k)

  // Escritas do agente no CRM (situação, etiqueta): `conversation:updated`.
  if (passou('situacao') || passou('etiqueta')) {
    emitirDoServidor('conversation:updated', { conversationId: CONVERSA })
  }

  // O negócio mudou de etapa: `deal:changed` — o quadro e a ficha recarregam.
  if (passou('avanco') || passou('ganho')) {
    const deal = heroDeal(para)
    emitirDoServidor('deal:changed', { contactId: deal.contactId, dealId: deal.id, pipelineId: deal.pipelineId })
  }

  // O agente chamou uma pessoa: atribuição + status "pendente" + notificação.
  if (passou('assumido')) {
    emitirDoServidor('conversation:assigned', {
      conversationId: CONVERSA,
      assignedUser: { id: HERO_USER.id, firstName: HERO_USER.firstName, lastName: HERO_USER.lastName ?? null },
    })
    emitirDoServidor('conversation:status-updated', { conversationId: CONVERSA, status: 'pending' })
    const aviso = heroNotifications(para).find((n) => n.type === 'agent_handoff')
    if (aviso) emitirDoServidor('notification:new', aviso)
  }

  // A pessoa entrou: a IA fica em pausa.
  if (passou('humano')) {
    emitirDoServidor('conversation:ai-pause-updated', {
      conversationId: CONVERSA,
      aiPausedUntil: conversa.aiPausedUntil ?? null,
      changedBy: HERO_USER.id,
      assignedUser: { id: HERO_USER.id, firstName: HERO_USER.firstName, lastName: HERO_USER.lastName ?? null },
    })
  }

  if (passou('ganho')) {
    emitirDoServidor('conversation:resolved', { conversationId: CONVERSA })
  }
}

/**
 * A rota de cada cena.
 *  • No DESKTOP a demonstração segue o roteiro inteiro.
 *  • No CELULAR (a landing em tela pequena roda o app a 390 px, com a
 *    `AppShellMobile` real) só entra o que faz sentido no bolso: a conversa e o
 *    negócio. Na cena de Disparos ele fica onde está (`null` = não
 *    navega). O quadro do funil mostra uma coluna por vez e o card da história
 *    ficaria fora da tela; ali a cena abre o painel do próprio negócio (`?deal=`).
 */
function rotaDa(cena: Exclude<HeroCena, 'reinicio'>): string | null {
  const celular = window.innerWidth < 768
  if (!celular) return HERO_ROTAS[cena]
  if (cena === 'conversa') return HERO_ROTAS.conversa
  if (cena === 'funil') return `${HERO_ROTAS.funil}?deal=demo-deal-0`
  return null
}

let cenaAtual: HeroCena | null = null

function aplicarPasso(estado: HeroState, cena: HeroCena) {
  const de = estadoAtual()
  // Voltar ao começo não é uma "transição" a narrar: o banco volta ao estado
  // inicial em silêncio, com o palco vazio (cena `reinicio`), e cada tela
  // busca de novo quando for montada.
  const recomeco = !reached(estado, de)
  // Um passo novo encerra a tomada anterior: o destaque nunca descreve um
  // acontecimento que já passou.
  encerrarFoco()
  definirEstado(estado)
  if (!recomeco && de !== estado) {
    emitirTransicao(de, estado)
    focar(estado)
  }

  const w = window as unknown as Janela
  // Voltar no tempo para uma cena com rota: a página já montada guarda o que
  // aconteceu depois. Uma passagem por outra rota faz o app remontar e buscar
  // tudo no estado certo (vale para o laço dos recortes da seção Plataforma).
  if (recomeco && cena !== 'reinicio' && cena !== cenaAtual) {
    cenaAtual = cena
    const rota = rotaDa(cena)
    if (rota) {
      w.__demoFecharPainel?.()
      w.__demoNavegar?.(rota === HERO_ROTAS.disparos ? HERO_ROTAS.conversa : HERO_ROTAS.disparos)
      setTimeout(() => w.__demoNavegar?.(rota), 60)
      const alvo = FOCOS_CENA[cena]
      if (alvo) focarAlvo(alvo, 500)
    }
    return
  }
  if (cena !== cenaAtual) {
    cenaAtual = cena
    if (cena !== 'reinicio') {
      const rota = rotaDa(cena)
      if (rota) {
        w.__demoFecharPainel?.()
        w.__demoNavegar?.(rota)
        avisarPai({ canal: CANAL, tipo: 'rota', rota })
      }
      const alvo = FOCOS_CENA[cena]
      // A cena precisa montar (e a gaveta do relatório, deslizar) antes da medida.
      if (alvo) focarAlvo(alvo, 500)
    }
  } else if (recomeco && cena !== 'reinicio') {
    // Voltar no tempo NA MESMA tela (clicar num capítulo anterior, ambos em
    // Conversas): a página já montada guarda as mensagens de depois. Uma
    // passagem por outra rota — escondida sob o corte de câmera da landing —
    // faz o app remontar e buscar tudo de novo no estado certo.
    const rota = rotaDa(cena)
    if (rota) {
      w.__demoFecharPainel?.()
      w.__demoNavegar?.(HERO_ROTAS.disparos)
      setTimeout(() => w.__demoNavegar?.(rota), 60)
    }
  }
}

/** O tema acompanha o da landing — o mesmo mecanismo de `useTheme`. */
function aplicarTema(tema: 'dark' | 'light') {
  if (tema === 'light') document.documentElement.setAttribute('data-theme', 'light')
  else document.documentElement.removeAttribute('data-theme')
  localStorage.setItem('oryon-theme', tema)
}

export function instalarDiretor() {
  window.addEventListener('message', (e: MessageEvent<MensagemParaDemo>) => {
    if (e.origin !== location.origin) return
    const d = e.data
    if (!d || d.canal !== CANAL) return
    if (d.tipo === 'passo') aplicarPasso(d.estado, d.cena)
    if (d.tipo === 'tema') aplicarTema(d.tema)
  })
}

/**
 * Avisa a landing quando o app terminou de desenhar a primeira tela — é o
 * sinal para trocar o pôster pela demonstração viva.
 */
// ─── Foco: para onde a câmera aponta o olhar ────────────────────────────────

/**
 * O que acabou de mudar na tela, por estado — um trecho de texto do produto
 * que identifica o elemento (e, nas mensagens, o id dela). O diretor só MEDE
 * onde ele está e avisa a landing, que desenha contorno e conector por cima
 * (efeito de câmera, fora do app). Nada aqui altera a interface.
 */
type Alvo = {
  texto: string
  /** A mensagem, pelo id (`data-message-id` do `MessageList`): o alvo é
   *  procurado DENTRO dela — o mesmo texto na prévia da lista não confunde. */
  mensagem?: string
  bolha?: boolean
}

// Situação, etiqueta e a chamada da Ana: o painel do contato não se atualiza
// ao vivo no produto (só recarregando), então a mudança VISÍVEL é na linha do
// tempo e no sino — janelas da landing, focadas pelo próprio `HeroPalco`.
const FOCOS: Partial<Record<HeroState, Alvo>> = {
  demanda: { texto: 'Preciso de uma proposta pra 12', mensagem: 'demo-m-5', bolha: true },
  resposta: { texto: 'O Plano Pro anual sai por', mensagem: 'demo-m-6', bolha: true },
  confirma: { texto: HERO.confirm.slice(0, 18), mensagem: 'demo-m-7', bolha: true },
  pedido: { texto: HERO.ask.slice(0, 18), mensagem: 'demo-m-8', bolha: true },
  avanco: { texto: 'Plano Pro anual · 12', bolha: true },
  humano: { texto: 'aqui é a Ana', mensagem: 'demo-m-9', bolha: true },
}

/** O elemento visível mais interno (o de menor área) cujo texto contém o trecho. */
function acharTexto(raiz: ParentNode, trecho: string): HTMLElement | null {
  const candidatos = [...raiz.querySelectorAll<HTMLElement>('p, span, div, h4, button')]
    .filter((e) => e.children.length <= 2 && (e.textContent ?? '').includes(trecho))
  let melhor: HTMLElement | null = null
  let menorArea = Infinity
  for (const e of candidatos) {
    const r = e.getBoundingClientRect()
    if (r.width <= 0 || r.height <= 0) continue
    const area = r.width * r.height
    if (area < menorArea) { menorArea = area; melhor = e }
  }
  return melhor
}

/** Sobe até o "cartão" que contém o texto (bolha de mensagem, card do quadro). */
function subirAteCartao(e: HTMLElement, limite?: Element | null): HTMLElement {
  let atual: HTMLElement = e
  for (let i = 0; i < 7 && atual.parentElement && atual !== limite; i++) {
    const cs = getComputedStyle(atual)
    const temFundo = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent'
    if (temFundo && parseFloat(cs.borderTopLeftRadius) >= 6 && atual.getBoundingClientRect().width > 120) return atual
    atual = atual.parentElement
  }
  return e
}

function acharAlvo(alvo: Alvo): HTMLElement | null {
  const app = document.getElementById('main-content') ?? document.getElementById('root') ?? document.body
  const escopo = alvo.mensagem ? app.querySelector(`[data-message-id="${CSS.escape(alvo.mensagem)}"]`) : app
  if (!escopo) return null
  const achado = acharTexto(escopo, alvo.texto)
  if (!achado) return null
  return alvo.bolha ? subirAteCartao(achado, alvo.mensagem ? escopo : null) : achado
}

/** Foco por CENA — o que a câmera aponta ao chegar num módulo sem ação de estado. */
const FOCOS_CENA: Partial<Record<HeroCena, Alvo>> = {
  disparos: { texto: 'Renovação Pro · setembro', bolha: true },
  relatorio: { texto: 'Funil de engajamento' },
}

type Retangulo = { x: number; y: number; w: number; h: number }

/**
 * A parte do elemento que está de fato à vista: recortada por todo ancestral
 * que corta o conteúdo (a lista rolável do chat, o painel) e pela janela.
 * `visivel` cai quando sobra menos da metade ou quando outra camada do app
 * (um painel, um menu) cobre o centro do alvo.
 */
function medir(el: HTMLElement): { rect: Retangulo; visivel: boolean } {
  const r = el.getBoundingClientRect()
  let x1 = r.left, y1 = r.top, x2 = r.right, y2 = r.bottom
  for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
    const cs = getComputedStyle(a)
    if (cs.overflowX === 'visible' && cs.overflowY === 'visible') continue
    const c = a.getBoundingClientRect()
    x1 = Math.max(x1, c.left); y1 = Math.max(y1, c.top); x2 = Math.min(x2, c.right); y2 = Math.min(y2, c.bottom)
  }
  x1 = Math.max(x1, 0); y1 = Math.max(y1, 0); x2 = Math.min(x2, window.innerWidth); y2 = Math.min(y2, window.innerHeight)
  const w = Math.max(0, x2 - x1), h = Math.max(0, y2 - y1)
  let visivel = w > 0 && h > 0 && w * h >= 0.5 * r.width * r.height
  if (visivel) {
    const topo = document.elementFromPoint(x1 + w / 2, y1 + h / 2)
    if (topo && !el.contains(topo) && !topo.contains(el)) visivel = false
  }
  return { rect: { x: x1, y: y1, w, h }, visivel }
}

let focoSeq = 0
let focoAtivo = 0

function encerrarFoco() {
  focoSeq++
  if (focoAtivo) avisarPai({ canal: CANAL, tipo: 'foco-fim', id: focoAtivo })
  focoAtivo = 0
}

function focar(estado: HeroState) {
  const alvo = FOCOS[estado]
  if (alvo) focarAlvo(alvo, 150)
}

/** Quanto tempo a tomada fica no ar depois que o alvo assenta. */
const FOCO_NO_AR_MS = 4600
/** Espera máxima para o alvo parar de se mexer antes de aparecer. */
const FOCO_ASSENTAR_MAX_MS = 1400

/**
 * A TOMADA — acha o alvo, espera ele ASSENTAR (a mensagem entrar, o chat
 * terminar de rolar, a gaveta deslizar) e então o acompanha quadro a quadro
 * enquanto estiver no ar: rolagem, painel abrindo, card mudando de coluna,
 * mudança de tamanho. Cada mudança vai para a landing, que desenha o contorno
 * e o conector na mesma geometria. Nada aqui altera a interface.
 */
function focarAlvo(alvo: Alvo, atrasoMs: number) {
  const seq = ++focoSeq
  const inicio = performance.now()
  let el: HTMLElement | null = null
  let ultimo = ''
  let parado = 0
  let noArDesde = 0

  const quadro = () => {
    if (seq !== focoSeq) return
    const agora = performance.now()
    // O React pode trocar o nó (a lista recarrega): acha de novo.
    if (!el || !el.isConnected) el = acharAlvo(alvo)
    if (!el) {
      if (agora - inicio < atrasoMs + 2200) { requestAnimationFrame(quadro); return }
      encerrarFoco()
      return
    }
    const { rect, visivel } = medir(el)
    const raio = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 8
    const chave = [rect.x, rect.y, rect.w, rect.h].map((n) => Math.round(n * 2) / 2).join(',') + visivel
    if (!noArDesde) {
      // Assentando: conta quadros sem mudança antes de entrar no ar.
      parado = chave === ultimo ? parado + 1 : 0
      ultimo = chave
      if ((parado >= 8 && visivel) || agora - inicio > atrasoMs + FOCO_ASSENTAR_MAX_MS) {
        noArDesde = agora
        focoAtivo = seq
        avisarPai({ canal: CANAL, tipo: 'foco', id: seq, rect, raio, visivel })
      }
    } else if (chave !== ultimo) {
      ultimo = chave
      avisarPai({ canal: CANAL, tipo: 'foco', id: seq, rect, raio, visivel })
    }
    if (noArDesde && agora - noArDesde > FOCO_NO_AR_MS) { encerrarFoco(); return }
    requestAnimationFrame(quadro)
  }
  setTimeout(() => { if (seq === focoSeq) requestAnimationFrame(quadro) }, atrasoMs)
}

export function avisarQuandoPronta() {
  const inicio = Date.now()
  const checar = () => {
    // Desktop: `#main-content` da AppShell. Celular: a AppShellMobile não tem
    // esse id, então vale o conteúdo da raiz inteira.
    const principal = document.getElementById('main-content') ?? document.getElementById('root')
    // Conteúdo de verdade na área da página (não só o spinner do Suspense).
    const temConteudo = !!principal && principal.innerText.trim().length > 40
    if (temConteudo || Date.now() - inicio > 15_000) {
      // Um quadro a mais para a pintura assentar antes de revelar.
      requestAnimationFrame(() => avisarPai({ canal: CANAL, tipo: 'pronta' }))
      return
    }
    setTimeout(checar, 120)
  }
  checar()
}
