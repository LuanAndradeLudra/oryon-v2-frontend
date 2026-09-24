import { StatStrip } from '@/components/campaigns/StatStrip'
import { StageRail } from '../primitives/StageRail'
import { StageCampaignCard } from '../primitives/StageCampaignCard'
import { StageCampaignReview } from '../primitives/StageCampaignReview'
import { StageEnter } from '../StageMotion'
import { DEMO_CAMPAIGN_NEW, DEMO_CAMPAIGNS_BASE } from '../demoData'
import type { StageLayout } from '../types'
import { STEP, newCampaignAt } from './disparoScript'

function List({ step }: { step: number }) {
  const fresh = newCampaignAt(step)
  const c = DEMO_CAMPAIGN_NEW
  return (
    <div className="flex flex-col gap-2 p-4">
      {fresh && (
        <StageEnter>
          <StageCampaignCard
            name={c.name}
            status={fresh.status}
            template={c.template}
            total={c.total}
            sent={fresh.sent}
            delivered={fresh.delivered}
            read={fresh.read}
            replied={fresh.replied}
            when={c.when}
          />
        </StageEnter>
      )}
      {DEMO_CAMPAIGNS_BASE.map((k) => (
        <StageCampaignCard key={k.id} {...k} />
      ))}
    </div>
  )
}

/** Painel da direita: revisão antes do disparo; depois, os números da campanha (StatStrip real). */
function SidePanel({ step, pressed }: { step: number; pressed: boolean }) {
  const fresh = newCampaignAt(step)
  if (!fresh) return <StageCampaignReview pressed={pressed} />
  const c = DEMO_CAMPAIGN_NEW
  return (
    <StageEnter className="p-5 flex flex-col gap-3">
      <div>
        <h3 className="text-[15px] font-display font-bold tracking-[-0.01em] text-surface-50">{c.name}</h3>
        <p className="text-xs text-surface-400 mt-0.5">{fresh.status === 'sent' ? 'Disparo concluído' : 'Disparando agora…'}</p>
      </div>
      <StatStrip
        items={[
          { label: 'Enviadas', value: fresh.sent },
          { label: 'Entregues', value: fresh.delivered },
          { label: 'Lidas', value: fresh.read },
          { label: 'Respostas', value: fresh.replied },
        ]}
      />
    </StageEnter>
  )
}

/** Cena "Disparos" — função PURA do passo (roteiro em `disparoScript.ts`). */
export function DisparoScene({ step, layout }: { step: number; layout: StageLayout }) {
  const pressed = step === STEP.press
  if (layout === 'compact') {
    return (
      <div className="flex-1 min-w-0 overflow-hidden bg-surface-900">
        {newCampaignAt(step) ? <List step={step} /> : <SidePanel step={step} pressed={pressed} />}
      </div>
    )
  }
  return (
    <>
      <StageRail active="disparo" />
      <div className="w-[540px] flex-shrink-0 border-r border-surface-700 bg-surface-900 overflow-hidden">
        <List step={step} />
      </div>
      <div className="flex-1 min-w-0 bg-surface-800 overflow-hidden">
        <SidePanel step={step} pressed={pressed} />
      </div>
    </>
  )
}
