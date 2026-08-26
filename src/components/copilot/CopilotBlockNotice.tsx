import { motion } from 'framer-motion'
import type { CopilotBlockNotice as Notice } from '@/lib/copilotBlock'

/**
 * Bloqueio de cobranca (SCRUM-804).
 *
 * Deliberadamente NAO usa a tarja vermelha de erro: nao houve falha, a conta
 * e que esta numa condicao. Tom de aviso, e o caminho de saida visivel quando
 * existe — quando nao existe, a orientacao diz a quem recorrer, que e o unico
 * proximo passo real para quem nao administra o plano.
 */
export function CopilotBlockNotice({ notice, compact }: { notice: Notice; compact?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="status"
      className={
        compact
          ? 'mx-3 mb-2 px-3 py-2 bg-warning/10 border border-warning/20 rounded-lg text-[11px] text-warning flex-shrink-0'
          : 'max-w-4xl mx-auto px-3 py-2.5 bg-warning/10 border border-warning/20 rounded-lg text-xs text-warning'
      }
    >
      <p className="font-medium">{notice.cause}</p>
      <p className="mt-0.5 opacity-90">{notice.guidance}</p>
      {notice.action && (
        <a
          href={notice.action.href}
          className="inline-block mt-1.5 underline underline-offset-2 font-medium hover:opacity-80 focus:outline-none focus-visible:ring-1 focus-visible:ring-warning rounded-sm"
        >
          {notice.action.label}
        </a>
      )}
    </motion.div>
  )
}
