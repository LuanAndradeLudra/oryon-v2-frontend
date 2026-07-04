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

import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Banner } from '@/components/ui/Banner'

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
    <Banner
      variant="warning"
      className="waba-banner mb-4"
      action={
        <Link
          to={settingsHref}
          className="waba-banner-btn flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/25"
        >
          Configurar WhatsApp
          <ArrowRight className="h-3 w-3" />
        </Link>
      }
    >
      <p className="font-semibold">Nenhuma linha WhatsApp conectada</p>
      <p className="mt-0.5 text-white/80">
        Você precisa conectar uma linha WhatsApp Business (WABA) antes de criar {resource}. Todas as operações dependentes são bloqueadas até que exista pelo menos uma linha ativa no tenant.
      </p>
    </Banner>
  )
}
