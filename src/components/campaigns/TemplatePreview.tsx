import { cn } from '@/lib/utils'
import type { WhatsAppTemplate } from '@/types'

interface TemplatePreviewProps {
  template: WhatsAppTemplate
  /** Optional variable substitution values: { '1': 'João', '2': 'Produto X' } */
  variables?: Record<string, string>
  compact?: boolean
  /** Só importa com `compact` (spec 2c, CAMP-PREVIEW-01/TPL-08): 'frame' —
   *  bolha dentro do fundo de conversa do WhatsApp com pílula "Hoje" (usado
   *  no resumo do CampaignWizard); 'card' — bolha densa e clampada, sem
   *  fundo de conversa próprio (usado dentro do card de TemplatesTab, que já
   *  tem o próprio wrapper #EFE7DD). Default 'frame'. */
  variant?: 'frame' | 'card'
}

// CAMP-PREVIEW-04: variável substituída entra em negrito — mais perto de como
// o WhatsApp de verdade destaca o valor preenchido num template.
function substituteVarsHtml(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const v = vars[n]
    return v ? `<strong>${v}</strong>` : `{{${n}}}`
  })
}

import DOMPurify from 'dompurify'

const SAFE_TAGS = ['strong', 'em', 's', 'br']

function renderBody(text: string, vars: Record<string, string>): string {
  // Convert WhatsApp markdown to HTML, substitute variables (already bold),
  // then sanitize.
  const html = text
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/~(.*?)~/g, '<s>$1</s>')
    .replace(/\n/g, '<br />')
  const withVars = substituteVarsHtml(html, vars)
  return DOMPurify.sanitize(withVars, { ALLOWED_TAGS: SAFE_TAGS })
}

export function TemplatePreview({ template, variables = {}, compact = false, variant = 'frame' }: TemplatePreviewProps) {
  const headerText = template.headerText ? template.headerText.replace(/\{\{(\d+)\}\}/g, (_, n) => variables[n] ?? `{{${n}}}`) : undefined

  if (compact && variant === 'card') {
    return <MessageBubble template={template} bodyText={template.body} headerText={headerText} variables={variables} dense />
  }

  if (compact) {
    // CAMP-PREVIEW-01/02: bolha dentro do fundo de conversa (sem moldura de
    // celular), com a pílula "Hoje" que separa o dia — mesmo vocabulário do
    // preview cheio, só sem status bar.
    return (
      <div className="rounded-xl bg-[#EFE7DD] border border-surface-700 px-2.5 py-3 flex flex-col gap-1.5 min-h-[230px]">
        <span className="self-center text-[10px] text-[#54656F] bg-white px-2 py-0.5 rounded-xs shadow-[0_1px_1px_rgba(0,0,0,.08)]">Hoje</span>
        <MessageBubble template={template} bodyText={template.body} headerText={headerText} variables={variables} />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center">
      <div className="w-[280px]">
        {/* Phone mockup frame — CAMP-PREVIEW-07: sem shadow-2xl (única sombra
            fora de overlay é a da própria bolha). */}
        <div className="relative bg-[#EFE7DD] rounded-2xl overflow-hidden border border-surface-700">
          {/* Status bar */}
          <div className="bg-[#075E54] text-white px-4 py-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
              {template.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-semibold leading-none">Empresa</p>
              <p className="text-[10px] text-white/60">online</p>
            </div>
          </div>

          {/* Chat area */}
          <div className="p-3 min-h-[280px] flex flex-col gap-1.5">
            <span className="self-center text-[10px] text-[#54656F] bg-white px-2 py-0.5 rounded-xs shadow-[0_1px_1px_rgba(0,0,0,.08)]">Hoje</span>
            <MessageBubble template={template} bodyText={template.body} headerText={headerText} variables={variables} />
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ template, bodyText, headerText, variables, dense = false }: {
  template: WhatsAppTemplate
  bodyText: string
  headerText?: string
  variables: Record<string, string>
  dense?: boolean
}) {
  return (
    <>
      {/* CAMP-PREVIEW-03/07: raio "cauda" (canto de 2px), sombra fina de
          bolha real (não shadow-sm genérico), largura máxima 92% em vez de
          preencher o container inteiro. */}
      <div className={cn(
        'bg-white overflow-hidden shadow-[0_1px_1px_rgba(0,0,0,.08)] max-w-[92%]',
        dense ? 'rounded-[6px_6px_6px_2px]' : 'rounded-[8px_8px_8px_2px]',
      )}>
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
          <div className={dense ? 'px-2 pt-1.5' : 'px-3 pt-3 pb-1'}>
            <p className="text-sm font-bold text-[#111B21]">{headerText}</p>
          </div>
        )}

        {/* Body — CAMP-PREVIEW-01 dense (TPL-08): 11px/1.4, clamp de 3 linhas. */}
        <div className={dense ? 'px-2 pt-1.5 pb-1' : 'px-2 pt-1.5 pb-1'}>
          <p
            className={cn('text-[#111B21]', dense ? 'text-[11px] leading-[1.4] line-clamp-3' : 'text-xs leading-[1.4]')}
            dangerouslySetInnerHTML={{ __html: renderBody(bodyText, variables) }}
          />
        </div>

        {/* Footer */}
        {template.footer && (
          <div className="px-2 pb-2">
            <p className="text-[11px] text-[#9ca3af]">{template.footer}</p>
          </div>
        )}

        {/* Timestamp */}
        <div className="px-2 pb-2 flex justify-end">
          <span className="text-[10px] text-[#667781]">12:00 ✓✓</span>
        </div>
      </div>

      {/* Buttons — CAMP-PREVIEW-06: cards irmãos fora da bolha, sem ícone. */}
      {!dense && template.buttons && template.buttons.length > 0 && (
        <div className="flex flex-col gap-1.5 max-w-[92%]">
          {template.buttons.map((btn, i) => (
            <div key={i} className="bg-white rounded-lg p-2 text-center text-xs font-medium text-[#027EB5] shadow-[0_1px_1px_rgba(0,0,0,.08)]">
              {btn.text}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
