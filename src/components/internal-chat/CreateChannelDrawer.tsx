/**
 * CreateChannelDrawer
 * Slide-in drawer for admin users to create group channels or department rooms.
 *
 * Step 0 — Tipo:     Choose channel type (grupo / setor)
 * Step 1 — Detalhes: Name, emoji, topic — for department_room: pick an existing sector
 * Step 2 — Membros:  Search and pick members (pre-populated for department_room)
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Hash, Building2, Users, Check, ChevronRight, ArrowLeft,
  Loader2, Search,
} from 'lucide-react'
import { cn, avatarColor } from '@/lib/utils'
import { Emoji } from '@/lib/emojiText'
import { useInternalChat } from '@/contexts/InternalChatContext'
import type { Department, User, InternalChannelType } from '@/types'
import { api } from '@/services/api'


// ─── Emoji quick-pick ─────────────────────────────────────────────────────────

const QUICK_EMOJIS = [
  '💬','👥','🏢','💰','🛠️','📊','🚀','🎯','💡','🔥',
  '✅','📋','🎉','⚡','🌟','💎','🏆','📣','🔔','💼',
]

function EmojiQuickPick({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {QUICK_EMOJIS.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onChange(e)}
          className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center text-xl transition-all hover:scale-110',
            value === e
              ? 'bg-blue-500/20 ring-1 ring-blue-500'
              : 'bg-surface-800 hover:bg-surface-700',
          )}
        >
          <Emoji native={e} size="1.25rem" />
        </button>
      ))}
    </div>
  )
}

// ─── Color picker ─────────────────────────────────────────────────────────────

const DEPT_COLORS = [
  '#6366f1','#3b82f6','#10b981','#f59e0b','#f43f5e',
  '#8b5cf6','#06b6d4','#84cc16','#fb923c','#ec4899',
]

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {DEPT_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
          style={{ background: c }}
        >
          {value === c && <Check className="w-3.5 h-3.5 text-white" />}
        </button>
      ))}
    </div>
  )
}

// ─── Sector card (selectable) ─────────────────────────────────────────────────

function SectorCard({
  dept, selected, usersCount, onClick,
}: {
  dept: Department
  selected: boolean
  usersCount: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
        selected
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-surface-700 bg-surface-800/50 hover:border-surface-600 hover:bg-surface-800',
      )}
    >
      {/* Color swatch */}
      <div
        className="w-9 h-9 rounded-lg flex-shrink-0"
        style={{ background: `color-mix(in srgb, ${dept.color} 19%, transparent)`, border: `2px solid color-mix(in srgb, ${dept.color} 25%, transparent)` }}
      >
        <div className="w-full h-full flex items-center justify-center">
          <Building2 className="w-4 h-4" style={{ color: dept.color }} />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-surface-100 truncate">{dept.name}</p>
        {dept.description && (
          <p className="text-[11px] text-surface-500 truncate">{dept.description}</p>
        )}
      </div>

      {/* Members count */}
      <span className="text-[11px] text-surface-500 flex items-center gap-1 flex-shrink-0">
        <Users className="w-3 h-3" />
        {usersCount}
      </span>

      {/* Selection indicator */}
      <div className={cn(
        'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
        selected ? 'border-blue-500 bg-blue-500' : 'border-surface-600',
      )}>
        {selected && <Check className="w-3 h-3 text-white" />}
      </div>
    </button>
  )
}

// ─── Member row ───────────────────────────────────────────────────────────────

function MemberRow({
  user, selected, isSectorMember, onToggle,
}: {
  user: User
  selected: boolean
  isSectorMember: boolean
  onToggle: () => void
}) {
  const name = `${user.firstName} ${user.lastName}`
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left',
        selected ? 'bg-blue-500/10' : 'hover:bg-surface-800/60',
      )}
    >
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0',
        avatarColor(name),
      )}>
        {name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-surface-100 truncate">{name}</p>
          {isSectorMember && (
            <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-status-active-bg text-status-active">
              Setor
            </span>
          )}
        </div>
        <p className="text-[11px] text-surface-500 truncate">{user.email}</p>
      </div>
      <div className={cn(
        'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
        selected ? 'border-blue-500 bg-blue-500' : 'border-surface-600',
      )}>
        {selected && <Check className="w-3 h-3 text-white" />}
      </div>
    </button>
  )
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function Steps({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1 rounded-full transition-all duration-300',
            i < current ? 'bg-blue-500 flex-1' :
            i === current ? 'bg-blue-500 flex-[2]' :
            'bg-surface-700 flex-1',
          )}
        />
      ))}
    </div>
  )
}

// ─── Main drawer ──────────────────────────────────────────────────────────────

interface CreateChannelDrawerProps {
  onClose: () => void
  onCreated: (channelId: string) => void
}

export function CreateChannelDrawer({ onClose, onCreated }: CreateChannelDrawerProps) {
  const { createChannel } = useInternalChat()

  const [step, setStep] = useState(0)

  // Step 0
  const [channelType, setChannelType] = useState<InternalChannelType>('group')

  // Step 1 — departments (for department_room)
  const [departments, setDepartments]     = useState<Department[]>([])
  const [loadingDepts, setLoadingDepts]   = useState(false)
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null)

  // Step 1 — details
  const [name, setName]           = useState('')
  const [emoji, setEmoji]         = useState('💬')
  const [topic, setTopic]         = useState('')
  const [deptColor, setDeptColor] = useState('#6366f1')

  // Step 2 — members
  const [allUsers, setAllUsers]       = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [memberIds, setMemberIds]     = useState<string[]>([])
  const [memberNames, setMemberNames] = useState<string[]>([])
  const [memberSearch, setMemberSearch] = useState('')

  // Submit
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  // ── Fetch departments when entering step 1 for department_room ──────────────
  useEffect(() => {
    if (step !== 1 || channelType !== 'department_room' || departments.length > 0) return
    setLoadingDepts(true)
    api.get<{ data: Department[] } | Department[]>('/departments')
      .then((r) => setDepartments(Array.isArray(r.data) ? r.data : r.data.data))
      .catch(() => {})
      .finally(() => setLoadingDepts(false))
  }, [step, channelType, departments.length])

  // ── Fetch all users when entering step 2 ────────────────────────────────────
  useEffect(() => {
    if (step !== 2 || allUsers.length > 0) return
    setLoadingUsers(true)
    api.get<User[]>('/users')
      .then((r) => {
        setAllUsers(r.data)
        // Pre-select users belonging to the selected sector
        if (selectedDeptId) {
          const sectorUsers = r.data.filter(
            (u) => u.departmentIds?.includes(selectedDeptId) || u.departmentId === selectedDeptId
          )
          setMemberIds(sectorUsers.map((u) => u.id))
          setMemberNames(sectorUsers.map((u) => `${u.firstName} ${u.lastName}`))
        }
      })
      .catch(() => {})
      .finally(() => setLoadingUsers(false))
  }, [step, allUsers.length, selectedDeptId])

  // ── Select a department card ─────────────────────────────────────────────────
  function selectDepartment(dept: Department) {
    if (selectedDeptId === dept.id) {
      // Deselect
      setSelectedDeptId(null)
      setName('')
      setDeptColor('#6366f1')
    } else {
      setSelectedDeptId(dept.id)
      setName(dept.name)
      setDeptColor(dept.color)
    }
  }

  function toggleMember(u: User) {
    const id = u.id
    const nm = `${u.firstName} ${u.lastName}`
    if (memberIds.includes(id)) {
      setMemberIds((p) => p.filter((x) => x !== id))
      setMemberNames((p) => p.filter((x) => x !== nm))
    } else {
      setMemberIds((p) => [...p, id])
      setMemberNames((p) => [...p, nm])
    }
  }

  // Sort: sector members first, then alphabetically
  const sectorUserIds = new Set(
    selectedDeptId
      ? allUsers
          .filter((u) => u.departmentIds?.includes(selectedDeptId) || u.departmentId === selectedDeptId)
          .map((u) => u.id)
      : []
  )

  const filteredUsers = allUsers
    .filter((u) => {
      const q = memberSearch.trim().toLowerCase()
      if (!q) return true
      return `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
    })
    .sort((a, b) => {
      const aInSector = sectorUserIds.has(a.id) ? 0 : 1
      const bInSector = sectorUserIds.has(b.id) ? 0 : 1
      return aInSector - bInSector
    })

  // ── Validation ───────────────────────────────────────────────────────────────
  const step1Valid = channelType === 'group' ? name.trim().length > 0 : name.trim().length > 0
  const canNext = step === 0 ? true : step === 1 ? step1Valid : true

  const selectedDept = departments.find((d) => d.id === selectedDeptId)

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleCreate() {
    setSaving(true)
    setError('')
    try {
      const ch = await createChannel({
        type: channelType as 'group' | 'department_room',
        name: name.trim(),
        emoji,
        topic: topic.trim() || undefined,
        departmentName: channelType === 'department_room' ? name.trim() : undefined,
        departmentColor: channelType === 'department_room' ? deptColor : undefined,
        memberIds,
        memberNames,
      })
      onCreated(ch.id)
      onClose()
    } catch {
      setError('Não foi possível criar o canal. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        key="drawer"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface-900 border-l overlay-frame z-50 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800 flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-surface-50">Criar canal</h2>
            <p className="text-[11px] text-surface-500 mt-0.5">
              {step === 0 && 'Escolha o tipo de canal'}
              {step === 1 && (channelType === 'department_room' ? 'Selecione o setor e configure o canal' : 'Configure as informações do canal')}
              {step === 2 && 'Confirme os membros do canal'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step progress */}
        <div className="px-5 py-3 flex-shrink-0">
          <Steps current={step} total={3} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">

            {/* ── Step 0: Tipo ────────────────────────────────────────────── */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="px-5 py-4 space-y-3"
              >
                <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-4">
                  Selecione o tipo
                </p>

                <button
                  type="button"
                  onClick={() => setChannelType('group')}
                  className={cn(
                    'w-full flex items-start gap-4 p-4 rounded-2xl border transition-all text-left',
                    channelType === 'group'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-surface-700 bg-surface-800/50 hover:border-surface-600',
                  )}
                >
                  <div className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                    channelType === 'group' ? 'bg-blue-500/20' : 'bg-surface-700',
                  )}>
                    <Hash className={cn('w-5 h-5', channelType === 'group' ? 'text-blue-400' : 'text-surface-400')} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-surface-100">Grupo personalizado</p>
                    <p className="text-[12px] text-surface-400 mt-0.5 leading-relaxed">
                      Canal aberto para qualquer combinação de membros. Ideal para projetos,
                      campanhas ou grupos temáticos.
                    </p>
                  </div>
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all',
                    channelType === 'group' ? 'border-blue-500 bg-blue-500' : 'border-surface-600',
                  )}>
                    {channelType === 'group' && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setChannelType('department_room')}
                  className={cn(
                    'w-full flex items-start gap-4 p-4 rounded-2xl border transition-all text-left',
                    channelType === 'department_room'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-surface-700 bg-surface-800/50 hover:border-surface-600',
                  )}
                >
                  <div className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                    channelType === 'department_room' ? 'bg-blue-500/20' : 'bg-surface-700',
                  )}>
                    <Building2 className={cn('w-5 h-5', channelType === 'department_room' ? 'text-blue-400' : 'text-surface-400')} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-surface-100">Canal de setor</p>
                    <p className="text-[12px] text-surface-400 mt-0.5 leading-relaxed">
                      Vinculado a um setor existente da empresa. Os membros do setor são
                      adicionados automaticamente.
                    </p>
                  </div>
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all',
                    channelType === 'department_room' ? 'border-blue-500 bg-blue-500' : 'border-surface-600',
                  )}>
                    {channelType === 'department_room' && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
              </motion.div>
            )}

            {/* ── Step 1: Detalhes ─────────────────────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="px-5 py-4 space-y-5"
              >
                {/* ── Department picker (only for department_room) ── */}
                {channelType === 'department_room' && (
                  <div>
                    <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider block mb-2">
                      Setor
                    </label>
                    {loadingDepts ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 text-surface-500 animate-spin" />
                      </div>
                    ) : departments.length === 0 ? (
                      <div className="py-6 text-center rounded-xl border border-dashed border-surface-700">
                        <Building2 className="w-7 h-7 text-surface-600 mx-auto mb-1.5" />
                        <p className="text-xs text-surface-500">Nenhum setor cadastrado.</p>
                        <p className="text-[11px] text-surface-600 mt-0.5">Configure setores em Configurações → Setores.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {departments.map((dept) => (
                          <SectorCard
                            key={dept.id}
                            dept={dept}
                            selected={selectedDeptId === dept.id}
                            usersCount={allUsers.filter(
                              (u) => u.departmentIds?.includes(dept.id) || u.departmentId === dept.id
                            ).length || (dept.usersCount ?? 0)}
                            onClick={() => selectDepartment(dept)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Emoji ── */}
                <div>
                  <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider block mb-2">
                    Ícone
                  </label>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={channelType === 'department_room' && selectedDept
                        ? { background: `color-mix(in srgb, ${selectedDept.color} 15%, transparent)`, border: `1.5px solid color-mix(in srgb, ${selectedDept.color} 25%, transparent)` }
                        : { background: 'var(--color-surface-800)' }
                      }
                    >
                      <Emoji native={emoji} size="1.75rem" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-surface-200">{name || 'Sem nome'}</p>
                      <p className="text-[11px] text-surface-500">
                        {channelType === 'department_room'
                          ? (selectedDept ? `Setor: ${selectedDept.name}` : 'Canal de setor')
                          : 'Grupo'}
                      </p>
                    </div>
                  </div>
                  <EmojiQuickPick value={emoji} onChange={setEmoji} />
                </div>

                {/* ── Channel name ── */}
                <div>
                  <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider block mb-1.5">
                    Nome do canal
                  </label>
                  <input
                    autoFocus={channelType === 'group'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={channelType === 'department_room'
                      ? 'Ex: atendimento-geral, vendas-equipe…'
                      : 'Ex: projeto-alpha, avisos-gerais…'}
                    className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2.5 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-blue-500/60 transition-colors"
                  />
                </div>

                {/* ── Topic ── */}
                <div>
                  <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider block mb-1.5">
                    Descrição <span className="text-surface-600 font-normal normal-case tracking-normal">(opcional)</span>
                  </label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Sobre o que é este canal?"
                    rows={2}
                    className="w-full bg-surface-800 border border-surface-700 rounded-xl px-3 py-2.5 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-blue-500/60 transition-colors resize-none"
                  />
                </div>

                {/* ── Color (department_room only) ── */}
                {channelType === 'department_room' && (
                  <div>
                    <label className="text-xs font-semibold text-surface-400 uppercase tracking-wider block mb-2">
                      Cor do setor
                    </label>
                    <ColorPicker value={deptColor} onChange={setDeptColor} />
                    <div
                      className="mt-2 h-1.5 rounded-full transition-colors"
                      style={{ background: deptColor }}
                    />
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Step 2: Membros ──────────────────────────────────────────── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full"
              >
                <div className="px-5 pt-4 pb-3 space-y-2 flex-shrink-0">
                  {/* Info banner for department rooms */}
                  {channelType === 'department_room' && selectedDept && (
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-xl mb-1 text-[11px]"
                      style={{ background: `color-mix(in srgb, ${selectedDept.color} 9%, transparent)`, border: `1px solid color-mix(in srgb, ${selectedDept.color} 19%, transparent)` }}
                    >
                      <Building2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: selectedDept.color }} />
                      <span style={{ color: selectedDept.color }}>
                        Membros do setor <strong>{selectedDept.name}</strong> pré-selecionados. Você pode adicionar ou remover.
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">
                      Membros
                    </p>
                    {memberIds.length > 0 && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">
                        {memberIds.length} selecionado{memberIds.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-800 border border-surface-700 focus-within:border-blue-500/50 transition-colors">
                    <Search className="w-3.5 h-3.5 text-surface-500 flex-shrink-0" />
                    <input
                      autoFocus
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Buscar usuário…"
                      className="flex-1 bg-transparent text-sm text-surface-200 placeholder:text-surface-500 focus:outline-none"
                    />
                    {memberSearch && (
                      <button onClick={() => setMemberSearch('')} className="text-surface-500 hover:text-surface-300">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Selected chips */}
                {memberIds.length > 0 && (
                  <div className="px-5 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
                    {memberNames.map((nm, i) => (
                      <span
                        key={memberIds[i]}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 text-[11px] font-medium"
                      >
                        {nm}
                        <button
                          onClick={() => {
                            setMemberIds((p) => p.filter((_, j) => j !== i))
                            setMemberNames((p) => p.filter((_, j) => j !== i))
                          }}
                          className="ml-0.5 text-blue-400/70 hover:text-blue-300"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="h-px bg-surface-800 flex-shrink-0" />

                {/* User list */}
                <div className="flex-1 overflow-y-auto">
                  {loadingUsers ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-5 h-5 text-surface-500 animate-spin" />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="py-10 text-center">
                      <Users className="w-8 h-8 text-surface-600 mx-auto mb-2" />
                      <p className="text-xs text-surface-500">Nenhum usuário encontrado.</p>
                    </div>
                  ) : (
                    filteredUsers.map((u) => (
                      <MemberRow
                        key={u.id}
                        user={u}
                        selected={memberIds.includes(u.id)}
                        isSectorMember={sectorUserIds.has(u.id)}
                        onToggle={() => toggleMember(u)}
                      />
                    ))
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-surface-800 flex-shrink-0 space-y-2">
          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-surface-700 text-sm font-medium text-surface-300 hover:bg-surface-800 hover:text-surface-100 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar
              </button>
            )}

            {step < 2 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canNext}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  canNext
                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                    : 'bg-surface-800 text-surface-600 cursor-not-allowed',
                )}
              >
                Próximo
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  saving
                    ? 'bg-brand-600/60 text-white/70 cursor-not-allowed'
                    : 'bg-brand-600 hover:bg-brand-500 text-surface-950',
                )}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Criando…
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Criar canal
                  </>
                )}
              </button>
            )}
          </div>

          {step === 2 && memberIds.length === 0 && (
            <p className="text-[11px] text-surface-500 text-center">
              Você pode adicionar membros agora ou depois.
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
