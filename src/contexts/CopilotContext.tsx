import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { useAuth } from '@/contexts/AuthContext'

export interface BatchApprovalItem {
  id: string    // per-item ID — used to resolve individual Promise
  name: string  // tool name
  input: unknown
}

export interface ToolCallRecord {
  id: string  // stable ID used for approval resolution
  name: string
  input: unknown
  result?: unknown
  status: 'running' | 'done' | 'error'
  // 'submitting' is the intermediate state between the operator clicking
  // "Aprovar" and the backend acknowledging the decision. It exists so the
  // card can disable the button + show a spinner instead of letting a
  // double-click fire two POSTs (the bug that hit
  // UQ_whatsapp_templates_name in prod).
  approvalStatus?: 'pending' | 'submitting' | 'approved' | 'denied'
  batchItems?: BatchApprovalItem[]  // present when name === '__approval_batch__'
  /** Unix ms — when the ApprovalGate will auto-deny this batch. Streamed
   *  from the backend on the approval_request event so the UI can render
   *  a live countdown, letting the operator know they have time to review
   *  but also giving a concrete deadline. */
  approvalExpiresAt?: number
  /** Phase 9 UX: when the turn runs under a TaskPlan, this associates the
   *  tool call with the plan step that was running when the chip fired.
   *  Tool calls with stepId are rendered INSIDE the PlanCard step row,
   *  and hidden from the top-level tool-chip list to avoid duplication. */
  stepId?: string
}

export type AttachmentMediaType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  | 'application/pdf'

export interface CopilotAttachment {
  id: string
  name: string
  kind: 'image' | 'pdf'
  mediaType: AttachmentMediaType
  data: string      // pure base64, no "data:…;base64," prefix
  previewUrl: string // object URL for images; empty string for PDFs
}

export interface CopilotMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  attachments?: CopilotAttachment[]
  toolCalls?: ToolCallRecord[]
  isStreaming?: boolean
  timestamp: Date
  /** Live status label shown during streaming (e.g., "Analisando métricas...").
   *  Set directly on the message so React re-renders reliably via setMessages. */
  statusLabel?: string
  // Conversation branching (edit history)
  branchGroup?: string    // UUID shared by all edits at the same position
  branchIndex?: number    // 0-based index within the branch group
  totalBranches?: number  // total branches in the group
  /** Phase 8/9: live task plan attached to this assistant message.
   *  Populated from plan_created / plan_step_update SSE events. */
  plan?: import('@/types/agent-events').TaskPlan
  /** Setup nudge emitted by the OrchestratorAgent short-circuit when the
   *  tenant lacks a prerequisite (e.g. no WhatsApp line). Rendered as a
   *  CTA card at the bottom of the message — distinct from tool_call
   *  chips and plan cards. No approval, no tool chip, no plan card. */
  setupRequired?: {
    reason: string
    message: string
    cta: { href: string; label: string }
  }
}

interface CopilotContextValue {
  isOpen: boolean
  open: (preloadMessage?: string) => void
  close: () => void
  messages: CopilotMessage[]
  setMessages: Dispatch<SetStateAction<CopilotMessage[]>>
  preloadedMessage: string | null
  clearPreload: () => void
}

const CopilotContext = createContext<CopilotContextValue | null>(null)

export function CopilotProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [preloadedMessage, setPreloadedMessage] = useState<string | null>(null)

  // Clear history and close panel on logout
  useEffect(() => {
    if (!isAuthenticated) {
      setIsOpen(false)
      setMessages([])
      setPreloadedMessage(null)
    }
  }, [isAuthenticated])

  const open = useCallback((preload?: string) => {
    if (preload) setPreloadedMessage(preload)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => setIsOpen(false), [])
  const clearPreload = useCallback(() => setPreloadedMessage(null), [])

  const value = useMemo(() => ({
    isOpen, open, close, messages, setMessages, preloadedMessage, clearPreload,
  }), [isOpen, open, close, messages, preloadedMessage, clearPreload])

  return (
    <CopilotContext.Provider value={value}>
      {children}
    </CopilotContext.Provider>
  )
}

export function useCopilotContext() {
  const ctx = useContext(CopilotContext)
  if (!ctx) throw new Error('useCopilotContext must be used inside CopilotProvider')
  return ctx
}
