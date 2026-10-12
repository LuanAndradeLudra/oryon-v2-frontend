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
 * dompurify + cn + tipos — sem api/socket); ele não conhece a escala mobile/`lg:`
 * do palco, então entra em DOIS wrappers de largura fixa (um por breakpoint,
 * `compact` estica ao 100 % do wrapper) em vez de um `transform: scale`.
 */
function Row({ label, strong, mono, children, first }: { label: string; strong?: boolean; mono?: boolean; children: React.ReactNode; first?: boolean }) {
  return (
    <div className={cn('flex items-baseline gap-1.5 lg:gap-3 py-1 lg:py-1.5 border-t border-[0.5px] lg:border-[1px] border-surface-700', first && 'border-t-0 pt-0')}>
      <span className="text-[4.5px] lg:text-[11px] text-surface-500 w-[36px] lg:w-[88px] flex-none">{label}</span>
      <span className={cn('text-[5px] lg:text-xs min-w-0 truncate', strong ? 'font-semibold text-surface-100' : 'text-surface-100', mono && 'font-mono text-[4.75px] lg:text-[11.5px]')}>
        {children}
      </span>
    </div>
  )
}

export function StageCampaignReview() {
  const c = DEMO_CAMPAIGN_NEW
  return (
    <div className="flex flex-col gap-2 lg:gap-4 p-2.5 lg:p-5">
      <div>
        <h3 className="text-[7.5px] lg:text-[15px] font-display font-bold tracking-[-0.01em] text-surface-50">Revisar e disparar</h3>
        <p className="hidden lg:block text-xs text-surface-400 mt-0.5">Confira antes de enviar. Depois do disparo, não dá para desfazer.</p>
      </div>

      <div className="flex gap-2.5 lg:gap-5">
        <div className="flex-1 min-w-0">
          <Row label="Nome" strong first>{c.name}</Row>
          <Row label="Modelo" mono>{c.template}</Row>
          <Row label="Público">
            <b className="text-surface-100">{c.total} contatos</b> <span className="hidden lg:inline">· {c.audience}</span>
          </Row>
          <Row label="Linha">{c.line}</Row>
          <Row label="Envio">Imediatamente</Row>
        </div>
        <div className="flex-none">
          <span className="lg:hidden inline-block w-[52px]"><TemplatePreview template={DEMO_TEMPLATE as unknown as WhatsAppTemplate} variables={DEMO_TEMPLATE_VARS} compact variant="card" /></span>
          <span className="hidden lg:inline-block w-[210px]"><TemplatePreview template={DEMO_TEMPLATE as unknown as WhatsAppTemplate} variables={DEMO_TEMPLATE_VARS} compact variant="card" /></span>
        </div>
      </div>

      <div className="hidden lg:block">
        <Banner variant="info">Modelo aprovado pela Meta: pode ser enviado fora da janela de 24 h.</Banner>
      </div>

      <div className="flex justify-end pt-0.5 lg:pt-1">
        <span className="lg:hidden inline-flex items-center h-[10px] px-1.5 rounded-[2.5px] bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-fg)] text-[5px] font-semibold">Disparar</span>
        <span className="hidden lg:inline-flex">
          <Button variant="primary" tabIndex={-1} leftIcon={<Send className="w-3.5 h-3.5" />}>Disparar</Button>
        </span>
      </div>
    </div>
  )
}
