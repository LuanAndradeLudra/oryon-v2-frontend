import { useState } from 'react'
import { Search, Check, UserX } from 'lucide-react'
import { Dropdown } from './Dropdown'
import { Avatar } from './Avatar'
import { cn } from '@/lib/utils'
import type { User } from '@/types'

interface UserPickerProps {
  users: User[]
  selectedUserId?: string
  onSelect: (user: User | null) => void
  anchor: React.ReactNode
  open: boolean
  onClose: () => void
  align?: 'left' | 'right'
  label?: string
}

export function UserPicker({
  users, selectedUserId, onSelect, anchor, open, onClose, align = 'left', label = 'Atribuir usuário',
}: UserPickerProps) {
  const [search, setSearch] = useState('')

  const filtered = users.filter((u) =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
    (u.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const roleLabel: Record<string, string> = {
    admin: 'Admin',
    agent: 'Usuário',
    supervisor: 'Supervisor',
  }

  return (
    <Dropdown open={open} onClose={onClose} anchor={anchor} align={align} className="w-72">
      {/* Header */}
      <div className="px-3 pt-2.5 pb-2 border-b border-surface-700">
        <p className="text-[11px] font-semibold text-surface-500 uppercase tracking-wide mb-2">{label}</p>
        <div className="flex items-center gap-2 bg-surface-900 rounded-lg px-2.5 py-1.5">
          <Search className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuário..."
            className="flex-1 bg-transparent text-xs text-surface-200 placeholder:text-surface-500 outline-none"
          />
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto py-1">
        {/* Unassign option */}
        {selectedUserId && (
          <button
            onClick={() => { onSelect(null); onClose() }}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-700 transition-all"
          >
            <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center flex-shrink-0">
              <UserX className="w-4 h-4 text-surface-400" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm text-surface-300">Remover atribuição</p>
            </div>
          </button>
        )}

        {filtered.length === 0 ? (
          <p className="text-center text-xs text-surface-500 py-4">Nenhum usuário encontrado</p>
        ) : (
          filtered.map((user) => {
            const isSelected = user.id === selectedUserId
            return (
              <button
                key={user.id}
                onClick={() => { onSelect(user); onClose() }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 transition-all',
                  isSelected ? 'bg-brand-600/10' : 'hover:bg-surface-700'
                )}
              >
                <Avatar name={`${user.firstName} ${user.lastName}`} size="sm" className="flex-shrink-0" />
                <div className="min-w-0 flex-1 text-left">
                  <p className={cn('text-sm font-medium', isSelected ? 'text-brand-300' : 'text-surface-200')}>
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-[11px] text-surface-500 truncate">
                    {roleLabel[user.role]} · {user.email}
                  </p>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />}
              </button>
            )
          })
        )}
      </div>
    </Dropdown>
  )
}
