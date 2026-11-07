// Retomadas (06/11): enviar um MODELO de mensagem a um contato do plano. É o mesmo envio do
// "Enviar template" de Contatos (escolher, preencher as variáveis, revisar e confirmar), mas passa
// pelo plano para entrar no histórico dele. Fora da janela de 24 h, só modelo aprovado chega.
import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { TemplatePicker } from '@/components/templates/TemplatePicker'
import { TemplateSendModal } from '@/components/templates/TemplateSendModal'
import { followUpsApi, type ItemDoPlano } from '@/services/followUpsApi'
import type { WhatsAppTemplate } from '@/types'

export function EnviarModeloDoPlano({ planId, item, onFechar, onEnviado }: {
  planId: string
  item: ItemDoPlano
  onFechar: () => void
  onEnviado: (conversationId: string | null) => void
}) {
  const [modelo, setModelo] = useState<WhatsAppTemplate | null>(null)
  // Uma chave por abertura: o duplo clique (ou a nova tentativa da rede) não envia duas vezes.
  const [chave] = useState(() => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`))
  const nome = item.contact?.name || 'o contato'
  if (!item.contact) return null
  return (
    <>
      <Drawer open={!modelo} onClose={onFechar} side="right" className="sm:w-[420px] flex flex-col" ariaLabel={`Enviar modelo para ${nome}`}>
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-surface-700 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-surface-100">Enviar modelo de mensagem</h2>
            <p className="text-xs text-surface-400 truncate">Para {nome}</p>
          </div>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="p-1.5 rounded-[6px] text-surface-400 hover:text-surface-100 hover:bg-[var(--rowhover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <X className="w-4 h-4" aria-hidden />
          </button>
        </div>
        <div className="px-4 py-3 space-y-2 border-b border-surface-700 text-xs text-surface-300 leading-relaxed">
          <p>Escolha uma mensagem pronta. Antes de enviar você revisa o texto e preenche o que faltar (o nome, a data…).</p>
          <p className="text-surface-400">Modelo aprovado pelo WhatsApp chega mesmo para quem não escreve há mais de 24 h. O envio fica no histórico do plano.</p>
          {item.optedOut && (
            <p className="flex items-start gap-1.5 text-status-pending">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" aria-hidden />
              Esta pessoa pediu para não receber disparos. Envie só se for um retorno que ela pediu.
            </p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          <TemplatePicker onSelect={setModelo} />
        </div>
      </Drawer>
      <TemplateSendModal template={modelo} contactId={item.contact.id} recipientName={nome}
        onClose={onFechar} onBack={() => setModelo(null)}
        enviar={async (templateName, language, variables) => {
          const r = await followUpsApi.enviarModelo(planId, item.id, { templateName, language, variables, idempotencyKey: chave })
          return { conversationId: r.data.resultRef ?? '', messageId: '' }
        }}
        onSent={(r) => onEnviado(r.conversationId || null)} />
    </>
  )
}
