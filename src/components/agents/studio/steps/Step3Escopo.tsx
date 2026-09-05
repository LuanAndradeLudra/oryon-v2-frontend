import { Check, X, AlertCircle } from 'lucide-react'
import type { WizardData } from '../types'
import { CAN_DO_PRESETS, CANNOT_DO_PRESETS } from './constants'
import { CapabilityPicker } from './shared'

export function Step3Escopo({ data, setData }: { data: WizardData; setData: React.Dispatch<React.SetStateAction<WizardData>> }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-surface-100">O que o agente faz — e o que não faz?</h2>
        <p className="text-sm text-surface-500 mt-0.5">Limites claros garantem um atendimento preciso e confiável.</p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-status-active-bg ring-1 ring-status-active-border flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-status-active" />
          </div>
          <span className="text-xs font-semibold text-surface-300 uppercase tracking-wide">Pode fazer</span>
          {data.can_do.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-md bg-status-active-bg text-status-active">{data.can_do.length}</span>
          )}
        </div>
        <CapabilityPicker
          selected={data.can_do}
          onChange={items => setData(d => ({ ...d, can_do: items }))}
          presets={CAN_DO_PRESETS}
          addPlaceholder="Adicionar capacidade personalizada..."
          color="green"
        />
        {data.can_do.length === 0 && (
          <p className="text-xs text-amber-500/80 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Selecione pelo menos uma capacidade
          </p>
        )}
      </div>

      <div className="border-t border-surface-800" />

      <div>
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-5 h-5 rounded-full color-chip flex items-center justify-center flex-shrink-0"
            style={{ ['--chip']: 'var(--color-danger)' } as React.CSSProperties}
          >
            <X className="w-3 h-3" />
          </div>
          <span className="text-xs font-semibold text-surface-300 uppercase tracking-wide">Não deve fazer</span>
          {data.cannot_do.length > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded-md color-chip"
              style={{ ['--chip']: 'var(--color-danger)' } as React.CSSProperties}
            >
              {data.cannot_do.length}
            </span>
          )}
        </div>
        <CapabilityPicker
          selected={data.cannot_do}
          onChange={items => setData(d => ({ ...d, cannot_do: items }))}
          presets={CANNOT_DO_PRESETS}
          addPlaceholder="Adicionar restrição personalizada..."
          color="red"
        />
      </div>
    </div>
  )
}
