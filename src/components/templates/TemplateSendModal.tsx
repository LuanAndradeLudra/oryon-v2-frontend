import { useEffect, useState } from 'react'
import { Send, Info, ChevronLeft } from 'lucide-react'
import { cn, getApiErrorMessage } from '@/lib/utils'
import type { WhatsAppTemplate } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Banner } from '@/components/ui/Banner'
import { Input } from '@/components/ui/Input'
import { TemplatePreview } from '@/components/campaigns/TemplatePreview'
import { templateVariableSlots, variablesComplete, variablesToArray } from '@/lib/templateVariables'
import { contactsApi } from '@/services/api'

// Modal "Revisar template" (SCRUM-807): o operador escolheu um template
// aprovado; aqui preenche as variáveis {{n}}, confere a prévia do WhatsApp e só
// então envia pela API real de template. Compartilhado entre o input de
// Conversas (janela de 24h fechada) e o "Iniciar conversa" dos Leads — um único
// diálogo de revisão/confirmação, sem segundo ConfirmModal por cima.

// Rótulos + acento dos chips de metadados.
const TEMPLATE_CATEGORY_META: Record<WhatsAppTemplate['category'], { label: string; dot: string }> = {
  MARKETING:      { label: 'Marketing',    dot: 'bg-brand-400' },
  UTILITY:        { label: 'Utilidade',    dot: 'bg-[#3B82F6]' },
  AUTHENTICATION: { label: 'Autenticação', dot: 'bg-warning' },
}
const TEMPLATE_HEADER_LABEL: Record<NonNullable<WhatsAppTemplate['headerType']>, string> = {
  TEXT: 'Texto', IMAGE: 'Imagem', VIDEO: 'Vídeo', DOCUMENT: 'Documento',
}

interface TemplateSendModalProps {
  /** Template escolhido; `null` = fechado. */
  template: WhatsAppTemplate | null
  contactId: string
  /** Quando informado, mostra o aviso de que uma mensagem real será enviada
   *  para essa pessoa (QW-07). Conversas já deixa isso claro pelo contexto. */
  recipientName?: string
  /** Encerra: X, Esc e — sem `onBack` — o botão "Cancelar". */
  onClose: () => void
  /** Quando o modal é uma ETAPA de um fluxo (Nova conversa): o botão do rodapé
   *  vira "Voltar" (canto esquerdo) e chama isto; X/Esc continuam encerrando. */
  onBack?: () => void
  /** Envio concluído (o modal NÃO se fecha sozinho — quem chama decide). */
  onSent: (result: { conversationId: string; messageId: string }) => void
}

export function TemplateSendModal({ template, contactId, recipientName, onClose, onBack, onSent }: TemplateSendModalProps) {
  // Valores das variáveis, chaves "1","2"… — o formato que o <TemplatePreview>
  // lê pro preview ao vivo. Resetados a cada template escolhido.
  const [vars, setVars] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setVars({})
    setError(null)
  }, [template])

  const slots = template ? templateVariableSlots(template) : []
  const ready = variablesComplete(slots, vars)
  const missing = slots.filter((s) => !(vars[s.key] ?? '').trim()).length

  const handleClose = () => { if (!sending) onClose() }
  const handleBack = () => { if (!sending) onBack?.() }

  const handleSend = async () => {
    if (!template || sending || !ready) return
    setSending(true)
    setError(null)
    try {
      // Meta template flow (R10/SCRUM-807): API real de template com variáveis
      // posicionais — não `tpl.body` como texto (falha fora das 24h).
      const res = await contactsApi.sendTemplate(contactId, template.name, template.language, variablesToArray(slots, vars))
      onSent(res.data)
    } catch (err) {
      // Mantém o modal aberto pra corrigir e tentar de novo. A mensagem já vem
      // classificada do backend (contagem de variáveis, template não aprovado,
      // códigos da Meta) — mostrada aqui, junto do formulário.
      setError(getApiErrorMessage(err, 'Não foi possível enviar o template. Tente novamente.'))
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      open={!!template}
      onClose={handleClose}
      title="Revisar template"
      className="max-w-2xl"
      footer={
        <div className="flex items-center justify-end gap-2">
          {onBack ? (
            <Button variant="neutral" className="mr-auto" onClick={handleBack} disabled={sending} leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}>
              Voltar
            </Button>
          ) : null}
          {error && (
            <p role="alert" className={cn('text-xs text-danger leading-snug min-w-0', onBack ? 'flex-1' : 'mr-auto')}>{error}</p>
          )}
          {!onBack && (
            <Button variant="neutral" onClick={handleClose} disabled={sending}>
              Cancelar
            </Button>
          )}
          <Button
            variant="primary"
            onClick={handleSend}
            loading={sending}
            disabled={!ready}
            title={ready ? undefined : 'Preencha todas as variáveis para enviar'}
            leftIcon={<Send className="w-4 h-4" />}
          >
            {sending ? 'Enviando…' : 'Enviar template'}
          </Button>
        </div>
      }
    >
      {template && (() => {
        const cat = TEMPLATE_CATEGORY_META[template.category]
        const btnCount = template.buttons?.length ?? 0
        const chip = 'inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-800 text-surface-300 border border-surface-700'
        return (
          <div className="space-y-4">
            {recipientName && (
              <Banner variant="warning">Uma mensagem real será enviada para {recipientName}.</Banner>
            )}
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
              {/* Metadata + variables */}
              <div className="order-2 md:order-1 min-w-0 space-y-4">
                <div className="space-y-2">
                  <h3 className="font-display text-lg font-semibold text-surface-50 leading-tight break-words">{template.name}</h3>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={chip}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', cat?.dot ?? 'bg-surface-500')} />
                      {cat?.label ?? template.category}
                    </span>
                    <span className={cn(chip, 'uppercase tracking-wide')}>{template.language}</span>
                    {template.headerType && (
                      <span className={chip}>Cabeçalho: {TEMPLATE_HEADER_LABEL[template.headerType]}</span>
                    )}
                    {btnCount > 0 && (
                      <span className={chip}>{btnCount} {btnCount === 1 ? 'botão' : 'botões'}</span>
                    )}
                  </div>
                </div>

                {/* SCRUM-807 — um campo por variável do CORPO; o preview ao lado
                    reflete o que o operador digita e o envio só libera com tudo
                    preenchido. Antes era só um aviso e o template ia sem
                    parâmetros ({{1}} cru / rejeição da Meta). */}
                {slots.length > 0 ? (
                  <div className="rounded-lg border border-surface-700 bg-[var(--sf2)] p-3 space-y-2.5">
                    <p className="text-[11px] font-semibold text-surface-200">
                      Preencha {slots.length === 1 ? 'a variável' : `as ${slots.length} variáveis`} do template
                    </p>
                    {slots.map((slot) => (
                      <label key={slot.key} className="block min-w-0">
                        <span className="flex items-center gap-2 text-[11px] mb-1">
                          <code className="text-accent-dark bg-accent-soft border border-brand-500/25 px-1.5 py-0.5 rounded font-mono shrink-0">{slot.placeholder}</code>
                          <span className="text-surface-300 truncate">{slot.label}</span>
                        </span>
                        <Input
                          type="text"
                          value={vars[slot.key] ?? ''}
                          onChange={(e) => setVars((prev) => ({ ...prev, [slot.key]: e.target.value }))}
                          placeholder={`Valor para ${slot.placeholder}`}
                          maxLength={1024}
                          disabled={sending}
                          aria-label={`Variável ${slot.placeholder} — ${slot.label}`}
                        />
                      </label>
                    ))}
                    {!ready && (
                      <p className="text-[11px] text-surface-400 leading-snug flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        {missing === 1 ? 'Falta 1' : `Faltam ${missing}`} de {slots.length}{' '}
                        {slots.length === 1 ? 'variável' : 'variáveis'} para liberar o envio.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-surface-500 leading-snug">Template sem variáveis — pronto para envio.</p>
                )}
              </div>

              {/* WhatsApp preview — SEM `compact` de propósito: este Modal
                  (className="max-w-2xl", 672px) não é um popover apertado, é uma
                  coluna `auto` de um grid de 2, com folga pro bubble de 296px
                  do TemplatePreview em tamanho cheio. */}
              <div className="order-1 md:order-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-surface-500 mb-2">Pré-visualização</p>
                <div className="rounded-lg bg-surface-950 border border-surface-700 p-4 flex items-center justify-center">
                  <TemplatePreview template={template} variables={vars} />
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </Modal>
  )
}
