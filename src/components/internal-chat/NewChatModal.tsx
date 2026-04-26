import { useState, useEffect } from 'react'
import { X, Search, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import axios from 'axios'
import { useInternalChat } from '@/contexts/InternalChatContext'
import { PresenceDot } from './PresenceDot'
import type { User } from '@/types'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

interface NewChatModalProps {
  currentUserId: string
  onClose: () => void
}

export function NewChatModal({ currentUserId, onClose }: NewChatModalProps) {
  const { openDM, presence } = useInternalChat()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [opening, setOpening] = useState<string | null>(null)

  useEffect(() => {
    axios.get<User[]>(`${API}/users`)
      .then((r) => setUsers(r.data.filter((u) => u.id !== currentUserId)))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [currentUserId])

  const filtered = users.filter((u) =>
    search.trim() === '' ||
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  async function handleOpenDM(user: User) {
    setOpening(user.id)
    await openDM(user.id, `${user.firstName} ${user.lastName}`)
    setOpening(null)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/70"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.16, ease: 'easeOut' }}
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-surface-900 rounded-2xl border border-surface-700 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800">
          <h3 className="text-sm font-semibold text-surface-100">Nova mensagem direta</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800 border border-surface-700">
            <Search className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Buscar usuário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none"
            />
          </div>
        </div>

        {/* User list */}
        <div className="overflow-y-auto max-h-72 px-2 pb-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-surface-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-surface-600 py-6">Nenhum usuário encontrado</p>
          ) : (
            filtered.map((u) => {
              const presenceStatus = presence[u.id] ?? 'offline'
              return (
                <button
                  key={u.id}
                  onClick={() => handleOpenDM(u)}
                  disabled={opening === u.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-800 transition-all text-left group"
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center text-sm font-semibold text-surface-200">
                      {u.firstName.charAt(0)}
                    </div>
                    <PresenceDot status={presenceStatus} className="absolute -bottom-0.5 -right-0.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-100 truncate">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="text-[11px] text-surface-500 truncate">{u.cargo ?? u.email}</p>
                  </div>
                  {opening === u.id && <Loader2 className="w-4 h-4 text-brand-400 animate-spin flex-shrink-0" />}
                </button>
              )
            })
          )}
        </div>
      </motion.div>
    </>
  )
}
