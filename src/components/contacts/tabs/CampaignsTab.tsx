import { Megaphone } from 'lucide-react'

export function CampaignsTab() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-surface-800 border border-surface-700 flex items-center justify-center">
        <Megaphone className="w-7 h-7 text-surface-500" />
      </div>
      <div>
        <p className="text-sm font-semibold text-surface-300">Módulo de campanhas em desenvolvimento</p>
        <p className="text-xs text-surface-500 mt-1 max-w-xs mx-auto">
          Em breve você poderá ver o histórico de campanhas que incluíram este contato, métricas de abertura e resposta.
        </p>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-surface-600 bg-surface-800 px-3 py-1.5 rounded-full border border-surface-700">
        Em breve
      </span>
    </div>
  )
}
