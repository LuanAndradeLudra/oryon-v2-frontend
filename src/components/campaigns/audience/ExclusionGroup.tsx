// ─── ExclusionGroup ────────────────────────────────────────────────────────
// A caixa vermelha "Excluir sempre" do mockup. Não é um `SegmentGroup` de
// condições livres: são exatamente os 3 motivos que o contrato conhece
// (`SegmentExclusions`), cada um ligado/desligado por uma linha.
//
// Cuidado semântico (Decisão D5 do BE.3): as 3 contagens são independentes,
// NÃO uma partição — o mesmo contato pode estar sem opt-in E em conversa com
// a IA. Por isso cada linha mostra o próprio número, e nada aqui subtrai um do
// outro nem soma os três.
//
// O liga/desliga é um botão `aria-pressed` local, não o `ui/Switch`: as linhas
// aqui são frases ("Recebeu disparo nos últimos 7 dias"), o mockup não tem
// switch nenhum, e o `Switch` compartilhado não expõe rótulo acessível.
import type { ReactNode } from 'react'
import { Bot, Send, ShieldOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/Input'
import { tint } from '@/components/ui/accentColor'
import { SegmentGroup } from './SegmentGroup'
import type { SegmentExclusions } from '@/types/campaignsV2'

export interface ExclusionCounts {
  optOut: number
  recentlyCampaigned: number
  activeAi: number
}

interface ExclusionGroupProps {
  value: SegmentExclusions
  onChange: (patch: Partial<SegmentExclusions>) => void
  counts?: ExclusionCounts
  /** Sem BE.1/BE.3 no ar só o opt-out existe — e é imposto, não escolhido
   *  (o motor antigo só sabe filtrar por opt-in positivo). */
  degraded?: boolean
}

/** Botão de ligar/desligar um motivo de exclusão. Ligado é rosa: aqui "ligado"
 *  quer dizer "está tirando gente do público". */
function ToggleChip({ on, onToggle, label, children }: { on: boolean; onToggle: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onToggle}
      className={cn('rounded-[7px] px-2 py-1 text-[12.5px] border transition-colors', !on && 'border-surface-700 text-surface-400 hover:border-surface-600')}
      style={on ? { backgroundColor: tint('rose', 12), borderColor: tint('rose', 30), color: tint('rose', 85) } : undefined}
    >
      {children}
    </button>
  )
}

function Row({
  icon, label, operator, control, count,
}: {
  icon: ReactNode
  label: string
  operator: string
  control: ReactNode
  count?: number
}) {
  return (
    <div className="grid grid-cols-[20px_1fr] gap-2.5 items-center mb-2">
      <span aria-hidden="true" />
      <div className="flex gap-1.5 items-center flex-wrap">
        <span className="inline-flex items-center gap-1.5 bg-surface-900 border border-surface-700 rounded-[9px] px-2.5 py-1.5 text-[13.2px] text-surface-100">
          <span className="text-surface-500 [&>svg]:w-[13px] [&>svg]:h-[13px]">{icon}</span>
          {label}
        </span>
        <span className="text-xs text-surface-400 px-0.5">{operator}</span>
        {control}
        {typeof count === 'number' && (
          <span className="ml-auto font-mono text-[11.5px] text-surface-500 tabular-nums">
            −{count.toLocaleString('pt-BR')}
          </span>
        )}
      </div>
    </div>
  )
}

export function ExclusionGroup({ value, onChange, counts, degraded = false }: ExclusionGroupProps) {
  const days = value.campaignedWithinDays ?? 7
  const campaignedOn = value.campaignedWithinDays !== undefined

  return (
    <SegmentGroup variant="exclude" title="Excluir sempre" hint="aplicado depois dos grupos acima" className="mt-3.5">
      <Row
        icon={<ShieldOff />}
        label="Opt-in de marketing"
        operator="é"
        count={counts?.optOut}
        control={
          degraded ? (
            <span
              className="rounded-[7px] px-2 py-1 text-[12.5px] border"
              style={{ backgroundColor: tint('rose', 12), borderColor: tint('rose', 30), color: tint('rose', 85) }}
            >
              não
            </span>
          ) : (
            <ToggleChip
              on={value.optOut ?? false}
              onToggle={() => onChange({ optOut: !value.optOut })}
              label="Excluir quem não deu opt-in de marketing"
            >
              não
            </ToggleChip>
          )
        }
      />
      {degraded && (
        <p className="ml-[30px] -mt-1 mb-2 text-[11px] text-surface-500">
          Sempre aplicado: sem opt-in, o contato não pode receber disparo de marketing.
        </p>
      )}

      {!degraded && (
        <>
          <Row
            icon={<Send />}
            label="Recebeu disparo"
            operator="nos últimos"
            count={campaignedOn ? counts?.recentlyCampaigned : undefined}
            control={
              <span className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={1}
                  className={cn('w-16', !campaignedOn && 'opacity-50')}
                  value={days}
                  disabled={!campaignedOn}
                  onChange={(e) => onChange({ campaignedWithinDays: Math.max(1, Number(e.target.value) || 1) })}
                  aria-label="Quantos dias desde o último disparo"
                />
                <ToggleChip
                  on={campaignedOn}
                  onToggle={() => onChange({ campaignedWithinDays: campaignedOn ? undefined : 7 })}
                  label="Excluir quem já recebeu disparo no período"
                >
                  dias
                </ToggleChip>
              </span>
            }
          />

          <Row
            icon={<Bot />}
            label="Em conversa com a IA"
            operator="agora"
            count={value.activeAiConversation ? counts?.activeAi : undefined}
            control={
              <ToggleChip
                on={value.activeAiConversation ?? false}
                onToggle={() => onChange({ activeAiConversation: !value.activeAiConversation })}
                label="Excluir quem está em conversa ativa com o agente de IA"
              >
                sim
              </ToggleChip>
            }
          />
        </>
      )}
    </SegmentGroup>
  )
}
