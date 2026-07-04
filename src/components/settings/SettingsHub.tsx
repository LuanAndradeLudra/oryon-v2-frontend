// ─── Settings Hub ────────────────────────────────────────────────────────────
// A raiz de /settings deixou de redirecionar cegamente para "Minha Conta" e
// virou um hub navegável (padrão Stripe): o admin enxerga o MAPA de tudo que
// é configurável, com descrições — descoberta de recursos sem caça ao menu.

import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { visibleNavGroups } from './SettingsLayout'

export function SettingsHub({ currentRole }: { currentRole: string }) {
  const navigate = useNavigate()
  const groups = visibleNavGroups(currentRole)

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-surface-50">Configurações</h1>
        <p className="text-sm text-surface-400 mt-1">
          Tudo que molda o seu workspace — conta, equipe, canais e plataforma.
        </p>
      </div>

      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.label}>
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-surface-500 mb-3">
              {group.label}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {group.items.map((item) => (
                <button
                  key={item.section}
                  onClick={() => navigate(`/settings/${item.section}`)}
                  className="card-glow group flex items-start gap-3 text-left bg-surface-900 border border-surface-800 rounded-xl p-4 cursor-pointer"
                >
                  <span className="w-9 h-9 rounded-lg bg-brand-600/10 text-brand-400 flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1 text-sm font-semibold text-surface-100">
                      <span className="truncate">{item.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-surface-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </span>
                    <span className="block text-xs text-surface-500 mt-0.5 leading-snug">
                      {'desc' in item ? item.desc : ''}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
