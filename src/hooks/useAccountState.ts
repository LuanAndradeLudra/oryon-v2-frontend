// ─── Estado da conta (SCRUM-1210) ─────────────────────────────────────────────
// GET /account/state — qualquer usuário logado: suspensa?, pode criar?, é dono?,
// módulos do contrato. Sem valores (esses são só do dono, em /settings/billing).
// Store de módulo: um fetch por sessão, revalidado pelo socket
// (`billing:account-state`) e no foco (janela de 60s).

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { isOryonStaff } from '@/lib/roleHelpers'

export interface AccountState {
  status: 'not_provisioned' | 'pending_activation' | 'active' | 'suspended' | 'canceled' | 'ended'
  suspended: boolean
  canCreateResources: boolean
  isOwner: boolean
  modules: Record<string, boolean>
}

let current: AccountState | null = null
let currentUser: string | null = null
// Geração: sobe a cada reset (logout). Resposta de uma geração antiga é
// descartada e o fetch em voo de outro usuário nunca é reaproveitado — sem
// isso, B logando enquanto o fetch de A voava ficava sem estado (portão aberto).
let gen = 0
let inflight: { key: string; p: Promise<void> } | null = null
let loadedAt = 0
const subs = new Set<() => void>()
let listening = false

const notify = () => subs.forEach((f) => f())

function load(userId: string): Promise<void> {
  const myGen = gen
  const key = `${myGen}:${userId}`
  if (inflight?.key === key) return inflight.p
  const p: Promise<void> = api
    .get<AccountState>('/account/state')
    .then((r) => {
      if (gen === myGen && currentUser === userId) {
        current = r.data
        loadedAt = Date.now()
        notify()
      }
    })
    .catch(() => {
      // Sem estado conhecido: nada bloqueia (falha não trava a plataforma). Mas
      // a tentativa conta como "carregado" para quem espera o primeiro
      // resultado antes de decidir (OnboardingGate) — senão o loader não sai.
      if (gen === myGen && currentUser === userId) {
        loadedAt = Date.now()
        notify()
      }
    })
    .finally(() => { if (inflight?.p === p) inflight = null })
  inflight = { key, p }
  return p
}

function listen() {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('billing:account-state', () => { if (currentUser) void load(currentUser) })
  window.addEventListener('focus', () => {
    if (currentUser && Date.now() - loadedAt > 60_000) void load(currentUser)
  })
}

export function resetAccountState() {
  gen += 1
  inflight = null
  current = null
  currentUser = null
  loadedAt = 0
  notify()
}

export function refreshAccountState() {
  if (currentUser) void load(currentUser)
}

export function useAccountState(): { state: AccountState | null; loaded: boolean } {
  const { user, isAuthenticated } = useAuth()
  const [, force] = useState(0)

  useEffect(() => {
    const f = () => force((n) => n + 1)
    subs.add(f)
    listen()
    return () => { subs.delete(f) }
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return
    if (currentUser !== user.id) {
      current = null
      currentUser = user.id
      void load(user.id)
    }
  }, [isAuthenticated, user?.id])

  const mine = !!user?.id && currentUser === user.id
  return { state: current, loaded: mine && (current !== null || loadedAt > 0) }
}

/** Módulo contratado? Só `false` EXPLÍCITO esconde (contratos antigos não têm a lista). */
export function moduleEnabled(state: AccountState | null, key: string): boolean {
  return state?.modules?.[key] !== false
}

/**
 * Checagem de módulo para telas/menus (SCRUM-1210). Staff Oryon (super_admin)
 * não é afetado: inspeciona qualquer conta com tudo à vista.
 */
export function useModuleAccess(): (key: string) => boolean {
  const { user } = useAuth()
  const { state } = useAccountState()
  const staff = isOryonStaff(user?.role)
  return useCallback((key: string) => staff || moduleEnabled(state, key), [staff, state])
}
