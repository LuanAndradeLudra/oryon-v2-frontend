import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { lazy, Suspense } from 'react'
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

const ConversationsPage = lazy(async () => ({ default: (await import('@/pages/ConversationsPage')).ConversationsPage }))

/**
 * O APP REAL, montado no documento de demonstração.
 *
 * A diferença para `App.tsx` é deliberadamente mínima: os mesmos provedores,
 * na mesma ordem, a mesma `AppShell` e as mesmas páginas. O que muda é
 * `MemoryRouter` no lugar do `BrowserRouter` — a navegação do roteiro não pode
 * mexer na URL da landing — e a ausência dos provedores que só existem para
 * funcionalidades fora do palco (Copilot, chat interno), que o spike acrescenta
 * se algum consumidor reclamar.
 *
 * Nenhum pixel aqui é desenhado à mão. Se uma tela ficar diferente do produto,
 * é porque o backend de demonstração ainda não responde àquele endpoint — e é
 * exatamente isso que o registro de rotas não mapeadas existe para mostrar.
 */
export function DemoApp() {
  return (
    /* O roteador por FORA de tudo, como em `App.tsx`: `DealPanelProvider` usa
       `useNavigate` e quebra fora do Router — foi o primeiro achado do spike.
       Manter a mesma ordem do app não é estética, é requisito. */
    <MemoryRouter initialEntries={['/conversations']}>
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
                          <Route
                            path="/conversations"
                            element={<AppShell><ConversationsPage /></AppShell>}
                          />
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
