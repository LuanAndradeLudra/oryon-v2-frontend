import { ExternalLink, Phone, CornerDownLeft, Copy, Workflow } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { WhatsAppTemplate } from '@/types'

/** Paleta do WhatsApp — cromo de terceiro, não cor categórica do produto.
 *
 *  Os hex aqui são a paleta EXATA do WhatsApp; reproduzi-la é o ponto da
 *  prévia, então não passam por token do design system (mesma razão pela qual
 *  já estavam crus neste arquivo antes de existir a prop `theme`). A Carta §7
 *  pede token para cor do produto — esta não é.
 *
 *  A tabela entra como custom properties no `style` da raiz, e o JSX lê
 *  `var(--wa-*)` em classes LITERAIS. Uma classe montada em runtime
 *  (`'bg-[' + cor + ']'`) não existiria: o JIT do Tailwind v4 varre o texto do
 *  fonte e nunca a veria, e a falha seria silenciosa — classe no DOM sem regra
 *  por trás, invisível para `tsc`, lint e teste. Precedente da forma no repo:
 *  `layout/TopBar.tsx` (`bg-[var(--color-overlay)]`).
 *
 *  `light` reproduz exatamente os valores que este arquivo já tinha, para
 *  nenhum call-site existente mudar de aparência. */
export const WHATSAPP_PALETTE = {
  light: {
    '--wa-chat':       '#ECE5DD',
    '--wa-header':     '#075E54',
    '--wa-bubble':     '#FFFFFF',
    '--wa-text':       '#111827',
    '--wa-meta':       '#9ca3af',
    '--wa-action':     '#0078D7',
    '--wa-divider':    '#f3f4f6',
    // Placeholders de mídia. `ph-soft` e `ph-strong` existem porque o header
    // de DOCUMENT tem fundo e tom de texto próprios — reaproveitar `divider`
    // e `meta` aqui casaria por acidente no claro e erraria no escuro.
    '--wa-ph-bg':      '#e5e7eb',
    '--wa-ph-text':    '#6b7280',
    '--wa-ph-border':  '#e5e7eb',
    '--wa-ph-soft':    '#f3f4f6',
    '--wa-ph-strong':  '#4b5563',
    '--wa-video-bg':   '#1f2937',
    '--wa-video-text': '#9ca3af',
  },
  dark: {
    '--wa-chat':       '#0B141A',
    '--wa-header':     '#202C33',
    '--wa-bubble':     '#202C33',
    '--wa-text':       '#E9EDEF',
    '--wa-meta':       '#8696A0',
    '--wa-action':     '#53BDEB',
    '--wa-divider':    'rgba(255,255,255,.08)',
    '--wa-ph-bg':      '#2A3942',
    '--wa-ph-text':    '#8696A0',
    '--wa-ph-border':  'rgba(255,255,255,.08)',
    '--wa-ph-soft':    '#182229',
    '--wa-ph-strong':  '#D1D7DB',
    '--wa-video-bg':   '#111B21',
    '--wa-video-text': '#8696A0',
  },
} as const

export type WhatsAppTheme = keyof typeof WHATSAPP_PALETTE

interface TemplatePreviewProps {
  template: WhatsAppTemplate
  /** Optional variable substitution values: { '1': 'João', '2': 'Produto X' } */
  variables?: Record<string, string>
  compact?: boolean
  /** Paleta do WhatsApp a usar. `'light'` (padrão) é o tema claro, que é o que
   *  o Composer e o criador mostram hoje. `'dark'` é a paleta do WhatsApp
   *  escuro, usada nos cards da Biblioteca (D4). */
  theme?: WhatsAppTheme
}

function substituteVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\d+)\}\}/g, (_, n) => vars[n] ?? `{{${n}}}`)
}

import DOMPurify from 'dompurify'

const SAFE_TAGS = ['strong', 'em', 's', 'br']

function renderBody(text: string): string {
  // Convert WhatsApp markdown to HTML, then sanitize
  const html = text
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/~(.*?)~/g, '<s>$1</s>')
    .replace(/\n/g, '<br />')
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: SAFE_TAGS })
}

export function TemplatePreview({ template, variables = {}, compact = false, theme = 'light' }: TemplatePreviewProps) {
  const bodyText = substituteVars(template.body, variables)
  const headerText = template.headerText ? substituteVars(template.headerText, variables) : undefined

  return (
    <div
      className={compact ? '' : 'flex items-center justify-center'}
      style={WHATSAPP_PALETTE[theme] as CSSProperties}
    >
      <div className={compact ? 'w-full' : 'w-[280px]'}>
        {/* Phone mockup frame */}
        {!compact && (
          <div className="relative bg-[var(--wa-chat)] rounded-2xl overflow-hidden shadow-2xl border border-surface-700">
            {/* Status bar */}
            <div className="bg-[var(--wa-header)] text-white px-4 py-2 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                {template.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold leading-none">Empresa</p>
                <p className="text-[10px] text-white/60">online</p>
              </div>
            </div>

            {/* Chat area */}
            <div className="p-3 min-h-[280px]">
              <MessageBubble template={template} bodyText={bodyText} headerText={headerText} variables={variables} />
            </div>
          </div>
        )}

        {compact && (
          <MessageBubble template={template} bodyText={bodyText} headerText={headerText} variables={variables} />
        )}
      </div>
    </div>
  )
}

function MessageBubble({ template, bodyText, headerText }: {
  template: WhatsAppTemplate
  bodyText: string
  headerText?: string
  variables: Record<string, string>
}) {
  return (
    <div className="bg-[var(--wa-bubble)] rounded-xl overflow-hidden shadow-sm max-w-full">
      {/* Header */}
      {template.headerType === 'IMAGE' && (
        <div className="bg-[var(--wa-ph-bg)] h-40 flex items-center justify-center overflow-hidden">
          {template.headerMediaUrl
            ? <img src={template.headerMediaUrl} alt="header" className="w-full h-full object-cover" />
            : <span className="text-[var(--wa-ph-text)] text-xs">Imagem</span>
          }
        </div>
      )}
      {template.headerType === 'VIDEO' && (
        <div className="bg-[var(--wa-video-bg)] h-28 flex items-center justify-center">
          <span className="text-[var(--wa-video-text)] text-xs">▶ Vídeo</span>
        </div>
      )}
      {template.headerType === 'DOCUMENT' && (
        <div className="bg-[var(--wa-ph-soft)] px-3 py-2 flex items-center gap-2 border-b border-[var(--wa-ph-border)]">
          <span className="text-[10px] font-semibold text-[var(--wa-ph-strong)] bg-[var(--wa-ph-bg)] px-1.5 py-0.5 rounded">PDF</span>
          <span className="text-xs text-[var(--wa-ph-strong)] truncate">documento.pdf</span>
        </div>
      )}
      {template.headerType === 'TEXT' && headerText && (
        <div className="px-3 pt-3 pb-1">
          <p className="text-sm font-bold text-[var(--wa-text)]">{headerText}</p>
        </div>
      )}

      {/* Body */}
      <div className="px-3 pt-2 pb-1">
        <p
          className="text-[13px] text-[var(--wa-text)] leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderBody(bodyText) }}
        />
      </div>

      {/* Footer */}
      {template.footer && (
        <div className="px-3 pb-2">
          <p className="text-[11px] text-[var(--wa-meta)]">{template.footer}</p>
        </div>
      )}

      {/* Timestamp */}
      <div className="px-3 pb-2 flex justify-end">
        <span className="text-[10px] text-[var(--wa-meta)]">12:00 ✓✓</span>
      </div>

      {/* Buttons */}
      {template.buttons && template.buttons.length > 0 && (
        <div className="border-t border-[var(--wa-divider)] divide-y divide-[var(--wa-divider)]">
          {template.buttons.map((btn, i) => (
            <div key={i} className="flex items-center justify-center gap-1.5 py-2 text-[var(--wa-action)]">
              {btn.type === 'URL' && <ExternalLink className="w-3 h-3" />}
              {btn.type === 'PHONE_NUMBER' && <Phone className="w-3 h-3" />}
              {btn.type === 'QUICK_REPLY' && <CornerDownLeft className="w-3 h-3" />}
              {btn.type === 'COPY_CODE' && <Copy className="w-3 h-3" />}
              {btn.type === 'FLOW' && <Workflow className="w-3 h-3" />}
              <span className="text-xs font-medium">{btn.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
