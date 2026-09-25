import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { TemplatePreview, WA, FONTE_WA } from '@/components/campaigns/TemplatePreview'
import { HERO, HERO_TEMPLATE, HERO_TEMPLATE_VARIAVEIS, reached } from './heroRealData'
import type { HeroCena, HeroState } from './heroStory'
import { minutesAgo } from './heroClock'

/** HH:MM do relógio da demonstração — o mesmo das mensagens no Oryon. */
const hhmm = (min: number) => new Date(minutesAgo(min)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

/**
 * O WHATSAPP NO IPHONE DA MARINA — o outro lado da conversa.
 *
 * Desenhado no tamanho real do aparelho (390 × 760 pontos) e reduzido pela
 * moldura, para as proporções serem as do iPhone. Estrutura do WhatsApp para
 * iOS (layout estável; a barra flutuante "Liquid Glass" ainda é beta):
 *
 *  • barra de status do iOS — hora à esquerda; sinal, Wi-Fi e bateria à
 *    direita; a ilha dinâmica é desenhada pela moldura (`Aparelho`);
 *  • cabeçalho da conversa — "‹" de voltar, avatar, nome da empresa, "Conta
 *    comercial", vídeo e ligação, no azul do sistema;
 *  • a conversa sobre o papel de parede (a paleta amostrada dos prints da Meta,
 *    a mesma da `TemplatePreview`): a mensagem da campanha é a prévia REAL do
 *    modelo; o resto são as bolhas do próprio WhatsApp;
 *  • a barra de digitação — "+", campo arredondado com a figurinha dentro,
 *    câmera e microfone — e o indicador de início embaixo.
 *
 * A Marina DIGITA no campo e envia: a mesma mensagem que chega na Oryon, no
 * mesmo instante. A resposta do Agente IA chega aqui também.
 */

const AZUL_IOS = '#007AFF'
const CINZA_IOS = '#8E8E93'
const BARRA_IOS = '#F6F6F6'
const DIVISOR_IOS = '#D1D1D6'
/** Bolha enviada (verde claro do WhatsApp no tema claro). */
const VERDE_ENVIADA = '#D9FDD3'
const TIQUE_LIDO = '#53BDEB'

// ─── Ícones (traço do iOS / WhatsApp) ───────────────────────────────────────

function Sinal() {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 4.7} y={9 - i * 3} width="3.2" height={3 + i * 3} rx="0.9" fill="#000" />
      ))}
    </svg>
  )
}
function WiFi() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden>
      <path d="M8 11.4 5.6 9a3.4 3.4 0 0 1 4.8 0L8 11.4Z" fill="#000" />
      <path d="M3.3 6.8a6.6 6.6 0 0 1 9.4 0l-1.2 1.2a4.9 4.9 0 0 0-7 0L3.3 6.8Z" fill="#000" />
      <path d="M1 4.5a9.9 9.9 0 0 1 14 0l-1.2 1.2a8.2 8.2 0 0 0-11.6 0L1 4.5Z" fill="#000" />
    </svg>
  )
}
function Bateria() {
  return (
    <svg width="27" height="13" viewBox="0 0 27 13" aria-hidden>
      <rect x="0.5" y="0.5" width="22" height="12" rx="3.6" fill="none" stroke="#000" strokeOpacity=".35" />
      <rect x="2" y="2" width="17" height="9" rx="2.2" fill="#000" />
      <path d="M24 4.4v4.2a2.1 2.1 0 0 0 0-4.2Z" fill="#000" fillOpacity=".4" />
    </svg>
  )
}
const traco = { fill: 'none', stroke: AZUL_IOS, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
function Voltar() { return <svg width="12" height="21" viewBox="0 0 12 21" aria-hidden><path d="M10 1.5 1.8 10.5 10 19.5" {...traco} strokeWidth={2.6} /></svg> }
function Video() { return <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden><rect x="1" y="2" width="16" height="14" rx="3.5" {...traco} /><path d="m17 7.2 6.6-3.9v11.4L17 10.8" {...traco} /></svg> }
function Telefone() { return <svg width="21" height="21" viewBox="0 0 24 24" aria-hidden><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.4 2.1L8 9.8a16 16 0 0 0 6 6l1.4-1.3a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2Z" {...traco} /></svg> }
function Mais() { return <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden><path d="M12 4v16M4 12h16" {...traco} strokeWidth={2.2} /></svg> }
function Figurinha() { return <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden><path d="M20.5 12.5V8a4.5 4.5 0 0 0-4.5-4.5H8A4.5 4.5 0 0 0 3.5 8v8A4.5 4.5 0 0 0 8 20.5h4.5l8-8Z" {...traco} /><path d="M12.5 20.5v-3.5a4.5 4.5 0 0 1 4.5-4.5h3.5" {...traco} /></svg> }
function Camera() { return <svg width="25" height="22" viewBox="0 0 26 22" aria-hidden><path d="M3 7a2.5 2.5 0 0 1 2.5-2.5h2.4l1.8-2.5h6.6l1.8 2.5h2.4A2.5 2.5 0 0 1 23 7v10.5a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 3 17.5Z" {...traco} /><circle cx="13" cy="12" r="4.2" {...traco} /></svg> }
function Microfone() { return <svg width="18" height="24" viewBox="0 0 18 24" aria-hidden><rect x="5" y="1.5" width="8" height="13.5" rx="4" {...traco} /><path d="M1.8 11a7.2 7.2 0 0 0 14.4 0M9 18.3v4" {...traco} /></svg> }
function Enviar() {
  return (
    <span className="flex h-[32px] w-[32px] items-center justify-center rounded-full" style={{ background: '#25D366' }}>
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden><path d="M4 12h14M12 5l7 7-7 7" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </span>
  )
}
function Tiques() {
  return <svg width="17" height="11" viewBox="0 0 17 11" aria-hidden><path d="m1 6 3.2 3.2L11 2M6.5 9.2 7.2 9.9 14.8 2" fill="none" stroke={TIQUE_LIDO} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

// ─── Bolhas ─────────────────────────────────────────────────────────────────

function Bolha({ texto, hora, minha }: { texto: string; hora: string; minha?: boolean }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className={minha ? 'self-end' : 'self-start'}
      style={{ maxWidth: '82%', transformOrigin: minha ? '100% 100%' : '0% 100%' }}
    >
      <div
        className="relative px-[9px] pt-[6px] pb-[7px] text-[15.5px] leading-[20px]"
        style={{
          background: minha ? VERDE_ENVIADA : WA.balao,
          color: WA.texto,
          borderRadius: 8,
          boxShadow: '0 1px .5px rgba(11,20,26,.13)',
        }}
      >
        {texto}
        <span className="float-right ml-2 mt-[6px] -mb-[3px] inline-flex items-center gap-1 text-[11px]" style={{ color: WA.meta }}>
          {hora}
          {minha && <Tiques />}
        </span>
      </div>
    </motion.div>
  )
}

/** Digita o texto no campo, letra por letra, no ritmo de quem digita no celular. */
function useDigitacao(texto: string | null, duracaoMs: number) {
  const semMovimento = useReducedMotion()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!texto) { setN(0); return }
    if (semMovimento) { setN(texto.length); return }
    setN(0)
    const inicio = performance.now()
    let raf = 0
    const passo = () => {
      const p = Math.min(1, (performance.now() - inicio) / duracaoMs)
      setN(Math.round(p * texto.length))
      if (p < 1) raf = requestAnimationFrame(passo)
    }
    raf = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(raf)
  }, [texto, duracaoMs, semMovimento])
  return texto ? texto.slice(0, n) : ''
}

export function WhatsAppIphone({ at, cena }: { at: HeroState; cena: HeroCena }) {
  // O que ela está digitando agora: a demanda (no começo da cena de
  // Conversas, antes de enviar) e a confirmação (depois de ler a resposta).
  const [rascunho, setRascunho] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    clearTimeout(timer.current)
    if (cena === 'conversa' && at === 'inicio') {
      timer.current = setTimeout(() => setRascunho(HERO.demand), 250)
    } else if (at === 'resposta') {
      timer.current = setTimeout(() => setRascunho(HERO.confirm), 2000)
    } else {
      setRascunho(null)
    }
    return () => clearTimeout(timer.current)
  }, [at, cena])
  const digitado = useDigitacao(rascunho, rascunho === HERO.demand ? 1100 : 900)

  const mensagens: { id: string; texto: string; hora: string; minha?: boolean }[] = []
  if (reached(at, 'demanda')) mensagens.push({ id: 'd', texto: HERO.demand, hora: hhmm(4), minha: true })
  if (reached(at, 'resposta')) mensagens.push({ id: 'r', texto: HERO.answer, hora: hhmm(3) })
  if (reached(at, 'confirma')) mensagens.push({ id: 'c', texto: HERO.confirm, hora: hhmm(2), minha: true })

  return (
    <div
      className="relative flex flex-col overflow-hidden origin-top-left"
      style={{ width: 390, height: 760, transform: 'scale(0.6)', fontFamily: FONTE_WA, background: WA.papel }}
    >
      {/* ── Barra de status do iOS ── */}
      <div className="flex h-[54px] flex-shrink-0 items-center justify-between px-[34px] pt-[6px]" style={{ background: BARRA_IOS }}>
        <span className="text-[17px] font-semibold tracking-[-0.2px] text-black" style={{ fontFamily: '-apple-system, "SF Pro Text", "Segoe UI", system-ui, sans-serif' }}>{hhmm(0).replace(/^0/, '')}</span>
        <span className="flex items-center gap-[6px]"><Sinal /><WiFi /><Bateria /></span>
      </div>

      {/* ── Cabeçalho da conversa ── */}
      <div className="flex h-[52px] flex-shrink-0 items-center gap-2 px-3" style={{ background: BARRA_IOS, borderBottom: `0.5px solid ${DIVISOR_IOS}` }}>
        <span className="flex items-center gap-1 pr-1"><Voltar /></span>
        <span className="flex h-[36px] w-[36px] flex-shrink-0 items-center justify-center rounded-full text-[14px] font-semibold text-white" style={{ background: '#0F766E' }}>VS</span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-[16.5px] font-semibold text-black">Vértice Software</span>
          <span className="truncate text-[12.5px]" style={{ color: CINZA_IOS }}>Conta comercial</span>
        </span>
        <span className="flex items-center gap-5 pl-2"><Video /><Telefone /></span>
      </div>

      {/* ── A conversa ── */}
      <div className="relative flex min-h-0 flex-1 flex-col justify-end gap-[6px] overflow-hidden px-[10px] pb-2">
        <div className="self-center mb-1">
          <span className="inline-block rounded-md bg-white/90 px-2.5 py-1 text-[12px] font-medium shadow-[0_1px_.5px_rgba(11,20,26,.13)]" style={{ color: '#54656F' }}>Hoje</span>
        </div>
        <div className="self-start" style={{ maxWidth: '86%' }}>
          <TemplatePreview template={HERO_TEMPLATE} variables={HERO_TEMPLATE_VARIAVEIS} variant="card" />
        </div>
        <AnimatePresence initial={false}>
          {mensagens.map((m) => <Bolha key={m.id} texto={m.texto} hora={m.hora} minha={m.minha} />)}
        </AnimatePresence>
      </div>

      {/* ── Barra de digitação do WhatsApp (iOS) ── */}
      <div className="flex-shrink-0" style={{ background: BARRA_IOS, borderTop: `0.5px solid ${DIVISOR_IOS}` }}>
        <div className="flex items-end gap-3 px-3 pt-[7px] pb-[7px]">
          <span className="pb-[5px]"><Mais /></span>
          <div
            className="flex min-h-[36px] flex-1 items-center gap-2 rounded-[18px] bg-white pl-3 pr-2"
            style={{ border: `0.5px solid ${DIVISOR_IOS}` }}
          >
            <span className="min-w-0 flex-1 py-[7px] text-[16px] leading-[21px] text-black">
              {digitado}
              {rascunho && <span className="ml-[1px] inline-block h-[19px] w-[2px] translate-y-[3px] animate-pulse" style={{ background: AZUL_IOS }} />}
            </span>
            <Figurinha />
          </div>
          {digitado ? (
            <span className="pb-[2px]"><Enviar /></span>
          ) : (
            <span className="flex items-center gap-4 pb-[5px]"><Camera /><Microfone /></span>
          )}
        </div>
        {/* Indicador de início do iPhone. */}
        <div className="flex h-[26px] items-start justify-center pt-[9px]">
          <span className="h-[5px] w-[134px] rounded-full bg-black" />
        </div>
      </div>
    </div>
  )
}
