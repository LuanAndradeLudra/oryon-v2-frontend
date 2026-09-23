import { useEffect, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingBag, FileText, Truck, Copy, CreditCard,
  X, Check, ChevronLeft, ChevronRight, ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TemplateButtonType, TemplateCategoryType, WhatsAppTemplate } from '@/types'
import { Emoji } from '@/lib/emojiText'
import { TemplatePreview, WA, FONTE_WA } from './TemplatePreview'

// ─── Paleta (SCRUM-1097, 23/09) ─────────────────────────────────────────────
//
// Esta prévia (passo 1 do criador — escolha de subcategoria) tinha a MESMA
// doença que o TemplatePreview.tsx tinha antes da reescrita de 22/09: uma
// paleta inventada de memória (`#ECE5DD` de papel, cabeçalho verde `#075E54`
// de app do WhatsApp, moldura de celular, raios `rounded-t-2xl` de bottom
// sheet). Nenhum desses valores vem de captura real do painel da Meta.
//
// Correção: reusa a paleta AMOSTRADA de `TemplatePreview.tsx` (`WA`,
// `FONTE_WA` — mesma fonte, não duplicada) e, pros três casos mais simples
// (AUTHENTICATION, order_status, UTILITY sem catálogo/flow), reusa o próprio
// `<TemplatePreview>` para a bolha — a peça mais fiel que existe, em vez de
// redesenhar de memória. Catálogo, flow e o resumo de pedido continuam
// desenhados à mão (o `TemplatePreview` não cobre painel animado nenhum),
// mas com a paleta corrigida. O cabeçalho verde de app SAIU: a prévia real
// da Meta não tem cabeçalho de conversa (mesma correção documentada no
// topo de `TemplatePreview.tsx`) — o contexto ("Loja Online", "Empresa"…)
// vira só a legenda abaixo da prévia.

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubCategory = 'standard' | 'catalog' | 'flows' | 'order_details' | 'order_status'

interface Props {
  category: TemplateCategoryType
  subCategory: SubCategory
}

type CatalogPhase = 'idle' | 'tapping' | 'open'
type FlowPhase    = 'idle' | 'tapping' | 'q1' | 'selecting' | 'q2' | 'done'

// ─── Animation sequences ──────────────────────────────────────────────────────

const CATALOG_SEQ: [CatalogPhase, number][] = [
  ['idle', 2200], ['tapping', 380], ['open', 3600],
]
const FLOW_SEQ: [FlowPhase, number][] = [
  ['idle', 2200], ['tapping', 380], ['q1', 2300], ['selecting', 750], ['q2', 2300], ['done', 2000],
]

function useCycle<T>(seq: [T, number][], active: boolean): T {
  const [idx, setIdx] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const seqRef   = useRef(seq)

  useEffect(() => {
    if (!active) { setIdx(0); return }
    const s = seqRef.current
    let i = 0
    const run = () => {
      const [, duration] = s[i]
      setIdx(i)
      timerRef.current = setTimeout(() => { i = (i + 1) % s.length; run() }, duration)
    }
    run()
    return () => clearTimeout(timerRef.current)
  }, [active])

  return seq[idx][0]
}

// ─── Message config per subcategory ──────────────────────────────────────────

interface BtnDef {
  label: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
}

interface MsgConfig {
  contactName:    string
  headerType:     'none' | 'image' | 'document' | 'text'
  headerLabel?:   string
  headerGradient?: string
  documentName?:  string
  body:           string
  footer?:        string
  buttons:        BtnDef[]
  description:    string
}

function getConfig(category: TemplateCategoryType, sub: SubCategory): MsgConfig {
  if (category === 'AUTHENTICATION') return {
    contactName: 'Oryon App',
    headerType: 'none',
    body: 'Seu código de verificação é:\n\n*847 291*\n\nVálido por 10 minutos.\nNão compartilhe este código.',
    buttons: [{ label: 'Copiar código', icon: Copy }],
    description: 'O código OTP é copiado com 1 toque — sem digitação.',
  }

  switch (sub) {
    case 'catalog': return {
      contactName: 'Loja Online',
      headerType: 'image',
      headerGradient: 'from-blue-300 to-indigo-400',
      body: 'Novidades da loja! Confira nossa coleção completa com os últimos lançamentos.',
      footer: 'Frete grátis acima de R$ 150',
      buttons: [{ label: 'Ver catálogo', icon: ShoppingBag }],
      description: 'Ao tocar, o catálogo de produtos abre dentro do WhatsApp.',
    }

    case 'flows': return {
      contactName: 'Empresa',
      headerType: 'image',
      headerGradient: 'from-violet-300 to-purple-400',
      body: 'Que tal um orçamento personalizado? Responda algumas perguntas rápidas.',
      buttons: [{ label: 'Abrir formulário', icon: ChevronRight }],
      description: 'Flow interativo — formulário completo dentro do WhatsApp.',
    }

    case 'order_details': return {
      contactName: 'E-commerce',
      headerType: 'document',
      documentName: 'Comprovante_Pedido_45678.pdf',
      body: 'Seu pedido foi confirmado! Confira os detalhes e conclua o pagamento.',
      buttons: [
        { label: 'Copiar código Pix',    icon: Copy },
        { label: 'Mais formas de pagar', icon: CreditCard },
      ],
      description: 'Pedido com itens, total e pagamento integrado (Pix/cartão).',
    }

    case 'order_status': return {
      contactName: 'E-commerce',
      headerType: 'text',
      headerLabel: 'Pedido a caminho!',
      body: 'Seu pedido #45678 saiu para entrega.\nPrevisão: hoje entre 14h e 18h.',
      footer: 'Acompanhe pelo rastreador abaixo',
      buttons: [{ label: 'Rastrear pedido', icon: Truck }],
      description: 'Atualização automática do status de entrega em tempo real.',
    }

    default:
      if (category === 'UTILITY') return {
        contactName: 'Empresa',
        headerType: 'none',
        body: 'Seu agendamento para *amanhã às 14h* está confirmado.\nConfirme sua presença abaixo.',
        buttons: [
          { label: 'Confirmar presença', icon: Check },
          { label: 'Cancelar',           icon: X },
        ],
        description: 'Notificação transacional com botões de ação direta.',
      }
      return {
        contactName: 'Loja',
        headerType: 'image',
        headerGradient: 'from-amber-200 to-orange-300',
        body: 'Promoção especial! Use *PROMO10* e ganhe 10% de desconto na próxima compra.',
        footer: 'Válido até 31/03 · Oryon Commerce',
        buttons: [
          { label: 'Comprar agora', icon: ShoppingBag },
          { label: 'Copiar código', icon: Copy },
        ],
        description: 'Template de marketing com botões de ação e código de desconto.',
      }
  }
}

/** Subcategorias sem painel animado nem cabeçalho de imagem/documento — a
 *  bolha real do `TemplatePreview` cobre 100% do que elas mostram, sem
 *  perder nada (nenhuma usa catálogo, flow ou o resumo de pedido). */
function toRealTemplate(category: TemplateCategoryType, sub: SubCategory): WhatsAppTemplate | null {
  const base = {
    id: 'preview', tenantId: '', name: 'preview', language: 'pt_BR',
    createdAt: '', updatedAt: '',
  }
  if (category === 'AUTHENTICATION') {
    return {
      ...base, category, status: 'APPROVED',
      body: 'Seu código de verificação é:\n\n*847 291*\n\nVálido por 10 minutos.\nNão compartilhe este código.',
      buttons: [{ type: 'COPY_CODE' as TemplateButtonType, text: 'Copiar código' }],
    }
  }
  if (sub === 'order_status') {
    return {
      ...base, category: 'UTILITY', status: 'APPROVED',
      headerType: 'TEXT', headerText: 'Pedido a caminho!',
      body: 'Seu pedido #45678 saiu para entrega.\nPrevisão: hoje entre 14h e 18h.',
      footer: 'Acompanhe pelo rastreador abaixo',
      buttons: [{ type: 'URL' as TemplateButtonType, text: 'Rastrear pedido', url: 'https://exemplo.com/rastreio' }],
    }
  }
  if (sub === 'standard' && category === 'UTILITY') {
    return {
      ...base, category: 'UTILITY', status: 'APPROVED',
      body: 'Seu agendamento para *amanhã às 14h* está confirmado.\nConfirme sua presença abaixo.',
      buttons: [
        { type: 'QUICK_REPLY' as TemplateButtonType, text: 'Confirmar presença' },
        { type: 'QUICK_REPLY' as TemplateButtonType, text: 'Cancelar' },
      ],
    }
  }
  return null
}

// ─── Catalog products data ────────────────────────────────────────────────────

const PRODUCTS = [
  { name: 'Camiseta Básica',  price: 'R$ 59,90',  gradient: 'from-sky-100 to-sky-200',      emoji: '👕' },
  { name: 'Tênis Corrida',    price: 'R$ 299,00', gradient: 'from-green-100 to-emerald-200', emoji: '👟' },
  { name: 'Mochila Urbana',   price: 'R$ 149,90', gradient: 'from-amber-100 to-orange-200',  emoji: '🎒' },
]

// ─── Main component ───────────────────────────────────────────────────────────

export function SubcategoryPreview({ category, subCategory }: Props) {
  const isCatalog = subCategory === 'catalog'
  const isFlows   = subCategory === 'flows'

  const catalogPhase = useCycle<CatalogPhase>(CATALOG_SEQ, isCatalog)
  const flowPhase    = useCycle<FlowPhase>(FLOW_SEQ, isFlows)

  const isTapping   = (isCatalog && catalogPhase === 'tapping') || (isFlows && flowPhase === 'tapping')
  const showCatalog = isCatalog && catalogPhase === 'open'
  const showFlow    = isFlows && (flowPhase === 'q1' || flowPhase === 'selecting' || flowPhase === 'q2' || flowPhase === 'done')

  const cfg = getConfig(category, subCategory)
  const realTemplate = toRealTemplate(category, subCategory)

  return (
    <div className="space-y-2.5">
      {/* Fundo: papel de parede amostrado (WA.papel), sem moldura de
          celular nem cabeçalho de app — a prévia real da Meta não tem
          nenhum dos dois (mesma correção de TemplatePreview.tsx). */}
      <div
        className="relative rounded-lg overflow-hidden border border-surface-700/30 shadow-inner"
        style={{ minHeight: 380, background: WA.papel }}
      >
        <div className="p-3">
          {realTemplate
            ? <TemplatePreview template={realTemplate} variant="card" compact />
            : <MessageBubble cfg={cfg} isTapping={isTapping} subCategory={subCategory} />}
        </div>

        {/* ── Animated: Catalog panel ── */}
        <AnimatePresence>
          {showCatalog && (
            <motion.div
              key="catalog"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 30, mass: 0.85 }}
              className="absolute inset-x-0 bottom-0 bg-white rounded-t-lg shadow-2xl overflow-hidden"
              style={{ height: 300 }}
            >
              <CatalogPanel />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Animated: Flow panel ── */}
        <AnimatePresence>
          {showFlow && (
            <motion.div
              key="flow"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 30, mass: 0.85 }}
              className="absolute inset-0 bg-white overflow-hidden"
            >
              <FlowPanel phase={flowPhase} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animation hint badge */}
        {(isCatalog || isFlows) && (
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/50 text-white text-[9px] font-medium px-2 py-1 rounded-full backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ao vivo
          </div>
        )}
      </div>

      {/* Description — contexto do cenário ("Loja Online", "Empresa"…) que
          o cabeçalho de app fake dava antes vive só aqui agora. */}
      <p className="text-2xs text-surface-500 text-center leading-relaxed px-2">
        <span className="text-surface-400 font-medium">{cfg.contactName}: </span>
        {cfg.description}
      </p>
    </div>
  )
}

// ─── Message bubble (catálogo, flow, resumo de pedido, marketing padrão —
//     os únicos casos que o TemplatePreview não cobre; paleta WA.* daqui
//     em diante, não mais inventada) ─────────────────────────────────────

function MessageBubble({
  cfg, isTapping, subCategory,
}: {
  cfg: MsgConfig
  isTapping: boolean
  subCategory: SubCategory
}) {
  return (
    <div
      className="relative"
      style={{
        // maxWidth: 92% (não um px fixo) — mesma proporção adaptativa do
        // componente original, o container real varia por chamador.
        maxWidth: '92%', background: WA.balao, borderRadius: '7.5px',
        borderTopLeftRadius: 0, padding: 3, boxShadow: '0 1px .5px rgba(11,20,26,.13)',
        fontFamily: FONTE_WA,
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute', top: 0, left: -8, width: 8, height: 13,
          background: WA.balao, clipPath: 'polygon(100% 0, 100% 100%, 0 0)',
        }}
      />

      {/* Header: image gradient — mantido (não é um dado real, é um recurso
          visual pra diferenciar cenário no seletor de subcategoria; o
          TemplatePreview real mostra "Imagem" cinza quando não há URL). */}
      {cfg.headerType === 'image' && (
        <div className={cn('h-[96px] rounded-[6px] flex items-center justify-center bg-gradient-to-br', cfg.headerGradient ?? 'from-surface-200 to-surface-300')}>
          <ImageIcon className="w-7 h-7 text-white/60" />
        </div>
      )}

      {/* Header: document */}
      {cfg.headerType === 'document' && (
        <div className="rounded-[6px] px-2.5 py-2 flex items-center gap-2.5" style={{ background: '#F3F4F6' }}>
          <div className="w-9 h-11 bg-red-50 border border-red-100 rounded-[6px] flex flex-col items-center justify-center gap-0.5 flex-shrink-0">
            <FileText className="w-4 h-4 text-red-500" />
            <span className="text-[7px] font-bold text-red-400 uppercase">pdf</span>
          </div>
          <div className="min-w-0">
            <p className="text-2xs font-medium leading-tight truncate" style={{ color: WA.texto }}>{cfg.documentName}</p>
            <p className="text-3xs mt-0.5" style={{ color: WA.meta }}>2.4 MB · PDF</p>
          </div>
        </div>
      )}

      {/* Header: text */}
      {cfg.headerType === 'text' && (
        <div className="px-[7px] pt-1.5">
          <p className="text-xs font-bold" style={{ color: WA.texto }}>{cfg.headerLabel}</p>
        </div>
      )}

      {/* Body */}
      <div style={{ padding: '6px 7px 4px' }}>
        <p
          className="text-[12.5px] leading-relaxed whitespace-pre-line"
          style={{ color: WA.texto }}
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(
              cfg.body
                .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br/>'),
              { ALLOWED_TAGS: ['strong', 'em', 's', 'br'] },
            ),
          }}
        />

        {/* Order details summary (inline) */}
        {subCategory === 'order_details' && (
          <div className="mt-1.5 rounded-[6px] px-2.5 py-2 space-y-1" style={{ background: '#F3F4F6' }}>
            <div className="flex justify-between text-3xs">
              <span style={{ color: WA.meta }}>Camiseta Básica (M)</span>
              <span className="font-medium" style={{ color: WA.texto }}>R$ 89,90</span>
            </div>
            <div className="flex justify-between text-3xs">
              <span style={{ color: WA.meta }}>Tênis Running (42)</span>
              <span className="font-medium" style={{ color: WA.texto }}>R$ 299,00</span>
            </div>
            <div className="flex justify-between text-3xs pt-1" style={{ borderTop: `1px solid ${WA.divisor}` }}>
              <span className="font-semibold" style={{ color: WA.texto }}>Total</span>
              <span className="font-bold" style={{ color: WA.texto }}>R$ 388,90</span>
            </div>
          </div>
        )}

        {cfg.footer && (
          <p className="text-3xs" style={{ color: WA.meta, marginTop: 5 }}>{cfg.footer}</p>
        )}

        {/* Sem tique: mensagem recebida não tem confirmação de entrega
            (mesma correção de TemplatePreview.tsx). */}
        <p className="text-3xs text-right" style={{ color: WA.meta, marginTop: 1 }}>
          {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {/* Action buttons — dentro da bolha, divisor de 1px (não cards soltos
          fora dela). */}
      <div>
        {cfg.buttons.map((btn, i) => {
          const Icon = btn.icon
          const tapHighlight = isTapping && i === 0
          return (
            <div key={i}>
              <div style={{ height: 1, background: WA.divisor, margin: '0 -3px' }} />
              <motion.div
                animate={tapHighlight ? { backgroundColor: 'color-mix(in srgb, ' + WA.azul + ' 8%, transparent)' } : { backgroundColor: 'transparent' }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-center gap-1.5"
                style={{ height: 36 }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: WA.azul }} />
                <span className="text-xs font-medium" style={{ color: WA.azul }}>
                  {btn.label}
                </span>
              </motion.div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Catalog panel ────────────────────────────────────────────────────────────

function CatalogPanel() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#f3f4f6] flex-shrink-0">
        <ChevronLeft className="w-4 h-4" style={{ color: WA.azul }} />
        <p className="text-xs font-semibold text-[#111827] flex-1">Catálogo da loja</p>
        <span className="text-3xs text-[#6b7280] bg-[#f3f4f6] px-1.5 py-0.5 rounded-full">{PRODUCTS.length} itens</span>
      </div>

      {/* Products list */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#f9fafb]">
        {PRODUCTS.map((p, i) => (
          <div key={i} className="flex items-center gap-2.5 px-3 py-2.5">
            <div className={cn('w-12 h-12 rounded-[6px] bg-gradient-to-br flex items-center justify-center flex-shrink-0', p.gradient)}>
              <Emoji native={p.emoji} size="1.75rem" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xs font-semibold text-[#111827] leading-tight">{p.name}</p>
              <p className="text-2xs text-emerald-600 font-medium mt-0.5">{p.price}</p>
            </div>
            <button className="text-white text-3xs px-2 py-1 rounded-[6px] font-medium flex-shrink-0 whitespace-nowrap" style={{ background: WA.azul }}>
              + Add
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-[#f3f4f6] px-3 py-2 flex-shrink-0">
        <p className="text-2xs text-center font-medium" style={{ color: WA.azul }}>Ver todos os produtos →</p>
      </div>
    </div>
  )
}

// ─── Flow panel ───────────────────────────────────────────────────────────────

const FLOW_OPTIONS = ['Produtos', 'Serviços', 'Parceria', 'Suporte']

function FlowPanel({ phase }: { phase: FlowPhase }) {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Cabeçalho do flow — não é o cabeçalho de app do WhatsApp (esse
          saiu), é a barra de título do próprio formulário, que a Meta
          renderiza dentro do flow. Neutro, sem verde. */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#f3f4f6] flex-shrink-0">
        {phase !== 'done' && <ChevronLeft className="w-4 h-4 text-[#111827]" />}
        <div className="flex-1">
          <p className="text-xs font-semibold leading-none text-[#111827]">Formulário de contato</p>
          {phase !== 'done' && (
            <p className="text-3xs text-[#6b7280] mt-0.5">
              {phase === 'q1' || phase === 'selecting' ? 'Passo 1 de 2' : 'Passo 2 de 2'}
            </p>
          )}
        </div>
        <X className="w-4 h-4 text-[#6b7280]" />
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {/* Q1 — single choice */}
          {(phase === 'q1' || phase === 'selecting') && (
            <motion.div
              key="q1"
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -28 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 p-3 space-y-3 overflow-y-auto"
            >
              <p className="text-xs font-semibold text-[#111827]">Qual é o seu interesse?</p>
              <div className="space-y-2">
                {FLOW_OPTIONS.map((opt, i) => {
                  const chosen = phase === 'selecting' && i === 1
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 px-3 py-2.5 border rounded-[6px] transition-all duration-200"
                      style={chosen
                        ? { borderColor: WA.azul, background: 'color-mix(in srgb, ' + WA.azul + ' 6%, transparent)' }
                        : { borderColor: '#e5e7eb' }}
                    >
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                        style={{ borderColor: chosen ? WA.azul : '#d1d5db' }}
                      >
                        {chosen && <div className="w-2 h-2 rounded-full" style={{ background: WA.azul }} />}
                      </div>
                      <span className={cn('text-2xs transition-colors', chosen && 'font-medium')} style={{ color: chosen ? WA.azul : '#374151' }}>
                        {opt}
                      </span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Q2 — text / preference */}
          {phase === 'q2' && (
            <motion.div
              key="q2"
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -28 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 p-3 space-y-3"
            >
              <p className="text-xs font-semibold text-[#111827]">Como prefere ser contatado?</p>
              <div
                className="rounded-[6px] px-3 py-2.5 flex items-center gap-2"
                style={{ background: 'color-mix(in srgb, ' + WA.azul + ' 8%, transparent)', border: '1px solid color-mix(in srgb, ' + WA.azul + ' 30%, transparent)' }}
              >
                <Check className="w-3.5 h-3.5" style={{ color: WA.azul }} />
                <span className="text-2xs font-medium" style={{ color: WA.azul }}>WhatsApp</span>
              </div>
              <div>
                <p className="text-3xs text-[#6b7280] mb-1.5">Seu nome completo</p>
                <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-[6px] px-3 py-2.5 text-2xs text-[#9ca3af] flex items-center gap-1">
                  <span className="inline-block w-0.5 h-3.5 bg-[#9ca3af] animate-pulse rounded-full" />
                  <span className="ml-1">Digitar aqui...</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Done screen */}
          {phase === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.88 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 18 }}
                className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center"
              >
                <Check className="w-7 h-7 text-emerald-600" />
              </motion.div>
              <div className="text-center">
                <p className="text-sm font-semibold text-[#111827]">Enviado com sucesso!</p>
                <p className="text-2xs text-[#6b7280] mt-1 leading-relaxed">
                  Nossa equipe entrará em contato em breve.
                </p>
              </div>
              <p className="text-2xs font-medium mt-1" style={{ color: WA.azul }}>Fechar</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom action button */}
      {phase !== 'done' && (
        <div className="px-3 py-3 border-t border-[#f3f4f6] flex-shrink-0">
          <div className="w-full text-white text-xs font-semibold py-2.5 rounded-[6px] flex items-center justify-center gap-1.5" style={{ background: WA.azul }}>
            {phase === 'q2' ? 'Enviar' : 'Próximo'}
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      )}
    </div>
  )
}
