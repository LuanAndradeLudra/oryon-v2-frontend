// ─── TemplateCard ──────────────────────────────────────────────────────────
// Um template da Biblioteca (D4/SCRUM-1023) como o mockup o desenha: a
// mensagem como ela chega no WhatsApp, com a etiqueta de situação por cima, e
// um rodapé com identificação, metadados e ações.
//
// A prévia é o `TemplatePreview` com `compact` + `theme="dark"`, e não uma
// bolha própria desta pasta. Decisão do Maestro, com o motivo certo: duas
// bolhas de WhatsApp em dois lugares divergem com o tempo, e a divergência
// que isso produz num produto de disparo é a pior possível — a prévia deixar
// de bater com o que foi enviado de verdade. Contrato acertado com a dona da
// D2 em `coord/D4-TemplatePreview-contrato.md`.
//
// Componente de apresentação: quem busca uso, atribuição e permissão é a tela
// (PR 3). Aqui nada é inventado — dado que não veio não é escrito.
import type { CSSProperties } from 'react'
import { Copy, Loader2, Pencil, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { accentColor, type Accent } from '@/components/ui/accentColor'
import { WabaAssignmentBadge } from '@/components/common/WabaAssignmentBadge'
import { CATEGORY_LABELS } from '../constants'
import { TemplatePreview, WHATSAPP_PALETTE } from '../TemplatePreview'
import { RejectedActions } from './RejectedActions'
import { STATUS_CHROME } from './statusChrome'
import type { TemplateCategoryType, WhatsAppTemplate } from '@/types'

/** Acento categórico da categoria — cor de produto, via token. */
const CATEGORY_ACCENT: Record<TemplateCategoryType, Accent> = {
  MARKETING:      'blue',
  UTILITY:        'green',
  AUTHENTICATION: 'violet',
}

interface TemplateCardProps {
  template: WhatsAppTemplate
  /** Quem usa este template hoje ("Automação \"carrinho 2h\""). Só automação
   *  tem esse vínculo no produto — agente não referencia template. */
  attribution?: string
  /** Rótulo humano do uso ("usado 12× · última hoje"), montado pela tela a
   *  partir do BE.8 para o card não precisar de `date-fns`. AUSENTE é o caso
   *  normal hoje: sem BE.8 não há uso, e a linha de metadados simplesmente
   *  não fala dele em vez de escrever "usado 0×". */
  usageLabel?: string
  canEdit: boolean
  /** Por que não dá para editar. Vira o `title` do lápis desabilitado — o
   *  botão fica visível de propósito, para a pessoa entender que não é um
   *  botão que faltou. */
  editBlockedReason?: string
  onEdit: () => void
  onUse: () => void
  onRewrite: () => void
  onDelete: () => void
  /** Só em conta multilinha — sem outra linha não há para onde clonar. */
  onDuplicate?: () => void
  /** Linha legada da Migration #045: o selo é o que torna a lacuna visível,
   *  e some da tela se ninguém o desenhar. */
  onAssignWaba: () => void
  deleting?: boolean
}

function variablesLabel(template: WhatsAppTemplate): string | null {
  const count = template.bodyVariables?.length ?? 0
  if (count === 0) return null
  return `${count} ${count === 1 ? 'variável' : 'variáveis'}`
}

function buttonsLabel(template: WhatsAppTemplate): string | null {
  const count = template.buttons?.length ?? 0
  if (count === 0) return null
  return `${count} ${count === 1 ? 'botão' : 'botões'}`
}

export function TemplateCard({
  template, attribution, usageLabel, canEdit, editBlockedReason,
  onEdit, onUse, onRewrite, onDelete, onDuplicate, onAssignWaba, deleting = false,
}: TemplateCardProps) {
  const rejected = template.status === 'REJECTED'
  const chrome = STATUS_CHROME[template.status]
  const StatusIcon = chrome.icon
  const accent = accentColor(CATEGORY_ACCENT[template.category])

  const meta = [
    // O código vem `pt_BR` do banco e o mockup escreve `pt-BR`.
    template.language.replace('_', '-'),
    variablesLabel(template),
    buttonsLabel(template),
    // "enviado à Meta há 6h" do mockup sai: não existe `submittedAt`, e
    // `updatedAt` erra assim que alguém edita depois de enviar. A frase sem
    // número é verdadeira sempre.
    template.status === 'PENDING' ? 'aguardando resposta da Meta' : usageLabel,
  ].filter(Boolean).join(' · ')

  return (
    <article
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border bg-surface-800',
        rejected ? 'border-[color-mix(in_srgb,var(--color-danger)_35%,transparent)]' : 'border-surface-700',
      )}
    >
      {/* Prévia — o fundo de conversa do WhatsApp escuro. */}
      <div
        className="relative flex flex-col gap-1.5 min-h-[150px] pt-4 px-3.5 pb-3.5 bg-[var(--wa-chat)]"
        style={WHATSAPP_PALETTE.dark as CSSProperties}
      >
        <span
          className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[12px] font-medium leading-[1.5]"
          style={{
            color: chrome.color,
            backgroundColor: `color-mix(in srgb, ${chrome.color} 12%, transparent)`,
            borderColor: `color-mix(in srgb, ${chrome.color} 25%, transparent)`,
          }}
        >
          <StatusIcon className="w-3 h-3" aria-hidden="true" />
          {chrome.label}
        </span>
        {/* 22px é o que o mockup reserva para a etiqueta não cobrir a bolha. */}
        <div className="mt-[22px]">
          <TemplatePreview template={template} compact theme="dark" />
        </div>
      </div>

      {/* Rodapé */}
      <div className="flex flex-col gap-1.5 px-3.5 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-[12.5px] font-semibold text-surface-100 truncate">{template.name}</span>
            {template.needsWabaAssignment && <WabaAssignmentBadge onClick={onAssignWaba} />}
          </span>
          <span
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-2xs font-semibold leading-[1.5]"
            style={{
              color: accent,
              backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)`,
              borderColor: `color-mix(in srgb, ${accent} 30%, transparent)`,
            } as CSSProperties}
          >
            {CATEGORY_LABELS[template.category]}
          </span>
        </div>

        {rejected ? (
          <RejectedActions reason={template.rejectionReason} onRewrite={onRewrite} />
        ) : (
          <p className="text-2xs text-surface-500">{meta}</p>
        )}

        <div className="mt-1 flex items-center justify-between gap-3">
          <span className="text-3xs text-surface-500 truncate">{rejected ? '' : (attribution ?? '')}</span>
          <div className="flex items-center gap-1 shrink-0">
            {/* No card recusado o lápis sai: "Reescrever e reenviar" já abre o
                criador com o mesmo template, e dois botões para o mesmo
                destino é pior que um. */}
            {!rejected && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEdit}
                  disabled={!canEdit}
                  title={canEdit ? 'Editar' : editBlockedReason}
                  aria-label="Editar template"
                  className="px-2"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
            )}
            {/* Duplicar e excluir NÃO estão no mockup, porque a conta dele tem
                uma linha só e nenhuma dívida legada. Some daqui e a Biblioteca
                perde duas capacidades que a aba de hoje tem. */}
            {onDuplicate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDuplicate}
                aria-label="Duplicar para outra linha"
                title="Duplicar para outra linha"
                className="px-2"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={deleting}
              aria-label="Excluir template"
              title="Excluir"
              className="px-2 hover:text-danger"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </Button>
            {/* Autenticação é disparada pelo fluxo de login, não por
                campanha — o mockup não oferece "Usar" nesse card. Recusado
                também não tem o que usar. */}
            {!rejected && template.category !== 'AUTHENTICATION' && (
              <Button
                variant={template.status === 'APPROVED' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={onUse}
                disabled={template.status !== 'APPROVED'}
                title={template.status === 'APPROVED' ? undefined : 'Só templates aprovados pela Meta podem ser disparados'}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Usar
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
