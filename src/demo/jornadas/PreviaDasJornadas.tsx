import { Suspense, type ReactNode } from 'react'
import { MemoryRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { lazyRoute } from '@/lib/lazyRoute'
import { LayerProvider } from '@/contexts/LayerContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { TenantVocabProvider } from '@/contexts/TenantVocabContext'
import { CRMConfigProvider } from '@/contexts/CRMConfigContext'
import { TagsProvider } from '@/contexts/TagsContext'
import { ContextMenuProvider } from '@/components/ui/ContextMenu'
import { MediaViewerProvider } from '@/components/ui/MediaViewer'
import { DealPanelProvider } from '@/contexts/DealPanelContext'
import { CopilotProvider } from '@/contexts/CopilotContext'
import { InternalChatProvider } from '@/contexts/InternalChatContext'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/layout/PageTransition'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { EmptyState } from '@/components/ui/EmptyState'

const JornadasPage = lazyRoute(() => import('@/pages/JornadasPage').then((m) => ({ default: m.JornadasPage })))
const JornadaPage = lazyRoute(() => import('@/pages/JornadaPage').then((m) => ({ default: m.JornadaPage })))
// Os outros módulos com dados no backend em memória (os mesmos da demonstração
// da landing, `src/demo/DemoApp.tsx`, mais Leads), então dá para navegar pelo
// app e ver a entrada e a saída do editor como no produto.
const HomePage = lazyRoute(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })))
const DashboardPage = lazyRoute(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const ConversationsPage = lazyRoute(() => import('@/pages/ConversationsPage').then((m) => ({ default: m.ConversationsPage })))
const ContactsPage = lazyRoute(() => import('@/pages/ContactsPage').then((m) => ({ default: m.ContactsPage })))
const ContactProfilePage = lazyRoute(() => import('@/pages/ContactProfilePage').then((m) => ({ default: m.ContactProfilePage })))
const PipelinesIndexPage = lazyRoute(() => import('@/pages/PipelinesIndexPage').then((m) => ({ default: m.PipelinesIndexPage })))
const PipelinePage = lazyRoute(() => import('@/pages/PipelinePage').then((m) => ({ default: m.PipelinePage })))
const CampaignsPage = lazyRoute(() => import('@/pages/CampaignsPage').then((m) => ({ default: m.CampaignsPage })))
const AgentsPage = lazyRoute(() => import('@/pages/AgentsPage').then((m) => ({ default: m.AgentsPage })))

/**
 * Módulo que a prévia não tem (sem dados no backend em memória). Antes, qualquer
 * caminho desconhecido voltava calado para /jornadas e parecia que o menu não
 * funcionava; agora a tela diz o que houve. Só existe na prévia (não vai ao build).
 */
function ForaDaPrevia() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  return (
    <div className="flex flex-1 items-center justify-center p-8 bg-surface-950">
      <EmptyState
        icon={Compass}
        title="Este módulo não está na prévia das Jornadas"
        hint={`A prévia roda sem servidor e só tem dados para Home, Dashboard, Conversas, Leads, Funis, Disparos, Jornadas e Agentes IA (${pathname}).`}
        action={{ label: 'Voltar para as Jornadas', onClick: () => navigate('/jornadas') }}
      />
    </div>
  )
}

/** Os avisos (toasts), como o `GlobalToastContainer` do App. */
function Avisos() {
  const { toasts, dismiss } = useToast()
  return <ToastContainer toasts={toasts} onDismiss={dismiss} />
}

function Pagina({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  )
}

/**
 * Os mesmos provedores e a mesma `AppShell` do app (cópia de `DemoApp`), com
 * as Jornadas e os módulos que o backend em memória atende. O resto mostra
 * `ForaDaPrevia`.
 */
export function PreviaDasJornadas({ inicial }: { inicial: string }) {
  return (
    <MemoryRouter initialEntries={[inicial]}>
      <LayerProvider>
        <AuthProvider>
          <TenantVocabProvider>
            <CRMConfigProvider>
              <TagsProvider>
                <InternalChatProvider>
                  <CopilotProvider>
                    <ContextMenuProvider>
                      <MediaViewerProvider>
                        <DealPanelProvider>
                          <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--color-surface-950)' }}>
                            <Suspense fallback={null}>
                              <Routes>
                                <Route path="/jornadas" element={<Pagina><JornadasPage /></Pagina>} />
                                <Route path="/jornadas/:id" element={<Pagina><JornadaPage /></Pagina>} />
                                <Route path="/home" element={<Pagina><HomePage /></Pagina>} />
                                <Route path="/dashboard" element={<Pagina><DashboardPage /></Pagina>} />
                                <Route path="/conversations" element={<Pagina><ConversationsPage /></Pagina>} />
                                <Route path="/contacts" element={<Pagina><ContactsPage /></Pagina>} />
                                <Route path="/contacts/:id" element={<Pagina><ContactProfilePage /></Pagina>} />
                                <Route path="/pipelines" element={<Pagina><PipelinesIndexPage /></Pagina>} />
                                <Route path="/pipelines/:id" element={<Pagina><PipelinePage /></Pagina>} />
                                <Route path="/campaigns" element={<Pagina><CampaignsPage /></Pagina>} />
                                <Route path="/agents" element={<Pagina><AgentsPage /></Pagina>} />
                                <Route path="/agents/:agentId/:secao?" element={<Pagina><AgentsPage /></Pagina>} />
                                <Route path="/" element={<Navigate to="/jornadas" replace />} />
                                <Route path="*" element={<Pagina><ForaDaPrevia /></Pagina>} />
                              </Routes>
                            </Suspense>
                            <Avisos />
                          </div>
                        </DealPanelProvider>
                      </MediaViewerProvider>
                    </ContextMenuProvider>
                  </CopilotProvider>
                </InternalChatProvider>
              </TagsProvider>
            </CRMConfigProvider>
          </TenantVocabProvider>
        </AuthProvider>
      </LayerProvider>
    </MemoryRouter>
  )
}
