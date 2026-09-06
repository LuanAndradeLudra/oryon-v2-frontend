// ─── Painel de 420 da caixa de transferências (A6 / SCRUM-1017) ──────────────
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRightLeft, ExternalLink, Sparkles, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { UserPicker } from '@/components/ui/UserPicker'
import { accentColor, tint } from '@/components/ui/accentColor'
import { MessageList } from '@/components/conversations/ChatWindow/MessageList'
import { useToast } from '@/hooks/useToast'
import { conversationsApi, usersApi } from '@/services/api'
import type { User } from '@/types'
import type { HandoffItem } from '@/types/agentsOps'
import { AiSummaryCard } from './AiSummaryCard'
import { acentoDoNome } from './handoffRowCore'
import { useHandoffDetail } from './useHandoffDetail'

export function HandoffDetailPanel({
  item,
  ocupada,
  onAssumir,
  onAcao,
}: {
  item: HandoffItem
  ocupada?: boolean
  onAssumir: () => void
  /** Avisa a fila para recarregar depois de um encaminhamento. */
  onAcao: () => void
}) {
  const d = useHandoffDetail(item)
  const navigate = useNavigate()
  const { toast } = useToast()
  const [encaminhando, setEncaminhando] = useState(false)
  const [usuarios, setUsuarios] = useState<User[]>([])

  // Carrega só quando o seletor abre: encaminhar é a ação menos frequente do
  // painel e não justifica uma chamada por conversa selecionada.
  useEffect(() => {
    if (!encaminhando || usuarios.length > 0) return
    let vivo = true
    usersApi.list()
      .then((r) => { if (vivo) setUsuarios(r.data) })
      .catch(() => { if (vivo) toast('Não foi possível carregar os atendentes.', 'error') })
    return () => { vivo = false }
  }, [encaminhando, usuarios.length, toast])

  const acento = acentoDoNome(item.contact.name)
  const inicial = item.contact.name.trim().charAt(0).toUpperCase() || '?'
  const transferidaAs = new Date(item.createdAt)
  const hora = Number.isFinite(transferidaAs.getTime())
    ? transferidaAs.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null

  async function encaminhar(userId: string) {
    try {
      await conversationsApi.transfer(item.conversationId, userId)
      toast('Conversa encaminhada.', 'success')
      onAcao()
    } catch {
      toast('Não foi possível encaminhar agora.', 'error')
    } finally {
      setEncaminhando(false)
    }
  }

  return (
    <aside className="flex h-full min-w-0 flex-col border-l border-surface-800 bg-surface-900">
      <header className="flex items-start justify-between gap-3 border-b border-surface-800 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border font-display text-xs font-bold"
            style={{ background: tint(acento, 15), color: accentColor(acento), borderColor: tint(acento, 28) }}
          >
            {inicial}
          </span>
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-surface-100">{item.contact.name}</div>
            {/* O subtítulo do mockup traz "3 pedidos · NPS 7", que NÃO existem
                em contrato nenhum. Renderizo só o que existe; o resto não vira
                travessão, simplesmente não aparece — `—` em subtítulo é ruído,
                não informação. */}
            <div className="truncate text-3xs text-surface-500">{item.contact.phoneMasked}</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Abrir conversa"
          onClick={() => navigate(`/conversations/${item.conversationId}`)}
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-4">
        <AiSummaryCard origem={d.origem} resumo={d.resumo} analise={d.analise} />

        {/* O marco da transferência entra como bloco FIXO acima da lista, não
            como item sintético no meio das mensagens: injetar no meio exigiria
            mexer no `MessageList`, que é de `conversations/**` e não é meu. */}
        {hora && (
          <div className="self-center rounded-full border border-surface-700 bg-surface-800 px-2.5 py-0.5 text-3xs text-surface-500">
            Transferida às {hora}
          </div>
        )}

        <div className="min-h-0 flex-1">
          {/* Reuso, não cópia: o `MessageList` é props-only, já agrupa por
              remetente e já desenha separador de data. */}
          <MessageList
            messages={d.mensagens}
            loading={d.carregandoMensagens}
            hasMore={d.temMais}
            onLoadMore={d.carregarMais}
          />
        </div>
      </div>

      <footer className="flex flex-col gap-2 border-t border-surface-800 px-4 py-3">
        {/* Uma sugestão, não duas: o mockup mostra dois chips, mas `nextAction`
            do `/analysis` é UMA string. Não fabrico a segunda para preencher o
            layout, e o chip só aparece quando o campo existe. */}
        {d.analise?.nextAction && (
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(d.analise!.nextAction!)
              toast('Sugestão copiada.', 'success')
            }}
            className="flex items-center gap-1.5 self-start rounded-full border border-surface-700 bg-surface-800 px-2.5 py-1 text-3xs text-surface-300 transition-colors hover:border-surface-600"
          >
            <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
            {d.analise.nextAction}
          </button>
        )}

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            className="flex-1"
            disabled={ocupada}
            onClick={onAssumir}
            leftIcon={<UserCheck className="h-4 w-4" />}
          >
            Assumir conversa
          </Button>
          {/* Encaminhar é PESSOA-A-PESSOA no v1. Encaminhar para outra FILA não
              existe como operação hoje, nem no BE.6 — então o seletor abre
              direto na lista de pessoas e eu não renderizo uma aba "Fila" nem
              desabilitada: controle desabilitado anuncia capacidade que não
              existe e gera chamado de suporte. */}
          <UserPicker
            open={encaminhando}
            onClose={() => setEncaminhando(false)}
            users={usuarios}
            label="Encaminhar para"
            align="right"
            onSelect={(u) => { if (u) void encaminhar(u.id) }}
            anchor={
              <Button
                variant="secondary"
                disabled={ocupada}
                onClick={() => setEncaminhando((v) => !v)}
                leftIcon={<ArrowRightLeft className="h-4 w-4" />}
              >
                Encaminhar
              </Button>
            }
          />
        </div>
      </footer>
    </aside>
  )
}
