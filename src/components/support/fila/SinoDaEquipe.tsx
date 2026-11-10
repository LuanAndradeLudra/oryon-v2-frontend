import { useCallback, useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { NotificationsPanel } from '@/components/layout/TopBar'
import { useNotifications } from '@/hooks/useNotifications'
import { useLayer } from '@/contexts/LayerContext'

/** O shell da equipe não monta o socket do app da empresa: a contagem se atualiza assim. */
const INTERVALO_MS = 30_000

/**
 * SINO da equipe de suporte (SCRUM-1386): o mesmo painel do app, sem o
 * botão de preferências (a equipe usa os padrões do papel). Os avisos levam
 * direto ao chamado na fila (`/admin/support?chamado=`).
 */
export function SinoDaEquipe() {
  const { unreadCount, reload } = useNotifications()
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Fechar atualiza a contagem: o painel marca como lido na instância dele.
  const fechar = useCallback(() => {
    setAberto(false)
    void reload()
  }, [reload])
  useLayer(aberto, fechar)

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void reload()
    }, INTERVALO_MS)
    return () => window.clearInterval(id)
  }, [reload])

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) fechar()
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto, fechar])

  const rotulo = unreadCount > 9 ? '9+' : String(unreadCount)
  // No celular o painel (400 px) ancora no cabeçalho (que é `relative`), não no
  // sino: com o "Sair" à direita, ele vazaria pela esquerda da tela.
  return (
    <div className="sm:relative" ref={ref}>
      <button
        type="button"
        onClick={() => (aberto ? fechar() : setAberto(true))}
        title="Notificações"
        aria-haspopup="dialog"
        aria-expanded={aberto}
        aria-label={unreadCount > 0 ? `Notificações (${rotulo} não lidas)` : 'Notificações'}
        className="relative flex items-center justify-center w-8 h-8 rounded-[6px] text-surface-300 hover:text-surface-100 hover:bg-[var(--rowhover)] transition-colors"
      >
        <Bell className="w-4 h-4" aria-hidden />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0 min-w-[14px] h-3.5 px-[3px] rounded-full bg-brand-cta text-2xs font-semibold text-surface-950 [[data-theme=light]_&]:bg-[#0F766E] [[data-theme=light]_&]:text-white flex items-center justify-center">
            {rotulo}
          </span>
        )}
      </button>
      {aberto && (
        <>
          <div className="overlay-scrim z-40" aria-hidden onMouseDown={fechar} />
          <NotificationsPanel semPreferencias />
        </>
      )}
    </div>
  )
}
