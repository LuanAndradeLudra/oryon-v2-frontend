/**
 * A COMPOSIÇÃO do palco — onde cada janela está, em cada momento.
 *
 * Substitui o "mundo panorâmico com câmera" da versão anterior, que o PO
 * rejeitou por razões estruturais, não de acabamento:
 *
 *  • Conversas e Funis dividiam UMA moldura, então pareciam a mesma janela do
 *    mesmo navegador;
 *  • o funil sobrava nas laterais da conversa como conteúdo colateral cortado;
 *  • o mesmo `overflow-hidden` recortava as duas telas;
 *  • para destacar uma região era preciso ampliar o plano inteiro, chegando a
 *    escalas agressivas que borravam o texto;
 *  • o card parecia atravessar para dentro da tela errada.
 *
 * Aqui cada superfície é um OBJETO VISUAL COMPLETO: moldura própria, recorte
 * próprio, sombra própria, dimensão própria. O palco só decide posição,
 * escala, opacidade e ordem de camadas. Uma janela pode recuar sem levar seu
 * conteúdo para dentro de outra, porque nunca esteve dentro de outra.
 *
 * As coordenadas são de uma TELA DE COMPOSIÇÃO fixa (`CANVAS`), não do
 * viewport: o palco recebe um único fator para caber na moldura externa. Assim
 * as escalas por janela ficam entre 0,6 e 1,0 — moderadas, aplicadas a objetos
 * inteiros — e a mesma composição vale em qualquer largura, sem tabela de
 * coordenadas por resolução.
 *
 * REGRA DURA desta tabela: toda janela VISÍVEL cabe inteira dentro do canvas.
 * Nenhuma pode ser cortada pela borda do palco — recuar é ficar menor e mais
 * apagada, nunca ser cortada por acidente. Os números abaixo estão escritos
 * com a conta ao lado justamente para essa verificação ser possível a olho.
 */

/**
 * O canvas é DEITADO (2,64:1) de propósito. Medido em tela: o palco da home
 * fica entre 380 e 600px de altura conforme a janela, e um canvas de 536
 * forçava o fator de ajuste a 0,71 — janelas a 71 %, texto de 9px, e as bordas
 * de cima e de baixo estourando o palco em 24px. Com 470, o mesmo palco baixo
 * ajusta em 0,81 e um notebook comum fica perto de 1:1.
 */
export const CANVAS = { w: 1240, h: 500 }

/**
 * Tamanhos próprios de cada janela.
 *
 * A conversa tem DOIS formatos, e isso não é um atalho de animação: é o que
 * permite uma composição dividida continuar legível. O formato `full` é a tela
 * de Conversas com a lista ao lado — a janela que domina o palco. O formato
 * `chat` é um RECORTE relevante da mesma tela (só a conversa, sem a lista),
 * para quando ela divide o espaço com o funil. Encolher a janela `full` até
 * caber ao lado do funil daria 63 % de escala e texto de 8px.
 */
/**
 * A coluna da conversa tem a MESMA largura (604) e a MESMA altura (446) nos
 * dois formatos. Isso não é detalhe: com 576 no recorte e 604 no formato
 * cheio, trocar de formato reescrevia a quebra de linha de TODAS as bolhas —
 * a conversa "saltava" no meio da cena. O que muda entre os dois é só a
 * presença da lista (300px) ao lado.
 */
export const WIN = {
  // 964 = lista 360 (a medida real, `sm:w-[360px]`) + chat 604.
  conversaFull: { w: 964, h: 446 },
  conversaChat: { w: 604, h: 446 },
  lista: 360,
  chat: 604,
  /**
   * 316×470, não 404 de altura. Medido: com 404 o painel cortava a seção de
   * NEGÓCIOS e o resumo da IA abaixo da dobra da própria janela — a narrativa
   * anunciava um resultado que o visitante não via. A ficha é a superfície mais
   * densa da história e precisa da altura inteira do palco.
   */
  contato: { w: 316, h: 470 },
  // Mais alta que as outras: a janela do Funil carrega a barra do funil e a
  // faixa de contexto da tela real, além das colunas.
  funil: { w: 808, h: 446 },
} as const

export type HeroWindowKey = 'conversa' | 'contato' | 'funil'
export type ConversaVariant = 'full' | 'chat'

export interface WindowPose {
  visible: boolean
  /** Canto superior esquerdo, em coordenadas da composição. */
  x: number
  y: number
  scale: number
  opacity: number
  z: number
  /** Só para a conversa: qual dos dois formatos da janela está em cena. */
  variant?: ConversaVariant
}

/**
 * A CÂMERA — a terceira camada, separada das janelas.
 *
 * Move e aproxima o PALCO inteiro sem tocar na geometria interna de nenhuma
 * superfície: é `translate3d` + `scale` num invólucro, nunca `top`/`left`, e
 * nunca uma animação de layout. Por isso o conteúdo das janelas não reflui
 * quando a câmera anda.
 *
 * Os valores são discretos de propósito. A escala aqui é PROFUNDIDADE, não
 * solução de layout: quem resolve tamanho é a composição. O teto de 1,05 está
 * coberto pela margem de segurança do fator de ajuste do palco.
 */
export interface CameraPose { x: number; y: number; scale: number }

/**
 * ENQUADRAMENTO POR RECURSO.
 *
 * Em vez de `x`/`y` escritos à mão, a tomada declara O QUE está enquadrando e
 * quanto aproxima; o deslocamento é CALCULADO a partir da geometria da janela
 * em foco (`cameraPara`). Foi a correção do item que ficava: coordenadas soltas
 * não têm relação com o elemento demonstrado e quebram quando uma pose muda.
 *
 * Sem `focus`, a câmera fica no centro da composição — é o que se quer nas
 * tomadas de relação, em que duas janelas dividem a atenção.
 */
export interface CameraShot { focus?: HeroWindowKey; zoom?: number }

/** Traduz um enquadramento em transformação da câmera. */
export function cameraPara(
  shot: CameraShot | undefined,
  comp: HeroComposition,
  tamanhos: { conversaFull: { w: number; h: number }; conversaChat: { w: number; h: number }; contato: { w: number; h: number }; funil: { w: number; h: number } },
  canvas: { w: number; h: number },
): CameraPose {
  const zoom = shot?.zoom ?? 1
  if (!shot?.focus) return { x: 0, y: 0, scale: zoom }
  const pose = comp[shot.focus]
  const t = shot.focus === 'conversa'
    ? (pose.variant === 'chat' ? tamanhos.conversaChat : tamanhos.conversaFull)
    : shot.focus === 'contato' ? tamanhos.contato : tamanhos.funil
  // Centro da janela em foco, em coordenadas da composição.
  const cx = pose.x + (t.w * pose.scale) / 2
  const cy = pose.y + (t.h * pose.scale) / 2
  // A câmera escala em torno do centro do canvas; trazer um ponto ao centro é
  // deslocá-lo pelo inverso da distância, já na escala aplicada.
  return { x: -(cx - canvas.w / 2) * zoom, y: -(cy - canvas.h / 2) * zoom, scale: zoom }
}

export const CAMERA_MAX = 1.05

export type HeroComposition = Record<HeroWindowKey, WindowPose> & { camera?: CameraPose; shot?: CameraShot }

export type HeroCompositionKey =
  | 'abertura'
  | 'conversa'
  | 'contato'
  | 'ponte'
  | 'funil'
  | 'handoff'
  | 'fecho'
  | 'reinicio'

const FORA = (x: number, y: number, variant?: ConversaVariant): WindowPose =>
  ({ visible: false, x, y, scale: 0.92, opacity: 0, z: 0, variant })

/**
 * Os estados não são slides: são configurações espaciais por onde a composição
 * passa. Uma janela domina por vez; as outras recuam em escala e opacidade. E
 * a composição precisa se sustentar CONGELADA — se o quadro parado já confunde,
 * nenhum easing resolve.
 */
export const HERO_COMPOSITIONS: Record<HeroCompositionKey, HeroComposition> = {
  // 964×0,98 = 945 (148 → 1093) · 446×0,98 = 437 (20 → 457)
  abertura: {
    conversa: { visible: true, x: 148, y: 20, scale: 0.98, opacity: 1, z: 30, variant: 'full' },
    contato: FORA(940, 60),
    funil: FORA(1240, 70),
    camera: { x: 0, y: 0, scale: 1 },
    shot: { focus: 'conversa', zoom: 1 },
  },

  // 964 (138 → 1102) · 446 (16 → 462)
  conversa: {
    conversa: { visible: true, x: 138, y: 16, scale: 1, opacity: 1, z: 30, variant: 'full' },
    contato: FORA(940, 60),
    funil: FORA(1240, 70),
    camera: { x: 0, y: -6, scale: 1.04 },
    shot: { focus: 'conversa', zoom: 1.04 },
  },

  // conversa 964×0,90 = 868 (10 → 878) · 401 (18 → 419)
  // contato 316×0,95 = 300 (920 → 1220) · 470×0,95 = 447 (26 → 473)
  contato: {
    conversa: { visible: true, x: 10, y: 18, scale: 0.9, opacity: 1, z: 20, variant: 'full' },
    contato: { visible: true, x: 920, y: 26, scale: 0.95, opacity: 1, z: 40 },
    funil: FORA(1240, 70),
    camera: { x: -18, y: -4, scale: 1.02 },
    shot: { focus: 'contato', zoom: 1.02 },
  },

  // conversa 604×0,86 = 519 (18 → 537) · 384 (56 → 440)
  // funil 808×0,84 = 679 (556 → 1235) · 375 (66 → 441)
  ponte: {
    conversa: { visible: true, x: 18, y: 56, scale: 0.86, opacity: 1, z: 20, variant: 'chat' },
    contato: FORA(520, 50),
    funil: { visible: true, x: 556, y: 66, scale: 0.84, opacity: 1, z: 30 },
    camera: { x: 0, y: 0, scale: 1 },
    shot: { zoom: 1 },
  },

  // conversa 604×0,62 = 374 (14 → 388) · 276 (112 → 388)
  // funil 808×0,98 = 792 (436 → 1228) · 437 (32 → 469)
  funil: {
    conversa: { visible: true, x: 14, y: 112, scale: 0.62, opacity: 0.5, z: 10, variant: 'chat' },
    contato: FORA(520, 50),
    funil: { visible: true, x: 436, y: 32, scale: 0.98, opacity: 1, z: 40 },
    camera: { x: -34, y: -6, scale: 1.05 },
    shot: { focus: 'funil', zoom: 1.04 },
  },

  // conversa 964 (138 → 1102) · 446 (16 → 462)
  // funil 808×0,58 = 469 (760 → 1229) · 259 (228 → 487)
  handoff: {
    conversa: { visible: true, x: 138, y: 16, scale: 1, opacity: 1, z: 40, variant: 'full' },
    contato: FORA(940, 60),
    funil: { visible: true, x: 760, y: 228, scale: 0.58, opacity: 0.45, z: 10 },
    camera: { x: 16, y: -4, scale: 1.03 },
    shot: { focus: 'conversa', zoom: 1.03 },
  },

  // conversa 604×0,78 = 471 (16 → 487) · 348 (74 → 422)
  // funil 808×0,88 = 711 (512 → 1223) · 392 (70 → 462)
  fecho: {
    conversa: { visible: true, x: 16, y: 74, scale: 0.78, opacity: 1, z: 25, variant: 'chat' },
    contato: FORA(520, 50),
    funil: { visible: true, x: 512, y: 70, scale: 0.88, opacity: 1, z: 20 },
    camera: { x: 0, y: 2, scale: 0.99 },
    shot: { zoom: 0.99 },
  },
  /**
   * REINÍCIO — o palco vazio por um instante, antes do laço voltar ao começo.
   *
   * Sem ele, a volta ao primeiro estado acontecia à vista: as mensagens
   * sumiam, a etiqueta era removida e o card voltava de Proposta para
   * Qualificação, como se o produto estivesse desfazendo o que acabou de
   * fazer. Aqui as janelas saem juntas, os dados se recompõem fora de cena, e
   * a demonstração recomeça como uma repetição deliberada.
   */
  reinicio: {
    conversa: { ...FORA(16, 74, 'chat'), scale: 0.96 },
    contato: FORA(520, 50),
    funil: { ...FORA(512, 70), scale: 0.96 },
    camera: { x: 0, y: 0, scale: 1 },
    shot: { zoom: 1 },
  },

}

/**
 * REGIME DE UMA JANELA POR VEZ — notebook estreito, largura intermediária e
 * celular.
 *
 * Não é a composição do desktop encolhida: é outra direção. O PO foi explícito
 * ("não reduzir o board desktop inteiro", "não deixar fragmentos laterais"), e
 * miniaturizar duas janelas para caber em 900px produz exatamente o texto de
 * 8px que ele recusou. Aqui a história continua a mesma; o que muda é que cada
 * momento tem UMA superfície dominante, e a continuidade vem da troca entre
 * elas.
 *
 * A tabela é derivada, não escrita à mão, para não haver três lugares onde
 * esquecer de atualizar um arranjo.
 */
type Tam = { w: number; h: number }
function soloTable(canvas: Tam, win: { conversaFull: Tam; conversaChat: Tam; contato: Tam; funil: Tam }) {
  const centro = (t: Tam, escala = 1): { x: number; y: number } => ({
    x: Math.round((canvas.w - t.w * escala) / 2),
    y: Math.round((canvas.h - t.h * escala) / 2),
  })
  const so = (qual: HeroWindowKey, variant?: ConversaVariant): HeroComposition => {
    const tam = qual === 'conversa'
      ? (variant === 'chat' ? win.conversaChat : win.conversaFull)
      : qual === 'contato' ? win.contato : win.funil
    const p = centro(tam)
    const base: HeroComposition = {
      conversa: FORA(canvas.w, 30, variant ?? 'chat'),
      contato: FORA(canvas.w, 30),
      funil: FORA(canvas.w, 30),
    }
    base[qual] = { visible: true, x: p.x, y: p.y, scale: 1, opacity: 1, z: 40, ...(qual === 'conversa' ? { variant } : {}) }
    return base
  }
  return {
    abertura: so('conversa', 'chat'),
    conversa: so('conversa', 'chat'),
    contato: so('contato'),
    ponte: so('funil'),
    funil: so('funil'),
    handoff: so('conversa', 'chat'),
    fecho: so('funil'),
    reinicio: {
      conversa: FORA(canvas.w, 30, 'chat'),
      contato: FORA(canvas.w, 30),
      funil: FORA(canvas.w, 30),
    } as HeroComposition,
  } satisfies Record<HeroCompositionKey, HeroComposition>
}

/** Notebook e larguras intermediárias: janelas em tamanho de leitura confortável. */
export const CANVAS_MEDIO = { w: 900, h: 470 }
export const WIN_MEDIO = {
  conversaFull: { w: 860, h: 440 },
  conversaChat: { w: 700, h: 440 },
  lista: 360,
  chat: 500,
  contato: { w: 340, h: 446 },
  funil: { w: 860, h: 440 },
} as const
export const HERO_COMPOSITIONS_MEDIO = soloTable(CANVAS_MEDIO, WIN_MEDIO)

/**
 * Composição do CELULAR — própria, não a do desktop encolhida.
 *
 * Uma janela dominante por vez e nenhum fragmento de outra tela na lateral: a
 * conversa (no recorte de chat, porque a lista não cabe) ocupa a tela, a ficha
 * entra por cima dela, e o funil a substitui. É a mesma história com menos
 * superfícies simultâneas.
 */
export const CANVAS_MOBILE = { w: 360, h: 448 }

export const WIN_MOBILE = {
  conversaFull: { w: 340, h: 420 },
  conversaChat: { w: 340, h: 420 },
  // Sem lista no celular, e o chat ocupa a janela: pôr o chat de desktop
  // (604) numa janela de 340 cortava as mensagens à direita.
  lista: 0,
  chat: 340,
  contato: { w: 320, h: 418 },
  funil: { w: 340, h: 420 },
} as const

export const HERO_COMPOSITIONS_MOBILE = soloTable(CANVAS_MOBILE, WIN_MOBILE)
