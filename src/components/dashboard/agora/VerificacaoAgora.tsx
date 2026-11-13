import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { formatarEspera } from '@/lib/filaAgora'
import type { Conversation } from '@/types'

// "Precisam de verificação" (PO 28/09): conversas em que a IA disse ter feito
// algo — marcar, cancelar, registrar — que o sistema não confirmou. O backend
// já passou a conversa para uma pessoa e avisou a gestão (SCRUM-806); o que
// falta é alguém conferir com o cliente. A verificação em si (e o "marcar como
// verificada") acontece na conversa, onde está o contexto — daqui só se abre.
//
// 12/11 (João): altura FIXA de 5 conversas, com rolagem interna na lista (sem páginas). Com menos
// de 5, ou nenhuma, o cartão mantém a mesma altura — a estrutura da tela não pula.

/** Altura da lista = 5 linhas de 52 px (com as divisórias). */
const ALTURA_DA_LISTA = 'h-[261px]'

function nomeDe(u: { firstName: string; lastName?: string | null }): string {
  return [u.firstName, u.lastName].filter(Boolean).join(' ')
}

interface Props {
  conversas: Conversation[]
  /** Total no backend — pode passar do que foi lido. */
  total: number
  meuId: string | undefined
  agora: number
  /** Sem uso desde 12/11 (a lista rola em vez de paginar); mantidos para quem ainda passa. */
  pagina?: number
  onPagina?: (p: number) => void
  onAbrir: (c: Conversation) => void
}

export function VerificacaoAgora({ conversas, total, meuId, agora, onAbrir }: Props) {
  return (
    <section
      aria-labelledby="verificacao-agora-titulo"
      className="flex flex-col bg-surface-800 border border-surface-700 rounded-[10px] overflow-hidden"
      data-testid="verificacao-agora"
    >
      <header className="flex-shrink-0 flex items-start gap-2.5 px-3.5 py-2.5 border-b border-surface-700">
        <ShieldAlert className="w-4 h-4 mt-0.5 text-status-pending flex-shrink-0" aria-hidden />
        <div className="min-w-0">
          <h2 id="verificacao-agora-titulo" className="text-sm font-semibold text-surface-100">
            Precisam de verificação <span className="ml-1 text-xs font-normal text-surface-400 tabular-nums">{total}</span>
          </h2>
          <p className="text-xs text-surface-400">
            A IA disse ao cliente que fez algo que o sistema não confirmou. Confira na conversa: sai da lista quando alguém da equipe responde depois do alerta, ou em 7 dias.
          </p>
        </div>
      </header>

      <div className={`${ALTURA_DA_LISTA} flex-shrink-0 overflow-y-auto`} data-testid="verificacao-rolagem">
        {conversas.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-1.5 text-center px-4" data-testid="verificacao-vazia">
            <ShieldCheck className="w-6 h-6 text-surface-600" aria-hidden />
            <p className="text-sm font-semibold text-surface-200">Nada para verificar agora</p>
            <p className="text-xs text-surface-500">Quando a IA disser algo que o sistema não confirmou, a conversa aparece aqui.</p>
          </div>
        ) : (
        <ul className="divide-y divide-surface-700">
          {conversas.map((c) => {
            const dono = c.assignedUser
            // Auditoria 12/11: a idade do ALERTA (antes, a da última mensagem — um alerta de maio
            // aparecia como "última mensagem agora"). Sem a hora do alerta (backend antigo), a de antes.
            const alertaEm = c.lastAnomalyAt ? new Date(c.lastAnomalyAt).getTime() : NaN
            const temAlerta = Number.isFinite(alertaEm)
            const ref = temAlerta ? alertaEm : c.lastMessageAt ? new Date(c.lastMessageAt).getTime() : NaN
            const min = Number.isFinite(ref) ? Math.max(0, Math.floor((agora - ref) / 60_000)) : null
            const quando = min === null ? null
              : temAlerta ? (min < 1 ? 'alerta agora' : `alerta há ${formatarEspera(min)}`)
              : (min < 1 ? 'última mensagem agora' : `última mensagem há ${formatarEspera(min)}`)
            return (
              <li key={c.id} className="flex items-center gap-3 px-3.5 py-2" data-testid="verificacao-item">
                <Avatar name={c.contact.displayName} imageUrl={c.contact.profilePicUrl} size="30" />
                <span className="flex-1 min-w-0 leading-[1.3]">
                  <span className="block text-sm font-semibold text-surface-100 truncate">{c.contact.displayName}</span>
                  <span className="block text-xs text-surface-500 truncate">
                    {dono ? `com ${dono.id === meuId ? 'você' : nomeDe(dono)}` : <span className="text-status-pending font-semibold">sem dono</span>}
                    {quando && <>{' · '}{quando}</>}
                  </span>
                </span>
                <Button size="sm" variant="secondary" onClick={() => onAbrir(c)} aria-label={`Verificar a conversa com ${c.contact.displayName}`}>
                  Verificar
                </Button>
              </li>
            )
          })}
        </ul>
        )}
      </div>

      <p className="flex-shrink-0 px-3.5 py-2 border-t border-surface-700 text-xs text-surface-500 tabular-nums" data-testid="verificacao-rodape">
        {total > conversas.length
          ? `As ${conversas.length} mais recentes de ${total}. As demais estão em Conversas, filtro "Precisam de verificação".`
          : conversas.length === 0 ? 'Nenhuma conversa na lista.'
          : `${conversas.length} ${conversas.length === 1 ? 'conversa' : 'conversas'}${conversas.length > 5 ? ' · role a lista para ver todas' : ''}`}
      </p>
    </section>
  )
}
