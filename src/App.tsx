import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, useEffect, Component, Suspense } from 'react'
import { lazyRoute, clearChunkReloadFlag } from '@/lib/lazyRoute'
import type { ReactNode, ErrorInfo } from 'react'
import * as Sentry from '@sentry/react'

// ── Error Boundary — prevents white screen on crash ─────────────────────────
// Phase D.1: also reports the captured error to Sentry (no-op when DSN unset).
// We keep our own boundary instead of wrapping with Sentry.ErrorBoundary so the
// existing fallback UI / reload UX remain unchanged.
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    try {
      Sentry.captureException(error, { contexts: { react: { componentStack: info.componentStack ?? null } } })
    } catch {
      // swallow — Sentry MUST NOT break the fallback path
    }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'var(--font-sans, sans-serif)', color: 'var(--color-surface-100, #ECF1F1)', background: 'var(--color-surface-950, #0A0F0F)', minHeight: '100vh' }}>
          <h2 style={{ color: 'var(--color-danger, #EF4444)', marginBottom: 12 }}>Algo deu errado</h2>
          <p style={{ color: 'var(--color-surface-400, #8FA5A5)', marginBottom: 20 }}>A página encontrou um erro. Tente recarregar.</p>
          <pre style={{ background: 'var(--color-surface-800, #161E1E)', border: '1px solid var(--color-surface-700, #243333)', padding: 16, borderRadius: 12, overflow: 'auto', fontSize: 13, color: 'var(--color-warning, #F97316)' }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload() }}
            style={{ marginTop: 16, padding: '8px 20px', background: 'var(--color-brand-500, #2DD4BF)', color: 'var(--color-surface-950, #0A0F0F)', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
          >
            Recarregar página
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { isOryonStaff } from '@/lib/roleHelpers'
import { CRMConfigProvider }    from '@/contexts/CRMConfigContext'
import { TenantVocabProvider }  from '@/contexts/TenantVocabContext'
import { CopilotProvider } from '@/contexts/CopilotContext'
import { ContextMenuProvider } from '@/components/ui/ContextMenu'
import { CopilotPanel } from '@/components/copilot/CopilotPanel'
import { InternalChatProvider } from '@/contexts/InternalChatContext'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage }            from '@/pages/LoginPage'
import { SetPasswordPage }      from '@/pages/SetPasswordPage'
import { SetupWizard }        from '@/components/onboarding/SetupWizard'
import { useIsMobile }        from '@/hooks/useIsMobile'
import { Monitor }            from 'lucide-react'

// Lazy-loaded pages — only downloaded when the route is visited (lazyRoute = reload on stale chunk after deploy)
const ConversationsPage = lazyRoute(() => import('@/pages/ConversationsPage').then(m => ({ default: m.ConversationsPage })))
const ContactsPage      = lazyRoute(() => import('@/pages/ContactsPage').then(m => ({ default: m.ContactsPage })))
const SettingsPage      = lazyRoute(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const DashboardPage     = lazyRoute(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const HomePage          = lazyRoute(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })))
const WelcomePage       = lazyRoute(() => import('@/pages/WelcomePage').then(m => ({ default: m.WelcomePage })))
const ForgotPasswordPage = lazyRoute(() => import('@/pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage  = lazyRoute(() => import('@/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))
const ActivateAccountPage = lazyRoute(() => import('@/pages/ActivateAccountPage').then(m => ({ default: m.ActivateAccountPage })))
const RegisterPage       = lazyRoute(() => import('@/pages/RegisterPage').then(m => ({ default: m.RegisterPage })))
const CampaignsPage     = lazyRoute(() => import('@/pages/CampaignsPage').then(m => ({ default: m.CampaignsPage })))
const CopilotPage       = lazyRoute(() => import('@/pages/CopilotPage').then(m => ({ default: m.CopilotPage })))
const MarketingPage     = lazyRoute(() => import('@/pages/MarketingPage').then(m => ({ default: m.MarketingPage })))
const AutomationsPage   = lazyRoute(() => import('@/pages/AutomationsPage').then(m => ({ default: m.AutomationsPage })))
const AgentsPage        = lazyRoute(() => import('@/pages/AgentsPage').then(m => ({ default: m.AgentsPage })))
const PricingPage       = lazyRoute(() => import('@/pages/PricingPage').then(m => ({ default: m.PricingPage })))
const TeamChatPage      = lazyRoute(() => import('@/pages/TeamChatPage').then(m => ({ default: m.TeamChatPage })))
const CanvaCallbackPage = lazyRoute(() => import('@/pages/CanvaCallbackPage').then(m => ({ default: m.CanvaCallbackPage })))
const MorePage          = lazyRoute(() => import('@/pages/MorePage').then(m => ({ default: m.MorePage })))
const NotificationsPage = lazyRoute(() => import('@/pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })))


// Admin (Oryon staff only) — gated by RequireSuperAdmin inside the route.
const SkillTemplatesPage       = lazyRoute(() => import('@/pages/admin/SkillTemplatesPage').then(m => ({ default: m.SkillTemplatesPage })))
const SkillTemplateEditorPage  = lazyRoute(() => import('@/pages/admin/SkillTemplateEditorPage').then(m => ({ default: m.SkillTemplateEditorPage })))
const SkillTemplateTesterPage  = lazyRoute(() => import('@/pages/admin/SkillTemplateTesterPage').then(m => ({ default: m.SkillTemplateTesterPage })))
const AssignSkillPage          = lazyRoute(() => import('@/pages/admin/AssignSkillPage').then(m => ({ default: m.AssignSkillPage })))
const AuditPage                = lazyRoute(() => import('@/pages/admin/AuditPage').then(m => ({ default: m.AuditPage })))
const AiObservabilityPage      = lazyRoute(() => import('@/pages/admin/AiObservabilityPage').then(m => ({ default: m.AiObservabilityPage })))
const AiExecutionsPage         = lazyRoute(() => import('@/pages/admin/AiExecutionsPage').then(m => ({ default: m.AiExecutionsPage })))
const AdminAgentEditorPage     = lazyRoute(() => import('@/pages/admin/AdminAgentEditorPage').then(m => ({ default: m.AdminAgentEditorPage })))

import { RequireSuperAdmin } from '@/components/admin/RequireSuperAdmin'
import { AdminMobileBlock } from '@/components/common/AdminMobileBlock'

// ── Route guards ──────────────────────────────────────────────────────────────

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, requiresPasswordChange } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (requiresPasswordChange && location.pathname !== '/set-password') {
    return <Navigate to="/set-password" replace />
  }
  return <>{children}</>
}

function OnboardingGate({ children }: { children: ReactNode }) {
  const { organizationConfigured, user } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const isMobile = useIsMobile()
  // Oryon staff (super_admin) must always reach the app shell — they may
  // be inspecting a half-configured tenant precisely to debug what the
  // wizard left undone. Without this bypass, super_admin gets trapped in
  // the SetupWizard for any tenant whose onboarding isn't finished.
  if (isOryonStaff(user?.role)) {
    return <>{children}</>
  }
  if (!organizationConfigured && !dismissed) {
    // SetupWizard tem multi-step de configuracao inicial (dados da empresa,
    // numero WhatsApp, primeiros agentes). Em mobile e ilegivel — exigimos
    // desktop para o onboarding.
    if (isMobile) {
      return (
        <div className="h-screen w-screen bg-black flex flex-col items-center justify-center px-6 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-950/40 border border-amber-700/40 flex items-center justify-center">
            <Monitor className="w-8 h-8 text-amber-300" />
          </div>
          <h1 className="text-lg font-semibold text-surface-50">Configuração inicial requer desktop</h1>
          <p className="text-sm text-surface-400 leading-relaxed max-w-xs">
            O assistente de configuração tem múltiplos passos com formulários e
            integrações. Abra o Oryon no seu computador para configurar sua
            empresa. Depois disso, o app mobile fica liberado para uso operacional.
          </p>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(window.location.origin).catch(() => {})}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-900 border border-surface-700 text-sm text-surface-200 hover:bg-surface-800 transition-colors"
          >
            Copiar link do Oryon
          </button>
        </div>
      )
    }
    return <SetupWizard onComplete={() => setDismissed(true)} />
  }
  return <>{children}</>
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <OnboardingGate>
        <AppShell>
          {children}
        </AppShell>
      </OnboardingGate>
    </RequireAuth>
  )
}

function RequireGuest({ children }: { children: ReactNode }) {
  const { isAuthenticated, requiresPasswordChange } = useAuth()
  if (isAuthenticated) {
    return <Navigate to={requiresPasswordChange ? '/set-password' : '/home'} replace />
  }
  return <>{children}</>
}

// ── Animated routes ───────────────────────────────────────────────────────────

function AnimatedRoutes() {
  const location = useLocation()
  const routeKey = '/' + location.pathname.split('/')[1]

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={routeKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{ position: 'absolute', inset: 0, background: 'var(--color-surface-950)' }}
      >
        <Suspense fallback={
          <div className="flex items-center justify-center h-screen w-screen bg-surface-950">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
        <Routes location={location}>
          {/* Public */}
          <Route path="/login" element={
            <RequireGuest><LoginPage /></RequireGuest>
          } />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/activate" element={<ActivateAccountPage />} />

          {/* Password setup gate */}
          <Route path="/set-password" element={
            <RequireAuth><SetPasswordPage /></RequireAuth>
          } />

          {/* Protected */}
          <Route path="/home" element={
            <ProtectedRoute><HomePage /></ProtectedRoute>
          } />
          <Route path="/conversations" element={
            <ProtectedRoute><ConversationsPage /></ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/contacts" element={
            <ProtectedRoute><ContactsPage /></ProtectedRoute>
          } />
          <Route path="/more" element={
            <ProtectedRoute><MorePage /></ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute><NotificationsPage /></ProtectedRoute>
          } />
          <Route path="/campaigns" element={
            <ProtectedRoute><CampaignsPage /></ProtectedRoute>
          } />
          {/* Raiz de settings = hub navegável (mapa das configurações) */}
          <Route path="/settings" element={
            <ProtectedRoute><SettingsPage /></ProtectedRoute>
          } />
          <Route path="/settings/:section" element={
            <ProtectedRoute><SettingsPage /></ProtectedRoute>
          } />
          <Route path="/copilot" element={
            <ProtectedRoute><CopilotPage /></ProtectedRoute>
          } />
          <Route path="/marketing" element={
            <ProtectedRoute><MarketingPage /></ProtectedRoute>
          } />
          <Route path="/automations" element={
            <ProtectedRoute><AutomationsPage /></ProtectedRoute>
          } />
          <Route path="/team" element={
            <ProtectedRoute><TeamChatPage /></ProtectedRoute>
          } />
          <Route path="/agents" element={
            <ProtectedRoute><AgentsPage /></ProtectedRoute>
          } />

          {/* ── Admin (Oryon staff) ──────────────────────────────────── */}
          <Route path="/admin/skill-templates" element={
            <ProtectedRoute><RequireSuperAdmin><AdminMobileBlock featureName="Skills"><SkillTemplatesPage /></AdminMobileBlock></RequireSuperAdmin></ProtectedRoute>
          } />
          <Route path="/admin/skill-templates/new" element={
            <ProtectedRoute><RequireSuperAdmin><AdminMobileBlock featureName="Editor de skill"><SkillTemplateEditorPage /></AdminMobileBlock></RequireSuperAdmin></ProtectedRoute>
          } />
          <Route path="/admin/skill-templates/:id" element={
            <ProtectedRoute><RequireSuperAdmin><AdminMobileBlock featureName="Editor de skill"><SkillTemplateEditorPage /></AdminMobileBlock></RequireSuperAdmin></ProtectedRoute>
          } />
          <Route path="/admin/skill-templates/:id/test" element={
            <ProtectedRoute><RequireSuperAdmin><AdminMobileBlock featureName="Test runner de skill"><SkillTemplateTesterPage /></AdminMobileBlock></RequireSuperAdmin></ProtectedRoute>
          } />
          <Route path="/admin/skills/assign" element={
            <ProtectedRoute><RequireSuperAdmin><AdminMobileBlock featureName="Atribuir skills"><AssignSkillPage /></AdminMobileBlock></RequireSuperAdmin></ProtectedRoute>
          } />
          <Route path="/admin/audit" element={
            <ProtectedRoute><RequireSuperAdmin><AdminMobileBlock featureName="Auditoria"><AuditPage /></AdminMobileBlock></RequireSuperAdmin></ProtectedRoute>
          } />
          <Route path="/admin/ai-observability" element={
            <ProtectedRoute><RequireSuperAdmin><AdminMobileBlock featureName="AI Observability"><AiObservabilityPage /></AdminMobileBlock></RequireSuperAdmin></ProtectedRoute>
          } />
          <Route path="/admin/ai-executions" element={
            <ProtectedRoute><RequireSuperAdmin><AdminMobileBlock featureName="AI Executions"><AiExecutionsPage /></AdminMobileBlock></RequireSuperAdmin></ProtectedRoute>
          } />
          <Route path="/admin/agents" element={
            <ProtectedRoute><RequireSuperAdmin><AdminMobileBlock featureName="Editor de agentes"><AdminAgentEditorPage /></AdminMobileBlock></RequireSuperAdmin></ProtectedRoute>
          } />

          {/* Public pricing */}
          <Route path="/pricing" element={<PricingPage />} />

          {/* Canva OAuth callback — public, opened as popup */}
          <Route path="/canva/callback" element={<CanvaCallbackPage />} />

          {/* Welcome page — public */}
          <Route path="/" element={<WelcomePage />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
}

// ── Global toast container — reads do singleton em useToast.ts ──────────────
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'

function GlobalToastContainer() {
  const { toasts, dismiss } = useToast()
  return <ToastContainer toasts={toasts} onDismiss={dismiss} />
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  useEffect(() => {
    clearChunkReloadFlag()
  }, [])

  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <TenantVocabProvider>
        <CRMConfigProvider>
          <InternalChatProvider>
          <CopilotProvider>
            <ContextMenuProvider>
              <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--color-surface-950)' }}>
                <AnimatedRoutes />
                <CopilotPanel />
                <GlobalToastContainer />
              </div>
            </ContextMenuProvider>
          </CopilotProvider>
          </InternalChatProvider>
        </CRMConfigProvider>
      </TenantVocabProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
