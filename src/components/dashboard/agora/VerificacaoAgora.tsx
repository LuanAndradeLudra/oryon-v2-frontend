import { useEffect, useRef } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Paginacao } from '@/components/ui/Paginacao'
import { paginar } from '@/lib/paginar'
import { formatarEspera } from '@/lib/filaAgora'
import type { Conversation } from '@/types'

// "Precisam de verificação" (PO 28/09): conversas em que a IA disse ter feito
// algo — marcar, cancelar, registrar — que o sistema não confirmou. O backend
// já passou a conversa para uma pessoa e avisou a gestão (SCRUM-806); o que
// falta é alguém conferir com o cliente. A verificação em si (e o "marcar como
// verificada") acontece na conversa, onde está o contexto — daqui só se abre.
//
// Só aparece quando há alguma: vazio não é notícia na aba Agora.

/** Conversas por página; o cartão rola dentro de si como a fila (PO 28/09). */
const POR_PAGINA = 5

function nomeDe(u: { firstName: string; lastName?: string | null }): string {
  return [u.firstName, u.lastName].filter(Boolean).join(' ')
}

interface Props {
  conversas: Conversation[]
  /** Total no backend — pode passar do que foi lido. */
  total: number
  meuId: string | undefined
  agora: number
  pagina: number
  onPagina: (p: number) => void
  onAbrir: (c: Conversation) => void
}

export function VerificacaoAgora({ conversas, total, meuId, agora, pagina, onPagina, onAbrir }: Props) {
  const pag = paginar(conversas, pagina, POR_PAGINA)
  const rolagem = useRef<HTMLDivElement>(null)
  useEffect(() => { rolagem.current?.scrollTo?.({ top: 0 }) }, [pag.pagina])

  if (conversas.length === 0) return null

  return (
    <section
      aria-labelledby="verificacao-agora-titulo"
      className="flex flex-col bg-surface-800 border border-surface-700 rounded-lg overflow-hidden"
      data-testid="verificacao-agora"
    >
      <header className="flex-shrink-0 flex items-start gap-2.5 px-3.5 py-2.5 border-b border-surface-700">
        <ShieldAlert className="w-4 h-4 mt-0.5 text-status-pending flex-shrink-0" aria-hidden />
        <div className="min-w-0">
          <h2 id="verificacao-agora-titulo" className="text-[13px] font-semibold text-surface-100">
            Precisam de verificação <span className="ml-1 text-xs font-normal text-surface-400 tabular-nums">{total}</span>
          </h2>
          <p className="text-[11.5px] text-surface-400">
            A IA disse ao cliente que fez algo que o sistema não confirmou. Confira na conversa e marque como verificada.
          </p>
        </div>
      </header>

      <div ref={rolagem} className="max-h-[280px] overflow-y-auto" data-testid="verificacao-rolagem">
        <ul className="divide-y divide-surface-700">
          {pag.itens.map((c) => {
            const dono = c.assignedUser
            const min = Math.max(0, Math.floor((agora - new Date(c.lastMessageAt).getTime()) / 60_000))
            return (
              <li key={c.id} className="flex items-center gap-3 px-3.5 py-2" data-testid="verificacao-item">
                <Avatar name={c.contact.displayName} imageUrl={c.contact.profilePicUrl} size="30" />
                <span className="flex-1 min-w-0 leading-[1.3]">
                  <span className="block text-[13px] font-semibold text-surface-100 truncate">{c.contact.displayName}</span>
                  <span className="block text-[11.5px] text-surface-500 truncate">
                    {dono ? `com ${dono.id === meuId ? 'você' : nomeDe(dono)}` : <span className="text-status-pending font-semibold">sem dono</span>}
                    {' · '}{min < 1 ? 'última mensagem agora' : `última mensagem há ${formatarEspera(min)}`}
                  </span>
                </span>
                <Button size="sm" variant="secondary" onClick={() => onAbrir(c)} aria-label={`Verificar a conversa com ${c.contact.displayName}`}>
                  Verificar
                </Button>
              </li>
            )
          })}
        </ul>
      </div>

      <Paginacao
        pagina={pag.pagina}
        paginas={pag.paginas}
        de={pag.de}
        ate={pag.ate}
        total={pag.total}
        onPagina={onPagina}
        rotulo="conversas a verificar"
        className="flex-shrink-0"
      />
      {total > conversas.length && (
        <p className="flex-shrink-0 px-3.5 py-2 border-t border-surface-700 text-[11.5px] text-surface-500">
          Mostrando {conversas.length} de {total}. As demais estão em Conversas, filtro "Precisam de verificação".
        </p>
      )}
    </section>
  )
}
