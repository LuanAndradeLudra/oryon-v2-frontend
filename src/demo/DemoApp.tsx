import { MemoryRouter, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
import { Suspense, useEffect } from 'react'
import type { ReactNode } from 'react'
import { lazyRoute } from '@/lib/lazyRoute'
import { LayerProvider } from '@/contexts/LayerContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { TenantVocabProvider } from '@/contexts/TenantVocabContext'
import { CRMConfigProvider } from '@/contexts/CRMConfigContext'
import { TagsProvider } from '@/contexts/TagsContext'
import { ContextMenuProvider } from '@/components/ui/ContextMenu'
import { DealPanelProvider } from '@/contexts/DealPanelContext'
import { CopilotProvider } from '@/contexts/CopilotContext'
import { InternalChatProvider } from '@/contexts/InternalChatContext'
import { AppShell } from '@/components/layout/AppShell'
import { PageTransition } from '@/components/layout/PageTransition'

// As MESMAS páginas e o mesmo carregamento tardio de `App.tsx`.
const ConversationsPage = lazyRoute(() => import('@/pages/ConversationsPage').then(m => ({ default: m.ConversationsPage })))
const PipelinePage = lazyRoute(() => import('@/pages/PipelinePage').then(m => ({ default: m.PipelinePage })))
const PipelinesIndexPage = lazyRoute(() => import('@/pages/PipelinesIndexPage').then(m => ({ default: m.PipelinesIndexPage })))
const CampaignsPage = lazyRoute(() => import('@/pages/CampaignsPage').then(m => ({ default: m.CampaignsPage })))
const AgentsPage = lazyRoute(() => import('@/pages/AgentsPage').then(m => ({ default: m.AgentsPage })))
const HomePage = lazyRoute(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })))

/** O que `ProtectedRoute` monta para uma sessão já autenticada e com o
 *  workspace pronto: `AppShell` + `PageTransition`. `RequireAuth` e
 *  `OnboardingGate` só redirecionam — com a sessão e a prontidão da
 *  demonstração, não desenham nada. */
function Pagina({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  )
}

type Janela = { __demoNavegar?: (to: string) => void; __demoRota?: () => string }

/** Ponte do roteiro: navegar entre módulos é trocar de rota, como um clique
 *  no menu faria. */
function PonteDeNavegacao() {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  useEffect(() => {
    const w = window as unknown as Janela
    w.__demoNavegar = (to) => navigate(to)
    w.__demoRota = () => pathname + search
  }, [navigate, pathname, search])
  return null
}

/**
 * O APP REAL, montado no documento de demonstração.
 *
 * A diferença para `App.tsx` é deliberadamente mínima: os mesmos provedores,
 * na mesma ordem, a mesma `AppShell`, a mesma transição e as mesmas páginas.
 * O que muda é `MemoryRouter` no lugar do `BrowserRouter` — a navegação do
 * roteiro não pode mexer na URL da landing.
 *
 * Nenhum pixel aqui é desenhado à mão. Se uma tela ficar diferente do produto,
 * é porque o backend de demonstração ainda não responde àquele endpoint — e é
 * exatamente isso que o registro de rotas não mapeadas existe para mostrar.
 */
export function DemoApp({ inicial = '/conversations' }: { inicial?: string }) {
  return (
    /* O roteador por FORA de tudo, como em `App.tsx`: `DealPanelProvider` usa
       `useNavigate` e quebra fora do Router. */
    <MemoryRouter initialEntries={[inicial]}>
      <PonteDeNavegacao />
      <LayerProvider>
        <AuthProvider>
          <TenantVocabProvider>
            <CRMConfigProvider>
              <TagsProvider>
                <InternalChatProvider>
                  <CopilotProvider>
                    <ContextMenuProvider>
                      <DealPanelProvider>
                        <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--color-surface-950)' }}>
                          <Suspense fallback={null}>
                            <Routes>
                              <Route path="/home" element={<Pagina><HomePage /></Pagina>} />
                              <Route path="/conversations" element={<Pagina><ConversationsPage /></Pagina>} />
                              <Route path="/pipelines" element={<Pagina><PipelinesIndexPage /></Pagina>} />
                              <Route path="/pipelines/:id" element={<Pagina><PipelinePage /></Pagina>} />
                              <Route path="/campaigns" element={<Pagina><CampaignsPage /></Pagina>} />
                              <Route path="/agents" element={<Pagina><AgentsPage /></Pagina>} />
                            </Routes>
                          </Suspense>
                        </div>
                      </DealPanelProvider>
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
