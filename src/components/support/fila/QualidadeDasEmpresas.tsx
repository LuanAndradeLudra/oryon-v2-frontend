import { useEffect, useState } from 'react'
import { ArrowLeft, Mail } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { showToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'
import { adminSupportApi } from '@/services/supportApi'
import type { IndicadorDaQualidade, PreviaDoEmailDaQualidade, QualidadeDaEmpresa, VisaoDaQualidade } from '@/types/support'
import { IndicadoresDaQualidade } from '../IndicadoresDaQualidade'
import { ULTIMOS_7_DIAS, fracaoCurta, nomeDoPeriodo, valorEmDestaque } from '../qualidade'

/** As colunas da visão geral (o texto completo de cada célula fica no título). */
const COLUNAS: ReadonlyArray<readonly [string, string]> = [
  ['respostas_da_ia', 'Respostas da IA'],
  ['respondeu_sozinha', 'Respondeu sozinha'],
  ['encaminhou', 'Encaminhou'],
  ['sem_resposta', 'Sem resposta'],
  ['chamados_sobre_ia', 'Chamados sobre a IA'],
  ['confirmados', 'Confirmados'],
  ['primeira_resposta', '1ª resposta'],
]

type Empresa = { tenantId: string; empresa: string }

/**
 * QUALIDADE POR EMPRESA (SCRUM-1391), visão da equipe Oryon: todas as
 * empresas com o suporte, nos últimos 7 dias (a base do relatório semanal da
 * equipe) ou num mês (o retrato guardado, quando existe). Abrir uma empresa
 * mostra os mesmos cartões que a gestão dela vê e a prévia do e-mail do mês.
 * Aberto pelo chamado, já começa na empresa dele.
 */
export function QualidadeDasEmpresas({ onFechar, inicial }: { onFechar: () => void; inicial?: Empresa }) {
  const [empresa, setEmpresa] = useState<Empresa | null>(inicial ?? null)
  return (
    <Modal open onClose={onFechar} title={empresa ? `Qualidade · ${empresa.empresa}` : 'Qualidade por empresa'} className="w-full max-w-[1040px]">
      {empresa
        ? <DetalheDaEmpresa empresa={empresa} onVoltar={inicial ? undefined : () => setEmpresa(null)} />
        : <VisaoGeral onAbrir={setEmpresa} />}
    </Modal>
  )
}

function SeletorDePeriodo({ valor, periodos, onMudar }: { valor: string; periodos: string[]; onMudar: (p: string) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-[13px] text-surface-300 self-start">
      Período
      <select value={valor} onChange={(e) => onMudar(e.target.value)}
        className="h-8 rounded-[7px] bg-surface-800 border border-[var(--bd2)] px-2 text-[13px] text-surface-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500">
        {[...new Set([...periodos, valor])].map((p) => <option key={p} value={p}>{nomeDoPeriodo(p)}</option>)}
      </select>
    </label>
  )
}

function VisaoGeral({ onAbrir }: { onAbrir: (e: Empresa) => void }) {
  const [periodo, setPeriodo] = useState(ULTIMOS_7_DIAS)
  const [visao, setVisao] = useState<VisaoDaQualidade | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pedido, setPedido] = useState(0)
  useEffect(() => {
    let vivo = true
    adminSupportApi.qualidade(periodo)
      .then((v) => { if (vivo) { setVisao(v); setErro(null) } })
      .catch((e) => { if (vivo) setErro(getApiErrorMessage(e, 'Tente de novo em instantes.')) })
    return () => { vivo = false }
  }, [periodo, pedido])

  if (erro) return <ErrorState title="Não foi possível carregar a qualidade" hint={erro} onRetry={() => { setErro(null); setPedido((v) => v + 1) }} />
  if (!visao) return <p className="text-sm text-surface-400" role="status">Carregando…</p>
  return (
    <div className="flex flex-col gap-4 min-w-0">
      <p className="text-[13px] text-surface-300">
        Cada número com a sua base (passe o mouse na célula para o texto completo). Os últimos 7 dias são a conta ao vivo da semana;
        o mês fechado mostra o retrato guardado, o mesmo do e-mail da empresa.
      </p>
      <SeletorDePeriodo valor={periodo} periodos={visao.periodos} onMudar={setPeriodo} />
      {visao.empresas.length === 0 ? (
        <p className="text-[13px] text-surface-400">Nenhuma empresa com o suporte ligado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-[13px]">
            <caption className="sr-only">Qualidade por empresa: {nomeDoPeriodo(visao.periodo).toLowerCase()}</caption>
            <thead>
              <tr className="text-left text-[11px] text-surface-400">
                <th scope="col" className="font-medium py-1 pr-2">Empresa</th>
                {COLUNAS.map(([k, rotulo]) => <th key={k} scope="col" className="font-medium py-1 pr-2">{rotulo}</th>)}
              </tr>
            </thead>
            <tbody>
              {visao.empresas.map((e) => {
                const porChave = new Map<string, IndicadorDaQualidade>(e.indicadores.map((i) => [i.chave, i]))
                return (
                  <tr key={e.tenantId} className="border-t border-surface-800">
                    <th scope="row" className="py-1.5 pr-2 text-left font-normal align-top">
                      <button type="button" onClick={() => onAbrir({ tenantId: e.tenantId, empresa: e.empresa })}
                        className="text-left text-surface-100 hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded-[4px]">
                        {e.empresa}
                      </button>
                      {e.retrato && <span className="block text-[11px] text-surface-400">retrato do mês</span>}
                    </th>
                    {COLUNAS.map(([k]) => {
                      const i = porChave.get(k)
                      return (
                        <td key={k} title={i?.texto} className="py-1.5 pr-2 align-top">
                          <span className="tabular-nums font-semibold text-surface-100">{i ? valorEmDestaque(i) : '—'}</span>
                          <span className="block text-[11px] text-surface-400 tabular-nums">{i ? fracaoCurta(i) : ''}</span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[12px] text-surface-400">{visao.avisoDaTaxaDeErro}</p>
    </div>
  )
}

function DetalheDaEmpresa({ empresa, onVoltar }: { empresa: Empresa; onVoltar?: () => void }) {
  const [periodo, setPeriodo] = useState<string | null>(null)
  const [dados, setDados] = useState<QualidadeDaEmpresa | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pedido, setPedido] = useState(0)
  const [previa, setPrevia] = useState<PreviaDoEmailDaQualidade | null>(null)
  const [abrindoPrevia, setAbrindoPrevia] = useState(false)
  useEffect(() => {
    let vivo = true
    adminSupportApi.qualidadeDaEmpresa(empresa.tenantId, periodo ?? undefined)
      .then((d) => { if (vivo) { setDados(d); setErro(null) } })
      .catch((e) => { if (vivo) setErro(getApiErrorMessage(e, 'Tente de novo em instantes.')) })
    return () => { vivo = false }
  }, [empresa.tenantId, periodo, pedido])

  const verEmail = async (mes: string) => {
    setAbrindoPrevia(true)
    try {
      setPrevia(await adminSupportApi.previaDoEmailDaQualidade(empresa.tenantId, mes))
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Não foi possível montar a prévia do e-mail.'), 'error')
    } finally {
      setAbrindoPrevia(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 min-w-0">
      {onVoltar && (
        <button type="button" onClick={onVoltar}
          className="self-start inline-flex items-center gap-1.5 text-[13px] text-surface-300 hover:text-surface-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded-[4px]">
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden />Todas as empresas
        </button>
      )}
      {erro ? (
        <ErrorState title="Não foi possível carregar a qualidade" hint={erro} onRetry={() => { setErro(null); setPedido((v) => v + 1) }} />
      ) : !dados ? (
        <p className="text-sm text-surface-400" role="status">Carregando…</p>
      ) : (
        <IndicadoresDaQualidade dados={dados} periodo={periodo ?? dados.periodo}
          onPeriodo={(p) => { setPeriodo(p); setPrevia(null) }}
          acoes={dados.fechado && dados.periodo === (periodo ?? dados.periodo) ? (
            <Button size="sm" variant="neutral" leftIcon={<Mail className="w-3.5 h-3.5" />} loading={abrindoPrevia} onClick={() => void verEmail(dados.periodo)}>
              Ver o e-mail do mês
            </Button>
          ) : null} />
      )}
      {previa && (
        <section aria-label="Prévia do e-mail do mês" className="flex flex-col gap-2">
          <p className="text-[12px] text-surface-400">
            Assunto: <span className="text-surface-200">{previa.assunto}</span>
            {!previa.retrato && ' · com a conta ao vivo (o retrato do mês ainda não foi guardado)'}
          </p>
          {/* Sem allow-scripts nada roda no e-mail; allow-same-origin só deixa a logo carregar (origem opaca bloqueia). */}
          <iframe title="Prévia do e-mail do mês" sandbox="allow-same-origin" srcDoc={previa.html}
            className="w-full h-[560px] rounded-[10px] border border-[var(--bd2)]" />
        </section>
      )}
    </div>
  )
}
