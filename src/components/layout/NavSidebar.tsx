import { useState, useEffect, useCallback } from 'react'
import {
  MessageSquare,
  Users,
  BarChart3,
  Home,
  Send,
  Megaphone,
  Workflow,
  MessagesSquare,
  Bot,
  ShieldCheck,
  Activity,
  LineChart,
  PanelLeft,
  Handshake,
  Calendar,
  Inbox,
} from 'lucide-react'
import { CopilotMark } from '@/lib/icons'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { Sidebar, SidebarBody, SidebarLink, SidebarSectionLabel, useSidebar } from '@/components/ui/sidebar'
import { useAuth } from '@/contexts/AuthContext'
import { isOryonStaff as isOryonStaffHelper } from '@/lib/roleHelpers'
import { useSetupChecklist } from '@/hooks/useSetupChecklist'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { useInternalChat } from '@/contexts/InternalChatContext'
import { conversationsApi } from '@/services/api'
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility'
import { useMultiPipeline } from '@/hooks/useMultiPipeline'
import { AiCreditsIndicator } from './AiCreditsIndicator'

interface NavSidebarProps {
  totalUnread?: number
  /**
   * When true, renders fully expanded (no hover-collapse) and overrides the
   * primitive's fixed width to fill the parent. Used by AppShell to embed the
   * sidebar inside a mobile drawer.
   */
  forceExpanded?: boolean
}

function LogoSection({ onToggle }: { onToggle?: () => void }) {
  const { open, animate } = useSidebar()
  const collapsed = animate && !open
  const toggleTitle = open ? 'Recolher navegação (Ctrl+B)' : 'Abrir navegação (Ctrl+B)'
  return (
    <div className="group/logo flex items-center h-9 gap-[9px] px-1.5 mb-2 flex-shrink-0">
      {/* SHELL-SIDEBAR-02/06 (spec shell.md): header 36px, gap 9, padding 6;
          logo 26px (o mock usa um tile-placeholder; mantemos a marca real no
          tamanho da spec). Nome do workspace à direita = [!] (campo do tenant
          a confirmar). */}
      {/* Recolhida, o LOGO é o botão (padrão do Claude): em repouso mostra a
          marca; no hover/foco da linha a marca dá lugar ao ícone PanelLeft.
          Aberta, a marca é só marca e o botão vai para a ponta direita da
          mesma linha — nunca uma linha só para ele (PO, 23/09). */}
      {onToggle && collapsed ? (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Abrir navegação"
          aria-expanded={false}
          title={toggleTitle}
          className="relative w-[26px] h-[26px] flex-shrink-0 rounded-sm flex items-center justify-center cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
        >
          <img
            src="/oryon-logo.svg"
            alt=""
            className="w-[26px] h-[26px] select-none transition-opacity duration-100 group-hover/logo:opacity-0 group-focus-within/logo:opacity-0"
            draggable={false}
          />
          <PanelLeft
            className="absolute inset-0 m-auto w-3.5 h-3.5 text-surface-300 opacity-0 transition-opacity duration-100 group-hover/logo:opacity-100 group-focus-within/logo:opacity-100"
            strokeWidth={1.75}
            aria-hidden
          />
        </button>
      ) : (
        <img
          src="/oryon-logo.svg"
          alt="Oryon"
          className="w-[26px] h-[26px] flex-shrink-0 select-none"
          draggable={false}
        />
      )}
      <AnimatePresence>
        {(!animate || open) && (
          <motion.img
            src="/oryon-wordmark.png"
            alt="Oryon"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.15 }}
            // SEM a classe oryon-wordmark: essa classe inverte a wordmark
            // (branca→preta) no tema claro, mas a sidebar agora é sempre
            // escura — a wordmark original (branca) precisa ficar como está
            // nos dois temas, senão fica preta sobre fundo escuro.
            className="h-5 w-auto select-none"
            draggable={false}
          />
        )}
      </AnimatePresence>
      {onToggle && open && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Recolher navegação"
          aria-expanded
          title={toggleTitle}
          className="ml-auto w-6 h-6 rounded-sm flex items-center justify-center text-surface-500 hover:text-surface-200 hover:bg-white/10 transition-colors cursor-pointer flex-shrink-0"
        >
          <PanelLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
      )}
    </div>
  )
}

const NOOP = () => {}

export function NavSidebar({ totalUnread = 0, forceExpanded = false }: NavSidebarProps) {
  // Estado da navegação: RECOLHIDA (62px) ou ABERTA (228px), escolhido por
  // clique e persistido — hover NÃO expande mais (PO, 23/09: o mouse
  // encostava no canto e a tela inteira refluía por acidente). Referência:
  // Claude/Linear/Slack — hover informa (tooltip), clique decide. Ctrl/⌘+B.
  const [pinned, setPinned] = useState(() => {
    try { return localStorage.getItem('oryon:sidebar-pinned') === '1' } catch { return false }
  })
  const togglePinned = useCallback(() => setPinned((p) => {
    const next = !p
    try { localStorage.setItem('oryon:sidebar-pinned', next ? '1' : '0') } catch { /* ignore */ }
    return next
  }), [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.key.toLowerCase() !== 'b') return
      const el = e.target as HTMLElement | null
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return
      e.preventDefault()
      togglePinned()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [togglePinned])
  const [whatsappUnread, setWhatsappUnread] = useState(totalUnread)
  const location = useLocation()
  const activeHref = '/' + location.pathname.split('/')[1]
  // Configurações e logout saíram da sidebar (SCRUM-1100 · rodapé agora é só
  // o consumo de créditos de IA) — `useAuth` aqui só precisa do usuário/flags
  // que ainda decidem quais itens de navegação aparecem.
  const { user, organizationConfigured } = useAuth()
  const { isRouteVisible, isFeatureVisible } = useFeatureVisibility()
  const { checklist } = useSetupChecklist(user?.id)
  const { vocab } = useTenantVocab()
  const { totalUnread: internalUnread } = useInternalChat()
  const multiPipeline = useMultiPipeline()

  const refreshUnread = useCallback(() => {
    conversationsApi.unreadTotal()
      .then((res) => setWhatsappUnread(res.data.totalUnread ?? 0))
      .catch(() => {})
  }, [])

  // Re-fetch unread count whenever route changes (user opens a conversation)
  useEffect(() => {
    refreshUnread()
  }, [location.pathname, totalUnread, refreshUnread])

  // Listen for real-time unread updates via socket
  useEffect(() => {
    let socket: ReturnType<typeof import('@/services/socket').connectSocket> | null = null
    import('@/services/socket').then(({ connectSocket }) => {
      socket = connectSocket()
      socket.on('unread:update', (payload: { total: number }) => {
        setWhatsappUnread(payload.total)
      })
      // Update unread count when new messages come in (via conversation:updated)
      socket.on('conversation:updated', () => {
        refreshUnread()
      })
    })
    return () => {
      socket?.off('unread:update')
      socket?.off('conversation:updated')
    }
  }, [refreshUnread])

  const geralItems = [
    { icon: <Home className="w-[16.5px] h-[16.5px]" />,          label: 'Home',       href: '/home' },
    {
      icon: <BarChart3 className="w-[16.5px] h-[16.5px]" />,
      label: 'Dashboard',
      href: '/dashboard',
      nudge: !checklist.dashboard ? 'Novo' : undefined,
    },
    {
      icon: <MessageSquare className="w-[16.5px] h-[16.5px]" />,
      label: 'Conversas',
      href: '/conversations',
      badge: whatsappUnread > 0 ? whatsappUnread : undefined,
    },
    {
      icon: <Users className="w-[16.5px] h-[16.5px]" />,
      label: vocab.contacts,
      href: '/contacts',
      nudge: !organizationConfigured ? 'Configurar' : undefined,
    },
    // D2 (SCRUM-935): "Funis" — Board + Relatórios de negócios, 1 clique
    // daqui. Gate SCRUM-498: mesmo flag de tenant que já esconde o board
    // de dentro de /contacts.
    ...(multiPipeline ? [{
      // PL-5-2: Handshake não existe no set da casa (`src/lib/icons.tsx`) e cai
      // no lucide-react de verdade, cujo traço padrão é 2 — mais pesado que o
      // 1.75 dos 11 vizinhos desta mesma barra. Mesmo motivo do LineChart abaixo.
      icon: <Handshake className="w-[16.5px] h-[16.5px]" strokeWidth={1.75} />,
      label: 'Funis',
      href: '/pipelines',
    }] : []),
  ].filter((item) => isRouteVisible(item.href))

  const ferramentasItems = [
    {
      icon: <Send className="w-[16.5px] h-[16.5px]" />,
      label: 'Disparos',
      href: '/campaigns',
      nudge: !checklist.campaigns ? 'Novo' : undefined,
    },
    // SCRUM-1107: casca visual da tela de Agendamentos (rota+flag já
    // existiam, só faltava o item de menu).
    { icon: <Calendar className="w-[16.5px] h-[16.5px]" />, label: 'Agendamentos', href: '/schedule' },
    { icon: <Megaphone className="w-[16.5px] h-[16.5px]" />, label: 'Marketing',   href: '/marketing' },
    { icon: <Workflow className="w-[16.5px] h-[16.5px]" />,   label: 'Automações',  href: '/automations' },
    { icon: <Bot className="w-[16.5px] h-[16.5px]" />,        label: 'Agentes IA',  href: '/agents' },
    { icon: <CopilotMark className="w-[16.5px] h-[16.5px]" />,   label: 'Copilot AI', href: '/copilot',
      nudge: !checklist.copilot ? 'Setup' : undefined },
  ].filter((item) => isRouteVisible(item.href))

  const internalChatItem = {
    icon: <MessagesSquare className="w-[16.5px] h-[16.5px]" />,
    label: 'Nexus',
    href: '/team',
    badge: internalUnread > 0 ? internalUnread : undefined,
  }
  const internalChatVisible = isRouteVisible(internalChatItem.href)
  // Oryon staff only — never shown to a customer's business_admin even if
  // they discover the URL (the route guard + agent-server gate also block them).
  const isOryonStaff = isOryonStaffHelper(user?.role)

  // When forceExpanded is true, the Sidebar primitive renders at fixed 228px
  // (via inline style). The wrapper className `[&_.nav-sidebar]:!w-full`
  // overrides that inline width so the sidebar fills its parent — used when
  // embedded in a mobile drawer that is wider than 228px.
  //
  // PIN: quem trabalha 8h/dia pode FIXAR a sidebar expandida — o hover-expand
  // padrão re-layouta a tela a cada passagem do mouse (jank acumulado). O pin
  // persiste em localStorage e reaproveita o caminho do forceExpanded.
  const expanded = forceExpanded || pinned
  const sidebarOpen = expanded
  // Sem hover-expand: o primitivo ainda chama setOpen no mouseenter/leave,
  // mas aqui é no-op — só o botão/atalho muda o estado.
  const sidebarSetOpen = NOOP
  const sidebarAnimate = !forceExpanded

  const body = (
    <Sidebar open={sidebarOpen} setOpen={sidebarSetOpen} animate={sidebarAnimate}>
      <SidebarBody className="justify-between">
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
          <div className="relative">
            <LogoSection onToggle={forceExpanded ? undefined : togglePinned} />
          </div>

          {/* GERAL */}
          {geralItems.length > 0 && (
            <>
              <SidebarSectionLabel label="Geral" />
              <nav className="flex flex-col gap-0.5">
                {geralItems.map((item) => (
                  <SidebarLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    active={activeHref === item.href}
                    badge={item.badge}
                    nudge={item.nudge}
                  />
                ))}
              </nav>
            </>
          )}

          {/* Chat Interno */}
          {internalChatVisible && (
            <nav className="flex flex-col gap-0.5 mb-1">
              <SidebarLink
                href={internalChatItem.href}
                icon={internalChatItem.icon}
                label={internalChatItem.label}
                badge={internalChatItem.badge}
                active={activeHref === '/team'}
              />
            </nav>
          )}

          {/* FERRAMENTAS */}
          {ferramentasItems.length > 0 && (
            <>
              <SidebarSectionLabel label="Ferramentas" />
              <nav className="flex flex-col gap-0.5">
                {ferramentasItems.map((item) => (
                  <SidebarLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    active={activeHref === item.href}
                    nudge={item.nudge}
                  />
                ))}
              </nav>
            </>
          )}

          {/* ORYON (super_admin only) — gated by `oryonStaffSidebar` flag for
              temporary hiding. When the flag is false, the whole section
              disappears from the menu but routes (/admin/*) still work via
              direct URL — matches the pattern of every other flag here. */}
          {isOryonStaff && isFeatureVisible('oryonStaffSidebar') && (
            <>
              <SidebarSectionLabel label="Oryon" />
              <nav className="flex flex-col gap-0.5">
                <SidebarLink
                  href="/admin/skill-templates"
                  icon={<ShieldCheck className="w-[16.5px] h-[16.5px]" />}
                  label="Skills"
                  active={activeHref.startsWith('/admin/skill')}
                />
                <SidebarLink
                  href="/admin/agents"
                  icon={<Bot className="w-[16.5px] h-[16.5px]" />}
                  label="Agentes (cross-tenant)"
                  active={activeHref.startsWith('/admin/agents')}
                />
                {/* "Conectores" (ciclo de vida do catálogo, /admin/connectors)
                    tirado deste menu em 2026-09-15 — decisão de produto: essa
                    entrada estava duplicando a confusão com o item homônimo
                    do menu de Configurações (hub de instalação, outra tela,
                    outro propósito). A rota continua acessível por URL
                    direta, mesmo padrão do flag `oryonStaffSidebar` acima. */}
                {/* D12 — some com a flag connectorsSelfService desligada. */}
                {isFeatureVisible('connectorsSelfService') && (
                  <SidebarLink
                    href="/admin/connector-requests"
                    icon={<Inbox className="w-[16.5px] h-[16.5px]" />}
                    label="Solicitações de conector"
                    active={activeHref === '/admin/connector-requests'}
                  />
                )}
                <SidebarLink
                  href="/admin/audit"
                  icon={<Activity className="w-[16.5px] h-[16.5px]" />}
                  label="Auditoria"
                  active={activeHref === '/admin/audit'}
                />
                <SidebarLink
                  href="/admin/ai-observability"
                  icon={<LineChart className="w-[16.5px] h-[16.5px]" strokeWidth={1.75} />}
                  label="AI Observability"
                  active={activeHref === '/admin/ai-observability'}
                />
                <SidebarLink
                  href="/admin/ai-executions"
                  icon={<Bot className="w-[16.5px] h-[16.5px]" />}
                  label="AI Executions"
                  active={activeHref === '/admin/ai-executions'}
                />
              </nav>
            </>
          )}

          {/* Configurações saiu da sidebar (SCRUM-1100 · 3.13): agora é item
              do menu do usuário na TopBar, que navega para a mesma rota
              `/settings` — o contrato de URL não muda, só a porta de entrada. */}
        </div>

        {/* Rodapé: só o consumo de créditos de IA (SCRUM-1100 · 3.12).
            Configurações e avatar saíram para o menu do usuário na TopBar. */}
        <AiCreditsIndicator />
      </SidebarBody>
    </Sidebar>
  )

  if (forceExpanded) {
    return <div className="h-full w-full [&_.nav-sidebar]:!w-full">{body}</div>
  }
  return body
}
