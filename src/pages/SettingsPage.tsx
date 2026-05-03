import { useEffect, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import axios from 'axios'

import { SettingsLayout } from '@/components/settings/SettingsLayout'
import { DesktopRecommendedBanner } from '@/components/common/DesktopRecommendedBanner'
import { useDesktopRecommendedBanner } from '@/hooks/useDesktopRecommendedBanner'

// Sections
import { CompanyProfile }   from '@/components/settings/sections/CompanyProfile'
import { MyAccount }        from '@/components/settings/sections/MyAccount'
import { AgentManagement }  from '@/components/settings/sections/AgentManagement'
import { Departments }      from '@/components/settings/sections/Departments'
import { WhatsAppNumbers }  from '@/components/settings/sections/WhatsAppNumbers'
import { WhatsAppHealth }   from '@/components/settings/sections/WhatsAppHealth'
import { QuickReplies }     from '@/components/settings/sections/QuickReplies'
import { TagsSettings }     from '@/components/settings/sections/TagsSettings'
import { BillingPlan }      from '@/components/settings/sections/BillingPlan'
import { SecuritySettings } from '@/components/settings/sections/SecuritySettings'
import { AdAccountsSettings }  from '@/components/settings/sections/AdAccountsSettings'
import { VerticalSettings }    from '@/components/settings/sections/VerticalSettings'
import { CompanyBrain }        from '@/components/settings/sections/CompanyBrain'
import { Notifications }       from '@/components/settings/sections/Notifications'
import { AuditTrail }          from '@/components/settings/sections/AuditTrail'
import type { User } from '@/types'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

const VALID_SECTIONS = [
  'account', 'notifications', 'company', 'company-brain', 'agents', 'departments', 'numbers',
  'whatsapp-health',
  'quick-replies', 'tags', 'billing', 'security', 'ad-accounts', 'vertical',
  'audit',
]

// Sections que sao desktop-first: configuracao pesada (assistentes IA, numeros
// WhatsApp, brain da empresa, billing, templates, integracao Meta). Em mobile
// mostram um banner discreto sugerindo desktop, sem bloquear.
const DESKTOP_FIRST_SECTIONS = new Set([
  'agents', 'numbers', 'company-brain', 'billing', 'quick-replies',
  'ad-accounts', 'whatsapp-health',
])

const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
  account:          MyAccount,
  notifications:    Notifications,
  company:          CompanyProfile,
  'company-brain':  CompanyBrain,
  agents:           AgentManagement,
  departments:      Departments,
  numbers:          WhatsAppNumbers,
  'whatsapp-health': WhatsAppHealth,
  'quick-replies':  QuickReplies,
  tags:             TagsSettings,
  billing:          BillingPlan,
  security:         SecuritySettings,
  'ad-accounts':    AdAccountsSettings,
  vertical:         VerticalSettings,
  audit:            AuditTrail,
}

export function SettingsPage() {
  const { section = 'account' } = useParams<{ section: string }>()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const banner = useDesktopRecommendedBanner(`settings/${section}`)

  useEffect(() => {
    axios.get<User>(`${API}/auth/me`).then((r) => setCurrentUser(r.data)).catch(() => {})
  }, [])

  if (!VALID_SECTIONS.includes(section)) {
    return <Navigate to="/settings/account" replace />
  }

  const SectionComponent = SECTION_COMPONENTS[section]
  const showBanner = DESKTOP_FIRST_SECTIONS.has(section) && banner.visible

  return (
    <SettingsLayout currentRole={currentUser?.role ?? 'admin'}>
      {showBanner && (
        <DesktopRecommendedBanner
          visible
          onDismiss={banner.dismiss}
          message="Esta secao tem formularios e tabelas que ficam apertados no celular. Para configurar com tranquilidade, use o desktop."
        />
      )}
      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15, ease: 'easeInOut' }}
        >
          <SectionComponent />
        </motion.div>
      </AnimatePresence>
    </SettingsLayout>
  )
}
