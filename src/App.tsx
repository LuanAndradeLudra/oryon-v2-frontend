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
        <div style={{ padding: 40, fontFamily: 'sans-serif', color: '#fff', background: '#1a1a2e', minHeight: '100vh' }}>
          <h2 style={{ color: '#ef4444', marginBottom: 12 }}>Algo deu errado</h2>
          <p style={{ color: '#94a3b8', marginBottom: 20 }}>A página encontrou um erro. Tente recarregar.</p>
          <pre style={{ background: '#0f0f23', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13, color: '#f59e0b' }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => { this.setState({ error: null }); window.location.reload() }}
            style={{ marginTop: 16, padding: '8px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
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

// Lazy-loaded pages — only downloaded when the route is visited (lazyRoute = reload on stale chunk after deploy)
const ConversationsPage = lazyRoute(() => import('@/pages/ConversationsPage').then(m => ({ default: m.ConversationsPage })))
const ContactsPage      = lazyRoute(() => import('@/pages/ContactsPage').then(m => ({ default: m.ContactsPage })))
const SettingsPage      = lazyRoute(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const DashboardPage     = lazyRoute(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const HomePage          = lazyRoute(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })))
const ForgotPasswordPage = lazyRoute(() => import('@/pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage  = lazyRoute(() => import('@/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))
const RegisterPage       = lazyRoute(() => import('@/pages/RegisterPage').then(m => ({ default: m.RegisterPage })))
const CampaignsPage     = lazyRoute(() => import('@/pages/CampaignsPage').then(m => ({ default: m.CampaignsPage })))
const CopilotPage       = lazyRoute(() => import('@/pages/CopilotPage').then(m => ({ default: m.CopilotPage })))
const MarketingPage     = lazyRoute(() => import('@/pages/MarketingPage').then(m => ({ default: m.MarketingPage })))
const AutomationsPage   = lazyRoute(() => import('@/pages/AutomationsPage').then(m => ({ default: m.AutomationsPage })))
const AgentsPage        = lazyRoute(() => import('@/pages/AgentsPage').then(m => ({ default: m.AgentsPage })))
const PricingPage       = lazyRoute(() => import('@/pages/PricingPage').then(m => ({ default: m.PricingPage })))
const TeamChatPage      = lazyRoute(() => import('@/pages/TeamChatPage').then(m => ({ default: m.TeamChatPage })))
const CanvaCallbackPage = lazyRoute(() => import('@/pages/CanvaCallbackPage').then(m => ({ default: m.CanvaCallbackPage })))

// Admin (Oryon staff only) — gated by RequireSuperAdmin inside the route.
const SkillTemplatesPage       = lazyRoute(() => import('@/pages/admin/SkillTemplatesPage').then(m => ({ default: m.SkillTemplatesPage })))
const SkillTemplateEditorPage  = lazyRoute(() => import('@/pages/admin/SkillTemplateEditorPage').then(m => ({ default: m.SkillTemplateEditorPage })))
const SkillTemplateTesterPage  = lazyRoute(() => import('@/pages/admin/SkillTemplateTesterPage').then(m => ({ default: m.SkillTemplateTesterPage })))
const AssignSkillPage          = lazyRoute(() => import('@/pages/admin/AssignSkillPage').then(m => ({ default: m.AssignSkillPage })))
const AuditPage                = lazyRoute(() => import('@/pages/admin/AuditPage').then(m => ({ default: m.AuditPage })))
const AiObservabilityPage      = lazyRoute(() => import('@/pages/admin/AiObservabilityPage').then(m => ({ default: m.AiObservabilityPage })))

import { RequireSuperAdmin } from '@/components/admin/RequireSuperAdmin'

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
  const { organizationConfigured } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  if (!organizationConfigured && !dismissed) {
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
          <Route path="/campaigns" element={
            <ProtectedRoute><CampaignsPage /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <RequireAuth><Navigate to="/settings/account" replace /></RequireAuth>
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
            <ProtectedRoute><RequireSuperAdmin><SkillTemplatesPage /></RequireSuperAdmin></ProtectedRoute>
          } />
          <Route path="/admin/skill-templates/new" element={
            <ProtectedRoute><RequireSuperAdmin><SkillTemplateEditorPage /></RequireSuperAdmin></ProtectedRoute>
          } />
          <Route path="/admin/skill-templates/:id" element={
            <ProtectedRoute><RequireSuperAdmin><SkillTemplateEditorPage /></RequireSuperAdmin></ProtectedRoute>
          } />
          <Route path="/admin/skill-templates/:id/test" element={
            <ProtectedRoute><RequireSuperAdmin><SkillTemplateTesterPage /></RequireSuperAdmin></ProtectedRoute>
          } />
          <Route path="/admin/skills/assign" element={
            <ProtectedRoute><RequireSuperAdmin><AssignSkillPage /></RequireSuperAdmin></ProtectedRoute>
          } />
          <Route path="/admin/audit" element={
            <ProtectedRoute><RequireSuperAdmin><AuditPage /></RequireSuperAdmin></ProtectedRoute>
          } />
          <Route path="/admin/ai-observability" element={
            <ProtectedRoute><RequireSuperAdmin><AiObservabilityPage /></RequireSuperAdmin></ProtectedRoute>
          } />

          {/* Public pricing */}
          <Route path="/pricing" element={<PricingPage />} />

          {/* Canva OAuth callback — public, opened as popup */}
          <Route path="/canva/callback" element={<CanvaCallbackPage />} />

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  )
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
