import { StatStrip } from '@/components/campaigns/StatStrip'
import { cn } from '@/lib/utils'
import { StageRail } from '../primitives/StageRail'
import { StageCampaignCard } from '../primitives/StageCampaignCard'
import { StageCampaignReview } from '../primitives/StageCampaignReview'
import { StageReveal } from '../StageMotion'
import { useStageAmbient } from '../stageContext'
import { DEMO_CAMPAIGN_NEW, DEMO_CAMPAIGNS_BASE } from '../demoData'
import type { StageFrameKey, StageLayout } from '../types'

interface SendState { status: 'sending' | 'sent'; sent: number; delivered: number; read: number; replied: number }

/** Estado da campanha nova em cada frame (null = ainda na revisão, não disparada). */
function sendStateAt(frame: StageFrameKey): SendState | null {
  const c = DEMO_CAMPAIGN_NEW
  if (frame === 'inicio' || frame === 'ia') return null
  if (frame === 'handoff') return { status: 'sending', sent: Math.round(c.total * 0.25), delivered: 4, read: 0, replied: 0 }
  if (frame === 'humano') return { status: 'sending', sent: Math.round(c.total * 0.62), delivered: 13, read: 3, replied: 0 }
  return { status: 'sent', sent: c.total, delivered: c.delivered, read: c.read, replied: c.replied }
}

const ACTIVITY = ['Entregue para Ana Modelo', 'Lida por Bruno Amostra', 'Entregue para Casa Exemplo', 'Lida por Diego Fictício']

/** Faixa de atividade recente — `.ambient-roll` (lista duplicada, translateY -50%: o loop nunca "pula"). */
function ActivityRoll() {
  const ambient = useStageAmbient()
  return (
    <div className="h-[54px] overflow-hidden text-[10.5px] text-surface-500">
      <div className={cn('flex flex-col gap-1.5', ambient && 'ambient-roll')}>
        {[...ACTIVITY, ...ACTIVITY].map((line, i) => <span key={i} className="truncate">{line}</span>)}
      </div>
    </div>
  )
}

function List({ frame }: { frame: StageFrameKey }) {
  const fresh = sendStateAt(frame)
  const c = DEMO_CAMPAIGN_NEW
  return (
    <div className="flex flex-col gap-1 lg:gap-2 p-1 lg:p-4">
      {fresh && (
        <StageReveal>
          <StageCampaignCard
            name={c.name} status={fresh.status} template={c.template} total={c.total}
            sent={fresh.sent} delivered={fresh.delivered} read={fresh.read} replied={fresh.replied} when={c.when}
          />
        </StageReveal>
      )}
      {DEMO_CAMPAIGNS_BASE.map((k) => <StageCampaignCard key={k.id} {...k} />)}
    </div>
  )
}

/** Painel da direita: revisão antes do disparo; depois, os números da campanha
 *  (StatStrip real) + `.ambient-roll` na atividade recente. */
function SidePanel({ frame }: { frame: StageFrameKey }) {
  const fresh = sendStateAt(frame)
  if (!fresh) return <StageCampaignReview />
  const c = DEMO_CAMPAIGN_NEW
  return (
    <div className="p-2 lg:p-5 flex flex-col gap-1.5 lg:gap-3">
      <div>
        <h3 className="text-[7.5px] lg:text-[15px] font-display font-bold tracking-[-0.01em] text-surface-50">{c.name}</h3>
        <p className="hidden lg:block text-xs text-surface-400 mt-0.5">{fresh.status === 'sent' ? 'Disparo concluído' : 'Disparando agora…'}</p>
      </div>
      <StatStrip
        items={[
          { label: 'Enviadas', value: fresh.sent },
          { label: 'Entregues', value: fresh.delivered },
          { label: 'Lidas', value: fresh.read },
          { label: 'Respostas', value: fresh.replied },
        ]}
        className="hidden lg:grid"
      />
      <div className="hidden lg:block">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-surface-500 mb-1.5">Atividade recente</p>
        <ActivityRoll />
      </div>
    </div>
  )
}

/** Cena "Disparos" — função PURA do frame (nenhum estado próprio). */
export function DisparoScene({ layout, frame }: { layout: StageLayout; frame: StageFrameKey }) {
  if (layout === 'compact') {
    return (
      <div className="flex-1 min-w-0 overflow-hidden bg-surface-900">
        {sendStateAt(frame) ? <List frame={frame} /> : <SidePanel frame={frame} />}
      </div>
    )
  }
  return (
    <>
      <StageRail active="disparo" />
      <div className="w-[135px] lg:w-[540px] flex-shrink-0 border-r border-[0.5px] lg:border-[1px] border-surface-700 bg-surface-900 overflow-hidden">
        <List frame={frame} />
      </div>
      <div className="flex-1 min-w-0 bg-surface-800 overflow-hidden">
        <SidePanel frame={frame} />
      </div>
    </>
  )
}
