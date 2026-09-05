import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { AgentConfigWithTools } from '@/services/agentsApi'
import { AgentIcon } from '@/components/agents/AgentIcons'
import { useAgentSimulator } from '@/components/agents/simulator/useAgentSimulator'
import { SimulatorPanel } from '@/components/agents/simulator/SimulatorPanel'

// NOTA (extração W0.3): este arquivo era o simulador inteiro (mensagens,
// sessão de teste, bolhas de chat). Agora é só o wrapper fino de chrome
// (backdrop + cabeçalho com ícone/nome/subtítulo) por cima de
// `simulator/SimulatorPanel.tsx` (UI do chat) + `simulator/useAgentSimulator.ts`
// (sessão/envio). Decisão registrada em W0.3-mapa.md: mantido como wrapper
// PRÓPRIO em vez do `ui/Modal.tsx` compartilhado — o Modal genérico não tem
// como pinar a banner "Simulação" acima das mensagens sem ela rolar junto
// (mudaria o visual), e seu cabeçalho só aceita um título em texto simples,
// sem o ícone+subtítulo que este modal sempre teve. Contrato de props
// (`agent`/`onClose`/`onTested`) preservado 100% — quem consome
// (`AgentDetail.tsx`) não precisa mudar nada.

export function AgentTestModal({
  agent,
  onClose,
  onTested,
}: {
  agent: AgentConfigWithTools
  onClose: () => void
  onTested: () => void
}) {
  const { messages, input, setInput, loading, error, dismissError, send, closeSession } =
    useAgentSimulator(agent, { onFirstReply: onTested })

  // Close test session (fire & forget) then call onClose
  const handleClose = () => {
    closeSession()
    onClose()
  }

  return (
    // z-[60] for the same reason as the shared Modal: this overlay can be
    // opened from within the agent-builder wizard (z-50). Sharing z-50
    // caused wizard children to show through the backdrop.
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70"
        onClick={handleClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative z-10 w-full max-w-md h-[640px] bg-surface-950 overlay-frame border rounded-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-800/60 bg-surface-900 flex-shrink-0">
          <AgentIcon iconId={agent.icon} className="w-9 h-9" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-surface-100 truncate">{agent.name}</p>
            <p className="text-[11px] text-surface-500">Modo de teste · WhatsApp simulado</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <SimulatorPanel
          agent={agent}
          messages={messages} input={input} setInput={setInput}
          loading={loading} error={error} dismissError={dismissError} send={send}
        />
      </motion.div>
    </div>
  )
}
