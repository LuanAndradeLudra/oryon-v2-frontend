import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

/**
 * O FOCO — o contorno sobre o elemento real e o conector que o liga à
 * anotação (rodada de 25/09).
 *
 * Por que foi refeito: o diretor media o alvo UMA vez, 850 ms depois do
 * passo, e a landing desenhava um anel parado naquela posição. Quando o chat
 * ainda rolava, um painel abria ou o card mudava de coluna, o anel ficava
 * apontando para o lugar antigo.
 *
 * Agora:
 *  • o diretor (dentro do iframe) acompanha o alvo QUADRO A QUADRO enquanto a
 *    tomada está no ar e manda o retângulo sempre que ele muda — já recortado
 *    pela área rolável, e com `visivel = false` quando sai de vista ou fica
 *    coberto por outra camada do app;
 *  • aqui, um laço por quadro (só enquanto há tomada) converte esse retângulo
 *    para a tela, lendo a posição REAL do iframe (`getBoundingClientRect`, que
 *    já inclui escala do palco, o recuo da âncora no scroll e o redimensiona-
 *    mento) — contorno e conector saem da MESMA conta;
 *  • o conector sai da anotação, desce por um CORREDOR externo ao palco e
 *    chega à borda da moldura na altura do alvo. Nunca atravessa uma tela: as
 *    molduras visíveis (âncora, janelas, aparelho) são obstáculos, e se não
 *    houver caminho livre o conector não é desenhado — fica só o contorno.
 */

export interface FocoDaDemo {
  id: number
  /** Retângulo visível do alvo, em px do app (coordenadas do iframe). */
  rect: { x: number; y: number; w: number; h: number }
  raio: number
  visivel: boolean
  /** A tomada terminou: tudo sai de cena. */
  saindo: boolean
}

const CANAL = 'oryon-hero'

/** As mensagens de foco de UM iframe da demonstração. */
export function useFocoDaDemo(iframeRef: RefObject<HTMLIFrameElement | null>) {
  const [foco, setFoco] = useState<FocoDaDemo | null>(null)
  useEffect(() => {
    let limpar: ReturnType<typeof setTimeout> | undefined
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== location.origin || !iframeRef.current || e.source !== iframeRef.current.contentWindow) return
      const d = e.data as { canal?: string; tipo?: string; id?: number; rect?: FocoDaDemo['rect']; raio?: number; visivel?: boolean }
      if (d?.canal !== CANAL) return
      if (d.tipo === 'foco' && d.rect && d.id) {
        if (limpar) clearTimeout(limpar)
        const { id, rect } = d
        setFoco({ id, rect, raio: d.raio ?? 8, visivel: d.visivel !== false, saindo: false })
      }
      if (d.tipo === 'foco-fim') {
        setFoco((f) => (f && f.id === d.id ? { ...f, saindo: true } : f))
        if (limpar) clearTimeout(limpar)
        limpar = setTimeout(() => setFoco((f) => (f && f.id === d.id ? null : f)), 450)
      }
    }
    window.addEventListener('message', onMsg)
    return () => { window.removeEventListener('message', onMsg); if (limpar) clearTimeout(limpar) }
  }, [iframeRef])
  return foco
}

type R = { x: number; y: number; w: number; h: number }
type P = [number, number]

const FOLGA = 12 // distância mínima entre o conector e qualquer moldura
/** Onde a linha termina: a esta distância POR FORA da borda da moldura. */
const FORA = 6
const RAIO_CURVA = 12

function relativo(r: DOMRect, base: DOMRect): R {
  return { x: r.left - base.left, y: r.top - base.top, w: r.width, h: r.height }
}
function intersecta(a: R, b: R, folga = 0) {
  return a.x < b.x + b.w + folga && a.x + a.w > b.x - folga && a.y < b.y + b.h + folga && a.y + a.h > b.y - folga
}
/** Um segmento horizontal ou vertical, como retângulo de espessura zero. */
function segmento(a: P, b: P): R {
  return { x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(a[0] - b[0]), h: Math.abs(a[1] - b[1]) }
}

/** Caminho ortogonal com cantos arredondados. */
function desenhar(pts: P[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1], [cx, cy] = pts[i], [nx, ny] = pts[i + 1]
    const l1 = Math.hypot(cx - px, cy - py), l2 = Math.hypot(nx - cx, ny - cy)
    const r = Math.min(RAIO_CURVA, l1 / 2, l2 / 2)
    const ax = cx - ((cx - px) / (l1 || 1)) * r, ay = cy - ((cy - py) / (l1 || 1)) * r
    const bx = cx + ((nx - cx) / (l2 || 1)) * r, by = cy + ((ny - cy) / (l2 || 1)) * r
    d += ` L ${ax} ${ay} Q ${cx} ${cy} ${bx} ${by}`
  }
  const [lx, ly] = pts[pts.length - 1]
  return d + ` L ${lx} ${ly}`
}

type Lado = 'esquerda' | 'direita' | 'topo'

interface Geometria {
  anel: R
  raio: number
  /** O anel está à vista (não coberto por janela nem fora da tela do app). */
  anelVisivel: boolean
  caminho?: { d: string; fim: P; inicio: P; comprimento: number; lado: Lado; marca: [P, P] }
  /** O HOLOFOTE: a área que escurece (o palco inteiro, ou a tela do recorte)
   *  e o furo em luz plena sobre o alvo — em px da raiz. */
  veu?: { area: R; furo: R; raio: number; esfumar: boolean }
}

function comprimento(pts: P[]) {
  let t = 0
  for (let i = 1; i < pts.length; i++) t += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
  return t
}

/** Uma tomada de foco: o que está em cena, e se já está saindo. */
export interface Tomada { id: number; saindo: boolean }

/** O que a medição devolve a cada quadro, em px da `raiz`. */
export interface MedidaDoAlvo {
  /** O retângulo do alvo (sem folga). */
  alvo: R
  raio: number
  /** O alvo está à vista dentro da sua tela (não rolado para fora, não coberto dentro do app). */
  visivel: boolean
  /** A moldura em que o alvo mora — onde o conector chega. */
  moldura: HTMLElement | null
  /** A área que recorta o contorno (a tela do app, a janela do recorte). */
  corte: R
}

/** Mede um alvo DENTRO do iframe da demonstração (retângulo vindo do diretor). */
export function medirNoIframe(
  foco: FocoDaDemo, iframe: HTMLIFrameElement | null, moldura: HTMLElement | null, recorte: HTMLElement | null, base: DOMRect,
): MedidaDoAlvo | null {
  if (!iframe) return null
  const fr = iframe.getBoundingClientRect()
  const escala = fr.width / (iframe.offsetWidth || 1)
  const tela = relativo(fr, base)
  return {
    alvo: { x: tela.x + foco.rect.x * escala, y: tela.y + foco.rect.y * escala, w: foco.rect.w * escala, h: foco.rect.h * escala },
    raio: foco.raio * escala,
    visivel: foco.visivel,
    moldura,
    corte: recorte ? relativo(recorte.getBoundingClientRect(), base) : tela,
  }
}

/** Mede um alvo na própria landing (um item de uma janela satélite). */
export function medirNoElemento(el: HTMLElement | null, moldura: HTMLElement | null, base: DOMRect, molduraInteira = false): MedidaDoAlvo | null {
  if (!el || !moldura) return null
  const conteudo = moldura.querySelector<HTMLElement>('.hero-bandeja > div:last-child') ?? moldura
  // A opacidade da entrada/saída mora no filho animado da satélite.
  const opacidade = Number(getComputedStyle(moldura.firstElementChild ?? moldura).opacity || '1')
  const escala = el.getBoundingClientRect().width / (el.offsetWidth || 1)
  return {
    alvo: relativo(el.getBoundingClientRect(), base),
    raio: (parseFloat(getComputedStyle(el).borderTopLeftRadius) || 8) * escala,
    visivel: opacidade > 0.9,
    moldura,
    // Moldura inteira em foco: o recorte é a própria moldura (com folga),
    // não só a área de conteúdo dela.
    corte: molduraInteira
      ? (() => { const r = relativo(el.getBoundingClientRect(), base); return { x: r.x - 8, y: r.y - 8, w: r.w + 16, h: r.h + 16 } })()
      : relativo(conteudo.getBoundingClientRect(), base),
  }
}

/** Quadros sem mudança antes de a tomada entrar no ar (a janela terminar de entrar). */
const QUADROS_PARADO = 6
const ASSENTAR_MAX_MS = 1500

/**
 * Desenha o foco sobre `raiz` (um contêiner `relative`). Com `anotacaoRef` e
 * `palcoRef`, desenha também o conector; sem eles, só o contorno (recortes da
 * seção Plataforma, celular).
 */
export function HeroFoco({ tomada, medir, raizRef, anotacaoRef, palcoRef, veuNaSecao = false }: {
  tomada: Tomada | null
  /** Mede o alvo a cada quadro (px relativos a `base`, o retângulo da raiz). */
  medir: (base: DOMRect) => MedidaDoAlvo | null
  raizRef: RefObject<HTMLElement | null>
  /** A pílula da narração — de onde o conector sai. */
  anotacaoRef?: RefObject<HTMLElement | null>
  /** O palco escalado — define os corredores laterais e os obstáculos. */
  palcoRef?: RefObject<HTMLElement | null>
  /** O véu do holofote cobre a seção inteira (Hero), não só a tela do alvo. */
  veuNaSecao?: boolean
}) {
  const [geo, setGeo] = useState<Geometria | null>(null)
  const ladoTravado = useRef<{ id: number; lado: Lado } | null>(null)
  const medirRef = useRef(medir)
  medirRef.current = medir
  const id = tomada?.id ?? 0

  useLayoutEffect(() => {
    if (!id) { setGeo(null); return }
    let quadro = 0
    let ultimo = ''
    let parado = 0
    let noAr = false
    let anterior: R | null = null
    const inicio = performance.now()
    const calcular = () => {
      const raiz = raizRef.current
      if (!raiz) return
      const base = raiz.getBoundingClientRect()
      const m = medirRef.current(base)
      if (!m) return
      // Assentar: a tomada só entra no ar quando o alvo para de se mexer.
      if (!noAr) {
        // "Parado" com tolerância de 1,5 px: o fim de uma mola não precisa
        // terminar para o olho considerar a janela no lugar.
        const a = anterior, b = m.alvo
        const quieto = !!a && Math.abs(a.x - b.x) <= 1.5 && Math.abs(a.y - b.y) <= 1.5 && Math.abs(a.w - b.w) <= 1.5 && Math.abs(a.h - b.h) <= 1.5
        parado = quieto && m.visivel ? parado + 1 : 0
        anterior = { ...b }
        if (parado < QUADROS_PARADO && performance.now() - inicio < ASSENTAR_MAX_MS) return
        noAr = true
      }
      let anel: R = { x: m.alvo.x - 5, y: m.alvo.y - 5, w: m.alvo.w + 10, h: m.alvo.h + 10 }
      // Recorte: o contorno nunca sai da tela em que o alvo mora.
      const corte = m.corte
      const x1 = Math.max(anel.x, corte.x + 2), y1 = Math.max(anel.y, corte.y + 2)
      const x2 = Math.min(anel.x + anel.w, corte.x + corte.w - 2), y2 = Math.min(anel.y + anel.h, corte.y + corte.h - 2)
      const dentro = x2 - x1 > 12 && y2 - y1 > 12
      anel = { x: x1, y: y1, w: Math.max(0, x2 - x1), h: Math.max(0, y2 - y1) }

      // Obstáculos: as molduras visíveis — menos a do próprio alvo.
      const obstaculos: R[] = []
      palcoRef?.current?.querySelectorAll<HTMLElement>('[data-obstaculo="sim"]').forEach((el) => {
        if (m.moldura && (el === m.moldura || el.contains(m.moldura) || m.moldura.contains(el))) return
        const r = el.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) obstaculos.push(relativo(r, base))
      })
      // Uma janela por cima do alvo esconde a tomada (só vale para alvo que
      // mora na âncora; as satélites ficam por cima dela).
      const naAncora = !m.moldura?.hasAttribute('data-obstaculo')
      // Coberto = uma janela esconde mais de um terço do alvo (uma quina
      // encoberta não apaga a tomada).
      const area = anel.w * anel.h || 1
      const coberto = naAncora && obstaculos.some((o) => {
        const w = Math.min(anel.x + anel.w, o.x + o.w) - Math.max(anel.x, o.x)
        const h = Math.min(anel.y + anel.h, o.y + o.h) - Math.max(anel.y, o.y)
        return w > 0 && h > 0 && (w * h) / area > 0.33
      })
      const anelVisivel = m.visivel && dentro && !coberto

      let caminho: Geometria['caminho']
      const pill = anotacaoRef?.current, palco = palcoRef?.current, moldura = m.moldura
      if (anelVisivel && pill && palco && moldura) {
        const A = relativo(moldura.getBoundingClientRect(), base)
        const N = relativo(pill.getBoundingClientRect(), base)
        const PL = relativo(palco.getBoundingClientRect(), base)
        const ty = anel.y + anel.h / 2
        const tx = anel.x + anel.w / 2
        const ny = N.y + N.h / 2
        // A âncora também é obstáculo quando o alvo mora numa satélite.
        const ancora = !naAncora ? palco.querySelector<HTMLElement>('[data-ancora]') : null
        const tudo = ancora ? [...obstaculos, relativo(ancora.getBoundingClientRect(), base)] : obstaculos
        const livre = (pts: P[]) => {
          for (let i = 1; i < pts.length; i++) {
            const seg = segmento(pts[i - 1], pts[i])
            // O último trecho encosta na moldura de destino: ela não é obstáculo dele.
            const obst = i === pts.length - 1 ? tudo : [...tudo, A]
            if (obst.some((o) => intersecta(seg, o, FOLGA - 2))) return false
          }
          return true
        }
        const todos = [PL, A, ...tudo]
        const xEsq = Math.min(...todos.map((o) => o.x)) - 20
        const xDir = Math.max(...todos.map((o) => o.x + o.w)) + 20
        const topoConteudo = A.y + 34
        const rotas: Record<Lado, P[] | null> = {
          // Tudo termina FORA da moldura (a 6 px da borda): nenhuma linha,
          // ponto ou marca encosta nos elementos de dentro.
          esquerda: ty > topoConteudo ? [[N.x - 6, ny], [xEsq, ny], [xEsq, ty], [A.x - FORA, ty]] : null,
          direita: ty > topoConteudo ? [[N.x + N.w + 6, ny], [xDir, ny], [xDir, ty], [A.x + A.w + FORA, ty]] : null,
          topo: tx > N.x + 18 && tx < N.x + N.w - 18
            ? [[tx, N.y + N.h + 4], [tx, A.y - FORA]]
            : [[tx < N.x ? N.x - 6 : N.x + N.w + 6, ny], [tx, ny], [tx, A.y - FORA]],
        }
        // Preferência: a borda mais próxima do alvo (entre ela e o alvo há menos
        // interface para o olho atravessar); a escolha fica travada na tomada —
        // o conector não troca de lado no meio de um movimento.
        const dist: Record<Lado, number> = { esquerda: tx - A.x, direita: A.x + A.w - tx, topo: ty - A.y }
        const ordem = (Object.keys(dist) as Lado[]).sort((a, b) => dist[a] - dist[b])
        const trava = ladoTravado.current?.id === id ? ladoTravado.current.lado : null
        if (trava) ordem.sort((a, b) => (a === trava ? -1 : b === trava ? 1 : 0))
        for (const lado of ordem) {
          const pts = rotas[lado]
          if (!pts || !livre(pts)) continue
          ladoTravado.current = { id, lado }
          // A MARCA DE PROJEÇÃO: na borda da moldura, um traço com a extensão
          // do alvo (a largura dele, chegando por cima; a altura, pelos lados).
          // É o que amarra o ponto de chegada ao contorno lá dentro.
          const fim = pts[pts.length - 1]
          const marca: [P, P] = lado === 'topo'
            ? [[Math.max(A.x + 14, anel.x), fim[1]], [Math.min(A.x + A.w - 14, anel.x + anel.w), fim[1]]]
            : [[fim[0], Math.max(topoConteudo, anel.y)], [fim[0], Math.min(A.y + A.h - 10, anel.y + anel.h)]]
          caminho = { d: desenhar(pts), inicio: pts[0], fim, comprimento: comprimento(pts), lado, marca }
          break
        }
      }

      // O véu: com `veuNaSecao` (Hero), a SEÇÃO inteira escurece — título,
      // palco, janelas —, e só o alvo fica aceso; a narração e o conector
      // ficam por cima do véu. Sem ela (recortes da Plataforma), só a tela.
      const secao = veuNaSecao ? raiz.closest('section') : null
      // O FURO não pode revelar outra janela: se uma moldura por cima (o
      // iPhone, uma satélite) invade o alvo por um lado, o furo recua até a
      // borda dela — antes o iPhone ficava meio aceso, meio escuro.
      let furo: R = { x: anel.x - 3, y: anel.y - 3, w: anel.w + 6, h: anel.h + 6 }
      if (naAncora) {
        for (const o of obstaculos) {
          if (!intersecta(furo, o)) continue
          const ox2 = o.x + o.w, oy2 = o.y + o.h, fx2 = furo.x + furo.w, fy2 = furo.y + furo.h
          const cobreAltura = o.y <= furo.y + furo.h * 0.25 && oy2 >= fy2 - furo.h * 0.25
          const cobreLargura = o.x <= furo.x + furo.w * 0.25 && ox2 >= fx2 - furo.w * 0.25
          if (cobreAltura && o.x <= furo.x + 1) furo = { ...furo, x: ox2 + 4, w: fx2 - (ox2 + 4) }
          else if (cobreAltura && ox2 >= fx2 - 1) furo = { ...furo, w: o.x - 4 - furo.x }
          else if (cobreLargura && o.y <= furo.y + 1) furo = { ...furo, y: oy2 + 4, h: fy2 - (oy2 + 4) }
          else if (cobreLargura && oy2 >= fy2 - 1) furo = { ...furo, h: o.y - 4 - furo.y }
        }
        furo = { ...furo, w: Math.max(0, furo.w), h: Math.max(0, furo.h) }
      }
      const veu: Geometria['veu'] = {
        area: secao ? relativo(secao.getBoundingClientRect(), base) : corte,
        furo,
        raio: m.raio + 8,
        esfumar: false,
      }
      const g: Geometria = { anel, raio: m.raio + 5, anelVisivel, caminho, veu }
      const chave = JSON.stringify([Math.round(anel.x), Math.round(anel.y), Math.round(anel.w), Math.round(anel.h), anelVisivel, caminho?.d])
      if (chave !== ultimo) { ultimo = chave; mudou = true; setGeo(g) }
    }
    // Medir o layout a cada quadro custa caro em máquina fraca (medido: ~4% da
    // CPU só em getBoundingClientRect). Enquanto algo se mexe, mede a cada
    // quadro; parado há ~12 quadros, confere a cada 120 ms — e acorda na hora
    // com rolagem, redimensionamento ou aviso novo da demo.
    let mudou = false
    let quietos = 0
    let espera = 0
    const laco = () => {
      mudou = false
      calcular()
      quietos = mudou || !noAr ? 0 : quietos + 1
      if (quietos > 12) espera = window.setTimeout(() => { espera = 0; quadro = requestAnimationFrame(laco) }, 120)
      else quadro = requestAnimationFrame(laco)
    }
    const acordar = () => {
      quietos = 0
      if (espera) { clearTimeout(espera); espera = 0; quadro = requestAnimationFrame(laco) }
    }
    const rolador = raizRef.current?.closest('[data-landing-root]') ?? window
    rolador.addEventListener('scroll', acordar, { passive: true })
    window.addEventListener('resize', acordar)
    window.addEventListener('message', acordar)
    laco()
    return () => {
      cancelAnimationFrame(quadro); clearTimeout(espera); setGeo(null)
      rolador.removeEventListener('scroll', acordar)
      window.removeEventListener('resize', acordar)
      window.removeEventListener('message', acordar)
    }
  }, [id, raizRef, anotacaoRef, palcoRef, veuNaSecao])

  if (!tomada || !geo) return null
  const saindo = tomada.saindo || !geo.anelVisivel
  const c = geo.caminho

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 transition-opacity duration-[1100ms] ease-out"
      data-hero-foco={tomada.id}
      data-lado={c?.lado ?? 'nenhum'}
      data-saindo={saindo ? 'sim' : undefined}
      style={{ zIndex: 40, opacity: saindo ? 0 : 1 }}
    >
      <style>{'@keyframes hero-foco-traco{from{stroke-dashoffset:var(--c)}to{stroke-dashoffset:0}}@keyframes hero-foco-veu{0%{opacity:0}100%{opacity:1}}@keyframes hero-foco-ponto{0%{opacity:0;transform:scale(.3)}100%{opacity:1;transform:scale(1)}}@keyframes hero-foco-marca-h{0%{opacity:0;transform:scaleX(0)}100%{opacity:1;transform:scaleX(1)}}@keyframes hero-foco-marca-v{0%{opacity:0;transform:scaleY(0)}100%{opacity:1;transform:scaleY(1)}}'}</style>
      {/* O HOLOFOTE (25/09, pedido do PO): no lugar do anel teal — que vazava
          sobre os vizinhos e parecia estado de seleção do próprio app —, a CENA
          inteira escurece e só o alvo fica em luz plena. Nada é desenhado por
          cima do alvo: linguagem de câmera, não de interface. As bordas do véu
          se esfumam no fundo da página; o conector vem por cima dele. */}
      {geo.veu && (
        <div
          aria-hidden
          data-hero-veu
          className="absolute overflow-hidden"
          style={{
            left: geo.veu.area.x, top: geo.veu.area.y, width: geo.veu.area.w, height: geo.veu.area.h,
            ...(geo.veu.esfumar ? {
              maskImage: 'linear-gradient(to right, transparent, #000 48px, #000 calc(100% - 48px), transparent), linear-gradient(to bottom, transparent, #000 48px, #000 calc(100% - 48px), transparent)',
              maskComposite: 'intersect',
              WebkitMaskComposite: 'source-in',
            } : null),
          }}
        >
          <div
            key={tomada.id}
            className="absolute"
            style={{
              left: geo.veu.furo.x - geo.veu.area.x, top: geo.veu.furo.y - geo.veu.area.y,
              width: geo.veu.furo.w, height: geo.veu.furo.h,
              borderRadius: geo.veu.raio,
              // Escuro: o alvo ganha LUZ (brilho sob o furo + halo sutil); o véu
              // em volta não escurece mais. Claro: só o véu (tokens em index.css).
              boxShadow: 'var(--hero-foco-halo), 0 0 26px 200vmax var(--hero-veu)',
              backdropFilter: 'var(--hero-foco-brilho)',
              WebkitBackdropFilter: 'var(--hero-foco-brilho)',
              animation: `hero-foco-veu 1.4s ${c ? '.35s' : '0s'} cubic-bezier(.33,1,.68,1) both`,
            }}
          />
        </div>
      )}
      {c && (
        <svg className="absolute inset-0 h-full w-full overflow-visible" key={`${tomada.id}-${c.lado}`}>
          <path
            d={c.d}
            fill="none"
            stroke="var(--hero-conector)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            style={{
              ['--c' as string]: c.comprimento,
              strokeDasharray: c.comprimento,
              animation: 'hero-foco-traco .85s cubic-bezier(.16,1,.3,1) both',
            }}
          />
          <circle cx={c.inicio[0]} cy={c.inicio[1]} r={2.5} fill="var(--hero-conector)" />
          {/* A chegada: um ponto na borda da moldura, na linha do alvo. */}
          <line
            x1={c.marca[0][0]} y1={c.marca[0][1]} x2={c.marca[1][0]} y2={c.marca[1][1]}
            stroke="var(--hero-conector)" strokeWidth={3} strokeLinecap="round"
            style={{ transformOrigin: `${c.fim[0]}px ${c.fim[1]}px`, animation: `hero-foco-marca-${c.lado === 'topo' ? 'h' : 'v'} .55s .7s cubic-bezier(.16,1,.3,1) both` }}
          />
          <g style={{ transformOrigin: `${c.fim[0]}px ${c.fim[1]}px`, animation: 'hero-foco-ponto .45s .7s cubic-bezier(.16,1,.3,1) both' }}>
            <circle cx={c.fim[0]} cy={c.fim[1]} r={7} fill="var(--hero-conector)" opacity={0.18} />
            <circle cx={c.fim[0]} cy={c.fim[1]} r={3.5} fill="var(--hero-conector)" />
          </g>
        </svg>
      )}

    </div>
  )
}
