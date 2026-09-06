import { MessageCircle, Instagram, Facebook, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { accentColor, tint } from '@/components/ui/accentColor'
import { AgentIcon } from '@/components/agents/AgentIcons'
import { SECTORS, TONES, LANGUAGES } from '../steps/constants'
import { STEP_LABELS, type WizardData } from '../types'
import { blueprintSlots } from './blueprintSlots'

/**
 * O cartão do centro do Studio (A3): a persona com os sete encaixes se
 * preenchendo conforme as etapas fecham. É o que substitui o painel-tutor do
 * wizard antigo — em vez de explicar o que a etapa faz, mostra o agente sendo
 * montado.
 */
export function BlueprintCard({ data, step }: { data: WizardData; step: number }) {
  const slots = blueprintSlots(data)
  const preenchidos = slots.filter(s => s.filled).length

  const setor = SECTORS.find(s => s.value === data.sector)?.label
  const tom = TONES.find(t => t.value === data.tone)?.label
  const idioma = LANGUAGES.find(l => l.value === data.language)?.label

  const canais = [
    { on: data.channels_whatsapp, label: 'WhatsApp', Icon: MessageCircle },
    { on: data.channels_instagram, label: 'Instagram', Icon: Instagram },
    { on: data.channels_messenger, label: 'Messenger', Icon: Facebook },
  ]

  return (
    <div className="relative overflow-hidden rounded-3xl border border-surface-700 bg-surface-800 p-6">
      {/* Brilho do topo, decorativo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[120px]"
        style={{ background: `linear-gradient(160deg, ${tint('blue', 18)}, transparent 70%)` }}
      />

      <div className="relative flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3.5 min-w-0">
          <span
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 [&>svg]:w-[26px] [&>svg]:h-[26px]"
            style={{ backgroundColor: tint('blue', 16), color: accentColor('blue') }}
          >
            <AgentIcon iconId={data.icon} />
          </span>
          <div className="min-w-0">
            <div className="text-[28px] font-black tracking-tight text-surface-50 truncate">
              {data.name.trim() || 'Novo agente'}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {[setor, tom, idioma].filter(Boolean).map(chip => (
                <span
                  key={chip}
                  className="px-2 py-0.5 rounded-full border border-surface-700 bg-surface-900 text-[11px] text-surface-400"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>

        <span
          className="color-chip flex-shrink-0 px-2.5 py-1 rounded-full border text-[11px] font-medium whitespace-nowrap"
          style={{ ['--chip' as string]: accentColor('brand') }}
        >
          blueprint · {step}/{STEP_LABELS.length}
        </span>
      </div>

      <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {slots.map(slot => {
          const Icon = slot.icon
          const cor = slot.accent ? accentColor(slot.accent) : undefined
          return (
            <div
              key={slot.key}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3.5 py-3 min-h-[52px] text-[12.5px] border',
                slot.filled
                  ? 'border-solid border-surface-700 bg-surface-900 text-surface-200'
                  : 'border-dashed border-surface-600 text-surface-500',
                slot.wide && 'sm:col-span-2',
              )}
            >
              <Icon
                aria-hidden
                className="w-3.5 h-3.5 flex-shrink-0"
                style={slot.filled && cor ? { color: cor } : undefined}
              />
              <div className="min-w-0">
                <span className="block text-[9.5px] font-bold uppercase tracking-[0.12em] text-surface-500 mb-0.5">
                  {slot.label}
                </span>
                <span className="block break-words">{slot.value}</span>
              </div>
            </div>
          )
        })}
      </div>

      <hr className="relative my-4 border-surface-700" />

      <div className="relative flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3.5 text-xs">
          {canais.map(({ on, label, Icon }) => (
            <span key={label} className={cn('flex items-center gap-1.5', on ? 'text-surface-300' : 'text-surface-600')}>
              <Icon className="w-3.5 h-3.5" aria-hidden />
              {label}
            </span>
          ))}
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-surface-500">
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden style={{ color: accentColor('green') }} />
          {preenchidos} de {slots.length} encaixes preenchidos
        </span>
      </div>
    </div>
  )
}
