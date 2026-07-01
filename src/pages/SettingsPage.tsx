import { useParams, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

import { SettingsLayout } from '@/components/settings/SettingsLayout'
import { DesktopRecommendedBanner } from '@/components/common/DesktopRecommendedBanner'
import { useDesktopRecommendedBanner } from '@/hooks/useDesktopRecommendedBanner'
import { MobileFeatureGate } from '@/components/common/MobileFeatureGate'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

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
import { ProductsManager }     from '@/components/settings/sections/crm/ProductsManager'
import { PractitionersManager } from '@/components/settings/sections/crm/PractitionersManager'
const VALID_SECTIONS = [
  'account', 'notifications', 'company', 'company-brain', 'agents', 'departments', 'numbers',
  'whatsapp-health',
  'quick-replies', 'tags', 'billing', 'security', 'ad-accounts', 'vertical',
  'audit', 'crm-products', 'crm-practitioners',
]

// Sections soft-warn em mobile: banner discreto sugerindo desktop, sem
// bloquear (usuario pode acessar mas com aviso).
const DESKTOP_FIRST_SECTIONS = new Set([
  'agents', 'quick-replies', 'whatsapp-health',
])

// Sections hard-block em mobile: substitui o conteudo por MobileFeatureGate.
// Sao telas onde o conteudo nem sequer renderiza minimamente bem
// (formularios longos, tabelas largas, integracoes Meta com QR codes etc).
const HARD_BLOCK_SECTIONS = new Set<string>([
  'numbers', 'company-brain', 'billing', 'ad-accounts',
])

const HARD_BLOCK_LABELS: Record<string, { name: string; description: string }> = {
  numbers: {
    name: 'Números WhatsApp',
    description: 'Configurar números WhatsApp envolve QR codes, fluxo Meta Business e tabelas largas. Abra no desktop.',
  },
  'company-brain': {
    name: 'Contexto da IA',
    description: 'O editor de contexto da IA é um formulário longo com seções aninhadas. Ilegível no celular — abra no desktop.',
  },
  billing: {
    name: 'Plano & Faturamento',
    description: 'Tabelas de planos, comparativos e fluxo de pagamento ficam apertados no celular. Abra no desktop.',
  },
  'ad-accounts': {
    name: 'Contas de Anúncios',
    description: 'Integração Meta Ads exige fluxo OAuth e tabela de pixels. Abra no desktop.',
  },
}

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
  'crm-products':   ProductsManager,
  'crm-practitioners': PractitionersManager,
}

export function SettingsPage() {
  const { section = 'account' } = useParams<{ section: string }>()
  // Use the AuthContext user — it's populated synchronously from the cached
  // session at app boot, so the sidebar role is correct on the very first
  // render. The previous code did its own GET /auth/me in a useEffect, which
  // caused a 1-frame flash where role defaulted to 'admin' before the real
  // 'super_admin' arrived and re-filtered the menu.
  const { user } = useAuth()
  const banner = useDesktopRecommendedBanner(`settings/${section}`)
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  if (!VALID_SECTIONS.includes(section)) {
    return <Navigate to="/settings/account" replace />
  }

  const SectionComponent = SECTION_COMPONENTS[section]
  const showBanner = DESKTOP_FIRST_SECTIONS.has(section) && banner.visible
  const isHardBlocked = isMobile && HARD_BLOCK_SECTIONS.has(section)
  const blockLabel = HARD_BLOCK_LABELS[section]

  return (
    <SettingsLayout currentRole={user?.role ?? 'admin'}>
      {showBanner && (
        <DesktopRecommendedBanner
          visible
          onDismiss={banner.dismiss}
          message="Esta secao tem formularios e tabelas que ficam apertados no celular. Para configurar com tranquilidade, use o desktop."
        />
      )}
      {isHardBlocked && blockLabel ? (
        <MobileFeatureGate
          open
          onClose={() => navigate('/settings/account')}
          featureName={blockLabel.name}
          description={blockLabel.description}
        />
      ) : (
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
      )}
    </SettingsLayout>
  )
}
