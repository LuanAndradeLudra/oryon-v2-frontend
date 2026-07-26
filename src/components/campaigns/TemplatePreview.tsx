import { ExternalLink, Phone, CornerDownLeft, Copy, Workflow } from 'lucide-react'
import type { WhatsAppTemplate } from '@/types'

interface TemplatePreviewProps {
  template: WhatsAppTemplate
  /** Optional variable substitution values: { '1': 'João', '2': 'Produto X' } */
  variables?: Record<string, string>
  compact?: boolean
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

export function TemplatePreview({ template, variables = {}, compact = false }: TemplatePreviewProps) {
  const bodyText = substituteVars(template.body, variables)
  const headerText = template.headerText ? substituteVars(template.headerText, variables) : undefined

  return (
    <div className={compact ? '' : 'flex items-center justify-center'}>
      <div className={compact ? 'w-full' : 'w-[280px]'}>
        {/* Phone mockup frame */}
        {!compact && (
          <div className="relative bg-[#ECE5DD] rounded-2xl overflow-hidden shadow-2xl border border-surface-700">
            {/* Status bar */}
            <div className="bg-[#075E54] text-white px-4 py-2 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                {(template.name ?? '?').slice(0, 2).toUpperCase()}
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

function MessageBubble({ template, bodyText, headerText, variables }: {
  template: WhatsAppTemplate
  bodyText: string
  headerText?: string
  variables: Record<string, string>
}) {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm max-w-full">
      {/* Header */}
      {template.headerType === 'IMAGE' && (
        <div className="bg-[#e5e7eb] h-40 flex items-center justify-center overflow-hidden">
          {template.headerMediaUrl
            ? <img src={template.headerMediaUrl} alt="header" className="w-full h-full object-cover" />
            : <span className="text-[#6b7280] text-xs">Imagem</span>
          }
        </div>
      )}
      {template.headerType === 'VIDEO' && (
        <div className="bg-[#1f2937] h-28 flex items-center justify-center">
          <span className="text-[#9ca3af] text-xs">▶ Vídeo</span>
        </div>
      )}
      {template.headerType === 'DOCUMENT' && (
        <div className="bg-[#f3f4f6] px-3 py-2 flex items-center gap-2 border-b border-[#e5e7eb]">
          <span className="text-[10px] font-semibold text-[#4b5563] bg-[#e5e7eb] px-1.5 py-0.5 rounded">PDF</span>
          <span className="text-xs text-[#4b5563] truncate">documento.pdf</span>
        </div>
      )}
      {template.headerType === 'TEXT' && headerText && (
        <div className="px-3 pt-3 pb-1">
          <p className="text-sm font-bold text-[#111827]">{headerText}</p>
        </div>
      )}

      {/* Body */}
      <div className="px-3 pt-2 pb-1">
        <p
          className="text-[13px] text-[#111827] leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderBody(bodyText) }}
        />
      </div>

      {/* Footer */}
      {template.footer && (
        <div className="px-3 pb-2">
          <p className="text-[11px] text-[#9ca3af]">{template.footer}</p>
        </div>
      )}

      {/* Timestamp */}
      <div className="px-3 pb-2 flex justify-end">
        <span className="text-[10px] text-[#9ca3af]">12:00 ✓✓</span>
      </div>

      {/* Buttons */}
      {template.buttons && template.buttons.length > 0 && (
        <div className="border-t border-[#f3f4f6] divide-y divide-[#f3f4f6]">
          {template.buttons.map((btn, i) => (
            <div key={i} className="flex items-center justify-center gap-1.5 py-2 text-[#0078D7]">
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
