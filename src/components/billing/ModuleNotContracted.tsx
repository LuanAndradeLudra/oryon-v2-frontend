// ─── Módulo não contratado (SCRUM-1210) ───────────────────────────────────────
// Guarda de rota: URL direta de um módulo desligado no contrato (só `false`
// explícito) mostra este aviso em vez da tela. O dono vai para a cobrança; os
// demais usuários são orientados a falar com ele.

import { Link } from 'react-router-dom'
import { PackageX } from 'lucide-react'
import { PLAN_MODULE_LABEL, type PlanModuleId } from '@/lib/billingModules'
import { billingHref } from '@/lib/billingLinks'

export function ModuleNotContracted({ module, isOwner }: { module: PlanModuleId; isOwner: boolean }) {
  // CL5 — sem a tela de cobrança no build, o link cairia em "Minha conta".
  const contractHref = billingHref()
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="flex flex-col items-center text-center rounded-2xl border border-dashed border-surface-700 bg-surface-900/40 px-6 py-12">
          <PackageX className="w-10 h-10 text-surface-600 mb-3" strokeWidth={1.5} />
          <h1 className="text-base font-semibold text-surface-100">Módulo não contratado</h1>
          <p className="mt-1 text-sm text-surface-400">
            {PLAN_MODULE_LABEL[module]} não faz parte do contrato desta conta.
            {isOwner ? ' Para incluir, fale com a equipe Oryon.' : ' Para incluir, fale com o dono da conta.'}
          </p>
          {isOwner && contractHref && (
            <Link to={contractHref} className="mt-4 text-sm font-medium text-brand-400 hover:text-brand-300">
              Ver o meu contrato →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
