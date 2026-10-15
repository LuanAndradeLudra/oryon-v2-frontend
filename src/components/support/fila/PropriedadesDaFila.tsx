import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { Layers, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { showToast } from '@/hooks/useToast'
import { cn, getApiErrorMessage } from '@/lib/utils'
import { adminSupportApi, type MudancaNaFila } from '@/services/supportApi'
import type { ChamadoDaEquipe, ItemDaFila } from '@/types/support'
import { EscolhaEmLinha, Linha } from '../ReportTicketPanel'
import {
  ALCANCES, CONTATO_VIU, CONTORNOU, DESDE_QUANDO, IMPEDE_AGORA, JA_CORRIGIRAM, ORIGENS_DO_PROBLEMA, QUEM_MAIS, TIPOS_DE_PEDIDO,
  dataCurta, tituloDoChamado,
} from '../supportModel'
import {
  CAUSAS, PRIORIDADES, RELOGIOS, STATUS_DA_EQUIPE, STATUS_NA_FILA, canalDe, ehConflito, relativo, type CausaRaiz, type Prioridade, type Relogio,
} from './modeloDaFila'

function Titulo({ children }: { children: ReactNode }) {
  return <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-400 mt-1 mb-1">{children}</h3>
}

/**
 * PROPRIEDADES do chamado (coluna de 300 px; abaixo de 1280 px, dobráveis):
 * responsável, prioridade com os motivos da regra (mudar exige motivo), status
 * interno, prazos, o que foi relatado e o problema (parecidos, causa, Jira).
 * Toda mudança vai com a versão da tela; 409 recarrega o chamado.
 */
export function PropriedadesDaFila({ c, agora, onAtualizar, onRecarregar, onAbrir }: {
  c: ChamadoDaEquipe
  agora: number
  onAtualizar: (c: ChamadoDaEquipe) => void
  onRecarregar: () => void
  onAbrir: (id: string) => void
}) {
  const { user } = useAuth()
  const meu = !!user && c.responsavelId === user.id
  // Rascunhos presos ao valor de onde partiram: se o chamado mudar por fora, voltam ao valor novo.
  const [escolha, setEscolha] = useState<{ de: Prioridade; para: Prioridade } | null>(null)
  const prioridade = escolha?.de === c.prioridade ? escolha.para : c.prioridade
  const setPrioridade = (p: Prioridade) => setEscolha({ de: c.prioridade, para: p })
  const [motivo, setMotivo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [rascunhoJira, setRascunhoJira] = useState<{ de: string; texto: string } | null>(null)
  const jira = rascunhoJira?.de === (c.jiraRef ?? '') ? rascunhoJira.texto : (c.jiraRef ?? '')
  const setJira = (texto: string) => setRascunhoJira({ de: c.jiraRef ?? '', texto })
  const [parecidos, setParecidos] = useState<{ id: string; lista: ItemDaFila[] } | null>(null)
  useEffect(() => {
    let vivo = true
    adminSupportApi.sugestoes(c.id).then((s) => { if (vivo) setParecidos({ id: c.id, lista: s.parecidos }) }).catch(() => {})
    return () => { vivo = false }
  }, [c.id])
  const listaDeParecidos = parecidos?.id === c.id ? parecidos.lista : null

  const mudar = async (mudanca: MudancaNaFila, aviso: string) => {
    setSalvando(true)
    try {
      onAtualizar(await adminSupportApi.atualizar(c.id, c.version, mudanca))
      showToast(aviso, 'success')
      return true
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Não foi possível salvar. Tente de novo.'), 'error')
      if (ehConflito(err)) onRecarregar()
      return false
    } finally {
      setSalvando(false)
    }
  }
  const salvarPrioridade = async () => {
    if (await mudar({ prioridade, motivo: motivo.trim() }, `Prioridade ${prioridade}. O motivo ficou no histórico.`)) setMotivo('')
  }
  const salvarJira = () => {
    const ref = jira.trim()
    if ((c.jiraRef ?? '') === ref) return
    void mudar({ jiraRef: ref || null }, ref ? 'Card do Jira ligado ao chamado.' : 'Card do Jira desligado.')
  }

  const mudouPrioridade = prioridade !== c.prioridade
  const statusEditavel = c.status === 'received' || STATUS_DA_EQUIPE.includes(c.status)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col">
        <Linha rotulo="Responsável">
          <span className="flex items-center gap-2 text-[13px] min-w-0">
            <span className={cn('truncate', c.responsavel ? 'text-surface-100' : 'text-surface-400')}>{c.responsavel ?? 'Sem dono'}</span>
            {meu
              ? <button type="button" disabled={salvando} onClick={() => void mudar({ assumir: false }, 'Você soltou o chamado.')} className="text-xs font-semibold text-surface-400 hover:text-surface-100 hover:underline flex-shrink-0">Soltar</button>
              : <button type="button" disabled={salvando} onClick={() => void mudar({ assumir: true }, 'Chamado atribuído a você.')} className="text-xs font-semibold text-accent-dark hover:underline flex-shrink-0">Assumir (A)</button>}
          </span>
        </Linha>
        <Linha rotulo="Prioridade">
          <EscolhaEmLinha<Prioridade> rotulo="Prioridade" valor={prioridade} onChange={(v) => v && setPrioridade(v)}
            opcoes={(Object.keys(PRIORIDADES) as Prioridade[]).map((p) => [p, `${p} · ${PRIORIDADES[p].nome}`])} />
        </Linha>
        {c.motivosDaPrioridade.length > 0 && (
          <ul className="pl-[112px] -mt-0.5 pb-1.5 flex flex-col gap-0.5 text-[11px] text-surface-400" aria-label="Por que esta prioridade">
            {c.motivosDaPrioridade.map((m) => <li key={m} className="flex gap-1.5"><span aria-hidden>·</span>{m}</li>)}
            {c.prioridadeManual && <li className="flex gap-1.5"><span aria-hidden>·</span>Decidida pela equipe (a regra sugeriu {c.prioridadeDaRegra})</li>}
          </ul>
        )}
        {mudouPrioridade && (
          <div className="flex flex-col gap-1.5 pb-2">
            <p className="text-[11px] text-surface-400">A regra sugeriu {c.prioridadeDaRegra}. Para mudar para {prioridade}, diga o motivo (fica no histórico).</p>
            <Input size="sm" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} placeholder="Motivo da mudança" aria-label="Motivo da mudança de prioridade" />
            <div className="flex gap-1.5">
              <Button size="sm" disabled={motivo.trim().length < 5} loading={salvando} onClick={() => void salvarPrioridade()}>Salvar</Button>
              <Button size="sm" variant="neutral" onClick={() => { setPrioridade(c.prioridade); setMotivo('') }}>Desfazer</Button>
            </div>
          </div>
        )}
        <Linha rotulo="Status">
          {statusEditavel ? (
            <EscolhaEmLinha rotulo="Status" valor={c.status}
              onChange={(v) => { if (v && v !== c.status) void mudar({ status: v }, `Status: ${STATUS_NA_FILA[v]}.`) }}
              opcoes={[...(c.status === 'received' ? [['received', STATUS_NA_FILA.received] as [typeof c.status, string]] : []), ...STATUS_DA_EQUIPE.map((s) => [s, STATUS_NA_FILA[s]] as [typeof s, string])]} />
          ) : <span className="text-[13px] text-surface-100">{STATUS_NA_FILA[c.status]}</span>}
        </Linha>
        <p className="text-[11px] text-surface-400 -mt-0.5">Resolvido só pela resposta à empresa, no campo de baixo.</p>
      </div>

      <div className="flex flex-col">
        <Titulo>Prazos</Titulo>
        {(['primeiraResposta', 'triagem', 'contorno', 'solucao'] as Relogio[]).map((r) => (
          <Linha key={r} rotulo={RELOGIOS[r]}><Prazo c={c} relogio={r} agora={agora} /></Linha>
        ))}
        {c.sla.pausadoDesde && <p className="text-[11px] text-surface-400">Parados desde {dataCurta(c.sla.pausadoDesde)}: a vez é da empresa.</p>}
        <p className="text-[11px] text-surface-500">Prazos de exemplo; o SLA ainda será definido.</p>
      </div>

      <div className="flex flex-col">
        <Titulo>Chamado</Titulo>
        <DadosDoChamado c={c} />
      </div>

      <div className="flex flex-col gap-2">
        <Titulo>Problema</Titulo>
        {listaDeParecidos && listaDeParecidos.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-[11px] text-surface-400 flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" aria-hidden />Parecidos nos últimos 7 dias, em qualquer empresa</p>
            {listaDeParecidos.map((p) => (
              <button key={p.id} type="button" onClick={() => onAbrir(p.id)}
                className="text-left rounded-[6px] px-2 py-1.5 hover:bg-[var(--rowhover)] flex flex-col min-w-0">
                <span className="text-xs text-surface-100 truncate"><span className="font-mono text-surface-400">{p.numero}</span> · {p.tenantNome}</span>
                <span className="text-[11px] text-surface-400 truncate">{tituloDoChamado(p)} · {STATUS_NA_FILA[p.status]}</span>
              </button>
            ))}
          </div>
        )}
        {listaDeParecidos && listaDeParecidos.length === 0 && <p className="text-[11px] text-surface-400">Nenhum parecido aberto nos últimos 7 dias.</p>}
        <div className="flex flex-col">
          <Linha rotulo="Causa">
            <EscolhaEmLinha<CausaRaiz> rotulo="Causa" valor={c.causaRaiz} limpar
              onChange={(v) => void mudar({ causaRaiz: v }, v ? 'Causa registrada.' : 'Causa retirada.')}
              opcoes={(Object.keys(CAUSAS) as CausaRaiz[]).map((k) => [k, CAUSAS[k]])} />
          </Linha>
          <Linha rotulo="Jira">
            <input value={jira} onChange={(e) => setJira(e.target.value)} onBlur={salvarJira} maxLength={80}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
              placeholder="SCRUM-1318" aria-label="Card no Jira"
              className="w-full h-8 -ml-2 px-2 rounded-[6px] bg-transparent text-[13px] text-surface-100 placeholder:text-surface-400 hover:bg-[var(--rowhover)] focus:bg-surface-800 focus:outline-none" />
          </Linha>
        </div>
        <p className="text-[11px] text-surface-500">Agrupar em problema e ligar ao teste de regressão chega na SCRUM-1387.</p>
      </div>
    </div>
  )
}

const COLUNA_ATE: Record<Relogio, 'primeiraRespostaAte' | 'triagemAte' | 'contornoAte' | 'solucaoAte'> = {
  primeiraResposta: 'primeiraRespostaAte', triagem: 'triagemAte', contorno: 'contornoAte', solucao: 'solucaoAte',
}
const COLUNA_EM: Record<Relogio, 'primeiraRespostaEm' | 'triagemEm' | 'contornoEm' | 'solucaoEm'> = {
  primeiraResposta: 'primeiraRespostaEm', triagem: 'triagemEm', contorno: 'contornoEm', solucao: 'solucaoEm',
}

/** Contorno é masculino; 1ª resposta, triagem e solução, femininos. */
const FEMININO: Record<Relogio, boolean> = { primeiraResposta: true, triagem: true, contorno: false, solucao: true }

/** Um relógio: feito (quando), parado, vence em… ou vencido. */
function Prazo({ c, relogio, agora }: { c: ChamadoDaEquipe; relogio: Relogio; agora: number }) {
  const feito = c.sla[COLUNA_EM[relogio]]
  const ate = c.sla[COLUNA_ATE[relogio]]
  const a = FEMININO[relogio] ? 'a' : 'o'
  if (feito) return <span className="text-[13px] text-success">feit{a} {dataCurta(feito)}</span>
  if (!ate) return <span className="text-[13px] text-surface-400">—</span>
  if (c.sla.pausadoDesde) return <span className="text-[13px] text-surface-300">parado</span>
  const vencido = new Date(ate).getTime() < agora
  const perto = c.proximoPrazo?.relogio === relogio && c.proximoPrazo.perto
  return (
    <span className={cn('text-[13px]', vencido ? 'text-danger font-semibold' : perto ? 'text-warning font-semibold' : 'text-surface-100')}>
      {vencido ? `vencid${a} ${relativo(ate, agora)}` : relativo(ate, agora)}
    </span>
  )
}

/** O que quem reportou disse (fatos, nunca gravidade) e o contexto do chamado. */
function DadosDoChamado({ c }: { c: ChamadoDaEquipe }) {
  const linhas: Array<[string, ReactNode]> = [['Empresa', c.tenantNome]]
  if (c.contatoNome) linhas.push(['Contato', c.contatoNome])
  linhas.push(['Aberto por', c.relatores > 1 ? `${c.abertoPor} (+${c.relatores - 1} relataram)` : c.abertoPor], ['Canal', canalDe(c)])
  if (c.tipoDePedido) {
    linhas.push(['Tipo', TIPOS_DE_PEDIDO[c.tipoDePedido].nome], ['Vai para', TIPOS_DE_PEDIDO[c.tipoDePedido].destino])
  } else {
    linhas.push(['Sobre', `${ORIGENS_DO_PROBLEMA[c.origemDoProblema]}${c.origemNome ? ` · ${c.origemNome}` : ''}`])
    linhas.push(['Assunto', c.assunto?.titulo ?? 'não informado'])
  }
  if (c.ondeAconteceu) linhas.push(['Onde', c.ondeAconteceu])
  const f = c.fatos
  if (f?.contornou) linhas.push(['Contornou', CONTORNOU[f.contornou]])
  if (f?.quemMais) linhas.push(['Mais alguém', QUEM_MAIS[f.quemMais]])
  if (f?.impede?.length) linhas.push(['Impede agora', f.impede.map((i) => IMPEDE_AGORA[i]).join(', ')])
  if (f?.contatoViu) linhas.push(['Contato viu', CONTATO_VIU[f.contatoViu]])
  if (f?.jaCorrigiram) linhas.push(['Corrigiram', JA_CORRIGIRAM[f.jaCorrigiram]])
  if (c.alcance && !c.tipoDePedido) linhas.push(['Alcance', ALCANCES[c.alcance].conversa])
  if (c.conversasAfetadas.length) linhas.push(['Afetadas', c.conversasAfetadas.map((x) => x.contatoNome).join(', ')])
  if (c.desdeQuando) linhas.push(['Desde', DESDE_QUANDO[c.desdeQuando]])
  if (c.dadosDeTerceiros) linhas.push(['Atenção', <span key="t" className="text-danger font-semibold">dados de terceiros</span>])
  for (const x of c.camposExtras) linhas.push([x.rotulo, x.valor])
  if (c.anexos.length) {
    linhas.push(['Anexos', (
      <span key="a" className="flex flex-col gap-1">
        {c.anexos.map((a) => (
          <button key={a.id} type="button" className="inline-flex items-center gap-1 text-left text-accent-dark hover:underline break-all"
            onClick={() => { adminSupportApi.baixarAnexo(c.id, a.id, a.nome).catch((err) => showToast(getApiErrorMessage(err, 'Não foi possível baixar o anexo.'), 'error')) }}>
            <Paperclip className="w-3 h-3 flex-shrink-0" aria-hidden />{a.nome}
          </button>
        ))}
      </span>
    )])
  }
  return (
    <dl className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1.5 text-xs">
      {linhas.map(([r, v]) => (
        <Fragment key={r}><dt className="text-surface-400">{r}</dt><dd className="text-surface-100 min-w-0 break-words">{v}</dd></Fragment>
      ))}
    </dl>
  )
}
