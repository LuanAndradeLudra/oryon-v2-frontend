// ─── WhatsappLineRequiredBanner ─────────────────────────────────────────────
// Reusable banner that warns when the tenant has no active WhatsApp line.
// Rendered at the top of modules whose core resources (automations,
// campaigns, templates) depend on an active WABA — the backend rejects
// creation of any of those with a 400 when no line is present, and the
// module's CTA button should ALSO gate on this signal to prevent the
// user from filling out a long form just to hit the same error at submit.
//
// Usage:
//   const { numbers, loading } = useWorkspaceNumber()
//   const noLines = !loading && numbers.length === 0
//   return (
//     <>
//       {noLines && <WhatsappLineRequiredBanner resource="automações" />}
//       <button disabled={noLines}>Criar ...</button>
//     </>
//   )

import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

interface WhatsappLineRequiredBannerProps {
  /** Plural noun used in the message — e.g. "automações", "campanhas",
   *  "templates WhatsApp". Keep feminine/masculine agreement in mind when
   *  writing the surrounding sentence. */
  resource: string
  /** Optional override of the destination link. Defaults to /settings/numbers,
   *  the direct route for the WhatsApp lines admin section. */
  settingsHref?: string
}

export function WhatsappLineRequiredBanner({
  resource,
  settingsHref = '/settings/numbers',
}: WhatsappLineRequiredBannerProps) {
  return (
    <div className="waba-banner mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-100">
            Nenhuma linha WhatsApp conectada
          </p>
          <p className="mt-0.5 text-[13px] text-amber-200/80">
            Você precisa conectar uma linha WhatsApp Business (WABA) antes de criar {resource}. Todas as operações dependentes são bloqueadas até que exista pelo menos uma linha ativa no tenant.
          </p>
        </div>
        <Link
          to={settingsHref}
          className="waba-banner-btn flex flex-shrink-0 items-center gap-1.5 self-center rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-500/30"
        >
          Configurar WhatsApp
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}
