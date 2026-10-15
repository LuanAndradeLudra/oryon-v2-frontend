import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { showToast } from '@/hooks/useToast'
import { cn, getApiErrorMessage } from '@/lib/utils'
import { adminSupportApi } from '@/services/supportApi'
import type { VisaoDaCalibracao } from '@/types/support'
import { PRIORIDADES, textoDaCalibracao, type Prioridade } from './modeloDaFila'

const SITUACAO: Record<VisaoDaCalibracao['empresas'][number]['situacao'], string> = {
  poucos_dados: 'Poucos dados', confirma: 'Confirma', inflado: 'Relato inflado',
}

/**
 * CALIBRAÇÃO DA REGRA (SCRUM-1392) — só a equipe Oryon. Por empresa: dos
 * chamados que a regra pôs em P2 pelos fatos e que a equipe já triou, quantos
 * ela confirmou (numerador, denominador e período sempre à vista). A
 * simulação com o histórico mostra a prioridade sugerida antes e depois do
 * ajuste. Ligar ou desligar o ajuste pede motivo (fica no histórico).
 */
export function CalibracaoDaRegra({ onFechar }: { onFechar: () => void }) {
  const [visao, setVisao] = useState<VisaoDaCalibracao | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [pedido, setPedido] = useState(0)
  useEffect(() => {
    let vivo = true
    adminSupportApi.calibracao()
      .then((v) => { if (vivo) setVisao(v) })
      .catch((e) => { if (vivo) setErro(getApiErrorMessage(e, 'Não foi possível carregar a calibração.')) })
    return () => { vivo = false }
  }, [pedido])

  const [mudando, setMudando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const mudar = async () => {
    if (!visao || motivo.trim().length < 5) return
    setSalvando(true)
    try {
      await adminSupportApi.definirConfiguracao('calibracao', { ...visao.config, ligado: !visao.config.ligado }, motivo.trim())
      showToast(visao.config.ligado ? 'Ajuste da regra desligado. O motivo ficou no histórico.' : 'Ajuste da regra ligado. O motivo ficou no histórico.', 'success')
      setMudando(false)
      setMotivo('')
      setPedido((v) => v + 1)
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Não foi possível salvar. Tente de novo.'), 'error')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Modal open onClose={onFechar} title="Calibração da regra por empresa" className="w-full max-w-[820px]">
      {erro ? <p className="text-sm text-danger">{erro}</p>
        : !visao ? <p className="text-sm text-surface-400">Carregando…</p>
          : (
            <div className="flex flex-col gap-5">
              <p className="text-[13px] text-surface-300">
                Dos chamados que a regra pôs em P2 pelos fatos e que a equipe já triou, quantos ela confirmou (não rebaixou para P3) nos
                últimos {visao.config.janelaDias} dias. Só a equipe Oryon vê; a empresa nunca.
              </p>

              <section aria-label="Ajuste na regra" className="flex flex-col gap-2 rounded-[8px] border border-surface-700 px-3 py-2.5">
                <p className="text-[13px] text-surface-100">
                  Ajuste na regra: <span className="font-semibold">{visao.config.ligado ? 'ligado' : 'desligado'}</span>.
                  <span className="text-surface-400"> Ligado, o P2 dos fatos de empresa com relato inflado — abaixo de {Math.round(visao.config.limiar * 100)}% confirmados,
                    com ao menos {visao.config.minimo} triados — começa em P3. P0 e P1 nunca mudam.</span>
                </p>
                {!mudando ? (
                  <Button size="sm" variant="neutral" className="self-start" onClick={() => setMudando(true)}>
                    {visao.config.ligado ? 'Desligar o ajuste' : 'Ligar o ajuste'}
                  </Button>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} maxLength={500} autoFocus
                      placeholder="Por que mudar (fica no histórico)" aria-label="Motivo da mudança do ajuste" />
                    <div className="flex gap-1.5">
                      <Button size="sm" disabled={motivo.trim().length < 5} loading={salvando} onClick={() => void mudar()}>
                        {visao.config.ligado ? 'Desligar' : 'Ligar'}
                      </Button>
                      <Button size="sm" variant="neutral" onClick={() => { setMudando(false); setMotivo('') }}>Cancelar</Button>
                    </div>
                  </div>
                )}
              </section>

              <section aria-label="Simulação com o histórico" className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-surface-300">
                  Simulação com o histórico ({visao.simulacao.chamados} {visao.simulacao.chamados === 1 ? 'chamado' : 'chamados'} em {visao.config.janelaDias} dias)
                </h3>
                <table className="w-full max-w-[420px] text-[13px]">
                  <thead>
                    <tr className="text-left text-[11px] text-surface-400">
                      <th className="font-medium py-1">Prioridade sugerida</th><th className="font-medium py-1 text-right">Antes</th><th className="font-medium py-1 text-right">Depois</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.keys(PRIORIDADES) as Prioridade[]).map((p) => (
                      <tr key={p} className="border-t border-surface-800">
                        <td className="py-1 text-surface-200">{p} · {PRIORIDADES[p].nome}</td>
                        <td className="py-1 text-right tabular-nums text-surface-100">{visao.simulacao.antes[p]}</td>
                        <td className={cn('py-1 text-right tabular-nums', visao.simulacao.depois[p] !== visao.simulacao.antes[p] ? 'text-warning font-semibold' : 'text-surface-100')}>
                          {visao.simulacao.depois[p]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[12px] text-surface-400">
                  {visao.simulacao.mudariam === 0
                    ? 'Nenhum chamado mudaria: nenhuma empresa tem relato inflado com dados suficientes.'
                    : `${visao.simulacao.mudariam} ${visao.simulacao.mudariam === 1 ? 'chamado mudaria' : 'chamados mudariam'} de P2 para P3.`}
                </p>
              </section>

              <section aria-label="Empresas" className="flex flex-col gap-2 min-w-0">
                <h3 className="text-xs font-semibold text-surface-300">Empresas</h3>
                {visao.empresas.length === 0 ? <p className="text-[13px] text-surface-400">Nenhum chamado na janela.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[620px] text-[13px]">
                      <thead>
                        <tr className="text-left text-[11px] text-surface-400">
                          <th className="font-medium py-1">Empresa</th>
                          <th className="font-medium py-1">Relatos de urgência confirmados</th>
                          <th className="font-medium py-1 text-right">Rebaixados</th>
                          <th className="font-medium py-1 text-right">Subiram</th>
                          <th className="font-medium py-1 text-right" title="Disseram que acontecia com outras pessoas e ninguém mais relatou em 24 h">
                            “Com outras pessoas” sem confirmação
                          </th>
                          <th className="font-medium py-1">Situação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visao.empresas.map((e) => (
                          <tr key={e.tenantId} className="border-t border-surface-800">
                            <td className="py-1.5 text-surface-100 pr-2">{e.empresa}</td>
                            <td className="py-1.5 text-surface-200 pr-2">{textoDaCalibracao(e)}</td>
                            <td className="py-1.5 text-right tabular-nums">{e.rebaixados}</td>
                            <td className="py-1.5 text-right tabular-nums">{e.elevados}</td>
                            <td className="py-1.5 text-right tabular-nums">{e.naoConfirmados} de {e.aConfirmar}</td>
                            <td className={cn('py-1.5 pl-2', e.situacao === 'inflado' ? 'text-warning font-semibold' : 'text-surface-300')}>{SITUACAO[e.situacao]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}
    </Modal>
  )
}
