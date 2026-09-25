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
  HERO_USER, heroContact, heroConversation, heroDeal, heroMessages, heroNotifications, reached,
} from '@/components/landing/stage/hero/heroRealData'
import { HERO_ROTAS, type HeroCena, type HeroState } from '@/components/landing/stage/hero/heroStory'

export const CANAL = 'oryon-hero'

export type MensagemParaDemo =
  | { canal: typeof CANAL; tipo: 'passo'; estado: HeroState; cena: HeroCena }
  | { canal: typeof CANAL; tipo: 'tema'; tema: 'dark' | 'light' }
export type MensagemDaDemo =
  | { canal: typeof CANAL; tipo: 'pronta' }
  | { canal: typeof CANAL; tipo: 'rota'; rota: string }

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
 *    negócio. Nas cenas de Disparos e Agentes ele fica onde está (`null` = não
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
  definirEstado(estado)
  if (!recomeco && de !== estado) emitirTransicao(de, estado)

  if (cena !== cenaAtual) {
    cenaAtual = cena
    if (cena !== 'reinicio') {
      const rota = rotaDa(cena)
      if (rota) {
        const w = window as unknown as Janela
        w.__demoFecharPainel?.()
        w.__demoNavegar?.(rota)
        avisarPai({ canal: CANAL, tipo: 'rota', rota })
      }
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
