import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ErrorState } from '@/components/ui/ErrorState'
import { useEstadoNaUrl } from '@/hooks/useEstadoNaUrl'
import { getApiErrorMessage } from '@/lib/utils'
import { supportApi } from '@/services/supportApi'
import type { QualidadeDaEmpresa } from '@/types/support'
import { IndicadoresDaQualidade } from '@/components/support/IndicadoresDaQualidade'

const MES = /^\d{4}-(0[1-9]|1[0-2])$/

/**
 * QUALIDADE DO ATENDIMENTO (SCRUM-1391) — a página da gestão da empresa
 * (admin e business_admin; a rota fecha para os outros papéis). O mês na URL
 * (`?periodo=AAAA-MM`): o link do e-mail mensal abre direto no mês dele.
 */
export function SupportQualidadePage() {
  const navigate = useNavigate()
  const [periodo, setPeriodo] = useEstadoNaUrl<string | null>('periodo', {
    padrao: null,
    ler: (v) => (v && MES.test(v) ? v : null),
    escrever: (v) => v,
  })
  const [dados, setDados] = useState<QualidadeDaEmpresa | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pedido, setPedido] = useState(0)
  useEffect(() => {
    let vivo = true
    supportApi.qualidade(periodo ?? undefined)
      .then((d) => { if (vivo) { setDados(d); setErro(null) } })
      .catch((e) => { if (vivo) setErro(getApiErrorMessage(e, 'Tente de novo em instantes.')) })
    return () => { vivo = false }
  }, [periodo, pedido])

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-950">
      <header className="h-14 px-4 md:px-6 flex items-center gap-3 border-b border-surface-800 flex-shrink-0 min-w-0">
        <button type="button" onClick={() => navigate('/support')} aria-label="Voltar para o Suporte"
          className="w-8 h-8 -ml-1.5 inline-flex items-center justify-center rounded-[7px] text-surface-300 hover:bg-[var(--rowhover)] flex-shrink-0">
          <ArrowLeft className="w-4 h-4" aria-hidden />
        </button>
        <h1 className="text-[17px] font-semibold text-surface-50 truncate">Qualidade do atendimento</h1>
        {dados && <span className="hidden lg:inline text-xs text-surface-400 truncate">{dados.empresa}: cada número com a sua base</span>}
      </header>
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
        <div className="max-w-[1100px] flex flex-col gap-4">
          {erro ? (
            <ErrorState title="Não foi possível carregar a qualidade" hint={erro} onRetry={() => { setErro(null); setPedido((v) => v + 1) }} />
          ) : !dados ? (
            <p className="text-sm text-surface-400" role="status">Carregando os indicadores…</p>
          ) : (
            <IndicadoresDaQualidade dados={dados} periodo={periodo ?? dados.periodo} onPeriodo={setPeriodo} />
          )}
        </div>
      </div>
    </div>
  )
}
