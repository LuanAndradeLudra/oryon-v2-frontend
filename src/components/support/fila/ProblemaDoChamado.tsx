import { useState } from 'react'
import { Download, FlaskConical, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { showToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'
import { adminSupportApi, type MudancaNoProblema } from '@/services/supportApi'
import type { ChamadoDaEquipe, ProblemaCompleto, ResumoDoProblema, StatusDoProblema } from '@/types/support'
import { EscolhaEmLinha, Linha } from '../ReportTicketPanel'
import { dataCurta } from '../supportModel'
import {
  CAUSAS, STATUS_DO_PROBLEMA, STATUS_NA_FILA, alcanceDoProblema, ehConflito, resumoDoProblema, type CausaRaiz,
} from './modeloDaFila'

/**
 * PROBLEMA do chamado (SCRUM-1387): vários chamados, o mesmo defeito. Sem
 * problema, as sugestões pela assinatura ("Parece com PRB-0007") e "Problema
 * novo"; vincular é sempre manual e fica no histórico do chamado. Com
 * problema: status, causa e Jira DO PROBLEMA (salvos na hora), o candidato a
 * teste de regressão e desvincular. Só a equipe vê; a empresa nunca.
 */
export function ProblemaDoChamado({ c, sugeridos, onAtualizar, onRecarregar, onAbrir }: {
  c: ChamadoDaEquipe
  sugeridos: ResumoDoProblema[] | null
  onAtualizar: (c: ChamadoDaEquipe) => void
  onRecarregar: () => void
  onAbrir: (id: string) => void
}) {
  const [ocupado, setOcupado] = useState(false)
  // O formulário do problema novo fica preso ao chamado de onde partiu.
  const [novo, setNovo] = useState<{ de: string; titulo: string } | null>(null)
  const formulario = novo?.de === c.id ? novo : null

  const agir = async (acao: () => Promise<void>, falha: string) => {
    setOcupado(true)
    try {
      await acao()
    } catch (err) {
      showToast(getApiErrorMessage(err, falha), 'error')
      if (ehConflito(err)) onRecarregar()
    } finally {
      setOcupado(false)
    }
  }
  const vincular = (problemaId: string | null, aviso: string) => agir(async () => {
    onAtualizar(await adminSupportApi.vincularProblema(c.id, problemaId, c.version))
    showToast(aviso, 'success')
  }, 'Não foi possível salvar o vínculo. Tente de novo.')
  const criar = () => agir(async () => {
    onAtualizar(await adminSupportApi.criarProblema(c.id, formulario?.titulo.trim() || null, c.version))
    setNovo(null)
    showToast('Problema criado com este chamado.', 'success')
  }, 'Não foi possível criar o problema. Tente de novo.')

  if (c.problema) {
    return (
      <CartaoDoProblema key={c.problema.id} c={c} p={c.problema} ocupado={ocupado} onAtualizar={onAtualizar} onAbrir={onAbrir}
        onDesvincular={() => void vincular(null, `Desvinculado do ${c.problema!.numero}.`)} />
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {sugeridos && sugeridos.length > 0 && (
        <ul className="flex flex-col gap-1" aria-label="Problemas parecidos">
          {sugeridos.map((s) => (
            <li key={s.id} className="flex items-center gap-2 rounded-[6px] px-2 py-1.5 border border-surface-700">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-surface-100 line-clamp-2 break-words">Parece com <span className="font-mono font-semibold">{s.numero}</span> · {s.titulo}</p>
                <p className="text-[11px] text-surface-400">{alcanceDoProblema(s)} · {s.nomeDoStatus}</p>
              </div>
              <Button size="sm" variant="neutral" disabled={ocupado} onClick={() => void vincular(s.id, `Vinculado ao ${s.numero}.`)}
                aria-label={`Vincular ao ${s.numero}`}>Vincular</Button>
            </li>
          ))}
          <li className="text-[11px] text-surface-400">Só sugestão: vincular é manual e fica no histórico do chamado.</li>
        </ul>
      )}
      {formulario ? (
        <div className="flex flex-col gap-1.5">
          <Input size="sm" value={formulario.titulo} onChange={(e) => setNovo({ de: c.id, titulo: e.target.value })} maxLength={200} autoFocus
            placeholder="Título (opcional: origem e categoria)" aria-label="Título do problema"
            onKeyDown={(e) => { if (e.key === 'Enter') void criar(); if (e.key === 'Escape') setNovo(null) }} />
          <div className="flex gap-1.5">
            <Button size="sm" loading={ocupado} onClick={() => void criar()}>Criar e vincular</Button>
            <Button size="sm" variant="neutral" onClick={() => setNovo(null)}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setNovo({ de: c.id, titulo: '' })}
          className="self-start inline-flex items-center gap-1 text-xs font-semibold text-accent-dark hover:underline">
          <Plus className="w-3.5 h-3.5" aria-hidden />Problema novo
        </button>
      )}
    </div>
  )
}

/** O problema vinculado: status, causa e Jira dele, o candidato a teste e os chamados (N em M empresas). */
function CartaoDoProblema({ c, p, ocupado, onAtualizar, onAbrir, onDesvincular }: {
  c: ChamadoDaEquipe
  p: ResumoDoProblema
  ocupado: boolean
  onAtualizar: (c: ChamadoDaEquipe) => void
  onAbrir: (id: string) => void
  onDesvincular: () => void
}) {
  const [completo, setCompleto] = useState<ProblemaCompleto | null>(null)
  const [lista, setLista] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [rascunhoJira, setRascunhoJira] = useState<{ de: string; texto: string } | null>(null)
  const jira = rascunhoJira?.de === (p.jiraRef ?? '') ? rascunhoJira.texto : (p.jiraRef ?? '')

  const guardar = (novo: ProblemaCompleto) => {
    setCompleto(novo)
    onAtualizar({ ...c, problema: resumoDoProblema(novo) })
  }
  const atualizar = async (mudanca: MudancaNoProblema, aviso: string) => {
    setSalvando(true)
    try {
      guardar(await adminSupportApi.atualizarProblema(p.id, mudanca))
      showToast(aviso, 'success')
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Não foi possível salvar o problema. Tente de novo.'), 'error')
    } finally {
      setSalvando(false)
    }
  }
  const salvarJira = () => {
    const ref = jira.trim()
    if ((p.jiraRef ?? '') === ref) return
    void atualizar({ jiraRef: ref || null }, ref ? 'Card do Jira ligado ao problema.' : 'Card do Jira desligado do problema.')
  }
  const verChamados = async () => {
    if (lista) { setLista(false); return }
    try {
      setCompleto(await adminSupportApi.problema(p.id))
      setLista(true)
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Não foi possível abrir o problema.'), 'error')
    }
  }
  const gerar = async () => {
    setSalvando(true)
    try {
      guardar(await adminSupportApi.gerarFixture(p.id, c.id))
      showToast('Candidato a teste gerado. Baixe e leve à bateria de regressão.', 'success')
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Não foi possível gerar o candidato a teste.'), 'error')
    } finally {
      setSalvando(false)
    }
  }
  const baixar = () => {
    adminSupportApi.baixarFixture(p.id, p.numero)
      .catch((err) => showToast(getApiErrorMessage(err, 'Não foi possível baixar o candidato a teste.'), 'error'))
  }
  const daIa = c.origemDoProblema === 'ia'

  return (
    <section aria-label={`Problema ${p.numero}`} className="flex flex-col rounded-[8px] border border-surface-700 px-2.5 py-2">
      <p className="text-xs text-surface-100 break-words"><span className="font-mono font-semibold">{p.numero}</span> · {p.titulo}</p>
      <button type="button" onClick={() => void verChamados()} aria-expanded={lista}
        className="self-start text-[11px] text-surface-400 hover:text-surface-100 hover:underline">
        {alcanceDoProblema(p)} · {lista ? 'ocultar' : 'ver'}
      </button>
      {lista && completo && (
        <ul className="flex flex-col py-1" aria-label={`Chamados do ${p.numero}`}>
          {completo.lista.map((x) => (
            <li key={x.id}>
              <button type="button" onClick={() => onAbrir(x.id)} disabled={x.id === c.id}
                className="w-full text-left rounded-[6px] px-1.5 py-1 hover:bg-[var(--rowhover)] disabled:hover:bg-transparent text-[11px] text-surface-300 truncate">
                <span className="font-mono text-surface-100">{x.numero}</span> · {x.empresa} · {STATUS_NA_FILA[x.status]}{x.id === c.id ? ' · este' : ''}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Linha rotulo="Status">
        <EscolhaEmLinha<StatusDoProblema> rotulo="Status do problema" valor={p.status}
          onChange={(v) => { if (v && v !== p.status && !salvando) void atualizar({ status: v }, `Problema ${STATUS_DO_PROBLEMA[v].toLowerCase()}.`) }}
          opcoes={(Object.keys(STATUS_DO_PROBLEMA) as StatusDoProblema[]).map((s) => [s, STATUS_DO_PROBLEMA[s]])} />
      </Linha>
      <Linha rotulo="Causa">
        <EscolhaEmLinha<CausaRaiz> rotulo="Causa do problema" valor={p.causaRaiz} limpar
          onChange={(v) => { if (!salvando) void atualizar({ causaRaiz: v }, v ? 'Causa do problema registrada.' : 'Causa do problema retirada.') }}
          opcoes={(Object.keys(CAUSAS) as CausaRaiz[]).map((k) => [k, CAUSAS[k]])} />
      </Linha>
      <Linha rotulo="Jira">
        <input value={jira} onChange={(e) => setRascunhoJira({ de: p.jiraRef ?? '', texto: e.target.value })} onBlur={salvarJira} maxLength={40}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          placeholder="SCRUM-1318" aria-label="Card do Jira do problema"
          className="w-full h-8 -ml-2 px-2 rounded-[6px] bg-transparent text-[13px] text-surface-100 placeholder:text-surface-400 hover:bg-[var(--rowhover)] focus:bg-surface-800 focus:outline-none" />
      </Linha>
      <Linha rotulo="Teste" alinhar="start">
        <div className="flex flex-col gap-1 text-xs">
          {p.temFixture ? (
            <>
              <span className="text-surface-100">
                Candidato gerado{completo?.fixture ? ` (${completo.fixture.deChamado}, ${dataCurta(completo.fixture.geradaEm)})` : ''}
              </span>
              <span className="flex flex-wrap gap-x-3 gap-y-1">
                <button type="button" onClick={baixar} className="inline-flex items-center gap-1 font-semibold text-accent-dark hover:underline">
                  <Download className="w-3 h-3" aria-hidden />Baixar JSON
                </button>
                {daIa && (
                  <button type="button" disabled={salvando} onClick={() => void gerar()} className="text-left text-surface-400 hover:text-surface-100 hover:underline">
                    Gerar de novo deste chamado
                  </button>
                )}
              </span>
            </>
          ) : daIa ? (
            <button type="button" disabled={salvando} onClick={() => void gerar()}
              className="self-start inline-flex items-center gap-1 font-semibold text-accent-dark hover:underline">
              <FlaskConical className="w-3 h-3" aria-hidden />Gerar deste chamado
            </button>
          ) : (
            <span className="text-surface-400">Sai de um chamado sobre resposta da IA do problema.</span>
          )}
          <span className="text-[11px] text-surface-400">Corrigido só com o candidato a teste de regressão.</span>
        </div>
      </Linha>
      <button type="button" disabled={ocupado} onClick={onDesvincular}
        className="self-start mt-1 text-xs font-semibold text-surface-400 hover:text-surface-100 hover:underline">
        Desvincular este chamado
      </button>
    </section>
  )
}
