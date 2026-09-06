// ─── Caixa de transferências (A6 / SCRUM-1017) ───────────────────────────────
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GitBranch, Inbox, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Spinner } from '@/components/ui/Spinner'
import { ConfirmModal } from '@/components/ui/Modal'
import { useRegisterTopBarActions } from '@/contexts/TopBarActionsContext'
import { useToast } from '@/hooks/useToast'
import { handoffsApi } from '@/services/agentsOpsApi'
import { conversationsApi } from '@/services/api'
import type { HandoffItem, HandoffStatus } from '@/types/agentsOps'
import { HandoffKpis } from '@/components/agents/handoffs/HandoffKpis'
import { HandoffQueueChips } from '@/components/agents/handoffs/HandoffQueueChips'
import { HandoffRow } from '@/components/agents/handoffs/HandoffRow'
import {
  esperaAoVivo, useChipsDeFila, useHandoffQueue, useRelogioSla,
} from '@/components/agents/handoffs/useHandoffQueue'

const SEGMENTOS: Array<{ value: HandoffStatus; label: string }> = [
  { value: 'waiting', label: 'Aguardando' },
  { value: 'claimed', label: 'Em atendimento' },
  { value: 'resolved', label: 'Resolvidas hoje' },
]

export function HandoffInboxPage() {
  const [status, setStatus] = useState<HandoffStatus>('waiting')
  const [fila, setFila] = useState<string | undefined>()
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const [ocupada, setOcupada] = useState<string | null>(null)
  const [devolvendo, setDevolvendo] = useState<HandoffItem | null>(null)
  const { toast } = useToast()
  const navigate = useNavigate()

  const q = useHandoffQueue(status, fila)
  const { filas, mostrarContagem } = useChipsDeFila(q.itens, q.total)

  // O relógio só corre em "Aguardando": nos outros dois a espera é histórica e
  // congelada pelo BE.6, e vê-la subir seria mentira sobre conversa já atendida.
  const agora = useRelogioSla(status === 'waiting')

  const contagem = (s: HandoffStatus): number | undefined => {
    if (!q.resumo) return undefined
    if (s === 'waiting') return q.resumo.waiting
    if (s === 'claimed') return q.resumo.claimed
    // Badge só quando o campo existe de verdade (D31) — nunca "resolvidas de
    // sempre" com rótulo de "hoje".
    return typeof q.resumo.resolvedToday === 'number' ? q.resumo.resolvedToday : undefined
  }

  useRegisterTopBarActions(
    <div className="flex items-center gap-2">
      <SegmentedControl
        label="Estado das transferências"
        value={status}
        onChange={(v: HandoffStatus) => { setStatus(v); setSelecionada(null) }}
        options={SEGMENTOS.map((s) => ({
          value: s.value,
          label: s.label,
          count: contagem(s.value),
        }))}
      />
      <Button variant="secondary" size="sm" leftIcon={<GitBranch className="h-4 w-4" />}
              onClick={() => navigate('/agents')}>
        Regras
      </Button>
    </div>,
    [status, q.disponivel, q.resumo, navigate],
  )

  const acao = useCallback(async (item: HandoffItem, tipo: 'claim' | 'return') => {
    setOcupada(item.id)
    try {
      if (!item.id.startsWith('conv:')) {
        // Sem update otimista de propósito: o BE.6 devolve 409 quando outro
        // atendente ganhou a corrida, e otimismo mostraria "você assumiu" para
        // quem perdeu.
        if (tipo === 'claim') await handoffsApi.claim(item.id)
        else await handoffsApi.return(item.id)
      } else if (tipo === 'claim') {
        // Modo degradado: o id é `conv:<id>` e a ação vai pela conversa.
        await conversationsApi.assign(item.conversationId, null)
      } else {
        await conversationsApi.setAiPause(item.conversationId, null)
      }
      toast(tipo === 'claim' ? 'Conversa assumida.' : 'Conversa devolvida à IA.', 'success')
      q.recarregar()
    } catch (e) {
      const conflito = (e as { response?: { status?: number } })?.response?.status === 409
      toast(
        conflito ? 'Outro atendente já assumiu essa conversa.' : 'Não foi possível concluir a ação agora.',
        conflito ? 'info' : 'error',
      )
      // Em 409 a fila está desatualizada, então recarregar é parte da correção.
      if (conflito) q.recarregar()
    } finally {
      setOcupada(null)
      setDevolvendo(null)
    }
  }, [q, toast])

  return (
    <div className="flex h-full flex-col">
      {!q.disponivel && (
        <div className="flex items-start gap-2 border-b border-amber-500/20 bg-amber-500/10 px-6 py-2.5 text-3xs text-amber-200">
          <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {/* Silenciar isto seria mentir com número: neste modo a espera é
              aproximada e não existe SLA nenhum para comparar. */}
          <span>
            <b className="font-semibold">Fila em modo reduzido.</b>{' '}
            A caixa de transferências ainda não está ativa, então esta lista vem das conversas com a
            IA pausada: o tempo de espera é aproximado e não há SLA, indicadores nem filas.
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {q.resumo && <HandoffKpis resumo={q.resumo} />}

        {(filas.length > 0 || q.total > q.itens.length) && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <HandoffQueueChips
              filas={filas}
              mostrarContagem={mostrarContagem}
              selecionada={fila}
              onSelecionar={setFila}
            />
            <span className="shrink-0 text-3xs text-surface-500">
              {q.total > q.itens.length && `${q.itens.length} de ${q.total}`}
            </span>
          </div>
        )}

        <div role="listbox" aria-label="Transferências" className="mt-3 flex flex-col gap-1">
          {q.carregando && q.itens.length === 0 && (
            <div className="flex justify-center py-10"><Spinner /></div>
          )}

          {!q.carregando && q.erro && (
            <EmptyState icon={TriangleAlert} title="Não foi possível carregar a fila" hint={q.erro} />
          )}

          {!q.carregando && !q.erro && q.itens.length === 0 && (
            <EmptyState
              icon={Inbox}
              title={status === 'waiting' ? 'Ninguém esperando' : 'Nada por aqui'}
              hint={status === 'waiting'
                ? 'Quando a IA passar uma conversa para o time, ela aparece aqui.'
                : 'Nenhuma conversa neste estado agora.'}
            />
          )}

          {q.itens.map((item) => (
            <HandoffRow
              key={item.id}
              item={item}
              espera={status === 'waiting' ? esperaAoVivo(item, agora) : item.waitingSeconds}
              nomeDoAgente={item.agent?.id ? q.nomesDeAgente.get(item.agent.id) : null}
              selecionada={selecionada === item.id}
              ocupada={ocupada === item.id}
              onSelecionar={() => setSelecionada(item.id)}
              onAssumir={() => acao(item, 'claim')}
              onDevolver={status === 'resolved' ? undefined : () => setDevolvendo(item)}
            />
          ))}
        </div>
      </div>

      {/* "Devolver à IA" é destrutivo o bastante para confirmar: a conversa
          volta para o bot e o cliente deixa de falar com uma pessoa. Carta §5:
          destrutivo = ConfirmModal, nunca window.confirm. */}
      <ConfirmModal
        open={devolvendo !== null}
        title="Devolver à IA?"
        description={devolvendo
          ? `${devolvendo.contact.name} volta a ser atendido pelo agente de IA e sai desta fila.`
          : ''}
        confirmLabel="Devolver à IA"
        loading={ocupada !== null}
        onConfirm={() => { if (devolvendo) void acao(devolvendo, 'return') }}
        onClose={() => setDevolvendo(null)}
      />
    </div>
  )
}
