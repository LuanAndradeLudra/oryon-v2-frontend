import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import type { Campaign } from '@/types'

/**
 * Cabeçalho do relatório: trilha, título, situação e a linha de contexto.
 *
 * **A trilha é local, não um primitivo de `ui/`** (decisão D3-decisoes §6). A
 * Carta só admite promover para `ui/` migrando a maioria das cópias, e aqui há
 * uma. Quando D4/D5 quiserem o mesmo, aí vale a promoção, numa história
 * própria, com as três chamadas migradas de uma vez.
 *
 * **Sem "Ver conversas" e sem "Exportar"** (§5 e §7): não existe filtro da
 * caixa de entrada por campanha, e a exportação varreria todas as páginas de
 * destinatários. Nenhum dos dois é renderizado desabilitado — controle
 * desabilitado anuncia capacidade que não existe.
 */
export function ReportHeader({ campaign }: { campaign: Campaign | null }) {
  return (
    <header className="mb-5">
      <nav aria-label="Trilha de navegação" className="flex items-center gap-1.5 mb-1.5">
        <Link to="/campaigns" className="text-xs text-surface-400 hover:text-surface-200 transition-colors">
          Disparos
        </Link>
        <ChevronRight className="w-3 h-3 text-surface-600" aria-hidden="true" />
        <span className="text-xs text-surface-300 truncate max-w-[40ch]" aria-current="page">
          {campaign?.name ?? 'Relatório'}
        </span>
      </nav>

      <div className="flex items-center gap-2.5 flex-wrap">
        <h1 className="text-[26px] leading-tight font-semibold text-surface-50">
          {campaign?.name ?? 'Relatório do disparo'}
        </h1>
        {campaign && <Badge variant={badgeVariant(campaign.status)}>{rotuloStatus(campaign.status)}</Badge>}
      </div>

      {campaign && <p className="text-sm text-surface-400 mt-1">{linhaDeContexto(campaign)}</p>}
    </header>
  )
}

/**
 * Rótulo e cor da situação, local por ora.
 *
 * O `campaignStatus.ts` do W0.4 (#117) é o dono desse vocabulário, mas ainda
 * não está mesclado no épico. Quando entrar, esta função sai e o import passa a
 * ser de lá — está anotado no corpo do PR para não virar terceira cópia.
 */
function rotuloStatus(status: Campaign['status']): string {
  const rotulos: Record<string, string> = {
    draft: 'Rascunho',
    scheduled: 'Agendada',
    sending: 'Enviando',
    sent: 'Enviada',
    failed: 'Falhou',
    cancelled: 'Cancelada',
    paused: 'Pausada',
  }
  return rotulos[status] ?? status
}

function badgeVariant(status: Campaign['status']) {
  if (status === 'sent') return 'resolved' as const
  if (status === 'failed' || status === 'cancelled') return 'abandoned' as const
  if (status === 'sending') return 'open' as const
  return 'pending' as const
}

function linhaDeContexto(campaign: Campaign): string {
  const partes: string[] = []

  if (campaign.sentAt) {
    const d = new Date(campaign.sentAt)
    if (!Number.isNaN(d.getTime())) {
      partes.push(
        d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }),
        d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      )
    }
  }
  if (campaign.templateName) partes.push(campaign.templateName)

  return partes.join(' · ')
}
