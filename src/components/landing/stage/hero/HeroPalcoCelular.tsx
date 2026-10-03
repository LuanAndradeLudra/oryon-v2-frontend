import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DemoRecorte, type Recorte } from '../../plataforma/DemoRecorte'
import { HeroCapitulosLinha } from './HeroCapitulosLinha'
import { HeroNarracao } from './HeroNarracao'
import {
  HERO_CAPITULOS, HERO_ROTAS, HERO_TAIL_MS, batidaCurtaDe,
  type HeroCapitulo, type HeroCapituloId, type HeroCena, type HeroState,
} from './heroStory'
import type { HeroCue } from './useHeroTimeline'

/**
 * O PALCO DO HERO NO CELULAR (02/10, PO) — o mesmo padrão da página /solucoes:
 * o app no layout de COMPUTADOR, numa moldura de proporção fixa (4:3), com
 * uma câmera que só aproxima no que, no desktop, surge como janela satélite.
 * Substitui o app de celular, que só mostrava a conversa e a ficha do
 * negócio; agora a história é a mesma do
 * desktop: a conversa, a ficha do contato, o funil, o sino e o relatório.
 *
 * As janelas satélite do desktop não cabem no celular: o detalhe que elas
 * mostram (a atividade do contato, as notificações) aparece no próprio app,
 * com a câmera (a moldura em modo `camera`, que liga o `detalhe` do diretor:
 * o painel do contato rola até a Timeline e o sino abre).
 *
 * A história, a narração e os capítulos são os do desktop (`heroStory.ts`);
 * o RITMO é próprio (02/10, PO): no celular a tela é pequena, então cada
 * mensagem tem o mesmo intervalo e um zoom curto nela antes de a câmera voltar.
 */

/**
 * A direção (02/10, PO): a tela inteira o tempo todo — a conversa, o funil e o
 * relatório se leem com o holofote (o contorno no alvo), sem zoom. A câmera
 * só aproxima no que, no desktop, é uma janela satélite que surge: a
 * atividade do contato (a Timeline, com o painel rolado até ela) e as
 * notificações (o sino aberto). Regiões em 4:3, medidas no app de
 * computador desenhado em 1024 × 768: a moldura nunca muda de tamanho.
 */
/**
 * A JANELA (02/10, PO): a mesma do "Como funciona" no celular — o app desenhado
 * numa tela de 1024 × 768 e a moldura em 4:3, um terço mais alta que a 16:9 e
 * com o texto 25% maior, sem corte. As regiões são nessa medida e mantêm a
 * força de zoom de antes (2× nas janelas satélite, 1,5× na mensagem e no card).
 */
const APP_DO_HERO = { w: 1024, h: 768 }
const APP_INTEIRO: Recorte = { x: 0, y: 0, ...APP_DO_HERO }
/** A Timeline no painel do contato (à direita, embaixo). */
const R_TIMELINE: Recorte = { x: 512, y: 384, w: 512, h: 384 }
/** O sino aberto, no alto à direita. */
const R_NOTIFICACOES: Recorte = { x: 512, y: 28, w: 512, h: 384 }
/** O zoom leve em cada mensagem (1,5×): a coluna da conversa, com a mensagem
 *  mais nova — que entra embaixo — à vista. */
const R_MENSAGEM: Recorte = { x: 202, y: 216, w: 683, h: 512 }
/** O mesmo zoom leve no card do negócio, no funil: as colunas Avaliação e
 *  Agendado, com o card antes e depois de a IA avançá-lo. */
const R_NEGOCIO: Recorte = { x: 212, y: 90, w: 683, h: 512 }
/** Quanto o zoom leve (mensagem ou card) fica no ar antes de a câmera voltar. */
const ZOOM_MENSAGEM_MS = 3000

/** Os passos em que chega uma mensagem na conversa. */
const MENSAGENS = new Set<HeroState>(['inicio', 'demanda', 'resposta', 'confirma', 'pedido', 'humano'])

/**
 * O ROTEIRO DO CELULAR — os mesmos passos do desktop, num ritmo mais calmo e
 * regular: uma mensagem a cada 6 s (a resposta da IA, mais longa, ganha 8 s
 * de leitura), e as mudanças fora da conversa com o mesmo fôlego.
 */
type Cue = HeroCue<HeroState, HeroCena>
const S = (t: number, state: HeroState): Cue => ({ t, state })
const PASSO = 6000
const CUES: readonly Cue[] = [
  { t: 0, state: 'inicio', composition: 'conversa' },
  S(PASSO, 'demanda'),
  S(PASSO * 2, 'resposta'),
  S(PASSO * 2 + 8000, 'confirma'),
  S(PASSO * 3 + 8000, 'situacao'),
  S(PASSO * 4 + 8000, 'etiqueta'),
  { t: PASSO * 5 + 8000, composition: 'funil' },
  S(PASSO * 5 + 11000, 'avanco'),
  { t: PASSO * 6 + 11000, composition: 'conversa' },
  S(PASSO * 6 + 12500, 'pedido'),
  S(PASSO * 7 + 12500, 'assumido'),
  // A transferência com a mão (02/10, PO): o cursor clica no aviso e em
  // "Assumir"; a recepção entra logo depois do segundo clique (3 s depois do
  // aviso) e a mensagem dela fica o tempo que sobra até o "ganho".
  S(PASSO * 7 + 15500, 'humano'),
  S(PASSO * 9 + 12500, 'ganho'),
  { t: PASSO * 10 + 12500, composition: 'relatorio' },
  // O relatório fica 14 s (a gaveta leva um instante para abrir e os números
  // precisam de leitura); o fim do laço escurece com calma antes de recomeçar.
  { t: PASSO * 10 + 26500, composition: 'reinicio' },
  { t: PASSO * 10 + 28500, composition: 'reinicio' },
]
const indice = (pred: (c: Cue) => boolean) => CUES.findIndex(pred)
/** Sem movimento: o funil logo depois de a IA avançar o negócio (como no desktop). */
const QUADRO_PARADO = indice((c) => c.state === 'avanco')

/** Os quatro capítulos do desktop, apontando para os passos deste roteiro. */
const CAPITULOS: readonly HeroCapitulo[] = HERO_CAPITULOS.map((c) => ({
  ...c,
  cue: c.id === 'atendimento' ? 0
    : c.id === 'funil' ? indice((x) => x.composition === 'funil')
    : c.id === 'equipe' ? indice((x) => x.state === 'pedido') - 1
    : indice((x) => x.composition === 'relatorio'),
}))

/** Onde começa cada capítulo depois do primeiro (o fim do laço já tem a cortina). */
const CORTES = new Set(CAPITULOS.slice(1).map((c) => c.cue))
/** Quanto antes do corte a tela começa a escurecer. */
const VEU_ANTES_MS = 800

function capituloDe(cena: HeroCena, index: number): HeroCapituloId {
  if (cena === 'disparos' || cena === 'relatorio' || cena === 'reinicio') return 'disparos'
  if (cena === 'funil') return 'funil'
  return index >= CAPITULOS[2].cue ? 'equipe' : 'atendimento'
}

function regiaoDe(estado: HeroState, cena: HeroCena, zoomMensagem: boolean): Recorte {
  if (cena === 'funil') return zoomMensagem ? R_NEGOCIO : APP_INTEIRO
  if (cena !== 'conversa') return APP_INTEIRO
  if (estado === 'situacao' || estado === 'etiqueta') return R_TIMELINE
  if (estado === 'assumido') return R_NOTIFICACOES
  if (zoomMensagem && MENSAGENS.has(estado)) return R_MENSAGEM
  return APP_INTEIRO
}

export function HeroPalcoCelular({ className }: { className?: string }) {
  const semMovimento = useReducedMotion()
  const pilulaRef = useRef<HTMLDivElement>(null)
  const [pausado, setPausado] = useState(false)
  const [passo, setPasso] = useState<{ estado: HeroState; cena: HeroCena; indice: number }>({ estado: 'inicio', cena: 'conversa', indice: 0 })
  const [rodando, setRodando] = useState(false)
  // Cada mensagem nova: um zoom leve nela por alguns segundos, e a câmera volta.
  const [zoomPasso, setZoomPasso] = useState<number | null>(null)
  const aoPassar = useCallback((estado: HeroState, cena: HeroCena, indice: number) => {
    setPasso({ estado, cena, indice })
    setRodando(true)
    // E no funil: quando ele abre e quando a IA avança o negócio.
    setZoomPasso((cena === 'conversa' && MENSAGENS.has(estado)) || cena === 'funil' ? indice : null)
  }, [])
  useEffect(() => {
    if (zoomPasso === null) return
    const id = window.setTimeout(() => setZoomPasso(null), ZOOM_MENSAGEM_MS)
    return () => window.clearTimeout(id)
  }, [zoomPasso])
  const zoomMensagem = zoomPasso !== null && !semMovimento

  /*
   * O VÉU ENTRE OS CAPÍTULOS (02/10, PO): como no "Como funciona", a tela
   * escurece devagar no fim de cada capítulo (os últimos 800 ms) e clareia
   * devagar depois que o próximo começa — a troca de tela acontece no escuro.
   */
  const [veuCapitulo, setVeuCapitulo] = useState(false)
  useEffect(() => {
    if (semMovimento || pausado || !rodando) return
    const i = passo.indice
    if (CORTES.has(i)) {
      // Começou um capítulo: clareia quando a tela nova assentou.
      const id = window.setTimeout(() => setVeuCapitulo(false), 650)
      return () => window.clearTimeout(id)
    }
    const proximo = CUES[i + 1]
    if (!proximo || !CORTES.has(i + 1)) return
    const id = window.setTimeout(() => setVeuCapitulo(true), Math.max(0, proximo.t - CUES[i].t - VEU_ANTES_MS))
    return () => window.clearTimeout(id)
  }, [passo.indice, pausado, rodando, semMovimento])

  // Os capítulos embaixo, como no desktop: clicar pula a história para ele.
  const duracoes = useMemo(() => {
    const fim = (CUES[CUES.length - 1]?.t ?? 0) + HERO_TAIL_MS
    const out = {} as Record<HeroCapituloId, number>
    CAPITULOS.forEach((c, i) => {
      const proximo = CAPITULOS[i + 1]
      out[c.id] = (proximo ? CUES[proximo.cue].t : fim) - CUES[c.cue].t
    })
    return out
  }, [])
  const capitulo = capituloDe(passo.cena, passo.indice)
  const [salto, setSalto] = useState<{ indice: number }>()
  const [saltos, setSaltos] = useState(0)
  const irParaCapitulo = (c: HeroCapitulo) => {
    setSalto({ indice: c.cue })
    setSaltos((n) => n + 1)
    setPausado(false)
  }

  return (
    <div className={cn('relative w-full', className)}>
      <HeroNarracao pilulaRef={pilulaRef} texto={batidaCurtaDe(passo.estado, passo.cena)} className="relative z-[45] mb-[var(--hero-gap-palco,16px)] px-1" />
      <div
        role="img"
        aria-label="Demonstração da Oryon: uma campanha chega no WhatsApp de uma cliente, o Agente IA atende, atualiza o contato e avança o negócio no funil, e uma atendente assume e fecha a venda."
      >
        <DemoRecorte
          layoutDesktop
          camera
          tamanhoDoApp={APP_DO_HERO}
          cursorNaPassagem
          anotacaoRef={pilulaRef}
          veuDoCapitulo={veuCapitulo && !pausado && !semMovimento}
          titulo="Telas reais da Oryon · dados de exemplo"
          acoesDaMoldura={!semMovimento && (
            <button
              type="button"
              onClick={() => setPausado((p) => !p)}
              aria-label={pausado ? 'Retomar a demonstração' : 'Pausar a demonstração'}
              className="pointer-events-auto -mr-1 rounded-md p-1 text-[var(--bandeja-titulo)] transition-colors hover:text-surface-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-btn-primary-bg)]"
            >
              {pausado ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
          )}
          manterMontado
          rota={HERO_ROTAS.conversa}
          estado="inicio"
          cues={CUES}
          quadroParado={QUADRO_PARADO}
          recorte={regiaoDe(passo.estado, passo.cena, zoomMensagem)}
          pausado={pausado}
          onPasso={aoPassar}
          salto={salto}
        />
      </div>
      <div className="relative mt-3.5 flex flex-col gap-2 px-1">
        <HeroCapitulosLinha
          capitulos={CAPITULOS}
          ativo={capitulo}
          duracoes={duracoes}
          rodando={rodando && !pausado && !semMovimento}
          chaveProgresso={`${capitulo}-${saltos}`}
          onIr={irParaCapitulo}
        />
      </div>
    </div>
  )
}
