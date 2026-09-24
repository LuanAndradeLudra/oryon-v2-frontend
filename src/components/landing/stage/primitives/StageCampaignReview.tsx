import { Send } from 'lucide-react'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { TemplatePreview } from '@/components/campaigns/TemplatePreview'
import type { WhatsAppTemplate } from '@/types'
import { cn } from '@/lib/utils'
import { DEMO_CAMPAIGN_NEW, DEMO_TEMPLATE, DEMO_TEMPLATE_VARS } from '../demoData'

/**
 * Passo "Revisar" do assistente de campanha — ESPELHA `campaigns/CampaignWizard.tsx`
 * :1560-1660 (lista plana com hairline entre linhas: Nome · Template · Público ·
 * Linha · Envio) e `campaigns/SummaryRow.tsx` (rótulo em coluna de 88px, divisor de
 * 1px, valor 12px). A prévia do modelo é o `TemplatePreview` real (puro:
 * dompurify + cn + tipos — sem api/socket).
 * `data-stage-target="disparar"` é o alvo do cursor.
 */
function Row({ label, strong, mono, children, first }: { label: string; strong?: boolean; mono?: boolean; children: React.ReactNode; first?: boolean }) {
  return (
    <div className={cn('flex items-baseline gap-3 py-1.5 border-t border-surface-700', first && 'border-t-0 pt-0')}>
      <span className="text-[11px] text-surface-500 w-[88px] flex-none">{label}</span>
      <span className={cn('text-xs min-w-0 truncate', strong ? 'font-semibold text-surface-100' : 'text-surface-100', mono && 'font-mono text-[11.5px]')}>
        {children}
      </span>
    </div>
  )
}

interface Props {
  /** Botão "Disparar" pressionado (feedback do clique). */
  pressed?: boolean
}

export function StageCampaignReview({ pressed = false }: Props) {
  const c = DEMO_CAMPAIGN_NEW
  return (
    <div className="flex flex-col gap-4 p-5">
      <div>
        <h3 className="text-[15px] font-display font-bold tracking-[-0.01em] text-surface-50">Revisar e disparar</h3>
        <p className="text-xs text-surface-400 mt-0.5">Confira antes de enviar — o disparo não pode ser desfeito.</p>
      </div>

      <div className="flex gap-5">
        <div className="flex-1 min-w-0">
          <Row label="Nome" strong first>{c.name}</Row>
          <Row label="Modelo" mono>{c.template}</Row>
          <Row label="Público">
            <b className="text-surface-100">{c.total} contatos</b> · {c.audience}
          </Row>
          <Row label="Linha">{c.line}</Row>
          <Row label="Envio">Imediatamente</Row>
        </div>
        <div className="flex-none">
          <TemplatePreview template={DEMO_TEMPLATE as unknown as WhatsAppTemplate} variables={DEMO_TEMPLATE_VARS} compact variant="card" className="w-[210px]" />
        </div>
      </div>

      <Banner variant="info">Modelo aprovado pela Meta: pode ser enviado fora da janela de 24 h.</Banner>

      <div className="flex justify-end pt-1">
        <span data-stage-target="disparar" className={cn('inline-flex origin-center transition-transform duration-100', pressed && 'scale-90')}>
          <Button variant="primary" tabIndex={-1} leftIcon={<Send className="w-3.5 h-3.5" />}>Disparar</Button>
        </span>
      </div>
    </div>
  )
}
