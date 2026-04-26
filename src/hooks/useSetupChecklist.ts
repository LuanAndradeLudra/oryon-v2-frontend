import { useState, useCallback } from 'react'

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

function saveChecklist(userId: string, checklist: SetupChecklist) {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(checklist)) } catch { /* silent */ }
}

export function useSetupChecklist(userId: string | undefined) {
  const [checklist, setChecklist] = useState<SetupChecklist>(() => loadChecklist(userId))

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
