// ─── Agent Event Types (Frontend subset) ─────────────────────────────────────
// Minimal types for consuming SSE events from the Agent Server.
// The full agent logic lives in agent-server/ — frontend only renders events.

export type AgentId =
  | 'crm_read' | 'crm_write' | 'analytics' | 'artifact'
  | 'composer' | 'web' | 'agent_builder' | 'orchestrator'
  | 'planner'

export type PlanStepStatus = 'pending' | 'running' | 'done' | 'failed'

export interface PlanStep {
  id: string
  order: number
  title: string
  agent: AgentId
  query: string
  status: PlanStepStatus
  result?: string
  error?: string
}

export interface TaskPlan {
  id: string
  steps: PlanStep[]
  tier: 'simple' | 'complex' | 'deep'
  rationale?: string
}

export type AgentSSEEvent =
  | { type: 'token'; text: string; agentId: AgentId }
  | { type: 'tool_call'; name: string; input: unknown; agentId: AgentId }
  | { type: 'tool_result'; name: string; input: unknown; result: unknown; agentId: AgentId }
  | { type: 'agent_start'; agentId: AgentId; intent: string }
  | { type: 'agent_done'; agentId: AgentId; tokensUsed: number }
  | { type: 'approval_request'; batchId: string; items: ApprovalItem[] }
  | { type: 'plan_created'; plan: TaskPlan }
  | { type: 'plan_step_update'; stepId: string; status: PlanStepStatus; result?: string; error?: string }
  | { type: 'error'; message: string; code?: string }
  | { type: 'done' }

export interface ApprovalItem {
  id: string
  name: string
  input: unknown
}
