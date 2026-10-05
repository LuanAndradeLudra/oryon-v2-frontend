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
import { definirEstado, estadoAtual, reiniciarInteracoesDemo } from './backend'
import { emitirDoServidor } from './preparar'
import { requisicoesEmVoo } from './guards'
import {
  HERO, HERO_CAMPANHA_NOME, HERO_TEMPLATE_TRECHO, HERO_USER, heroContact, heroConversation, heroDeal, heroMessages, heroNotifications, reached,
} from '@/components/landing/stage/hero/heroRealData'
import { PERFIL } from '@/components/landing/stage/hero/perfisDemo'
import { HERO_ROTAS, type HeroCena, type HeroState } from '@/components/landing/stage/hero/heroStory'
import { recortarForma, raiosDoElemento, type RaiosFoco } from '@/components/landing/stage/hero/focoGeometry'

export const CANAL = 'oryon-hero'

export type MensagemParaDemo =
  | { canal: typeof CANAL; tipo: 'passo'; estado: HeroState; cena: HeroCena }
  | { canal: typeof CANAL; tipo: 'tema'; tema: 'dark' | 'light' }
export type MensagemDaDemo =
  | { canal: typeof CANAL; tipo: 'pronta' }
  | { canal: typeof CANAL; tipo: 'rota'; rota: string }
  /** A rota nova já pintou (enviado pela ponte de navegação do `DemoApp`). */
  | { canal: typeof CANAL; tipo: 'pintou'; rota: string }
  /** O alvo em foco, a cada quadro em que muda (id = a tomada). `visivel`:
   *  falso quando o alvo saiu da área rolável ou ficou coberto. */
  | { canal: typeof CANAL; tipo: 'foco'; id: number; rect: { x: number; y: number; w: number; h: number }; raios: RaiosFoco; visivel: boolean }
  | { canal: typeof CANAL; tipo: 'foco-fim'; id: number }
  /** Onde está o que abre por cima (o modal "Nova campanha"); `null` quando fecha. */
  | { canal: typeof CANAL; tipo: 'quadro'; rect: { x: number; y: number; w: number; h: number } | null }

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
    // A situação e as etiquetas são do CONTATO: o backend avisa `contact:updated`
    // e a ficha da conversa aberta relê o contato.
    emitirDoServidor('contact:updated', { contactId: contato.id })
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
  // Conduzida: quem troca de aba é o cursor, clicando no menu do app.
  if (CONDUZIDA && CENAS_NAVEGADAS_PELO_CURSOR.has(cena)) return null
  const celular = window.innerWidth < 768
  // Recortes da landing (30/09: um app só atende as seis abas de "Como
  // funciona"): cada aba pede a sua tela, inclusive no celular.
  const recorte = new URLSearchParams(location.search).get('modo') === 'recorte'
  if (!celular || (recorte && cena !== 'funil')) return HERO_ROTAS[cena]
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
  // A câmera já está acompanhando o card desde a entrada no Funil. Mantê-la
  // no mesmo alvo deixa o movimento entre colunas visível, sem apagar o foco
  // até a animação terminar.
  const seguirCard = cena === 'funil' && estado === 'avanco' && cenaAtual === 'funil'
  if (!seguirCard) encerrarFoco()
  definirEstado(estado)
  if (!recomeco && de !== estado) {
    // Com a mão na passagem, o "ganho" é da Ana: o cursor move o negócio para
    // Confirmado e só então a mudança chega ao app (02/10, PO).
    if (MAO_NA_PASSAGEM && estado === 'ganho' && cena === 'conversa') void maoNoGanho().then(() => emitirTransicao(de, estado))
    else emitirTransicao(de, estado)
    if (!seguirCard) focar(estado)
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
      // O palco espera este aviso para acender (sem ele, o recomeço do laço
      // ficava escuro até o teto de 3 s e a cena de Disparos passava apagada).
      avisarQuandoPintar(rota, cena)
      const alvo = alvoAoChegar(estado, cena)
      if (alvo) focarAlvo(alvo, cena === 'funil' ? 0 : 500, cena === 'funil' ? 7500 : FOCO_NO_AR_MS, cena === 'funil')
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
        avisarQuandoPintar(rota, cena)
      }
      const alvo = alvoAoChegar(estado, cena)
      // A cena precisa montar (e a gaveta do relatório, deslizar) antes da medida.
      if (alvo) focarAlvo(alvo, cena === 'funil' ? 0 : 500, cena === 'funil' ? 7500 : FOCO_NO_AR_MS, cena === 'funil')
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

/** Um texto que só existe quando a tela da cena já pintou com os dados. */
const PRONTA_CENA: Partial<Record<HeroCena, string | string[]>> = {
  // 02/10: a lista de Disparos não tem mais o "Convite webinar" — a troca de
  // etapa esperava o teto (2,2 s de tela coberta). Vale qualquer um dos textos.
  disparos: [HERO_CAMPANHA_NOME, 'Convite webinar'],
  relatorio: 'Funil de engajamento',
  conversa: PERFIL.conversas[0].nome,
  funil: HERO.dealTitle,
  'agente-instrucoes': 'Use só valores e condições',
  'agente-conhecimento': PERFIL.sinais.conhecimento,
  'agente-catalogo': PERFIL.sinais.catalogo,
  'agente-capacidades': 'Encerrar e reabrir conversas',
  'agente-capacidades-funil': 'Encerrar e reabrir conversas',
  // A aba Agora (onde o Dashboard abre) não tem o gráfico de volume.
  painel: ['Esperando alguém', 'Volume de Mensagens'],
}

let pinturaPendente = 0

/**
 * Avisa a landing quando a rota nova JÁ ESTÁ NA TELA. O app mantém a tela
 * anterior até a nova montar (medido: ~1 s), e o corte de câmera do palco
 * espera por isto em vez de acender sobre a tela velha. Espera o caminho do
 * roteador bater com o pedido; depois, dois quadros e um respiro para as
 * primeiras respostas do backend de demonstração pintarem.
 */
function avisarQuandoPintar(rota: string, cena: HeroCena) {
  const sinal = PRONTA_CENA[cena]
  const id = ++pinturaPendente
  const alvo = new URL(rota, 'http://demo.local').pathname
  const w = window as unknown as Janela
  const inicio = performance.now()
  let calmo = 0
  let textoEm = 0
  const checar = () => {
    if (id !== pinturaPendente) return
    const atual = new URL(w.__demoRota?.() ?? '/', 'http://demo.local').pathname
    const passou = performance.now() - inicio > 3500
    // O roteador troca o caminho antes de a página preguiçosa montar (tela em
    // branco): só conta quando o texto da tela nova já está no documento.
    const texto = document.body.innerText ?? ''
    const naTela = !sinal || (Array.isArray(sinal) ? sinal.some((s) => texto.includes(s)) : texto.includes(sinal))
    if (!passou && (atual !== alvo || !naTela)) { calmo = 0; setTimeout(checar, 50); return }
    // E o backend de demonstração quieto por 100 ms (as listas já chegaram) —
    // mas no máximo 300 ms depois de o texto aparecer: telas que consultam o
    // tempo todo (o quadro do funil) nunca ficam 100% quietas.
    if (!textoEm) textoEm = performance.now()
    calmo = requisicoesEmVoo() === 0 ? calmo + 1 : 0
    if (!passou && calmo < 2 && performance.now() - textoEm < 300) { setTimeout(checar, 50); return }
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => {
      if (id === pinturaPendente) avisarPai({ canal: CANAL, tipo: 'pintou', rota })
    }, 150)))
  }
  checar()
}

/** O tema acompanha o da landing — o mesmo mecanismo de `useTheme`. */
function aplicarTema(tema: 'dark' | 'light') {
  if (tema === 'light') document.documentElement.setAttribute('data-theme', 'light')
  else document.documentElement.removeAttribute('data-theme')
  localStorage.setItem('oryon-theme', tema)
}

/**
 * SEM TECLADO NO APARELHO (02/10, PO): dentro da landing, foco de verdade num
 * campo de texto da demonstração abre o teclado do celular de quem está
 * vendo — o iframe é do mesmo site, e o navegador trata o campo como da
 * página. Quem focava: o Modal (leva o foco ao 1º campo ao abrir), o
 * `autoFocus` de algumas telas e o próprio diretor ao digitar o nome da
 * campanha. Embutida, a demonstração só se assiste: campo de texto não
 * recebe foco (o anel de foco, quando a cena digita, é desenhado à mão).
 */
function semTecladoNoAparelho() {
  if (window.parent === window) return
  const focarOriginal = HTMLElement.prototype.focus
  HTMLElement.prototype.focus = function (this: HTMLElement, opcoes?: FocusOptions) {
    if (this instanceof HTMLInputElement || this instanceof HTMLTextAreaElement || this instanceof HTMLSelectElement || this.isContentEditable) return
    focarOriginal.call(this, opcoes)
  }
}

/**
 * SEM ROLAR A PÁGINA DE QUEM VÊ (02/10): `scrollIntoView` sobe pelos frames —
 * dentro do iframe da landing, a bancada de teste trazendo a última mensagem
 * à vista rolava também a página inteira. Embutida, a demonstração rola só o
 * que é dela: o contêiner rolável mais próximo, e nada acima do iframe.
 */
function semRolarAPagina() {
  if (window.parent === window) return
  Element.prototype.scrollIntoView = function (this: Element, opcao?: boolean | ScrollIntoViewOptions) {
    const o: ScrollIntoViewOptions = typeof opcao === 'object' ? opcao : { block: opcao === false ? 'end' : 'start' }
    let cont = this.parentElement
    while (cont && cont !== document.body && cont !== document.documentElement) {
      const oy = getComputedStyle(cont).overflowY
      if ((oy === 'auto' || oy === 'scroll') && cont.scrollHeight > cont.clientHeight) break
      cont = cont.parentElement
    }
    const rolavel = cont && cont !== document.body && cont !== document.documentElement ? cont : document.scrollingElement
    if (!rolavel) return
    const r = this.getBoundingClientRect()
    const c = rolavel === document.scrollingElement ? { top: 0, height: innerHeight } : rolavel.getBoundingClientRect()
    const bloco = o.block ?? 'start'
    let delta = r.top - c.top
    if (bloco === 'end') delta = r.bottom - (c.top + c.height)
    else if (bloco === 'center') delta = r.top + r.height / 2 - (c.top + c.height / 2)
    else if (bloco === 'nearest') delta = r.top < c.top ? r.top - c.top : r.bottom > c.top + c.height ? r.bottom - (c.top + c.height) : 0
    rolavel.scrollBy({ top: delta, behavior: o.behavior })
  }
}

/**
 * A TELA MENOR DO CELULAR (02/10, PO): no Hero do celular o app é desenhado em
 * 1024 × 768, e com a lista de conversas nos 360 px de sempre (e o painel do
 * contato nos 308) a conversa ficava com 294 px — apertada, as mensagens em
 * colunas finas. Só na demonstração embutida e só abaixo de 1100 px, a lista
 * e o painel do contato ficam com 270 px cada e a conversa ganha a diferença
 * (422 px). O app real não muda.
 */
function listaMaisEstreita() {
  if (window.parent === window) return
  const estilo = document.createElement('style')
  estilo.textContent = '@media (max-width: 1100px) {'
    + ' .conv-surface.sm\\:w-\\[360px\\] { width: 270px; }'
    + ' .conv-surface.md\\:w-\\[308px\\] { width: 270px; }'
    + ' }'
  document.head.appendChild(estilo)
}

export function instalarDiretor() {
  semTecladoNoAparelho()
  semRolarAPagina()
  listaMaisEstreita()
  window.addEventListener('message', (e: MessageEvent<MensagemParaDemo>) => {
    if (e.origin !== location.origin) return
    const d = e.data
    if (!d || d.canal !== CANAL) return
    if (d.tipo === 'passo') {
      aplicarPasso(d.estado, d.cena)
      aplicarDetalhe(d.estado, d.cena)
      aplicarCampanha(d.cena)
      aplicarConduzida(d.cena)
    }
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
  /** O texto é o TÍTULO de um bloco: o alvo é o bloco inteiro (título e
   *  conteúdo), não a faixa do título. */
  bloco?: boolean
  /** Componente exato que contém o texto quando a peça não é um card inteiro. */
  seletorAncestral?: string
  /** O alvo pode estar fora da área visível da tela: rola até ele antes de medir. */
  rolar?: boolean
}

// Situação, etiqueta e a chamada da Ana: a mudança que a câmera aponta é na
// linha do tempo e no sino — janelas da landing, focadas pelo próprio
// `HeroPalco`. (A ficha passou a reler a situação em `contact:updated`; a
// etiqueta da CONVERSA ainda não chega ao vivo: o backend não emite evento.)
export const FOCOS: Partial<Record<HeroState, Alvo>> = {
  // A campanha chegando: a mensagem do modelo na conversa da Marina. Não há
  // mudança de estado no primeiro passo — a tomada sai ao chegar na cena
  // (`alvoAoChegar`).
  inicio: { texto: HERO_TEMPLATE_TRECHO, mensagem: 'demo-m-10', bolha: true },
  // Os trechos saem da própria mensagem: um texto escrito à mão aqui ficava
  // para trás quando a história mudava, e a legenda passava sem destaque.
  demanda: { texto: HERO.demand.slice(0, 18), mensagem: 'demo-m-5', bolha: true },
  resposta: { texto: HERO.answer.slice(0, 18), mensagem: 'demo-m-6', bolha: true },
  confirma: { texto: HERO.confirm.slice(0, 18), mensagem: 'demo-m-7', bolha: true },
  pedido: { texto: HERO.ask.slice(0, 18), mensagem: 'demo-m-8', bolha: true },
  avanco: { texto: HERO.dealTitle, bolha: true },
  humano: { texto: HERO.human.slice(0, 18), mensagem: 'demo-m-9', bolha: true },
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
  if (alvo.seletorAncestral) {
    const componente = achado.closest<HTMLElement>(alvo.seletorAncestral)
    return componente && app.contains(componente) ? componente : null
  }
  if (alvo.bloco) return achado.parentElement ?? achado
  return alvo.bolha ? subirAteCartao(achado, alvo.mensagem ? escopo : null) : achado
}

/** Foco por CENA — o que a câmera aponta ao chegar num módulo sem ação de estado. */
const FOCOS_CENA: Partial<Record<HeroCena, Alvo>> = {
  // Disparos: sem tomada — a cena de campanhas abre com o cursor virtual
  // indo até "Nova campanha" (02/10, PO).
  relatorio: { texto: 'Funil de engajamento', bloco: true },
  funil: { texto: HERO.dealTitle, bolha: true },
  // O agente: a regra que manda usar só o catálogo; o documento da condição de
  // setembro; o produto que a resposta cita.
  'agente-instrucoes': { texto: 'Use só valores e condições' },
  'agente-conhecimento': { texto: PERFIL.sinais.conhecimento, bolha: true },
  'agente-catalogo': { texto: PERFIL.sinais.catalogo, bolha: true },
  // Limites da IA: chamar uma pessoa (permitido) e mover o negócio — onde a
  // própria tela diz que fechar venda nunca é permitido. O card do funil fica
  // abaixo da dobra do app: a câmera rola até ele.
  'agente-capacidades': { texto: 'Atribuir conversa a um atendente', bolha: true, rolar: true },
  'agente-capacidades-funil': { texto: 'Mover negócio ou registro no funil', bolha: true, rolar: true },
  // O Dashboard: a fila (a Marina esperando), os indicadores, o volume.
  'painel-fila': { texto: 'Fila agora', bolha: true },
  'painel-indicadores': { texto: 'Conversas Ativas', seletorAncestral: '[data-spotlight-target="kpi-cell"]' },
  'painel-volume': { texto: 'Volume de Mensagens', bolha: true },
}

type Retangulo = { x: number; y: number; w: number; h: number }

/**
 * A parte do elemento que está de fato à vista: recortada por todo ancestral
 * que corta o conteúdo (a lista rolável do chat, o painel) e pela janela.
 * `visivel` cai quando sobra menos da metade ou quando outra camada do app
 * (um painel, um menu) cobre o centro do alvo.
 */
/** Os ancestrais que recortam o alvo, calculados uma vez por elemento: o
 *  getComputedStyle de cada ancestral a cada quadro pesava em máquina fraca. */
const recortadores = new WeakMap<HTMLElement, HTMLElement[]>()
function ancestraisQueRecortam(el: HTMLElement): HTMLElement[] {
  let lista = recortadores.get(el)
  if (!lista) {
    lista = []
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a)
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') lista.push(a)
    }
    recortadores.set(el, lista)
  }
  return lista
}

function medir(el: HTMLElement): { rect: Retangulo; raios: RaiosFoco; visivel: boolean } {
  const r = el.getBoundingClientRect()
  let x1 = r.left, y1 = r.top, x2 = r.right, y2 = r.bottom
  for (const a of ancestraisQueRecortam(el)) {
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
  const forma = recortarForma(
    { x: r.left, y: r.top, w: r.width, h: r.height },
    { x: x1, y: y1, w, h },
    raiosDoElemento(el),
  )
  return { rect: forma.rect, raios: forma.raios, visivel }
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

/** A tomada ao CHEGAR numa cena: a da própria cena ou, no primeiro passo da
 *  história (que não muda estado), a da campanha chegando. */
function alvoAoChegar(estado: HeroState, cena: HeroCena): Alvo | undefined {
  if (CONDUZIDA && PASSOS_DO_CURSOR[cena]) return undefined
  return FOCOS_CENA[cena] ?? (estado === 'inicio' && cena === 'conversa' ? FOCOS.inicio : undefined)
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
/**
 * Centraliza o alvo rolando SÓ o contêiner rolável do app que o contém.
 * `scrollIntoView` não serve: ele sobe pelos frames e rolava também a página
 * da landing (medido: o visitante era puxado e a moldura ia parar sob o menu).
 */
function rolarAte(el: HTMLElement) {
  let cont: HTMLElement | null = el.parentElement
  while (cont && cont !== document.body) {
    const oy = getComputedStyle(cont).overflowY
    if ((oy === 'auto' || oy === 'scroll') && cont.scrollHeight > cont.clientHeight) break
    cont = cont.parentElement
  }
  if (!cont || cont === document.body) return
  const c = cont.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  const topo = cont.scrollTop + (r.top - c.top) - Math.max(0, (c.height - r.height) / 2)
  cont.scrollTo({ top: Math.max(0, topo), behavior: 'smooth' })
}

function focarAlvo(alvo: Alvo, atrasoMs: number, noArMs = FOCO_NO_AR_MS, imediato = false) {
  const seq = ++focoSeq
  const inicio = performance.now()
  let el: HTMLElement | null = null
  let ultimo = ''
  let parado = 0
  let noArDesde = 0
  let quietos = 0
  let anterior = ''

  const quadro = () => {
    if (seq !== focoSeq) return
    const agora = performance.now()
    // O React pode trocar o nó (a lista recarrega): acha de novo.
    if (!el || !el.isConnected) {
      el = acharAlvo(alvo)
      // Uma vez por alvo encontrado: a rolagem suave leva alguns quadros, e a
      // medida abaixo só entra no ar quando o retângulo para de mudar.
      if (el && alvo.rolar) rolarAte(el)
    }
    if (!el) {
      if (agora - inicio < (imediato ? 5000 : atrasoMs + 2200)) { requestAnimationFrame(quadro); return }
      encerrarFoco()
      return
    }
    const { rect, raios, visivel } = medir(el)
    const chave = [rect.x, rect.y, rect.w, rect.h, ...Object.values(raios).flatMap((r) => [r.x, r.y])]
      .map((n) => Math.round(n * 2) / 2).join(',') + visivel
    if (!noArDesde) {
      // Assentando: conta quadros sem mudança antes de entrar no ar.
      parado = chave === ultimo ? parado + 1 : 0
      ultimo = chave
      if ((imediato && visivel) || (parado >= 8 && visivel) || agora - inicio > atrasoMs + FOCO_ASSENTAR_MAX_MS) {
        noArDesde = agora
        focoAtivo = seq
        avisarPai({ canal: CANAL, tipo: 'foco', id: seq, rect, raios, visivel })
      }
    } else if (chave !== ultimo) {
      ultimo = chave
      avisarPai({ canal: CANAL, tipo: 'foco', id: seq, rect, raios, visivel })
    }
    if (noArDesde && agora - noArDesde > noArMs) { encerrarFoco(); return }
    // No ar e parado: confere a cada 120 ms em vez de a cada quadro (o
    // alvo só se mexe se a tela rolar ou a lista recarregar — e aí volta ao
    // ritmo de quadro até assentar de novo).
    quietos = noArDesde && chave === anterior ? quietos + 1 : 0
    anterior = chave
    if (quietos > 12) setTimeout(() => requestAnimationFrame(quadro), 120)
    else requestAnimationFrame(quadro)
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

// ─── Detalhe (página /solucoes, 02/10): a câmera da landing aproxima ─────────
//
// Com `detalhe=1`, a landing aproxima a moldura do app em dois momentos que
// quase não mudam a tela inteira, e o próprio app mostra a mudança:
//  • situação e etiqueta: o painel do contato rola até a Timeline;
//  • a recepção assume: o sino da barra do topo abre com a notificação.
// O Hero e as páginas de produto não passam `detalhe` e seguem como antes.

const DETALHE = new URLSearchParams(location.search).get('detalhe') === '1'

const FOCOS_DETALHE: Partial<Record<HeroState, Alvo>> = {
  situacao: { texto: 'Situação do contato' },
  etiqueta: { texto: 'Adicionou a etiqueta' },
  assumido: { texto: 'pediu transferência', bolha: true },
}

function botaoDoSino(): HTMLButtonElement | null {
  return [...document.querySelectorAll<HTMLButtonElement>('button[aria-haspopup="dialog"]')]
    .find((b) => (b.getAttribute('aria-label') ?? '').startsWith('Notificações')) ?? null
}

function sinoAberto(abrir: boolean) {
  const b = botaoDoSino()
  if (!b) return
  if ((b.getAttribute('aria-expanded') === 'true') !== abrir) b.click()
}

function aplicarDetalhe(estado: HeroState, cena: HeroCena) {
  if (!DETALHE) return
  // O sino abre só enquanto a notificação é a novidade; quando a pessoa
  // entra, fecha e o destaque vai para a mensagem dela (FOCOS.humano).
  const comSino = cena === 'conversa' && estado === 'assumido'
  // A notificação chega pelo servidor da demonstração: o sino abre depois dela.
  setTimeout(() => sinoAberto(comSino), comSino ? 450 : 0)
  // Situação e etiqueta: a Timeline inteira à vista, no alto do painel.
  if (cena === 'conversa' && (estado === 'situacao' || estado === 'etiqueta')) setTimeout(timelineNoTopo, 250)
  const alvo = cena === 'conversa' ? FOCOS_DETALHE[estado] : undefined
  // Com a mão na passagem, quem guia o olhar na transferência é o cursor.
  if (alvo && !(MAO_NA_PASSAGEM && comSino)) focarAlvo(alvo, comSino ? 900 : 350)
  if (MAO_NA_PASSAGEM) void passagemComCursor(estado, cena)
}

/**
 * A MÃO NA PASSAGEM (02/10, PO; /solucoes, "Na tela da sua equipe"): a IA faz
 * tudo sozinha — e o cursor só aparece quando entra uma pessoa. A
 * notificação de transferência chega no sino; o cursor entra, clica nela, vai
 * até "Assumir" e clica; logo depois a mensagem da recepção entra (o passo
 * `humano` da história). O clique é o gesto (a mão e o aperto): o efeito vem da
 * própria história — o "Assumir" de verdade chamaria a atribuição e a pausa
 * da IA, que a demonstração não simula.
 */
const MAO_NA_PASSAGEM = new URLSearchParams(location.search).get('mao') === '1'
let execucaoDaPassagem = 0

/** A notificação de transferência no sino aberto (no alto da tela). */
function avisoDeTransferencia(): HTMLElement | null {
  const textos = [...document.querySelectorAll<HTMLElement>('p, span, div')]
    .filter((e) => e.children.length <= 2 && (e.textContent ?? '').includes('pediu transferência'))
    .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.top < innerHeight * 0.45 })
  textos.sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height)
  return textos[0] ?? null
}

/**
 * O FECHAMENTO COM A MÃO (02/10, PO; Hero do celular): a Ana confirma o encaixe
 * e move o negócio para Confirmado. O cursor vai até a etapa do negócio no
 * painel do contato e clica; a mudança (o negócio, a Timeline) chega logo
 * depois do clique — antes, a Timeline mudava sozinha, sem ninguém na tela.
 */
async function maoNoGanho() {
  execucaoDaPassagem++
  const etapa = await achar(() => [...document.querySelectorAll<HTMLElement>('button, [role="combobox"], span')]
    .filter((e) => {
      const r = e.getBoundingClientRect()
      return r.width > 0 && r.left > innerWidth * 0.6 && (e.textContent ?? '').trim().startsWith('Agendado')
    })
    .sort((a, b) => a.getBoundingClientRect().width * a.getBoundingClientRect().height - b.getBoundingClientRect().width * b.getBoundingClientRect().height)[0] ?? null, 1500)
  if (!etapa) return
  const el = garantirCursor()
  if (el.style.opacity !== '1') {
    // Entra já perto do painel, sem atravessar a tela.
    el.getAnimations().forEach((a) => a.cancel())
    const r = etapa.getBoundingClientRect()
    posCursor = { x: Math.round(Math.min(innerWidth - 30, r.left + r.width + 60)), y: Math.round(r.top + 90) }
    el.style.transform = `translate(${posCursor.x}px, ${posCursor.y}px)`
  }
  await moverCursor(etapa)
  await esperarMs(380)
  pulsoDoClique()
  await esperarMs(260)
  // A mão fica um instante e sai de cena depois que o negócio mudou.
  window.setTimeout(() => esconderCursor(), 1900)
}

async function passagemComCursor(estado: HeroState, cena: HeroCena) {
  const execucao = ++execucaoDaPassagem
  const vivo = () => execucao === execucaoDaPassagem
  if (cena !== 'conversa' || estado !== 'assumido') {
    // A pessoa entrou: um instante para ver a mensagem dela, e a mão sai de cena.
    if (cursor && cursor.style.opacity === '1') {
      await esperarMs(estado === 'humano' ? 1600 : 0)
      if (vivo()) esconderCursor()
    }
    return
  }
  // O sino abre (450 ms depois da notificação); a mão aparece já dentro do
  // plano do sino (à direita, embaixo dele) — não atravessa a tela vindo de
  // fora — e vai curta até o aviso.
  await esperarMs(600)
  const aviso = await achar(avisoDeTransferencia, 2500)
  if (!vivo() || !aviso) return
  const el = garantirCursor()
  if (el.style.opacity !== '1') {
    el.getAnimations().forEach((a) => a.cancel())
    posCursor = { x: Math.round(innerWidth * 0.84), y: Math.round(innerHeight * 0.44) }
    el.style.transform = `translate(${posCursor.x}px, ${posCursor.y}px)`
  }
  await moverCursor(aviso)
  if (!vivo()) return
  // Um instante no aviso (o olho lê "pediu transferência"), e o clique.
  await esperarMs(450)
  pulsoDoClique()
  await esperarMs(350)
  // Abriu a conversa — é esta mesma: o sino fecha.
  sinoAberto(false)
  const assumir = await achar(() => [...document.querySelectorAll<HTMLButtonElement>('button')]
    .find((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.top < innerHeight * 0.3 && (b.textContent ?? '').trim() === 'Assumir' }) ?? null)
  if (!vivo() || !assumir) return
  await esperarMs(220)
  await moverCursor(assumir)
  if (!vivo()) return
  await esperarMs(160)
  pulsoDoClique()
}

/** Rola só o painel do contato até a Timeline ficar no alto, com o histórico
 *  inteiro abaixo (o `rolarAte` centraliza um item só). */
function timelineNoTopo() {
  const titulo = acharTexto(document.getElementById('main-content') ?? document.body, 'Timeline')
  let cont = titulo?.parentElement ?? null
  while (cont && cont !== document.body) {
    const oy = getComputedStyle(cont).overflowY
    if ((oy === 'auto' || oy === 'scroll') && cont.scrollHeight > cont.clientHeight) break
    cont = cont.parentElement
  }
  if (!titulo || !cont || cont === document.body) return
  const topo = cont.scrollTop + (titulo.getBoundingClientRect().top - cont.getBoundingClientRect().top) - 12
  cont.scrollTo({ top: Math.max(0, topo), behavior: 'smooth' })
}


// ─── Nova campanha (02/10): a criação de uma campanha, dentro da cena ─────────
//
// O assistente "Nova campanha" é um modal sem endereço próprio: o diretor o
// conduz como uma pessoa, no ritmo de quem mostra — um cursor virtual anda até
// o que vai ser clicado, um respiro, o clique; o nome é digitado com calma. A cena
// começa na lista de Disparos e o botão "Nova campanha" abre o modal. Cada
// passo do assistente é uma cena (o roteiro dá o tempo de cada um). As cenas
// são cumulativas: um pulo direto para um passo faz os anteriores na hora.
// Ao sair delas, o modal fecha.

const CENAS_DA_CAMPANHA: Partial<Record<HeroCena, number>> = {
  'campanha-nova': 1, 'campanha-publico': 2, 'campanha-variaveis': 3, 'campanha-agendamento': 4, 'campanha-revisao': 5,
}
let nivelDaCampanha = 0
let execucaoDaCampanha = 0

const esperarMs = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Espera um elemento aparecer (a tela ainda montando). */
async function achar<T>(fn: () => T | null | undefined, tetoMs = 3000): Promise<T | null> {
  const inicio = performance.now()
  while (performance.now() - inicio < tetoMs) {
    const x = fn()
    if (x) return x
    await esperarMs(80)
  }
  return null
}

/** O modal do assistente (o que contém o título e os botões de navegação). */
function raizDoModal(): HTMLElement | null {
  const titulo = [...document.querySelectorAll('h2')].find((h) => h.textContent?.trim() === 'Nova campanha')
  let caixa: HTMLElement | null = titulo?.parentElement ?? null
  for (let i = 0; i < 6 && caixa; i++) {
    if ([...caixa.querySelectorAll('button')].some((b) => /^(Próximo|Criar e enviar)/.test((b.textContent ?? '').trim()))) return caixa
    caixa = caixa.parentElement
  }
  return null
}

/** Um botão pelo começo do texto — dentro do modal, quando ele está aberto (a
 *  lista de Disparos atrás tem botões com os mesmos nomes, como "Enviar agora"). */
const botaoNoModal = (comeco: string) => {
  const raiz = raizDoModal()
  return raiz ? [...raiz.querySelectorAll<HTMLButtonElement>('button')]
    .find((b) => b.getBoundingClientRect().width > 0 && (b.textContent ?? '').trim().startsWith(comeco)) ?? null : null
}

const botao = (comeco: string) => [...document.querySelectorAll<HTMLButtonElement>('button')]
  .find((b) => b.getBoundingClientRect().width > 0 && (b.textContent ?? '').trim().startsWith(comeco)) ?? null
const modalAberto = () => [...document.querySelectorAll('h2')].some((h) => h.textContent?.trim() === 'Nova campanha')

function fecharCampanha() {
  nivelDaCampanha = 0
  execucaoDaCampanha++
  esconderCursor()
  zoomNoAlvo(null)
  seguirQuadro(null)
  if (!modalAberto()) return
  const titulo = [...document.querySelectorAll('h2')].find((h) => h.textContent?.trim() === 'Nova campanha')
  let caixa: HTMLElement | null = titulo?.parentElement ?? null
  for (let i = 0; i < 4 && caixa && !caixa.querySelector('button[aria-label="Fechar"]'); i++) caixa = caixa.parentElement
  caixa?.querySelector<HTMLButtonElement>('button[aria-label="Fechar"]')?.click()
}

/** Digita como uma pessoa (o campo é controlado pelo React). */
async function digitar(campo: HTMLInputElement | HTMLTextAreaElement, texto: string, vivo: () => boolean, devagar: boolean, msPorLetra = 85) {
  const prototipo = campo instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const definir = Object.getOwnPropertyDescriptor(prototipo, 'value')?.set
  // Sem foco de verdade (abriria o teclado do celular de quem vê a landing):
  // o anel de foco do Input é desenhado à mão enquanto o nome é digitado.
  const { borderColor, boxShadow } = campo.style
  campo.style.borderColor = 'var(--color-brand-500)'
  campo.style.boxShadow = '0 0 0 3px var(--color-accent-soft)'
  try {
    for (let i = devagar ? 1 : texto.length; i <= texto.length; i++) {
      if (!vivo()) return
      definir?.call(campo, texto.slice(0, i))
      campo.dispatchEvent(new Event('input', { bubbles: true }))
      // A caixa de mensagem da bancada tem uma linha e não cresce: o texto
      // longo sumia para baixo. Aqui ela cresce até o teto dela (max-h-28).
      if (campo instanceof HTMLTextAreaElement) {
        campo.style.height = 'auto'
        campo.style.height = `${Math.min(campo.scrollHeight + 2, 112)}px`
      }
      if (devagar) await esperarMs(msPorLetra)
    }
  } finally {
    campo.style.borderColor = borderColor
    campo.style.boxShadow = boxShadow
  }
}

// O CURSOR VIRTUAL (02/10, PO): uma seta que anda até o próximo alvo e
// clica, como alguém navegando. Mora no documento da demonstração, por cima
// do app, e não recebe clique nenhum.
let cursor: HTMLDivElement | null = null

function garantirCursor(): HTMLDivElement {
  if (cursor?.isConnected) return cursor
  const el = document.createElement('div')
  el.setAttribute('aria-hidden', 'true')
  el.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483646;pointer-events:none;opacity:0;'
    + 'transition:opacity 260ms ease;will-change:transform;'
  el.innerHTML = '<span data-anel style="position:absolute;left:-16px;top:-16px;width:32px;height:32px;border-radius:999px;'
    + 'border:2px solid rgba(45,212,191,.85);transform:scale(0);opacity:0"></span>'
    + '<svg data-seta width="24" height="24" viewBox="0 0 24 24" style="display:block;transform-origin:3px 3px;'
    + 'transition:transform 140ms ease;filter:drop-shadow(0 4px 10px rgba(0,0,0,.45)) drop-shadow(0 0 1px rgba(0,0,0,.5))">'
    + '<path d="M3.6 2.4c-.5-.2-1 .3-.8.8l6.3 17.3c.2.6 1 .6 1.2 0l2.3-6.6 6.6-2.3c.6-.2.6-1 0-1.2z" '
    + 'fill="#2DD4BF" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg>'
  document.body.appendChild(el)
  // Entra de baixo, perto do meio da tela.
  posCursor = { x: Math.round(innerWidth * 0.58), y: Math.round(innerHeight * 0.82) }
  el.style.transform = `translate(${posCursor.x}px, ${posCursor.y}px)`
  cursor = el
  return el
}

/**
 * O MOVIMENTO DA MÃO (02/10): o tempo cresce com a distância (um ajuste curto
 * é rápido, atravessar a tela leva quase um segundo) e o caminho faz um arco
 * leve — a mão não anda em régua. Acelera e freia suave.
 */
let posCursor: { x: number; y: number } | null = null
let cursorAndando = false
async function deslizarCursor(x: number, y: number) {
  const el = garantirCursor()
  el.style.opacity = '1'
  const de = posCursor ?? { x, y }
  const dx = x - de.x
  const dy = y - de.y
  const dist = Math.hypot(dx, dy)
  posCursor = { x: Math.round(x), y: Math.round(y) }
  const para = `translate(${posCursor.x}px, ${posCursor.y}px)`
  el.style.transform = para
  if (dist < 3) return
  const ms = Math.round(Math.min(980, Math.max(380, 260 + dist * 0.55)))
  const desvio = Math.min(46, dist * 0.09)
  const meio = { x: de.x + dx / 2 - (dy / dist) * desvio, y: de.y + dy / 2 + (dx / dist) * desvio }
  cursorAndando = true
  el.getAnimations().forEach((a) => a.cancel())
  el.animate([
    { transform: `translate(${de.x}px, ${de.y}px)` },
    { transform: `translate(${Math.round(meio.x)}px, ${Math.round(meio.y)}px)`, offset: 0.5 },
    { transform: para },
  ], { duration: ms, easing: 'cubic-bezier(.45,0,.2,1)' })
  await esperarMs(ms + 30)
  cursorAndando = false
}

function esconderCursor() {
  if (cursor) cursor.style.opacity = '0'
}

/** Leva o cursor até o alvo (um pouco abaixo do centro, como a mão faz). */
async function moverCursor(alvo: HTMLElement) {
  const r = alvo.getBoundingClientRect()
  await deslizarCursor(r.left + Math.min(r.width * 0.5, 120), r.top + r.height * 0.6)
}

/** Leva o cursor até um ponto da tela. */
async function moverCursorPara(x: number, y: number) {
  await deslizarCursor(x, y)
}

/** O clique: a seta aperta e um anel teal se abre sob a ponta. */
function pulsoDoClique() {
  const anel = cursor?.querySelector<HTMLElement>('[data-anel]')
  anel?.animate([
    { transform: 'scale(.3)', opacity: 1 },
    { transform: 'scale(1.35)', opacity: 0 },
  ], { duration: 460, easing: 'cubic-bezier(.2,.7,.3,1)' })
  cursor?.querySelector<SVGElement>('[data-seta]')?.animate([
    { transform: 'scale(1)' }, { transform: 'scale(.86)' }, { transform: 'scale(1)' },
  ], { duration: 260, easing: 'ease-out' })
}

/**
 * O ZOOM DO CLIQUE (02/10, PO): enquanto o cursor vai até o alvo, a tela
 * aproxima de leve, centrada nele; depois do clique, volta. A origem é o
 * próprio alvo, então ele fica parado na tela enquanto o resto cresce — e o
 * cursor, que mira o mesmo ponto, continua em cima dele.
 */
const ESCALA_DO_ZOOM = 1.05
let origemDoZoom: { x: number; y: number } | null = null
function zoomNoAlvo(alvo: HTMLElement | null) {
  const raiz = document.documentElement
  // Com a câmera da landing (o celular), o zoom do clique somava com o
  // movimento da moldura: lá ele não existe.
  if (DETALHE) { raiz.style.transform = ''; origemDoZoom = null; return }
  raiz.style.transition = 'transform 620ms cubic-bezier(.45,0,.2,1)'
  if (!alvo) { raiz.style.transform = ''; origemDoZoom = null; return }
  const r = desfazerZoom(alvo.getBoundingClientRect())
  origemDoZoom = { x: Math.round(r.x + r.w / 2), y: Math.round(r.y + r.h / 2) }
  raiz.style.transformOrigin = `${origemDoZoom.x}px ${origemDoZoom.y}px`
  raiz.style.transform = `scale(${ESCALA_DO_ZOOM})`
}

/** Um retângulo medido na tela, sem o zoom do clique (a medida "de verdade"). */
function desfazerZoom(r: DOMRect) {
  const o = origemDoZoom
  const k = o ? ESCALA_DO_ZOOM : 1
  const x = o ? o.x + (r.left - o.x) / k : r.left
  const y = o ? o.y + (r.top - o.y) / k : r.top
  return { x, y, w: r.width / k, h: r.height / k }
}

/**
 * O QUADRO DO MODAL (02/10, PO): a moldura da landing que segue a cena (o
 * celular) enquadra o modal inteiro — e acompanha quando ele cresce ou muda
 * de passo, para o cursor nunca sair de cena. Sem modal, `null`: a tela inteira.
 */
type Quadro = { x: number; y: number; w: number; h: number }
let observadorDoQuadro: ResizeObserver | null = null
let ultimoQuadro = ''
let esperaDoQuadro = 0
let remedirQuadro = 0
/** O que a moldura enquadra agora (o modal, a bancada, a gaveta). */
let medirQuadro: (() => Quadro | null) | null = null

/** O retângulo de um elemento, sem o zoom do clique. */
function quadroDe(el: Element | null): Quadro | null {
  if (!el) return null
  const r = desfazerZoom(el.getBoundingClientRect())
  return r.w > 0 ? r : null
}

function avisarQuadro() {
  const r = medirQuadro?.() ?? null
  const rect = r ? { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) } : null
  const chave = JSON.stringify(rect)
  if (chave === ultimoQuadro) return
  ultimoQuadro = chave
  avisarPai({ canal: CANAL, tipo: 'quadro', rect })
  if (rect) recolherCursor(rect)
}

/** O modal encolheu e o cursor ficou de fora (onde estava o "Próximo" do
 *  passo anterior): ele volta para dentro, sem sair de cena. */
function recolherCursor(rect: { x: number; y: number; w: number; h: number }) {
  // Andando, o cursor já vai para dentro do plano (quem chama o enquadrou).
  if (!cursor || cursor.style.opacity !== '1' || cursorAndando || !posCursor) return
  const { x, y } = posCursor
  const margem = 36
  const nx = Math.min(Math.max(x, rect.x + margem), rect.x + rect.w - margem)
  const ny = Math.min(Math.max(y, rect.y + margem), rect.y + rect.h - margem)
  if (nx !== x || ny !== y) void deslizarCursor(nx, ny)
}
/**
 * Liga a moldura a um alvo: `medir` diz o retângulo a enquadrar, `observar`
 * é o elemento cujo tamanho, ao mudar, pede uma nova medida. `null` desliga
 * (a tela inteira).
 */
function seguirQuadro(medir: (() => Quadro | null) | null, observar?: Element | null) {
  observadorDoQuadro?.disconnect()
  observadorDoQuadro = null
  window.clearTimeout(esperaDoQuadro)
  window.clearInterval(remedirQuadro)
  medirQuadro = medir
  if (!medir) {
    if (ultimoQuadro !== 'null') { ultimoQuadro = 'null'; avisarPai({ canal: CANAL, tipo: 'quadro', rect: null }) }
    return
  }
  // O alvo cresce animado: a câmera anda quando ele assenta (não a cada quadro).
  if (observar) {
    observadorDoQuadro = new ResizeObserver(() => {
      window.clearTimeout(esperaDoQuadro)
      esperaDoQuadro = window.setTimeout(avisarQuadro, 140)
    })
    observadorDoQuadro.observe(observar)
  }
  remedirQuadro = window.setInterval(avisarQuadro, 350)
  avisarQuadro()
}

/**
 * A CÂMERA (02/10, PO: "câmera de tripé"). `filmar()` sem nada é o plano
 * geral (a tela inteira); com elementos, um plano fechado na união deles.
 * Só vale onde a landing segue o quadro (o celular); no desktop, a tela inteira.
 */
type Enquadravel = Element | Quadro | null | undefined
function uniao(itens: Enquadravel[]): Quadro | null {
  const qs = itens.map((i) => (i instanceof Element ? quadroDe(i) : i ?? null)).filter((q): q is Quadro => !!q && q.w > 0)
  if (qs.length === 0) return null
  const x = Math.min(...qs.map((q) => q.x))
  const y = Math.min(...qs.map((q) => q.y))
  return { x, y, w: Math.max(...qs.map((q) => q.x + q.w)) - x, h: Math.max(...qs.map((q) => q.y + q.h)) - y }
}
function filmar(...itens: (Enquadravel | (() => Enquadravel))[]) {
  if (itens.length === 0) { seguirQuadro(null); return }
  const observar = itens.find((i): i is Element => i instanceof Element) ?? null
  seguirQuadro(() => uniao(itens.map((i) => (typeof i === 'function' ? i() : i))), observar)
}

/**
 * Clica como quem mostra: o cursor anda até o alvo, um respiro, o clique.
 * No pulo direto (sem animação), só o clique.
 */
async function apontarEClicar(alvo: HTMLElement, vivo: () => boolean, devagar: boolean, comZoom = true, semRespiro = false) {
  if (devagar) {
    if (comZoom) zoomNoAlvo(alvo)
    await moverCursor(alvo)
    if (!vivo()) { zoomNoAlvo(null); return false }
    await esperarMs(200)
    pulsoDoClique()
  }
  alvo.click()
  if (devagar && comZoom) {
    await esperarMs(260)
    zoomNoAlvo(null)
  }
  if (!semRespiro) await esperarMs(devagar ? 520 : 220)
  return vivo()
}

async function conduzirCampanha(alvo: number) {
  const execucao = ++execucaoDaCampanha
  const vivo = () => execucao === execucaoDaCampanha
  // Um passo à frente anima; um pulo faz os passos que faltam na hora.
  const devagar = alvo === nivelDaCampanha + 1

  // 1 · A lista de Disparos → "Nova campanha" → o nome e o modelo.
  if (nivelDaCampanha < 1) {
    const novo = await achar(() => botao('Nova campanha'))
    if (!vivo() || !novo) return
    if (!modalAberto() && !(await apontarEClicar(novo, vivo, devagar))) return
    await achar(() => raizDoModal())
    const campo = await achar(() => [...document.querySelectorAll<HTMLInputElement>('input')].find((i) => (i.placeholder ?? '').startsWith('Ex:')))
    if (!vivo() || !campo) return
    if (devagar) {
      await esperarMs(500)
      await moverCursor(campo)
      pulsoDoClique()
    }
    await digitar(campo, HERO_CAMPANHA_NOME, vivo, devagar)
    if (!vivo()) return
    const modelo = await achar(() => botaoNoModal(PERFIL.modelo.nome))
    if (!vivo() || !modelo) return
    if (devagar) await esperarMs(400)
    if (!(await apontarEClicar(modelo, vivo, devagar))) return
    nivelDaCampanha = 1
  }

  // 2 · Público: por etiqueta, e o alcance aparece.
  if (alvo >= 2 && nivelDaCampanha < 2) {
    const proximo = await achar(() => botaoNoModal('Próximo'))
    if (!vivo() || !proximo || !(await apontarEClicar(proximo, vivo, devagar, false))) return
    const porTags = await achar(() => botaoNoModal('Por tags'))
    if (!vivo() || !porTags) return
    if (devagar) await esperarMs(500)
    if (!(await apontarEClicar(porTags, vivo, devagar))) return
    const etiqueta = await achar(() => botaoNoModal(PERFIL.etiquetas[1].nome))
    if (!vivo() || !etiqueta || !(await apontarEClicar(etiqueta, vivo, devagar))) return
    nivelDaCampanha = 2
  }

  // 3 · Variáveis: o nome de cada paciente entra na mensagem.
  if (alvo >= 3 && nivelDaCampanha < 3) {
    const proximo = await achar(() => botaoNoModal('Próximo'))
    if (!vivo() || !proximo || !(await apontarEClicar(proximo, vivo, devagar, false))) return
    nivelDaCampanha = 3
  }

  // 4 · Agendamento: enviar agora.
  if (alvo >= 4 && nivelDaCampanha < 4) {
    const proximo = await achar(() => botaoNoModal('Próximo'))
    if (!vivo() || !proximo || !(await apontarEClicar(proximo, vivo, devagar, false))) return
    // "Enviar agora" já vem marcado: o passo é para ler, o cursor não mexe nele.
    nivelDaCampanha = 4
  }

  // 5 · Revisão: tudo o que foi configurado e a prévia no WhatsApp.
  if (alvo >= 5 && nivelDaCampanha < 5) {
    const proximo = await achar(() => botaoNoModal('Próximo'))
    if (!vivo() || !proximo || !(await apontarEClicar(proximo, vivo, devagar, false))) return
    nivelDaCampanha = 5
    // Na revisão: um tempo para ler o que foi configurado, e o envio.
    if (!devagar) return
    await esperarMs(2600)
    const enviar = await achar(() => botaoNoModal('Criar e enviar'))
    if (!vivo() || !enviar || !(await apontarEClicar(enviar, vivo, true))) return
    // A campanha saiu e o assistente fechou sozinho.
    nivelDaCampanha = 0
    seguirQuadro(null)
    if (!CONDUZIDA) { await esperarMs(600); esconderCursor(); return }
    await achar(() => !modalAberto() || null)
    await esperarMs(450)
    const nome = acharTexto(appDaDemo(), HERO_CAMPANHA_NOME)
    if (!vivo() || !nome) return
    // A campanha que acabou de sair, no topo da lista (no plano geral).
    await moverCursor(nome)
  }
}

function aplicarCampanha(cena: HeroCena) {
  const alvo = CENAS_DA_CAMPANHA[cena]
  if (alvo) void conduzirCampanha(alvo)
  else if (nivelDaCampanha > 0 || modalAberto()) fecharCampanha()
}

// ─── Cenas conduzidas (02/10, PO): o cursor no lugar do holofote ───────────────
//
// No "Como funciona" da home (`cursor=1`), as etapas do agente e do Dashboard
// são navegadas como uma pessoa faria: o cursor clica no menu do app, abre um
// documento, liga um item do catálogo, testa o agente, filtra a fila, atribui
// uma conversa e lê o gráfico. Cada cena do roteiro é um passo; o tempo de cada
// um vem do roteiro (`cuesConduzidas`). Sem zoom (só a criação de campanha
// tem). Tudo o que muda passa pelo app de verdade — o backend de demonstração
// guarda as mudanças até a cena recomeçar.

const CONDUZIDA = new URLSearchParams(location.search).get('cursor') === '1'
const CENAS_NAVEGADAS_PELO_CURSOR = new Set<HeroCena>([
  'agente-conhecimento', 'agente-catalogo', 'agente-teste', 'painel-fila', 'painel-indicadores', 'painel-volume', 'relatorio',
])
let execucaoConduzida = 0
let conduzindo = false

const visivel = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0 }
const appDaDemo = () => document.getElementById('main-content') ?? document.body

/** Um clique de navegação: o cursor anda, um respiro, o clique (sem zoom). */
const clicar = (alvo: HTMLElement, vivo: () => boolean) => apontarEClicar(alvo, vivo, true, false)

/** Um item do menu lateral do agente (Instruções, Conhecimento, Catálogo…). */
const itemDoMenuDoAgente = (nome: string) => [...document.querySelectorAll<HTMLAnchorElement>('a[href*="/agents/"]')]
  .find((a) => visivel(a) && (a.textContent ?? '').trim().startsWith(nome)) ?? null

/** A gaveta do relatório: o elemento fixo que contém o funil. */
function gavetaDoRelatorio(): HTMLElement | null {
  let e: HTMLElement | null = acharTexto(document.body, 'Relatório de desempenho') ?? acharTexto(document.body, 'Funil de engajamento')
  while (e && e !== document.body && getComputedStyle(e).position !== 'fixed') e = e.parentElement
  return e && e !== document.body ? e : null
}

/** Fecha o que o laço anterior deixou aberto (a bancada, um documento). */
function arrumarAgente() {
  document.querySelector<HTMLButtonElement>('button[aria-label="Fechar teste"]')?.click()
  const dialogo = document.querySelector('[role="dialog"]')
  if (dialogo) [...dialogo.querySelectorAll<HTMLButtonElement>('button')].find((b) => (b.textContent ?? '').trim() === 'Fechar')?.click()
}

/** Sobe até o ancestral que também contém o texto (sem diferenciar maiúsculas). */
function caixaCom(e: Element | null, texto: string, max = 9): HTMLElement | null {
  const alvo = texto.toLowerCase()
  let atual = e as HTMLElement | null
  for (let i = 0; i < max && atual; i++) {
    if ((atual.textContent ?? '').toLowerCase().includes(alvo)) return atual
    atual = atual.parentElement
  }
  return null
}


/**
 * A TROCA DE TELA DENTRO DA ETAPA (02/10): o app troca o conteúdo de uma vez,
 * como qualquer app; aqui o conteúdo novo entra subindo 8 px e aparecendo
 * (0,32 s) assim que monta — a troca lê como transição, não como corte.
 */
function entrarConteudo(el: Element | null) {
  if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.7,.3,1)' })
}

/** Como `achar`, mas a cada quadro: a entrada começa no quadro em que o conteúdo monta. */
async function acharNoQuadro<T>(fn: () => T | null | undefined, tetoMs = 3000): Promise<T | null> {
  const inicio = performance.now()
  while (performance.now() - inicio < tetoMs) {
    const x = fn()
    if (x) return x
    await new Promise((r) => requestAnimationFrame(r))
  }
  return null
}

/** Clica num item de navegação e anima a entrada do conteúdo que ele traz. */
async function trocarDeTela(alvo: HTMLElement, vivo: () => boolean, conteudo: () => Element | null) {
  if (!(await apontarEClicar(alvo, vivo, true, false, true))) return false
  entrarConteudo(await acharNoQuadro(conteudo))
  await esperarMs(380)
  return vivo()
}

/** Quanto a câmera leva para assentar num plano (DemoRecorte, conduzida). */
const CAMERA_MS = 1250

/** O plano fechado da conversa na bancada, fixo: da pergunta enviada para
 *  baixo, com a altura medida da conversa inteira (pergunta, resposta e "O que
 *  a IA usou" ≈ 245 px no app de 1024): mais alto, o quadro 4:3 alargava e
 *  pegava o catálogo cortado ao lado. */
const ALTURA_DA_CONVERSA = 262
function planoDaConversa(bancada: Element | null, pergunta: Element | null): Quadro | null {
  const b = quadroDe(bancada)
  const p = quadroDe(pergunta)
  return b && p ? { x: b.x, y: p.y - 10, w: b.w, h: ALTURA_DA_CONVERSA } : null
}

/** O plano fechado da escolha de quem assume: o fim da linha (a espera, os
 *  botões) e o menu "Atribuir a". */
function planoDoMenu(atribuir: Element, menu: Element): Quadro | null {
  const a = quadroDe(atribuir)
  if (!a) return null
  return uniao([{ x: a.x - 360, y: a.y - 16, w: a.w + 360, h: a.h + 32 }, menu])
}

/*
 * O ROTEIRO DE CÂMERA (02/10, PO: "câmera de tripé"). A câmera fica no plano
 * geral e só fecha na prova de cada etapa — um plano fechado por etapa, que
 * fica parado (não acompanha cada mudança de tamanho). Ela só anda quando a
 * mão para, e a mão só volta a andar quando a câmera assentou.
 *  • Ensinar a IA: tudo no geral; fecha na conversa do teste (da pergunta
 *    enviada à resposta e às fontes) e fica até o fim.
 *  • Trazer clientes de volta: a lista e o assistente no geral; fecha na gaveta
 *    do relatório (o funil e, na mesma moldura, as respostas) e fica.
 *  • Acompanhar os resultados: no geral; um plano de detalhe na escolha de
 *    quem assume a conversa, e volta ao geral para mostrar a fila sem ela.
 */
const PASSOS_DO_CURSOR: Partial<Record<HeroCena, (vivo: () => boolean) => Promise<unknown>>> = {
  // ── Ensinar a IA ────────────────────────────────────────────────────────────
  // 1 · A página do agente; o cursor para na regra de só usar o catálogo e a base.
  'agente-instrucoes': async (vivo) => {
    reiniciarInteracoesDemo()
    filmar()
    arrumarAgente()
    await esperarMs(1300)
    const regra = await achar(() => acharTexto(appDaDemo(), 'Use só valores e condições'))
    if (!vivo() || !regra) return
    await moverCursor(regra)
  },

  // 2 · Conhecimento: abre o documento dos convênios, lê, fecha.
  'agente-conhecimento': async (vivo) => {
    const menu = await achar(() => itemDoMenuDoAgente('Conhecimento'))
    const secaoConhecimento = () => caixaCom(acharTexto(appDaDemo(), 'Documentos e textos'), PERFIL.sinais.conhecimento)
    if (!vivo() || !menu || !(await trocarDeTela(menu, vivo, secaoConhecimento))) return
    const abrir = await achar(() => {
      const nome = acharTexto(appDaDemo(), PERFIL.sinais.conhecimento)
      let caixa: HTMLElement | null = nome
      for (let i = 0; i < 6 && caixa; i++) {
        const b = [...caixa.querySelectorAll<HTMLButtonElement>('button')].find((x) => (x.textContent ?? '').trim() === 'Abrir')
        if (b) return b
        caixa = caixa.parentElement
      }
      return null
    })
    if (!vivo() || !abrir) return
    await esperarMs(700)
    if (!(await clicar(abrir, vivo))) return
    const dialogo = await achar(() => document.querySelector<HTMLElement>('[role="dialog"]'))
    if (!vivo() || !dialogo) return
    await esperarMs(500)
    const corpo = acharTexto(dialogo, PERFIL.sinais.conhecimento.slice(0, 8))
    if (corpo) await moverCursor(corpo)
    await esperarMs(1900)
    const fechar = [...dialogo.querySelectorAll<HTMLButtonElement>('button')].find((b) => (b.textContent ?? '').trim() === 'Fechar')
    if (!vivo() || !fechar) return
    await clicar(fechar, vivo)
  },

  // 3 · Catálogo: liga o item que estava fora — ele sobe para "Ativos".
  'agente-catalogo': async (vivo) => {
    const menu = await achar(() => itemDoMenuDoAgente('Catálogo'))
    const secaoCatalogo = () => caixaCom(acharTexto(appDaDemo(), 'Produtos, serviços e profissionais'), 'Ativos no agente')
    if (!vivo() || !menu || !(await trocarDeTela(menu, vivo, secaoCatalogo))) return
    const chave = await achar(() => [...appDaDemo().querySelectorAll<HTMLButtonElement>('button[role="switch"][aria-checked="false"]')].find(visivel))
    if (!vivo() || !chave) return
    await esperarMs(900)
    await clicar(chave, vivo)
  },

  // 4 · O teste — o plano fechado da etapa. A pergunta é sobre o item que
  // acabou de ser liberado; enviada (a mão parou), a câmera fecha na conversa
  // e fica: o "escrevendo", a resposta com o preço, as fontes.
  'agente-teste': async (vivo) => {
    if (document.querySelector('textarea[aria-label="Mensagem do cliente"]')) return
    const testar = await achar(() => [...document.querySelectorAll<HTMLButtonElement>('button')].find((b) => visivel(b) && (b.textContent ?? '').trim() === 'Testar'))
    if (!vivo() || !testar || !(await clicar(testar, vivo))) return
    const caixa = await achar(() => document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Mensagem do cliente"]'))
    if (!vivo() || !caixa) return
    const teste = PERFIL.testeDoAgente
    await esperarMs(700)
    await moverCursor(caixa)
    pulsoDoClique()
    await digitar(caixa, teste?.pergunta ?? PERFIL.mensagens.demanda, vivo, true, teste ? 62 : 38)
    if (!vivo()) return
    const enviar = await achar(() => document.querySelector<HTMLButtonElement>('button[aria-label="Enviar"]:not([disabled])'))
    if (!vivo() || !enviar) return
    await esperarMs(350)
    if (!(await clicar(enviar, vivo))) return
    caixa.style.height = ''
    const bancada = document.querySelector('[aria-label="Teste ao vivo"]')
    const pergunta = await achar(() => bancada?.querySelector('[aria-live="polite"]')?.querySelector('[class*="rounded-br-xs"]') ?? null)
    if (!vivo() || !pergunta) return
    filmar(planoDaConversa(bancada, pergunta))
    await esperarMs(CAMERA_MS)
    const fontes = await achar(() => acharTexto(bancada ?? document.body, 'O que a IA usou'), 6000)
    if (!vivo() || !fontes) return
    await esperarMs(1200)
    await moverCursor(acharTexto(fontes.parentElement ?? fontes, 'Consultou') ?? fontes)
  },

  // ── Trazer clientes de volta: o resultado ───────────────────────────────────
  // No geral, o cursor abre o relatório da campanha que acabou de sair. Com a
  // gaveta assentada (a mão parada), a câmera fecha no alto dela e fica: o
  // funil, e depois — na mesma moldura — quem respondeu.
  relatorio: async (vivo) => {
    await esperarMs(600)
    const ver = await achar(() => [...document.querySelectorAll<HTMLButtonElement>('button, a')].find((b) => visivel(b) && (b.textContent ?? '').trim().startsWith('Ver relatório')) as HTMLButtonElement | undefined)
    if (!vivo()) return
    if (ver) { if (!(await clicar(ver, vivo))) return }
    else (window as unknown as Janela).__demoNavegar?.(HERO_ROTAS.relatorio)
    const gaveta = await achar(gavetaDoRelatorio, 4000)
    if (!vivo() || !gaveta) return
    await esperarMs(650)
    const g = quadroDe(gaveta)
    if (g) filmar({ x: g.x, y: g.y, w: g.w, h: Math.min(g.h, g.w * 0.75) })
    await esperarMs(CAMERA_MS)
    if (!vivo()) return
    const funil = caixaCom(acharTexto(gaveta, 'Funil de engajamento'), 'Falharam')
    const responderam = funil ? acharTexto(funil, 'Responderam') : null
    if (responderam) await moverCursor(responderam)
    await esperarMs(1500)
    const aba = [...gaveta.querySelectorAll<HTMLElement>('button, [role="tab"]')].find((b) => (b.textContent ?? '').trim().startsWith('Respostas'))
    if (!vivo() || !aba || !(await clicar(aba, vivo))) return
    const quem = await achar(() => acharTexto(gavetaDoRelatorio() ?? document.body, PERFIL.pessoa.nome))
    if (!vivo() || !quem) return
    await esperarMs(400)
    await moverCursor(quem)
  },

  // ── Acompanhar os resultados ────────────────────────────────────────────────
  // 1 · O Dashboard ao vivo; o cursor chega em quem está esperando.
  painel: async (vivo) => {
    reiniciarInteracoesDemo()
    filmar()
    await esperarMs(1300)
    const esperando = await achar(() => botao('Esperando alguém'))
    if (!vivo() || !esperando) return
    await moverCursor(esperando)
  },

  // 2 · A fila: filtra quem está sem dono e abre "Atribuir". Com o menu aberto
  // (a mão parada), um plano de detalhe na escolha; escolhido o Bruno, volta
  // ao geral — a fila sem a conversa.
  'painel-fila': async (vivo) => {
    const semDono = await achar(() => botao('Sem dono'))
    if (!vivo() || !semDono || !(await clicar(semDono, vivo))) return
    await esperarMs(900)
    const atribuir = await achar(() => [...document.querySelectorAll<HTMLButtonElement>('button[aria-label^="Atribuir a conversa com"]')].find(visivel))
    if (!vivo() || !atribuir || !(await clicar(atribuir, vivo))) return
    const menu = await achar(() => [...document.querySelectorAll('p')].find((p) => (p.textContent ?? '').trim() === 'Atribuir a')?.parentElement ?? null)
    if (!vivo() || !menu) return
    filmar(planoDoMenu(atribuir, menu))
    await esperarMs(CAMERA_MS)
    const pessoa = [...menu.querySelectorAll<HTMLElement>('button, [role="menuitem"]')].find((b) => visivel(b) && (b.textContent ?? '').includes('Bruno'))
    if (!vivo() || !pessoa || !(await clicar(pessoa, vivo))) return
    await esperarMs(500)
    filmar()
  },

  // 3 · Relatórios: os indicadores; o cursor para na taxa de resolução.
  'painel-indicadores': async (vivo) => {
    const aba = await achar(() => [...document.querySelectorAll<HTMLElement>('[role="tab"]')].find((b) => (b.textContent ?? '').trim() === 'Relatórios'))
    const indicadores = () => caixaCom(acharTexto(appDaDemo(), 'Conversas Ativas'), 'Volume de Mensagens')
    if (!vivo() || !aba || !(await trocarDeTela(aba, vivo, indicadores))) return
    const taxa = await achar(() => acharTexto(appDaDemo(), 'Taxa de Resolução'))
    if (!vivo() || !taxa) return
    await esperarMs(500)
    await moverCursor(taxa)
  },

  // 4 · O volume da semana: o cursor percorre as barras e a dica mostra os
  // números de cada dia.
  'painel-volume': async (vivo) => {
    const grafico = await achar(() => {
      const titulo = acharTexto(appDaDemo(), 'Volume de Mensagens')
      let caixa: HTMLElement | null = titulo
      for (let i = 0; i < 6 && caixa; i++) {
        const w = caixa.querySelector<HTMLElement>('.recharts-wrapper')
        if (w) return w
        caixa = caixa.parentElement
      }
      return null
    })
    if (!vivo() || !grafico) return
    const barras = [...grafico.querySelectorAll('.recharts-bar-rectangle')].map((b) => b.getBoundingClientRect()).filter((r) => r.width > 0)
    const xs = [...new Set(barras.map((r) => Math.round(r.left + r.width / 2)))].sort((a, b) => a - b)
    const area = grafico.getBoundingClientRect()
    const y = area.top + area.height * 0.55
    const pairar = (x: number) => {
      for (const tipo of ['mouseover', 'mousemove']) grafico.dispatchEvent(new MouseEvent(tipo, { bubbles: true, clientX: x, clientY: y, view: window }))
    }
    // Três dias, do meio para o mais recente.
    for (const x of [xs[Math.max(0, xs.length - 5)], xs[Math.max(0, xs.length - 3)], xs[xs.length - 1]].filter((v) => v !== undefined)) {
      await moverCursorPara(x, y)
      if (!vivo()) return
      pairar(x)
      await esperarMs(1400)
      if (!vivo()) return
    }
  },
}

function aplicarConduzida(cena: HeroCena) {
  const passo = CONDUZIDA ? PASSOS_DO_CURSOR[cena] : undefined
  const execucao = ++execucaoConduzida
  if (passo) {
    conduzindo = true
    void passo(() => execucao === execucaoConduzida)
    return
  }
  // Saiu das cenas conduzidas: o cursor some (a campanha traz o dela).
  if (conduzindo) {
    conduzindo = false
    seguirQuadro(null)
    if (!CENAS_DA_CAMPANHA[cena]) esconderCursor()
  }
}
