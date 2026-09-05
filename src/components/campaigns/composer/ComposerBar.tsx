// ─── ComposerBar ───────────────────────────────────────────────────────────
// Barra fixa do rodapé do Composer — mockup `p3-disparos.html` §D2, CSS
// `.compbar` em `p1b-extra.html:188`. Mostra o custo estimado, o que falta, e
// as duas ações finais.
//
// Recebe tudo por props em vez de chamar os hooks aqui: assim o custo (BE.5)
// e o envio de teste (BE.10) podem ser exercitados em teste sem rede, e a
// página continua sendo o único lugar que amarra rascunho e rede.
import { FlaskConical, CalendarCheck, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { BlockId } from './useComposerDraft'
import type { CampaignCostEstimate } from '@/types/campaignsV2'

/** O que falta, por bloco pendente. Frase de ação, não nome de campo — quem
 *  lê a barra quer saber o que fazer, não qual bloco está vermelho. */
const PENDING_HINT: Record<BlockId, string> = {
  template:  'Escolher o template e nomear o disparo',
  publico:   'Definir quem vai receber',
  variaveis: 'Preencher as variáveis do template',
  envio:     'Confirmar linha e horário',
}

interface ComposerBarProps {
  cost: CampaignCostEstimate | null
  costLoading: boolean
  /** `false` = BE.5 não implantada; o bloco de custo some (não vira R$ 0,00). */
  costAvailable: boolean
  /** Primeiro bloco pendente, ou `null` quando os 4 estão verdes. */
  firstPending: BlockId | null
  scheduleMode: 'now' | 'later'
  onSubmit: () => void
  submitting: boolean
  testSend: {
    send: () => void
    sending: boolean
    /** `false` = BE.10 não implantada; o botão some, não fica desabilitado. */
    available: boolean
    ready: boolean
  }
}

export function ComposerBar({
  cost, costLoading, costAvailable, firstPending, scheduleMode,
  onSubmit, submitting, testSend,
}: ComposerBarProps) {
  const canSubmit = firstPending === null && !submitting
  // O botão diz o que vai acontecer. "Agendar disparo" num rascunho marcado
  // como "Agora" seria mentira — ele envia na hora.
  const submitLabel = scheduleMode === 'now' ? 'Enviar agora' : 'Agendar disparo'
  const SubmitIcon = scheduleMode === 'now' ? Send : CalendarCheck

  return (
    <div className="sticky bottom-0 -mx-7 -mb-6 mt-2 px-7 py-3.5 flex items-center justify-between gap-4 border-t border-surface-800 bg-[color-mix(in_srgb,var(--color-surface-950)_85%,transparent)] backdrop-blur-lg">
      <div className="flex items-center gap-4.5">
        {/* Custo: só existe quando o BE.5 responde. Ausente é ausente —
            mostrar "R$ 0,00" seria um número errado, não um número faltando. */}
        {costAvailable && (
          <>
            <div>
              <div className="text-3xs uppercase tracking-wider text-surface-500">Custo estimado</div>
              <div className="text-base font-bold text-surface-50">
                {costLoading && !cost
                  ? <span className="text-sm font-medium text-surface-400">calculando…</span>
                  : cost
                    ? <>
                        {formatCents(cost.totalCents)}
                        <span className="text-xs font-medium text-surface-400">
                          {' · '}{cost.estimatedCount.toLocaleString('pt-BR')} × {formatCents(cost.perMessage.priceCents, 3)}
                        </span>
                      </>
                    : <span className="text-sm font-medium text-surface-400">—</span>}
              </div>
            </div>
            <div className="w-px h-7 bg-surface-700" />
          </>
        )}

        <div>
          <div className="text-3xs uppercase tracking-wider text-surface-500">
            {firstPending ? 'Falta' : 'Pronto'}
          </div>
          <div className={firstPending ? 'text-xs text-accent-amber' : 'text-xs text-accent-green'}>
            {firstPending ? PENDING_HINT[firstPending] : 'Os 4 blocos estão completos'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Enviar teste some quando o BE.10 não existe, em vez de ficar
            desabilitado: controle desabilitado anuncia capacidade que não
            existe (mesma regra da recorrência, coord/D2-plano.md §8). Ele
            fica desabilitado apenas enquanto FALTA dado do próprio rascunho
            (template ou linha), que é uma pendência do usuário, não uma
            capacidade ausente do produto. */}
        {testSend.available && (
          <Button
            variant="secondary"
            onClick={testSend.send}
            disabled={!testSend.ready || testSend.sending}
            title={testSend.ready ? undefined : 'Escolha um template e uma linha para testar o envio'}
          >
            {testSend.sending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <FlaskConical className="w-4 h-4" />}
            Enviar teste para mim
          </Button>
        )}

        <Button variant="primary" onClick={onSubmit} disabled={!canSubmit}>
          {submitting
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <SubmitIcon className="w-4 h-4" />}
          {submitLabel}
        </Button>
      </div>
    </div>
  )
}

/** Centavos inteiros → moeda pt-BR (convenção da casa, `amountCents` +
 *  `currency` BRL). `fractionDigits` maior serve para o preço unitário, que
 *  é fração de centavo por mensagem.
 *
 *  Existe um formatador igual em `agents/AgentCatalogTab.tsx:26`. Não
 *  importei de um componente nem criei um utilitário compartilhado agora:
 *  com um terceiro consumidor (o relatório da D3 provavelmente será), isto
 *  vira `lib/money.ts` numa história própria. */
function formatCents(cents: number, fractionDigits = 2): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits,
  })
}
