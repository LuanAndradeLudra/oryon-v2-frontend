// B2 (SCRUM-928) — o "painel lateral" da ficha do negócio. Não existia
// nenhum sistema de camada/drawer genérico no app (`useLayer` citado no
// card não existe em lugar nenhum — grep confirmado) — o padrão real do
// código é um drawer sempre-montado, controlado por prop local, portal para
// `document.body` (ver `CRMConfigDrawer`/`ContactDetailPanel` em
// `ContactsPage`). Este provider generaliza esse MESMO padrão para um único
// lugar global (montado 1x em `App.tsx`), porque a ficha precisa abrir como
// painel a partir de VÁRIAS páginas (/contacts, /contacts/:id,
// /conversations) — replicar o estado local em cada uma reintroduziria
// divergência (o mesmo problema que a B5 matou para os funis).
import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DealDetailPanel } from '@/components/deals/DealDetailPanel'

interface DealPanelContextValue {
  /** Abre a ficha do negócio `dealId` como painel lateral, por cima da
   *  página atual — nunca navega, nunca desmonta a página (preserva
   *  rascunho de chat, scroll, etc). */
  openDeal: (dealId: string) => void
  closeDeal: () => void
  /** Id do negócio aberto no painel, ou `null`. */
  openDealId: string | null
  /** Registrado por `ConversationsPage` enquanto montada — permite que a aba
   *  "Conversas" da ficha troque a conversa ativa no painel de chat SEM
   *  navegar (preserva o rascunho). Fora de `/conversations`, fica `null` e
   *  `openConversationBeside` cai para navegação normal. */
  registerConversationOpener: (fn: ((conversationId: string) => void) | null) => void
  openConversationBeside: (conversationId: string) => void
}

const DealPanelContext = createContext<DealPanelContextValue | null>(null)

export function useDealPanel(): DealPanelContextValue {
  const ctx = useContext(DealPanelContext)
  if (!ctx) throw new Error('useDealPanel precisa de <DealPanelProvider> no topo da árvore.')
  return ctx
}

export function DealPanelProvider({ children }: { children: ReactNode }) {
  const [openDealId, setOpenDealId] = useState<string | null>(null)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const conversationOpenerRef = useRef<((conversationId: string) => void) | null>(null)

  const openDeal = useCallback((dealId: string) => setOpenDealId(dealId), [])
  const closeDeal = useCallback(() => setOpenDealId(null), [])

  const registerConversationOpener = useCallback((fn: ((conversationId: string) => void) | null) => {
    conversationOpenerRef.current = fn
  }, [])

  const openConversationBeside = useCallback((conversationId: string) => {
    if (conversationOpenerRef.current) {
      conversationOpenerRef.current(conversationId)
      return
    }
    // Fora de /conversations (ficha aberta como página, por exemplo): não há
    // "painel oposto" para carregar — a única saída razoável é navegar.
    navigate(`/conversations?id=${conversationId}`)
  }, [navigate])

  // Deep link `?deal=<id>` — mesmo mecanismo do `?contact=` em ContactsPage:
  // abre uma vez e limpa o param (não fica preso na URL a cada render).
  // Funciona em QUALQUER página porque o provider é montado uma vez no
  // topo (App.tsx), não replicado por página.
  useEffect(() => {
    const dealParam = searchParams.get('deal')
    if (dealParam) {
      setOpenDealId(dealParam)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('deal')
        return next
      }, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <DealPanelContext.Provider value={{ openDeal, closeDeal, openDealId, registerConversationOpener, openConversationBeside }}>
      {children}
      {createPortal(
        <AnimatePresence>
          {openDealId && (
            <>
              <motion.div
                key="deal-panel-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 bg-black/40 z-[49]"
                onClick={closeDeal}
              />
              <motion.div
                key="deal-panel"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.9 }}
                className="fixed top-0 right-0 bottom-0 w-full sm:w-[48rem] z-50 bg-surface-950 border-l overlay-frame flex flex-col"
                role="dialog"
                aria-modal="true"
                aria-label="Ficha do negócio"
              >
                <DealDetailPanel
                  dealId={openDealId}
                  onClose={closeDeal}
                  onExpand={(id) => { closeDeal(); navigate(`/deals/${id}`) }}
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </DealPanelContext.Provider>
  )
}
