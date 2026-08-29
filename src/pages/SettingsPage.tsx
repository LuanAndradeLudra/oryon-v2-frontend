import { useParams, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

import { SettingsLayout, firstVisibleSection, MULTI_PIPELINE_SECTIONS } from '@/components/settings/SettingsLayout'
import { useMultiPipeline } from '@/hooks/useMultiPipeline'
import { DesktopRecommendedBanner } from '@/components/common/DesktopRecommendedBanner'
import { useDesktopRecommendedBanner } from '@/hooks/useDesktopRecommendedBanner'
import { MobileFeatureGate } from '@/components/common/MobileFeatureGate'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility'

// Sections
import { CompanyProfile }   from '@/components/settings/sections/CompanyProfile'
import { MyAccount }        from '@/components/settings/sections/MyAccount'
import { AgentManagement }  from '@/components/settings/sections/AgentManagement'
import { Departments }      from '@/components/settings/sections/Departments'
import { WhatsAppNumbers }  from '@/components/settings/sections/WhatsAppNumbers'
import { WhatsAppHealth }   from '@/components/settings/sections/WhatsAppHealth'
import { WhatsAppBusinessProfile } from '@/components/settings/sections/WhatsAppBusinessProfile'
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
import { PipelineRoutingSettings } from '@/components/settings/sections/crm/PipelineRoutingSettings'
import { PipelineStagesSettings } from '@/components/settings/sections/crm/PipelineStagesSettings'
import { ContactStagesSettings } from '@/components/settings/sections/crm/ContactStagesSettings'
const VALID_SECTIONS = [
  'account', 'notifications', 'company', 'company-brain', 'agents', 'departments', 'numbers',
  'whatsapp-health', 'whatsapp-profile',
  'quick-replies', 'tags', 'billing', 'security', 'ad-accounts', 'vertical',
  'audit', 'crm-products', 'crm-practitioners', 'stages', 'pipeline-stages', 'pipeline-routing',
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
  'whatsapp-profile': WhatsAppBusinessProfile,
  'quick-replies':  QuickReplies,
  tags:             TagsSettings,
  billing:          BillingPlan,
  security:         SecuritySettings,
  'ad-accounts':    AdAccountsSettings,
  vertical:         VerticalSettings,
  audit:            AuditTrail,
  'crm-products':   ProductsManager,
  'crm-practitioners': PractitionersManager,
  stages:           ContactStagesSettings,
  'pipeline-stages': PipelineStagesSettings,
  'pipeline-routing': PipelineRoutingSettings,
}

export function SettingsPage() {
  const { section } = useParams<{ section: string }>()
  // Use the AuthContext user — it's populated synchronously from the cached
  // session at app boot, so the sidebar role is correct on the very first
  // render. The previous code did its own GET /auth/me in a useEffect, which
  // caused a 1-frame flash where role defaulted to 'admin' before the real
  // 'super_admin' arrived and re-filtered the menu.
  const { user } = useAuth()
  const multiPipeline = useMultiPipeline()
  const banner = useDesktopRecommendedBanner(`settings/${section}`)
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { isFeatureVisible } = useFeatureVisibility()

  // Settings é superfície de INTENÇÃO, não de browsing: quem entra já sabe o
  // que quer mudar. Sem hub/home — /settings cai direto na primeira seção
  // visível do papel; a sidebar é o mapa permanente e a busca resolve o
  // "achar em segundos". Uma home aqui seria uma segunda navegação (o
  // problema que estamos eliminando).
  // Seções de funil (SCRUM-498): sem o flag, mesmo por URL direta caem na
  // primeira seção visível — o backend não tem os endpoints e a tela
  // ficaria em erro. As demais seções mantêm o padrão "acessível por URL".
  const gatedOut = !!section && MULTI_PIPELINE_SECTIONS.has(section) && !multiPipeline
  if (!section || !VALID_SECTIONS.includes(section) || gatedOut) {
    return <Navigate to={`/settings/${firstVisibleSection(user?.role ?? 'admin', { multiPipeline })}`} replace />
  }

  // Esconder o item do menu nao impede ninguem de digitar /settings/billing —
  // e quem ja tinha a tela salva continuaria entrando. Como a tela nao deveria
  // estar habilitada, a URL fecha junto. Mesmo padrao de guarda explicita que
  // o comentario do featureFlags.ts cita para campaigns.
  if (section === 'billing' && !isFeatureVisible('settingsBilling')) {
    return <Navigate to="/settings/account" replace />
  }

  const SectionComponent = SECTION_COMPONENTS[section]
  const showBanner = DESKTOP_FIRST_SECTIONS.has(section) && banner.visible
  const isHardBlocked = isMobile && HARD_BLOCK_SECTIONS.has(section)
  const blockLabel = HARD_BLOCK_LABELS[section]

  return (
    <SettingsLayout currentRole={user?.role ?? 'admin'} multiPipeline={multiPipeline}>
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
