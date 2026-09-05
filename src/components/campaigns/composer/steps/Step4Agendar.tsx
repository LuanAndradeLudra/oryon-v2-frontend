import { Calendar, Send, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Banner } from '@/components/ui/Banner'

export function Step4Agendar({
  estimatedReach,
  scheduleMode, onScheduleMode, scheduledAt, onScheduledAt,
}: {
  estimatedReach: number | null
  scheduleMode: 'now' | 'later'
  onScheduleMode: (m: 'now' | 'later') => void
  scheduledAt: string
  onScheduledAt: (v: string) => void
}) {
  return (
    <div className="space-y-5">
      {/* Schedule */}
      <div>
        <label className="text-xs font-medium text-surface-400 mb-2 block">Quando enviar?</label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { value: 'now',   label: 'Enviar agora',  icon: <Send className="w-4 h-4" />, desc: 'Disparo imediato após criar' },
            { value: 'later', label: 'Agendar',        icon: <Clock className="w-4 h-4" />, desc: 'Escolha data e hora do envio' },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              onClick={() => onScheduleMode(opt.value)}
              className={cn(
                'p-3 rounded-xl border text-left transition-colors',
                scheduleMode === opt.value
                  ? 'border-brand-500 bg-brand-500/10'
                  : 'border-surface-700 bg-surface-800/50 hover:border-surface-600'
              )}
            >
              <span className="text-surface-400">{opt.icon}</span>
              <p className="text-sm font-medium text-surface-100 mt-1">{opt.label}</p>
              <p className="text-[11px] text-surface-500">{opt.desc}</p>
            </button>
          ))}
        </div>

        {scheduleMode === 'later' && (
          <div className="mt-3">
            <label className="text-xs font-medium text-surface-400 mb-1.5 block">Data e hora do envio</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500 pointer-events-none" />
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => onScheduledAt(e.target.value)}
                min={(() => {
                  // toISOString() é UTC — subtrai o offset para obter hora local
                  const now = new Date()
                  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
                  return local.toISOString().slice(0, 16)
                })()}
                className="w-full bg-surface-800 border border-surface-700 rounded-xl pl-8 pr-3 py-2 text-sm text-surface-100 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
            <p className="text-[11px] text-surface-600 mt-1.5">
              Dica: envios nas terças e quartas, entre 9h–11h, tendem a ter maiores taxas de abertura.
            </p>
          </div>
        )}
      </div>

      {/* Warning for large reach */}
      {estimatedReach !== null && estimatedReach > 100 && (
        <Banner variant="warning">
          Campanhas grandes podem impactar o <strong>limite de conversas</strong> do seu plano e a qualidade do número WhatsApp.
          Verifique seu saldo antes de enviar.
        </Banner>
      )}
    </div>
  )
}
