import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'

// ── Mock heavy/side-effectful modules ────────────────────────────────────────

// Mock the socket service so no real connections are made
vi.mock('@/services/socket', () => ({
  getSocket: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  })),
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn(),
  joinConversation: vi.fn(),
  leaveConversation: vi.fn(),
  joinChannel: vi.fn(),
  leaveChannel: vi.fn(),
}))

// Mock AuthContext so components can call useAuth() without a real provider
const mockAuthValue = {
  user: null,
  token: null,
  requiresPasswordChange: false,
  organizationConfigured: true,
  isAuthenticated: false,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  completePasswordChange: vi.fn(),
  completeOnboarding: vi.fn(),
}

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthValue,
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}))

// Mock other context providers used by App
vi.mock('@/contexts/CRMConfigContext', () => ({
  CRMConfigProvider: ({ children }: { children: ReactNode }) => children,
  useCRMConfig: () => ({ config: {}, loading: false }),
}))

vi.mock('@/contexts/TenantVocabContext', () => ({
  TenantVocabProvider: ({ children }: { children: ReactNode }) => children,
  useTenantVocab: () => ({ vocab: {} }),
}))

vi.mock('@/contexts/CopilotContext', () => ({
  CopilotProvider: ({ children }: { children: ReactNode }) => children,
  useCopilot: () => ({ isOpen: false, toggle: vi.fn() }),
}))

vi.mock('@/contexts/InternalChatContext', () => ({
  InternalChatProvider: ({ children }: { children: ReactNode }) => children,
  useInternalChat: () => ({ messages: [] }),
}))

// Mock CopilotPanel (heavy component not needed for smoke tests)
vi.mock('@/components/copilot/CopilotPanel', () => ({
  CopilotPanel: () => null,
}))

// Mock AppShell to just render children
vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

// Mock onboarding wizard
vi.mock('@/components/onboarding/SetupWizard', () => ({
  SetupWizard: () => <div>Setup Wizard</div>,
}))

// Mock axios to prevent real HTTP requests
vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios')
  return {
    ...actual,
    default: {
      ...actual.default,
      get: vi.fn().mockResolvedValue({ data: {} }),
      post: vi.fn().mockResolvedValue({ data: {} }),
      put: vi.fn().mockResolvedValue({ data: {} }),
      delete: vi.fn().mockResolvedValue({ data: {} }),
      patch: vi.fn().mockResolvedValue({ data: {} }),
      create: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ data: {} }),
        post: vi.fn().mockResolvedValue({ data: {} }),
        interceptors: {
          request: { use: vi.fn(), eject: vi.fn() },
          response: { use: vi.fn(), eject: vi.fn() },
        },
      })),
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
    },
  }
})

// Mock appLogger
vi.mock('@/services/appLogger', () => ({
  appLogger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock canvas getContext for LoginBeams component
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  rotate: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  createLinearGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
  createRadialGradient: vi.fn().mockReturnValue({ addColorStop: vi.fn() }),
  arc: vi.fn(),
  closePath: vi.fn(),
  setTransform: vi.fn(),
  resetTransform: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  globalAlpha: 1,
  globalCompositeOperation: 'source-over',
  filter: 'none',
  shadowBlur: 0,
  shadowColor: '',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
}) as unknown as typeof HTMLCanvasElement.prototype.getContext

// ── Tests ────────────────────────────────────────────────────────────────────

describe('LoginPage', () => {
  it('renders the login form', async () => {
    const { LoginPage } = await import('@/pages/LoginPage')

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>,
    )

    // The page has an "Entrar" heading and submit button
    expect(screen.getByRole('heading', { name: /entrar/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })
})

describe('App', () => {
  it('renders without crashing', async () => {
    const { default: App } = await import('@/App')

    // App uses BrowserRouter internally, so we don't wrap it in MemoryRouter
    const { container } = render(<App />)
    expect(container).toBeTruthy()
  })
})
