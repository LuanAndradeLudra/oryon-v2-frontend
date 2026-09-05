import { cn } from '@/lib/utils'
import type { WizardData } from '../types'
import { INPUT, TONES, LANGUAGES, RESPONSE_STYLES } from './constants'

export function Step2Personalidade({ data, setData }: { data: WizardData; setData: React.Dispatch<React.SetStateAction<WizardData>> }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-surface-100">Como o agente se comunica?</h2>
        <p className="text-sm text-surface-500 mt-0.5">Defina a voz e o estilo de comunicação do seu agente.</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-400 mb-1.5">
          Nome da persona <span className="text-surface-600 font-normal">(opcional)</span>
        </label>
        <input
          value={data.persona_name}
          onChange={e => setData(d => ({ ...d, persona_name: e.target.value }))}
          placeholder={data.name || 'Mesmo nome do agente'}
          className={INPUT}
        />
        <p className="text-xs text-surface-600 mt-1">O nome que o agente usa ao se apresentar ao cliente.</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-400 mb-2">
          Tom de comunicação <span className="text-danger">*</span>
        </label>
        <div className="grid grid-cols-5 gap-2">
          {TONES.map(t => {
            const selected = data.tone === t.value
            return (
              <button
                key={t.value} type="button" onClick={() => setData(d => ({ ...d, tone: t.value }))}
                className={cn(
                  'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all',
                  selected
                    ? 'bg-status-active-bg border-status-active-border ring-1 ring-status-active-border'
                    : 'bg-surface-800 border-surface-700 hover:border-surface-600',
                )}
              >
                <span className={cn('transition-colors', selected ? 'text-status-active' : 'text-surface-400')}>{t.icon}</span>
                <span className="text-xs font-medium text-surface-200">{t.label}</span>
                <span className="text-[10px] text-surface-500 leading-tight">{t.desc}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-400 mb-2">Idioma principal</label>
        <div className="flex gap-2">
          {LANGUAGES.map(l => (
            <button
              key={l.value} type="button" onClick={() => setData(d => ({ ...d, language: l.value }))}
              className={cn(
                'flex-1 py-2 rounded-xl border text-sm font-medium transition-all',
                data.language === l.value
                  ? 'bg-status-active-bg border-status-active-border text-status-active ring-1 ring-status-active-border'
                  : 'bg-surface-800 border-surface-700 text-surface-400 hover:border-surface-600',
              )}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-400 mb-2">
          Estilo de resposta <span className="text-surface-600 font-normal">(selecione os que se aplicam)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {RESPONSE_STYLES.map(style => {
            const on = data.response_style.includes(style)
            return (
              <button
                key={style} type="button"
                onClick={() => setData(d => ({
                  ...d,
                  response_style: on
                    ? d.response_style.filter(s => s !== style)
                    : [...d.response_style, style],
                }))}
                className={cn(
                  'px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                  on
                    ? 'bg-status-active-bg border-status-active-border text-status-active ring-1 ring-status-active-border'
                    : 'bg-surface-800 border-surface-700 text-surface-400 hover:border-surface-600',
                )}
              >
                {style}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
