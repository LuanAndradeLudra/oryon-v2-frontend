// Resolves the default WhatsApp line to pre-fill in creation forms
// (TemplateCreator / CampaignWizard / AutomationWizard) without relying
// on a global "active line" selection. Matches the Zendesk/HubSpot
// pattern of per-resource canal: form pre-fills intelligently, operator
// confirms explicitly, backend validates again.
//
// Resolution ladder (first hit wins):
//   1. department — the operator has a department whose whatsappNumberId
//      is active in this tenant.
//   2. primary — the line marked isPrimary (Migration #044 guarantees at
//      most one per tenant via partial unique index).
//   3. lone — tenant only has one active line.
//   4. unresolved — multi-WABA tenant with no department hint and no
//      primary set. The form should require an explicit choice before
//      enabling the submit button.
//
// `source` lets the UI explain where the default came from ("herdado
// do seu setor", "linha primária do workspace") so the operator doesn't
// wonder why the field was already filled.

import { useEffect, useMemo, useState } from 'react'
import { departmentsApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import type { Department } from '@/types'

export type SmartLineSource = 'department' | 'primary' | 'lone' | 'unresolved' | 'none'

export interface SmartLineDefault {
  /** The resolved line id, or null when the operator must pick manually. */
  lineId: string | null
  /** Why this id was chosen — drives the explanatory copy in callouts. */
  source: SmartLineSource
  /** Total active lines in the tenant. UI uses this to decide whether
   *  to render the line picker at all (hidden for single-line tenants). */
  lineCount: number
  /** True while we're still fetching department info. Consumers treat
   *  this as "don't show the 'choose a line' warning yet". */
  loading: boolean
}

export function useSmartLineDefault(): SmartLineDefault {
  const { user } = useAuth()
  const { numbers, loading: numbersLoading } = useWorkspaceNumber()
  const [deptLineId, setDeptLineId] = useState<string | null>(null)
  const [deptLoading, setDeptLoading] = useState<boolean>(false)

  const departmentId = user?.departmentId ?? null

  useEffect(() => {
    if (!departmentId) {
      setDeptLineId(null)
      return
    }
    setDeptLoading(true)
    departmentsApi
      .list()
      .then((res) => {
        const mine = res.data.find((d: Department) => d.id === departmentId)
        setDeptLineId(mine?.whatsappNumberId ?? null)
      })
      .catch(() => setDeptLineId(null))
      .finally(() => setDeptLoading(false))
  }, [departmentId])

  return useMemo<SmartLineDefault>(() => {
    const loading = numbersLoading || deptLoading
    const lineCount = numbers.length

    if (lineCount === 0) {
      return { lineId: null, source: 'none', lineCount: 0, loading }
    }

    // 1. Department hint
    if (deptLineId && numbers.some((n) => n.id === deptLineId)) {
      return { lineId: deptLineId, source: 'department', lineCount, loading }
    }

    // 2. Primary
    const primary = numbers.find((n) => n.isPrimary)
    if (primary) {
      return { lineId: primary.id, source: 'primary', lineCount, loading }
    }

    // 3. Lone active
    if (lineCount === 1) {
      return { lineId: numbers[0].id, source: 'lone', lineCount: 1, loading }
    }

    // 4. Multi-WABA, no hint — operator must choose.
    return { lineId: null, source: 'unresolved', lineCount, loading }
  }, [numbers, deptLineId, numbersLoading, deptLoading])
}
