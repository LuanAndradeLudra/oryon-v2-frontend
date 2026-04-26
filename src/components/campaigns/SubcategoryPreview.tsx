import { useEffect, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingBag, FileText, Truck, Copy, CreditCard,
  X, Check, ChevronLeft, ChevronRight, ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TemplateCategoryType } from '@/types'
import { Emoji } from '@/lib/emojiText'

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
  icon: React.ComponentType<{ className?: string }>
}

interface MsgConfig {
  contactInitial: string
  contactName:    string
  headerType:     'none' | 'image' | 'document' | 'text'
  headerLabel?:   string
  headerGradient?: string
  headerEmoji?:   string
  documentName?:  string
  body:           string
  footer?:        string
  buttons:        BtnDef[]
  description:    string
}

function getConfig(category: TemplateCategoryType, sub: SubCategory): MsgConfig {
  if (category === 'AUTHENTICATION') return {
    contactInitial: 'O', contactName: 'Oryon App',
    headerType: 'none',
    body: 'Seu código de verificação é:\n\n*847 291*\n\nVálido por 10 minutos.\nNão compartilhe este código.',
    buttons: [{ label: 'Copiar código', icon: Copy }],
    description: 'O código OTP é copiado com 1 toque — sem digitação.',
  }

  switch (sub) {
    case 'catalog': return {
      contactInitial: 'L', contactName: 'Loja Online',
      headerType: 'image',
      headerGradient: 'from-blue-300 to-indigo-400',
      headerEmoji: '',
      body: 'Novidades da loja! Confira nossa coleção completa com os últimos lançamentos.',
      footer: 'Frete grátis acima de R$ 150',
      buttons: [{ label: 'Ver catálogo', icon: ShoppingBag }],
      description: 'Ao tocar, o catálogo de produtos abre dentro do WhatsApp.',
    }

    case 'flows': return {
      contactInitial: 'E', contactName: 'Empresa',
      headerType: 'image',
      headerGradient: 'from-violet-300 to-purple-400',
      headerEmoji: '',
      body: 'Que tal um orçamento personalizado? Responda algumas perguntas rápidas.',
      buttons: [{ label: 'Abrir formulário', icon: ChevronRight }],
      description: 'Flow interativo — formulário completo dentro do WhatsApp.',
    }

    case 'order_details': return {
      contactInitial: 'E', contactName: 'E-commerce',
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
      contactInitial: 'E', contactName: 'E-commerce',
      headerType: 'text',
      headerLabel: 'Pedido a caminho!',
      body: 'Seu pedido #45678 saiu para entrega.\nPrevisão: hoje entre 14h e 18h.',
      footer: 'Acompanhe pelo rastreador abaixo',
      buttons: [{ label: 'Rastrear pedido', icon: Truck }],
      description: 'Atualização automática do status de entrega em tempo real.',
    }

    default:
      if (category === 'UTILITY') return {
        contactInitial: 'E', contactName: 'Empresa',
        headerType: 'none',
        body: 'Seu agendamento para *amanhã às 14h* está confirmado.\nConfirme sua presença abaixo.',
        buttons: [
          { label: 'Confirmar presença', icon: Check },
          { label: 'Cancelar',           icon: X },
        ],
        description: 'Notificação transacional com botões de ação direta.',
      }
      return {
        contactInitial: 'L', contactName: 'Loja',
        headerType: 'image',
        headerGradient: 'from-amber-200 to-orange-300',
        headerEmoji: '',
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

  return (
    <div className="space-y-2.5">
      {/* Phone-style container */}
      <div
        className="relative rounded-2xl overflow-hidden bg-[#ECE5DD] border border-surface-700/30 shadow-inner"
        style={{ minHeight: 440 }}
      >
        {/* WhatsApp top bar */}
        <div className="bg-[#075E54] text-white px-3 py-2 flex items-center gap-2">
          <ChevronLeft className="w-3.5 h-3.5 text-white/70 flex-shrink-0" />
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {cfg.contactInitial}
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold leading-none">{cfg.contactName}</p>
            <p className="text-[10px] text-white/55 mt-0.5">online</p>
          </div>
          <div className="flex items-center gap-2.5 opacity-60">
            <div className="w-1 h-1 rounded-full bg-white" />
            <div className="w-1 h-1 rounded-full bg-white" />
            <div className="w-1 h-1 rounded-full bg-white" />
          </div>
        </div>

        {/* Chat area */}
        <div className="p-2.5 pt-3">
          <MessageBubble cfg={cfg} isTapping={isTapping} subCategory={subCategory} />
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
              className="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl overflow-hidden"
              style={{ height: 320 }}
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
          <div className="absolute top-11 right-2.5 flex items-center gap-1 bg-black/50 text-white text-[9px] font-medium px-2 py-1 rounded-full backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ao vivo
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-[11px] text-surface-500 text-center leading-relaxed px-2">
        {cfg.description}
      </p>
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  cfg, isTapping, subCategory,
}: {
  cfg: MsgConfig
  isTapping: boolean
  subCategory: SubCategory
}) {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm" style={{ maxWidth: '92%' }}>
      {/* Header: image gradient */}
      {cfg.headerType === 'image' && (
        <div className={cn('h-[96px] flex items-center justify-center bg-gradient-to-br', cfg.headerGradient ?? 'from-surface-200 to-surface-300')}>
          <ImageIcon className="w-8 h-8 text-white/60" />
        </div>
      )}

      {/* Header: document */}
      {cfg.headerType === 'document' && (
        <div className="bg-[#f8f8f8] px-3 py-2 flex items-center gap-2.5 border-b border-[#e5e5e5]">
          <div className="w-9 h-11 bg-red-50 border border-red-100 rounded-lg flex flex-col items-center justify-center gap-0.5 flex-shrink-0">
            <FileText className="w-4 h-4 text-red-500" />
            <span className="text-[7px] font-bold text-red-400 uppercase">pdf</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-[#374151] leading-tight truncate">{cfg.documentName}</p>
            <p className="text-[10px] text-[#6b7280] mt-0.5">2.4 MB · PDF</p>
          </div>
        </div>
      )}

      {/* Header: text */}
      {cfg.headerType === 'text' && (
        <div className="px-3 pt-2.5">
          <p className="text-xs font-bold text-[#111827]">{cfg.headerLabel}</p>
        </div>
      )}

      {/* Body */}
      <div className="px-3 pt-2 pb-1">
        <p
          className="text-[12px] text-[#111827] leading-relaxed whitespace-pre-line"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(
              cfg.body
                .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br/>'),
              { ALLOWED_TAGS: ['strong', 'em', 's', 'br'] },
            ),
          }}
        />
      </div>

      {/* Order details summary (inline) */}
      {subCategory === 'order_details' && (
        <div className="mx-3 mb-1 bg-[#f8f8f8] border border-[#e5e5e5] rounded-lg px-2.5 py-2 space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-[#6b7280]">Camiseta Básica (M)</span>
            <span className="text-[#374151] font-medium">R$ 89,90</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-[#6b7280]">Tênis Running (42)</span>
            <span className="text-[#374151] font-medium">R$ 299,00</span>
          </div>
          <div className="flex justify-between text-[10px] border-t border-[#e5e5e5] pt-1">
            <span className="font-semibold text-[#1f2937]">Total</span>
            <span className="font-bold text-[#111827]">R$ 388,90</span>
          </div>
        </div>
      )}

      {/* Footer */}
      {cfg.footer && (
        <div className="px-3 pb-1">
          <p className="text-[10px] text-[#9ca3af]">{cfg.footer}</p>
        </div>
      )}

      {/* Timestamp */}
      <div className="px-3 pb-1.5 flex justify-end">
        <span className="text-[10px] text-[#9ca3af]">12:47 ✓✓</span>
      </div>

      {/* Action buttons */}
      <div className="border-t border-[#f3f4f6] divide-y divide-[#f3f4f6]">
        {cfg.buttons.map((btn, i) => {
          const Icon = btn.icon
          const tapHighlight = isTapping && i === 0
          return (
            <motion.div
              key={i}
              animate={tapHighlight ? { backgroundColor: '#EFF6FF' } : { backgroundColor: '#FFFFFF' }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center gap-1.5 py-2"
            >
              <Icon className={cn('w-3 h-3 transition-colors', tapHighlight ? 'text-blue-700' : 'text-[#0078D7]')} />
              <span className={cn('text-xs font-medium transition-colors', tapHighlight ? 'text-blue-700' : 'text-[#0078D7]')}>
                {btn.label}
              </span>
            </motion.div>
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
        <ChevronLeft className="w-4 h-4 text-[#0078D7]" />
        <p className="text-xs font-semibold text-[#111827] flex-1">Catálogo da loja</p>
        <span className="text-[10px] text-[#6b7280] bg-[#f3f4f6] px-1.5 py-0.5 rounded-full">{PRODUCTS.length} itens</span>
      </div>

      {/* Products list */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#f9fafb]">
        {PRODUCTS.map((p, i) => (
          <div key={i} className="flex items-center gap-2.5 px-3 py-2.5">
            <div className={cn('w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0', p.gradient)}>
              <Emoji native={p.emoji} size="1.75rem" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-[#111827] leading-tight">{p.name}</p>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">{p.price}</p>
            </div>
            <button className="bg-[#0078D7] text-white text-[10px] px-2 py-1 rounded-lg font-medium flex-shrink-0 whitespace-nowrap">
              + Add
            </button>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-[#f3f4f6] px-3 py-2 flex-shrink-0">
        <p className="text-[11px] text-center text-[#0078D7] font-medium">Ver todos os produtos →</p>
      </div>
    </div>
  )
}

// ─── Flow panel ───────────────────────────────────────────────────────────────

const FLOW_OPTIONS = ['Produtos', 'Serviços', 'Parceria', 'Suporte']

function FlowPanel({ phase }: { phase: FlowPhase }) {
  return (
    <div className="flex flex-col h-full bg-white">
      {/* WA-style header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-[#075E54] text-white flex-shrink-0">
        {phase !== 'done' && <ChevronLeft className="w-4 h-4 opacity-75" />}
        <div className="flex-1">
          <p className="text-xs font-semibold leading-none">Formulário de contato</p>
          {phase !== 'done' && (
            <p className="text-[10px] text-white/55 mt-0.5">
              {phase === 'q1' || phase === 'selecting' ? 'Passo 1 de 2' : 'Passo 2 de 2'}
            </p>
          )}
        </div>
        <X className="w-4 h-4 opacity-60" />
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
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2.5 border rounded-xl transition-all duration-200',
                        chosen ? 'border-[#0078D7] bg-blue-50' : 'border-[#e5e7eb]'
                      )}
                    >
                      <div className={cn(
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                        chosen ? 'border-[#0078D7]' : 'border-[#d1d5db]'
                      )}>
                        {chosen && <div className="w-2 h-2 rounded-full bg-[#0078D7]" />}
                      </div>
                      <span className={cn(
                        'text-[11px] transition-colors',
                        chosen ? 'text-[#0078D7] font-medium' : 'text-[#374151]'
                      )}>
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
              <div className="bg-[#0078D7]/8 border border-[#0078D7]/30 rounded-xl px-3 py-2.5 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#0078D7]" />
                <span className="text-[11px] text-[#0078D7] font-medium">WhatsApp</span>
              </div>
              <div>
                <p className="text-[10px] text-[#6b7280] mb-1.5">Seu nome completo</p>
                <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-3 py-2.5 text-[11px] text-[#9ca3af] flex items-center gap-1">
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
                <p className="text-[11px] text-[#6b7280] mt-1 leading-relaxed">
                  Nossa equipe entrará em contato em breve.
                </p>
              </div>
              <p className="text-[11px] text-[#0078D7] font-medium mt-1">Fechar</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom action button */}
      {phase !== 'done' && (
        <div className="px-3 py-3 border-t border-[#f3f4f6] flex-shrink-0">
          <div className="w-full bg-[#0078D7] text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5">
            {phase === 'q2' ? 'Enviar' : 'Próximo'}
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      )}
    </div>
  )
}
