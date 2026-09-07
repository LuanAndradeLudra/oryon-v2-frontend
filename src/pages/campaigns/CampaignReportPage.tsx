import { useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ReportHeader } from '@/components/campaigns/report/ReportHeader'
import { ResultTab } from '@/components/campaigns/report/ResultTab'
import { ContactsTab } from '@/components/campaigns/report/ContactsTab'
import { useCampaignReport } from '@/components/campaigns/report/useCampaignReport'

type Aba = 'resultado' | 'contatos'

/**
 * Relatório do disparo (D3 / SCRUM-1022).
 *
 * Duas abas, não três: a "Linha do tempo" do plano foi adiada (decisão
 * D3-decisoes §3) porque não tem fonte de dados e não aparece no mockup —
 * inventá-la seria desenhar uma tela que ninguém aprovou, ou mostrar o mesmo
 * dado do heatmap com outra roupa.
 */
export function CampaignReportPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()

  const { campaign, model, loading, error, reload } = useCampaignReport(id)

  const aba: Aba = searchParams.get('tab') === 'contatos' ? 'contatos' : 'resultado'

  // A aba vive na URL para o "Ver contatos" da tabela de falhas e o "Ver as N"
  // das respostas poderem apontar direto, e para o link ser compartilhável.
  const irPara = useCallback(
    (destino: Aba) => {
      setSearchParams(
        (atual) => {
          const proximo = new URLSearchParams(atual)
          if (destino === 'resultado') proximo.delete('tab')
          else proximo.set('tab', destino)
          return proximo
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState title={error} onRetry={reload} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-6 max-w-[1200px] w-full mx-auto">
        <ReportHeader campaign={campaign} />

        <div className="flex justify-end mb-4">
          <SegmentedControl<Aba>
            label="Seções do relatório"
            value={aba}
            onChange={(v) => irPara(v)}
            options={[
              { value: 'resultado', label: 'Resultado' },
              { value: 'contatos', label: 'Contatos' },
            ]}
          />
        </div>

        {aba === 'resultado' ? (
          <ResultTab
            model={model}
            onVerContatos={() => irPara('contatos')}
            onVerRespostas={() => irPara('contatos')}
          />
        ) : (
          id && (
            <ContactsTab
              campaignId={id}
              hasRecipientData={model.hasRecipientData}
            />
          )
        )}
      </div>
    </div>
  )
}
