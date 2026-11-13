import { useState, useCallback, useEffect } from 'react'

export type SetupStep = 'company' | 'profile' | 'copilot' | 'dashboard' | 'campaigns'

interface SetupChecklist {
  company: boolean
  profile: boolean
  copilot: boolean
  dashboard: boolean
  campaigns: boolean
}

const DEFAULT: SetupChecklist = { company: false, profile: false, copilot: false, dashboard: false, campaigns: false }

function storageKey(userId: string) {
  return `oryon:setup_${userId}`
}

function loadChecklist(userId: string | undefined): SetupChecklist {
  if (!userId) return DEFAULT
  try {
    const raw = localStorage.getItem(storageKey(userId))
    return raw ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<SetupChecklist>) } : DEFAULT
  } catch {
    return DEFAULT
  }
}

/** 12/11: avisa as outras cópias do hook (o menu lateral, a página) que o checklist mudou. */
const EVENTO = 'oryon:setup-checklist'

function saveChecklist(userId: string, checklist: SetupChecklist) {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(checklist)) } catch { /* silent */ }
  try { window.dispatchEvent(new CustomEvent(EVENTO, { detail: { userId } })) } catch { /* sem janela */ }
}

export function useSetupChecklist(userId: string | undefined) {
  const [checklist, setChecklist] = useState<SetupChecklist>(() => loadChecklist(userId))

  // 12/11 (João): cada componente tinha a sua cópia — fechar o banner do tour na página não tirava o
  // "Novo" do menu lateral. Agora todas as cópias releem quando alguma muda (nesta aba e nas outras),
  // e também quando o usuário chega depois da primeira renderização.
  useEffect(() => {
    setChecklist(loadChecklist(userId))
    const reler = () => setChecklist(loadChecklist(userId))
    const daAba = (e: Event) => { if ((e as CustomEvent<{ userId?: string }>).detail?.userId === userId) reler() }
    const deOutraAba = (e: StorageEvent) => { if (userId && e.key === storageKey(userId)) reler() }
    window.addEventListener(EVENTO, daAba)
    window.addEventListener('storage', deOutraAba)
    return () => {
      window.removeEventListener(EVENTO, daAba)
      window.removeEventListener('storage', deOutraAba)
    }
  }, [userId])

  const markDone = useCallback((step: SetupStep) => {
    if (!userId) return
    setChecklist((prev) => {
      if (prev[step]) return prev
      const next = { ...prev, [step]: true }
      saveChecklist(userId, next)
      return next
    })
  }, [userId])

  const pendingSteps = (Object.keys(DEFAULT) as SetupStep[]).filter((k) => !checklist[k])

  return { checklist, markDone, pendingCount: pendingSteps.length, allDone: pendingSteps.length === 0 }
}
