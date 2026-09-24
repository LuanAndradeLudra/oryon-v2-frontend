import { useState, useEffect, useMemo } from 'react'
import { Send, Loader2, MessageSquare, AlertCircle } from 'lucide-react'
import { templatesApi } from '@/services/api'
import { cn } from '@/lib/utils'
import type { WhatsAppTemplate } from '@/types'

/**
 * Lista de templates APROVADOS para escolher um — extraída do
 * SendTemplateDrawer (SCRUM-1097) para ser a mesma peça no drawer "Iniciar
 * conversa" do contato e no passo "O quê" da "Nova conversa".
 *
 * Carrega `templatesApi.list('APPROVED')` sozinha ao montar (montar de novo =
 * recarregar: quem precisa de dado fresco a cada abertura só desmonta ao
 * fechar). Só renderiza carregando / erro / vazio / lista — o contêiner e a
 * rolagem são de quem a usa.
 */
export interface TemplatePickerProps {
  /** Escolheu um template (a revisão de variáveis e o envio são do chamador). */
  onSelect: (template: WhatsAppTemplate) => void
  /** Filtro por texto (nome e corpo, sem acento nem caixa). Vazio = tudo. */
  query?: string
  className?: string
}

/** minúsculas + sem diacríticos: "Olá" casa com "ola". */
function norm(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function templateMatches(tpl: WhatsAppTemplate, query: string): boolean {
  const q = norm(query.trim())
  if (!q) return true
  return norm(tpl.name.replace(/_/g, ' ')).includes(q) || norm(tpl.body ?? '').includes(q)
}

export function TemplatePicker({ onSelect, query = '', className }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  // `attempt` só existe pra "Tentar novamente" refazer a busca sem chamar
  // setState no corpo do efeito (a busca inicial não precisa de nada: o estado
  // já nasce em `loading`).
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    templatesApi.list('APPROVED')
      .then((r) => { if (!cancelled) setTemplates(Array.isArray(r.data) ? r.data : []) })
      .catch(() => { if (!cancelled) { setTemplates([]); setFailed(true) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [attempt])

  const retry = () => {
    setLoading(true)
    setFailed(false)
    setAttempt((n) => n + 1)
  }

  const visible = useMemo(() => templates.filter((t) => templateMatches(t, query)), [templates, query])

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-16', className)} role="status" aria-label="Carregando templates">
        <Loader2 className="w-5 h-5 text-accent-dark animate-spin" />
      </div>
    )
  }

  // Falha de rede/servidor NÃO é "não há templates": dizer que não há seria
  // afirmar algo que não sabemos.
  if (failed) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16 gap-3 px-6 text-center', className)}>
        <AlertCircle className="w-8 h-8 text-surface-600" />
        <p className="text-sm text-surface-400">Não foi possível carregar os templates.</p>
        <button
          type="button"
          onClick={retry}
          className="text-xs text-accent-dark hover:opacity-80 font-medium underline underline-offset-2"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16 gap-3 px-6 text-center', className)}>
        <MessageSquare className="w-8 h-8 text-surface-600" />
        <p className="text-sm text-surface-400">Nenhum template aprovado disponível.</p>
        <p className="text-xs text-surface-600">Crie templates em Disparos e aguarde aprovação da Meta.</p>
      </div>
    )
  }

  if (visible.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16 gap-2 px-6 text-center', className)}>
        <p className="text-sm text-surface-400">Nenhum template encontrado para “{query.trim()}”.</p>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col divide-y divide-surface-700', className)}>
      {visible.map((tpl) => (
        <button
          key={tpl.id}
          type="button"
          onClick={() => onSelect(tpl)}
          className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--rowhover)] transition-colors text-left group"
        >
          <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0 mt-0.5">
            <MessageSquare className="w-4 h-4 text-surface-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-medium text-surface-200 truncate">{tpl.name.replace(/_/g, ' ')}</p>
              <span className="text-[10px] text-surface-600 bg-surface-800 px-1.5 py-0.5 rounded">{tpl.language}</span>
            </div>
            <p className="text-xs text-surface-400 line-clamp-2">{tpl.body}</p>
            {tpl.footer && (
              <p className="text-[10px] text-surface-600 mt-1 italic">{tpl.footer}</p>
            )}
          </div>
          <div className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100 transition-opacity">
            <Send className="w-4 h-4 text-accent-dark" />
          </div>
        </button>
      ))}
    </div>
  )
}
