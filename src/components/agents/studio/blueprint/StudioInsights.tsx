import { Zap } from 'lucide-react'
import { accentColor } from '@/components/ui/accentColor'
import { Switch } from '@/components/ui/Switch'
import { CRM_CAPABILITIES_CATALOG } from '@/components/agents/crmCapabilitiesCatalog'
import { toggleCrmCapability, isCrmCapabilityEnabled, countEnabledCrmCapabilities } from '../crmCapabilities'
import type { WizardData } from '../types'
import { lacunaPrincipal } from './lacunas'

/**
 * Os três cards abaixo do blueprint (mockup `.g3`): Capacidades de CRM,
 * "O que a IA vai fazer com isso" e a Lacuna âmbar.
 *
 * O card do meio é o que sobrou do painel-tutor do wizard antigo: em vez de
 * explicar a etapa, explica o que o que já foi preenchido vira no prompt.
 */

/** As capacidades que o card mostra — o mockup mostra 3; o resto fica na etapa 8. */
const DESTAQUES = CRM_CAPABILITIES_CATALOG.slice(0, 3)

export function StudioInsights({
  data, setData, step,
}: {
  data: WizardData
  setData: React.Dispatch<React.SetStateAction<WizardData>>
  /** Etapa atual do wizard — decide QUAL lacuna aberta o card âmbar destaca. */
  step: number
}) {
  const lacuna = lacunaPrincipal(data, step)
  const ligadas = countEnabledCrmCapabilities(data)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
      {/* 1 — Capacidades de CRM */}
      <section className="rounded-lg border border-surface-700 bg-surface-800 p-3.5">
        <header className="flex items-baseline justify-between gap-2">
          <h3 className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-surface-500">
            Capacidades de CRM
          </h3>
          {ligadas > 0 && (
            <span className="text-[10px] text-brand-400 flex-shrink-0">{ligadas} ligada{ligadas > 1 ? 's' : ''}</span>
          )}
        </header>
        <ul className="mt-2.5 space-y-1.5">
          {DESTAQUES.map(entry => {
            const ligada = isCrmCapabilityEnabled(data, entry.id)
            return (
              <li key={entry.id}>
                {/* <button> é elemento rotulável, então o <label> em volta dá
                    nome acessível ao Switch — mesmo padrão da etapa 8. */}
                <label className="flex items-center justify-between gap-2 text-xs cursor-pointer">
                  <span className="text-surface-300 min-w-0 truncate" title={entry.description}>
                    {entry.label}
                  </span>
                  <Switch
                    checked={ligada}
                    onChange={next => setData(d => toggleCrmCapability(d, entry.id, next))}
                  />
                </label>
              </li>
            )
          })}
        </ul>
        <p className="mt-2.5 text-[10.5px] leading-relaxed text-surface-600">
          O resto das capacidades e os limites de cada uma ficam na etapa 8 e na aba Capacidades.
        </p>
      </section>

      {/* 2 — O que a IA vai fazer com isso */}
      <section className="rounded-lg border border-surface-700 bg-surface-800 p-3.5">
        <h3 className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-surface-500">
          O que a IA vai fazer com isso
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-surface-300">
          Persona, objetivo e limites viram seções do system prompt; as regras da etapa 5 viram
          instruções de escalonamento; o que estiver no negócio e na base entra como contexto.
        </p>
      </section>

      {/* 3 — Lacuna */}
      <section
        className="rounded-lg border bg-surface-800 p-3.5"
        style={{ borderColor: lacuna ? `color-mix(in srgb, ${accentColor('amber')} 30%, transparent)` : undefined }}
      >
        <h3
          className="text-[9.5px] font-bold uppercase tracking-[0.12em] flex items-center gap-1.5"
          style={{ color: lacuna ? accentColor('amber') : accentColor('green') }}
        >
          {lacuna ? 'Lacuna' : (<><Zap className="w-3 h-3" aria-hidden />Sem lacunas</>)}
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-surface-300">
          {lacuna
            ? lacuna.texto
            : 'O essencial está preenchido: escopo, limites, transferência e base de conhecimento.'}
        </p>
      </section>
    </div>
  )
}
