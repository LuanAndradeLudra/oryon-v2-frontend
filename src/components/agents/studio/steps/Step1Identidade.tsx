import { cn } from '@/lib/utils'
import { AGENT_ICONS } from '@/components/agents/AgentIcons'
import type { WizardData } from '../types'
import { INPUT, TEXTAREA, SECTORS } from './constants'

export function Step1Identidade({ data, setData }: { data: WizardData; setData: React.Dispatch<React.SetStateAction<WizardData>> }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-surface-100">Quem é o seu agente?</h2>
        <p className="text-sm text-surface-500 mt-0.5">Defina a identidade do agente que irá atender seus clientes.</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-400 mb-3">Ícone do agente</label>
        <div className="flex flex-wrap gap-3">
          {AGENT_ICONS.map(({ id, Icon, hoverBg, shadow, stroke, hoverStroke }) => {
            const selected = data.icon === id
            return (
              <button
                key={id} type="button" onClick={() => setData(d => ({ ...d, icon: id }))}
                className={cn(
                  'group w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 border',
                  selected
                    ? ['bg-white', shadow, 'border-transparent ring-2 ring-offset-2 ring-offset-surface-950 ring-surface-100/40 scale-110 shadow-lg']
                    : ['bg-surface-800 border-surface-700 hover:border-transparent hover:scale-105 hover:shadow-lg', hoverBg, `hover:${shadow}`],
                )}
              >
                <Icon className={cn(
                  'w-6 h-6 transition-colors duration-200',
                  selected ? stroke : ['text-surface-400', hoverStroke],
                )} />
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-400 mb-1.5">
          Nome do agente <span className="text-danger">*</span>
        </label>
        <input
          value={data.name}
          onChange={e => setData(d => ({ ...d, name: e.target.value }))}
          placeholder='Ex: "Sofia", "Max", "Aria"'
          className={INPUT}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-400 mb-1.5">
          Setor / Indústria <span className="text-danger">*</span>
        </label>
        <select
          value={data.sector}
          onChange={e => setData(d => ({ ...d, sector: e.target.value }))}
          className={INPUT}
        >
          <option value="">Selecione o setor...</option>
          {SECTORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-400 mb-1.5">
          Objetivo principal <span className="text-danger">*</span>
        </label>
        <textarea
          value={data.objective}
          onChange={e => setData(d => ({ ...d, objective: e.target.value }))}
          placeholder='Ex: "Qualificar leads, apresentar planos e agendar reuniões com a equipe de vendas"'
          rows={3} maxLength={300}
          className={TEXTAREA}
        />
        <p className="text-right text-xs text-surface-700 mt-1">{data.objective.length}/300</p>
      </div>
    </div>
  )
}
