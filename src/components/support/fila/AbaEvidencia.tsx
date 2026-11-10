import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ErrorState } from '@/components/ui/ErrorState'
import { showToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'
import { adminSupportApi } from '@/services/supportApi'
import type { ChamadoDaEquipe, EvidenciaDoChamado, EvidenciasDoChamado, StatusDaEvidencia } from '@/types/support'
import { SupportChip } from '../SupportChip'
import { MensagensMarcadas } from '../SupportPieces'
import { dataCurta } from '../supportModel'
import { Detalhes, LinhaDoTempoDoTurno, type TurnoGravado } from './LinhaDoTempoDoTurno'

const NOME_DO_COLETOR: Record<string, string> = {
  'ia-turno': 'Turno da IA',
  'linha-do-tempo': 'Linha do tempo da conversa',
  entrega: 'Entrega no WhatsApp',
  origem: 'Automação ou regra',
  'contexto-da-plataforma': 'Retrato da plataforma na abertura',
  anomalia: 'Sinal automático',
  'atividade-do-servidor': 'Erros do servidor (15 min antes)',
}
const ORDEM = ['ia-turno', 'anomalia', 'linha-do-tempo', 'entrega', 'origem', 'atividade-do-servidor', 'contexto-da-plataforma']
const SITUACAO: Record<StatusDaEvidencia, { nome: string; tom: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }> = {
  coletando: { nome: 'coletando', tom: 'info' },
  pronta: { nome: 'pronta', tom: 'success' },
  parcial: { nome: 'parcial', tom: 'warning' },
  indisponivel: { nome: 'indisponível', tom: 'danger' },
  expirada: { nome: 'expirada', tom: 'neutral' },
  removida: { nome: 'removida (LGPD)', tom: 'neutral' },
}

/**
 * Aba EVIDÊNCIA da fila (SCRUM-1384): o que foi coletado no chamado — turno da
 * IA, linha do tempo, entrega, automação/regra e o retrato da plataforma.
 * Cada abertura desta aba fica registrada no backend (acesso de suporte), por
 * isso ela busca só ao abrir e no "Tentar de novo", nunca na atualização periódica.
 */
export function AbaEvidencia({ c }: { c: ChamadoDaEquipe }) {
  const [estado, setEstado] = useState<{ id: string; pedido: number; dados: EvidenciasDoChamado | null; erro: boolean } | null>(null)
  const [pedido, setPedido] = useState(0)
  useEffect(() => {
    let vivo = true
    adminSupportApi.evidencia(c.id)
      .then((dados) => { if (vivo) setEstado({ id: c.id, pedido, dados, erro: false }) })
      .catch(() => { if (vivo) setEstado({ id: c.id, pedido, dados: null, erro: true }) })
    return () => { vivo = false }
  }, [c.id, pedido])
  const atual = estado?.id === c.id && estado.pedido === pedido ? estado : null

  const evidencias = [...(atual?.dados?.evidencias ?? [])].sort((a, b) => {
    const ia = ORDEM.indexOf(a.coletor), ib = ORDEM.indexOf(b.coletor)
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
  })

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] text-surface-400">
        Dados pessoais mascarados. O retrato fica no chamado por 90 dias, mesmo depois que o turno gravado expira. Esta leitura fica registrada.
      </p>
      {c.mensagens.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-400">Mensagens marcadas</h3>
          <MensagensMarcadas mensagens={c.mensagens} />
        </div>
      )}
      {!atual ? (
        <p className="text-xs text-surface-400" role="status">Carregando a evidência…</p>
      ) : atual.erro ? (
        <ErrorState compact title="Não foi possível abrir a evidência" onRetry={() => setPedido((v) => v + 1)} />
      ) : evidencias.length === 0 ? (
        <p className="text-xs text-surface-400">Nada coletado ainda. A coleta roda em segundo plano logo depois da abertura.</p>
      ) : (
        evidencias.map((e) => (e.coletor === 'ia-turno' && e.secoes
          ? <TurnoDaEvidencia key={e.id} c={c} e={e} replay={atual.dados?.replayHabilitado !== false} />
          : <ColetorDaEvidencia key={e.id} e={e} />))
      )}
    </div>
  )
}

/** O turno da IA, com "Repetir o turno" (custa IA: pede motivo, e o backend só aceita com a configuração ligada). */
function TurnoDaEvidencia({ c, e, replay }: { c: ChamadoDaEquipe; e: EvidenciaDoChamado; replay: boolean }) {
  const [pedindoMotivo, setPedindoMotivo] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [repetindo, setRepetindo] = useState(false)
  const [resultado, setResultado] = useState<Record<string, unknown> | null>(null)
  const repetivel = e.status === 'pronta' || e.status === 'parcial'
  const repetir = async () => {
    setRepetindo(true)
    try {
      setResultado(await adminSupportApi.repetirTurno(c.id, e.id, motivo.trim()))
      setPedindoMotivo(false)
      setMotivo('')
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Não foi possível repetir o turno.'), 'error')
    } finally {
      setRepetindo(false)
    }
  }
  return (
    <div className="flex flex-col gap-2">
      {/* Auditoria de UX de 28/10: com a repetição desligada (custa IA), o botão levava a um erro. */}
      <LinhaDoTempoDoTurno turno={e.secoes as TurnoGravado} acoes={repetivel ? (replay ? (
        <Button size="sm" variant="ghost" leftIcon={<RotateCcw className="w-3.5 h-3.5" />} onClick={() => setPedindoMotivo((v) => !v)} aria-expanded={pedindoMotivo}>
          Repetir o turno
        </Button>
      ) : (
        <span className="text-[11px] text-surface-400" title="A repetição chama o modelo de verdade; o super_admin liga na configuração do suporte.">
          Repetir o turno: desligado (custa IA)
        </span>
      )) : undefined} />
      {pedindoMotivo && (
        <div className="sup-cartao px-4 py-3 flex flex-col gap-2">
          <p className="text-xs text-surface-300">Repete o turno com as ferramentas respondendo pelo que foi gravado (nada é executado de novo). Custa IA e fica registrado.</p>
          <Input size="sm" value={motivo} onChange={(ev) => setMotivo(ev.target.value)} maxLength={500} placeholder="Motivo (ex.: conferir se o ajuste no cadastro resolve)" aria-label="Motivo para repetir o turno" />
          <div className="flex gap-1.5">
            <Button size="sm" disabled={motivo.trim().length < 5} loading={repetindo} onClick={() => void repetir()}>Repetir</Button>
            <Button size="sm" variant="neutral" onClick={() => setPedindoMotivo(false)}>Cancelar</Button>
          </div>
        </div>
      )}
      {resultado && (
        <div className="sup-cartao px-4 py-3">
          <p className="text-xs font-semibold text-surface-100">Resultado da repetição</p>
          <Detalhes dados={resultado} rotulo="Ver o resultado" />
        </div>
      )}
    </div>
  )
}

/** Os outros coletores: título, situação, um resumo e o retrato dobrável. */
function ColetorDaEvidencia({ e }: { e: EvidenciaDoChamado }) {
  const s = (e.secoes ?? {}) as Record<string, unknown>
  const contagem = (k: string) => (Array.isArray(s[k]) ? (s[k] as unknown[]).length : null)
  const resumo = e.coletor === 'contexto-da-plataforma'
    ? [`${contagem('incidentes') ?? 0} incidente(s)`, `${contagem('avisosDaMeta') ?? 0} aviso(s) da Meta`, `${contagem('linhas') ?? 0} linha(s)`].join(' · ')
    : e.coletor === 'linha-do-tempo'
      ? [`${contagem('mensagens') ?? 0} mensagem(ns)`, contagem('turnosDaIa') !== null ? `${contagem('turnosDaIa')} turno(s) da IA` : null,
        contagem('turnosSemResposta') ? `${contagem('turnosSemResposta')} sem resposta` : null].filter(Boolean).join(' · ')
      : e.coletor === 'atividade-do-servidor'
        ? [`${contagem('erros') ?? 0} erro(s) de quem abriu`, (e.refs as { ligadosAoNavegador?: number } | null)?.ligadosAoNavegador
          ? `${(e.refs as { ligadosAoNavegador: number }).ligadosAoNavegador} ligado(s) às falhas do navegador` : null].filter(Boolean).join(' · ')
        : contagem('mensagens') !== null ? `${contagem('mensagens')} mensagem(ns)` : null
  const situacao = SITUACAO[e.status] ?? SITUACAO.pronta
  return (
    <section className="sup-cartao px-4 py-3 flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-semibold text-surface-100">{NOME_DO_COLETOR[e.coletor] ?? e.coletor}</span>
        <SupportChip tom={situacao.tom}>{situacao.nome}</SupportChip>
        {e.coletadaEm && <span className="text-[11px] text-surface-400 ml-auto">{dataCurta(e.coletadaEm)}</span>}
      </div>
      {resumo && <p className="text-xs text-surface-300">{resumo}</p>}
      {e.erro && <p className="text-xs text-warning break-words">{e.erro}</p>}
      {e.secoes && <Detalhes dados={e.secoes} />}
    </section>
  )
}
