import { Suspense, type ReactNode } from 'react'
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom'
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

const JornadasPage = lazyRoute(() => import('@/pages/JornadasPage').then((m) => ({ default: m.JornadasPage })))
const JornadaPage = lazyRoute(() => import('@/pages/JornadaPage').then((m) => ({ default: m.JornadaPage })))

function Pagina({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <PageTransition>{children}</PageTransition>
    </AppShell>
  )
}

/**
 * Os mesmos provedores e a mesma `AppShell` do app (cópia de `DemoApp`), só
 * com as rotas das Jornadas. Qualquer outro caminho volta para `/jornadas`.
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
                                <Route path="*" element={<Navigate to="/jornadas" replace />} />
                              </Routes>
                            </Suspense>
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
