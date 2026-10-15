import { useEffect, useMemo, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { cn, formatRelativeTime } from '@/lib/utils'
import { conversationsApi } from '@/services/api'
import type { Conversation } from '@/types'
import './suporte.css'

export interface ConversaAfetada { id: string; contatoNome: string }

/**
 * "Quais outras conversas foram afetadas?" — aparece quando o alcance passa
 * da conversa atual. Usa a MESMA busca do Inbox (`GET /conversations?search=`)
 * e só lista conversas que a pessoa já pode ver (o backend aplica o escopo).
 * Opcional: o que a pessoa souber ajuda a medir o alcance e a agrupar.
 */
export function ConversasAfetadas({ atual, selecionadas, onChange }: {
  atual: string | null
  selecionadas: ConversaAfetada[]
  onChange: (l: ConversaAfetada[]) => void
}) {
  const [busca, setBusca] = useState('')
  const [lista, setLista] = useState<Conversation[] | null>(null)

  useEffect(() => {
    let vivo = true
    const t = setTimeout(() => {
      conversationsApi.list({ status: 'all', ...(busca.trim() ? { search: busca.trim() } : {}) }, 1, 30)
        .then((r) => { if (vivo) setLista(r.data.data) })
        .catch(() => { if (vivo) setLista([]) })
    }, busca ? 250 : 0)
    return () => { vivo = false; clearTimeout(t) }
  }, [busca])

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return (lista ?? [])
      .filter((c) => c.id !== atual)
      .filter((c) => !termo || (c.contact.displayName ?? '').toLowerCase().includes(termo) || (c.lastMessagePreview ?? '').toLowerCase().includes(termo))
      .slice(0, 8)
  }, [lista, busca, atual])

  const marcada = (id: string) => selecionadas.some((s) => s.id === id)
  const alternar = (c: Conversation) => onChange(marcada(c.id)
    ? selecionadas.filter((s) => s.id !== c.id)
    : [...selecionadas, { id: c.id, contatoNome: c.contact.displayName || c.contact.waId }])

  return (
    <div className="flex flex-col gap-2">
      {selecionadas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selecionadas.map((s) => (
            <span key={s.id} className="sup-chip-escolhido inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded-[6px] text-[11px] font-semibold">
              {s.contatoNome}
              <button type="button" aria-label={`Tirar ${s.contatoNome}`} onClick={() => onChange(selecionadas.filter((x) => x.id !== s.id))} className="p-0.5 rounded hover:bg-[var(--rowhover)]"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="rounded-[8px] border border-[var(--bd2)] overflow-hidden">
        <label className="flex items-center gap-2 px-2.5 h-9 border-b border-[var(--bd2)] bg-surface-900">
          <Search className="w-3.5 h-3.5 text-surface-500" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar conversa por nome ou mensagem"
            className="flex-1 bg-transparent text-xs text-surface-100 placeholder:text-surface-500 outline-none"
            aria-label="Buscar conversa afetada"
          />
        </label>
        <ul className="max-h-[184px] overflow-y-auto" role="listbox" aria-multiselectable="true" aria-label="Conversas">
          {lista === null && <li className="px-3 py-2.5 text-xs text-surface-400">Carregando conversas…</li>}
          {lista !== null && visiveis.length === 0 && <li className="px-3 py-2.5 text-xs text-surface-400">Nenhuma conversa encontrada.</li>}
          {visiveis.map((c) => {
            const on = marcada(c.id)
            return (
              <li key={c.id}>
                <button type="button" role="option" aria-selected={on} onClick={() => alternar(c)}
                  className={cn('w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-colors', on ? 'bg-[var(--sel)]' : 'hover:bg-[var(--rowhover)]')}>
                  <span className={cn('w-4 h-4 rounded-[5px] border-[1.5px] flex items-center justify-center flex-shrink-0', on ? 'bg-brand-500 border-brand-500 text-[#04201D]' : 'border-surface-600')}>
                    {on && <Check className="w-3 h-3" strokeWidth={3} />}
                  </span>
                  <Avatar name={c.contact.displayName} imageUrl={c.contact.profilePicUrl} size="2xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-surface-100 truncate">{c.contact.displayName || c.contact.waId}</span>
                    <span className="block text-[11px] text-surface-400 truncate">{c.lastMessagePreview ?? ''}</span>
                  </span>
                  <span className="text-[10.5px] text-surface-400 flex-shrink-0">{c.lastMessageAt ? formatRelativeTime(c.lastMessageAt) : ''}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
