// B2 (SCRUM-928) — cabeçalho da ficha: título editável, valor (com origem —
// itens ou valor livre), stepper clicável, dono, previsão, probabilidade
// efetiva com override, funil, origem/ator do último movimento, e as ações
// Mover ▾ · Marcar ganho/perdido · ⋯ (transferir de funil, excluir).
import { useState } from 'react'
import {
  X, KanbanSquare, CheckCircle2, XCircle, MoreHorizontal,
  Trash2, ArrowRightLeft, Calendar, Percent,
} from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { UserPicker } from '@/components/ui/UserPicker'
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmModal } from '@/components/ui/Modal'
import { formatBRL } from '@/utils/money'
import { cn, formatRelativeTime, hexToRgba } from '@/lib/utils'
import { pipelineKindOption, pipelineKindOf, pipelineNoun, terminalLabelsOf } from '@/lib/pipelineKinds'
import { originInfo, humanDuration, timeInStage } from '@/lib/dealCard'
import { moveTargets } from '@/lib/contactPipelines'
import { dealProbability } from '@/lib/dealProbability'
import { DealProgress } from './DealProgress'
import type { Deal, DealStageHistoryEntry, Pipeline, PipelineStage, User } from '@/types'

interface DealDetailHeaderProps {
  deal: Deal
  pipeline: Pipeline
  pipelines: Pipeline[]
  users: User[]
  lastMovedLabel: string | null
  /** Passagens de etapa, do `history` que o painel já busca. Alimentam o herói
   *  do processo (quantas) e a linha do tempo (quando entrou em cada etapa). */
  history?: DealStageHistoryEntry[] | null
  onPatch: (patch: Partial<Deal> & { updateAmount?: boolean }) => Promise<void>
  onMoveToStage: (stage: PipelineStage) => void
  onTransferPipeline: (pipelineId: string) => void
  onDelete: () => void
  onClose?: () => void
  /** Leva ao QUADRO do funil com a ficha em cima. Ausente = já está lá. */
  onOpenBoard?: () => void
}

function InlineEditTitle({ value, onSave }: { value: string; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (draft.trim() === value || !draft.trim()) { setEditing(false); setDraft(value); return }
    setSaving(true)
    try { await onSave(draft.trim()); setEditing(false) } finally { setSaving(false) }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
          onBlur={handleSave}
          aria-label="Título do negócio"
          className="bg-surface-800 border border-brand-500/50 rounded-lg px-2 py-1 text-lg font-semibold text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 min-w-0 flex-1"
        />
        {saving && <span className="text-xs text-surface-500">salvando…</span>}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => { setDraft(value); setEditing(true) }}
      data-testid="deal-title"
      className="group flex items-center gap-1.5 text-left min-w-0"
    >
      <span className="text-lg font-semibold text-surface-50 truncate group-hover:text-brand-300 transition-colors">{value}</span>
    </button>
  )
}

export function DealDetailHeader({
  deal, pipeline, pipelines, users, lastMovedLabel, history, onPatch, onMoveToStage, onTransferPipeline, onDelete, onClose, onOpenBoard,
}: DealDetailHeaderProps) {
  const [ownerPickerOpen, setOwnerPickerOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [probEditing, setProbEditing] = useState(false)
  const [probDraft, setProbDraft] = useState('')

  const isSales = pipelineKindOf(pipeline) === 'sales'
  const kindOption = pipelineKindOption(pipelineKindOf(pipeline))
  const KindIcon = kindOption.icon
  const labels = terminalLabelsOf(pipeline)
  const stage = pipeline.stages.find((s) => s.id === deal.stageId) ?? null
  const targets = moveTargets(pipeline, deal.stageId)
  const wonStage = targets.terminal.find((s) => s.isWon)
  const lostStage = targets.terminal.find((s) => s.isLost)
  const owner = users.find((u) => u.id === deal.ownerUserId) ?? null
  const origin = originInfo(deal)
  const noun = pipelineNoun(pipeline)

  /**
   * Idade e tempo na etapa — a métrica-herói do PROCESSO.
   *
   * `timeInStage` já devolve a frase pronta ("2 dias na etapa"), e é o que a
   * linha de metadados usava. Aqui ela é dividida em duas leituras: o número
   * grande é a IDADE do registro (aberto há quanto), e a linha de apoio é o
   * tempo na etapa atual — que é o que denuncia o processo parado.
   */
  const agora = Date.now()
  const nascido = deal.createdAt ? new Date(deal.createdAt).getTime() : NaN
  const idade = Number.isFinite(nascido) ? humanDuration(Math.max(0, agora - nascido)) : null
  const naEtapa = timeInStage(deal, agora)
  const tempoNaEtapa = naEtapa ? naEtapa.replace(' na etapa', ' nesta etapa') : null
  // Quantas vezes o registro mudou de etapa — o "andou/não andou" em número.
  const passagens = history?.length ?? null
  const prob = dealProbability(deal, stage)
  const itemCount = deal.lineItems?.length ?? 0
  const otherPipelines = pipelines.filter((p) => p.id !== pipeline.id && !p.isArchived)

  const handleOwnerSelect = async (user: User | null) => {
    await onPatch({ ownerUserId: user?.id ?? null })
  }

  const handleExpectedCloseChange = async (v: string) => {
    await onPatch({ expectedCloseAt: v ? new Date(`${v}T00:00:00Z`).toISOString() : null })
  }

  const handleProbabilitySave = async () => {
    const trimmed = probDraft.trim()
    setProbEditing(false)
    if (trimmed === '') { await onPatch({ probability: null }); return }
    const n = Number(trimmed)
    if (!Number.isFinite(n) || n < 0 || n > 100) return
    await onPatch({ probability: Math.round(n) })
  }

  return (
    <div className="px-5 py-4 border-b border-surface-800 flex-shrink-0 flex flex-col gap-3">
      {/* Linha 1 — título + fechar/expandir */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <InlineEditTitle value={deal.title} onSave={(title) => onPatch({ title })} />
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-800 border border-surface-700 text-surface-300"
              title={kindOption.description}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: pipeline.color }} />
              <KindIcon className="w-3 h-3" /> {pipeline.name}
            </span>
            {/* A ETAPA, em texto, ao lado do funil.
                A forma do progresso (funil ou linha do tempo) mostra onde o
                registro está, mas exige decodificar: comparar preenchimentos
                para achar a barra acesa. Dizer o nome resolve em uma leitura, e
                é a mesma dupla que o quadro e a tabela já mostram — funil e
                etapa, lado a lado. */}
            {stage && deal.status === 'open' && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                style={{
                  color: stage.color,
                  borderColor: hexToRgba(stage.color, 0.4),
                  backgroundColor: hexToRgba(stage.color, 0.12),
                }}
                data-testid="deal-current-stage"
                title={`Etapa atual${tempoNaEtapa ? ` — ${tempoNaEtapa}` : ''}`}
              >
                {stage.label}
              </span>
            )}
            {deal.status !== 'open' && (
              <span className={cn(
                'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                deal.status === 'won' ? 'text-status-active border-status-active/40 bg-status-active-bg' : 'text-surface-400 border-surface-700 bg-surface-800',
              )}>
                {deal.status === 'won' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {deal.status === 'won' ? labels.won : labels.lost}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* "Abrir como página" saiu (10/09) e deu lugar a "Ver no funil".

              O expandir levava à MESMA ficha, só que ocupando a tela — mais
              espaço para o conteúdo que já estava visível, e ao custo de sair
              da tela onde se estava. A pergunta que o operador tem aqui não é
              "quero isto maior", é "onde este negócio está no funil" — e essa
              a ficha sozinha não responde. É a mesma decisão que a B2 já tinha
              tomado no painel do contato, onde "No funil" convive com a ficha. */}
          {onOpenBoard && (
            <button
              type="button"
              onClick={onOpenBoard}
              title="Abrir o quadro deste funil com a ficha em cima — sai desta tela"
              aria-label="Ver no funil"
              data-testid="deal-open-board"
              className="inline-flex items-center gap-1.5 h-7 px-2 rounded-lg text-xs font-medium text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-all"
            >
              <KanbanSquare className="w-3.5 h-3.5" /> No funil
            </button>
          )}
          {onClose && (
            <button type="button" onClick={onClose} title="Fechar" aria-label="Fechar" className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Linha 2 — a métrica-herói.
          O que a ficha responde primeiro depende do TIPO. Um negócio existe
          para valer dinheiro; um registro de processo existe para ANDAR — e a
          pergunta dele é "está parado?". Os dois dados já eram calculados, mas
          moravam em 12 px no meio de quatro metadados (o valor) e em 11 px no
          rodapé (o tempo). Trocar o corpo e a posição é o que faz um drawer
          não se confundir com o outro à distância de leitura. */}
      <div className="flex items-end gap-4 flex-wrap" data-testid="deal-hero">
        {isSales ? (
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-3xs font-mono uppercase tracking-wider text-surface-500">
              Valor do {noun}
            </span>
            {itemCount > 0 ? (
              <>
                <span className="font-display text-3xl font-bold text-surface-50 tabular-nums tracking-tight leading-none" data-testid="deal-amount">
                  {formatBRL(deal.amountCents)}
                </span>
                <span className="text-[11px] text-surface-500 mt-1">
                  = soma de {itemCount} {itemCount === 1 ? 'item' : 'itens'}
                </span>
              </>
            ) : (
              <div data-testid="deal-amount">
                <MoneyInput
                  value={deal.amountCents}
                  onChange={(cents) => void onPatch({ amountCents: cents, updateAmount: false })}
                  aria-label={`Valor do ${noun}`}
                  className="h-11 !text-2xl font-display font-bold text-surface-50 w-48"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 min-w-0" data-testid="deal-age">
            <span className="text-3xs font-mono uppercase tracking-wider text-surface-500">
              {deal.status === 'open' ? 'Aberto há' : 'Encerrado'}
            </span>
            <span className="font-display text-3xl font-bold text-surface-50 tracking-tight leading-none">
              {idade ?? '—'}
            </span>
            {tempoNaEtapa && (
              <span className="text-[11px] text-surface-500 mt-1">{tempoNaEtapa}</span>
            )}
          </div>
        )}

        {/* Coluna secundária: o que qualifica o herói, não o que compete com ele.

            Dono, previsão e origem subiram para cá (10/09). Eram duas linhas
            soltas abaixo da trilha, e o cabeçalho lia como uma pilha: herói,
            faixa de etapas, dono, origem, ações — cinco blocos empilhados antes
            do conteúdo começar. Agora o canto direito reúne TUDO que qualifica
            o negócio, de frente para o valor no canto esquerdo, e o cabeçalho
            perde duas linhas de altura.

            Numa linha só, com separadores: empilhar aqui recriaria o problema
            que a mudança resolve. Cada item é `whitespace-nowrap` e o nome do
            dono trunca — assim a linha encolhe em vez de quebrar. */}
        <div className="ml-auto flex flex-col items-end gap-1.5 min-w-0 text-[11.5px] text-surface-400">
          <div className="flex items-center gap-2 min-w-0 text-[11px] text-surface-500">
            <UserPicker
              open={ownerPickerOpen}
              onClose={() => setOwnerPickerOpen(false)}
              users={users}
              selectedUserId={owner?.id}
              onSelect={handleOwnerSelect}
              anchor={
                <button
                  type="button"
                  onClick={() => setOwnerPickerOpen((v) => !v)}
                  data-testid="deal-owner"
                  title="Dono do negócio — clique para trocar"
                  className="inline-flex items-center gap-1.5 min-w-0 max-w-[11rem] hover:opacity-80 transition-opacity"
                >
                  {owner ? (
                    <>
                      <Avatar name={`${owner.firstName} ${owner.lastName}`} size="xs" kind="operator" />
                      <span className="text-surface-300 font-medium truncate">{owner.firstName} {owner.lastName}</span>
                    </>
                  ) : (
                    <span className="text-surface-500 italic whitespace-nowrap">sem dono</span>
                  )}
                </button>
              }
            />

            <span className="w-px h-3 bg-surface-800 shrink-0" aria-hidden />

            <span className="inline-flex items-center gap-1.5 shrink-0" title="Previsão de fechamento">
              <Calendar className="w-3.5 h-3.5 text-surface-500" />
              <input
                type="date"
                aria-label={isSales ? 'Previsão de fechamento' : 'Previsão de conclusão'}
                data-testid="deal-expected-close"
                value={deal.expectedCloseAt ? deal.expectedCloseAt.slice(0, 10) : ''}
                onChange={(e) => void handleExpectedCloseChange(e.target.value)}
                className="bg-transparent text-surface-300 text-[11px] outline-none border-b border-transparent hover:border-surface-700 focus:border-brand-500 transition-colors"
              />
            </span>

            <span className="w-px h-3 bg-surface-800 shrink-0" aria-hidden />

            {/* "movido por" e "atualizado há" saíram do texto e viraram `title`:
                cabiam na linha antiga, que era larga, e não cabem nesta sem
                empurrar o resto. O que a linha mostra é a ORIGEM, que é o dado
                estável; o resto é histórico e tem aba própria. */}
            <span
              className="inline-flex items-center gap-1.5 shrink-0"
              data-testid="deal-origin"
              title={`Origem: ${origin.label}${lastMovedLabel ? ` · movido por ${lastMovedLabel}` : ''}${deal.updatedAt ? ` · ${formatRelativeTime(deal.updatedAt)}` : ''}`}
            >
              <origin.icon className="w-3 h-3" /> {origin.label}
            </span>
          </div>
          {isSales ? (
            <>
              <span className="flex items-center gap-1.5" data-testid="deal-probability">
                probabilidade
                {probEditing ? (
                  <input
                    autoFocus
                    type="number"
                    min={0}
                    max={100}
                    value={probDraft}
                    onChange={(e) => setProbDraft(e.target.value)}
                    onBlur={handleProbabilitySave}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleProbabilitySave(); if (e.key === 'Escape') setProbEditing(false) }}
                    className="w-14 bg-surface-800 border border-brand-500/50 rounded px-1.5 py-0.5 text-xs text-surface-100"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => { setProbDraft(deal.probability != null ? String(deal.probability) : ''); setProbEditing(true) }}
                    className="font-semibold text-surface-100 tabular-nums hover:text-brand-300 transition-colors"
                    title={deal.probability != null ? 'Override deste negócio' : 'Herdada da etapa — clique para sobrescrever'}
                  >
                    {prob.effective != null ? `${prob.effective}%` : '— não configurada'}
                    {deal.probability != null && <span className="text-surface-500 font-normal"> (override)</span>}
                  </button>
                )}
              </span>
              {prob.configured && (
                <span title="Valor × probabilidade efetiva">
                  ponderado <b className="font-semibold text-surface-100 tabular-nums">{formatBRL(prob.weightedAmountCents)}</b>
                </span>
              )}
            </>
          ) : (
            <>
              <span>
                passagens <b className="font-semibold text-surface-100 tabular-nums">{passagens ?? '—'}</b>
              </span>
              {/* A previsão saiu daqui: agora é da linha de qualificadores no
                  topo desta coluna, uma só para os dois tipos de funil. Antes
                  ela vivia em dois lugares diferentes conforme o tipo, com dois
                  `data-testid` iguais no mesmo documento quando os dois ramos
                  chegavam a coexistir. */}
            </>
          )}
        </div>
      </div>

      {/* Linha 3 — o caminho do negócio, e o CONTROLE de onde ele está.

          Ganhou banda própria (10/09). Antes ela vinha achatada dentro do
          cabeçalho — sem fundo, sem borda, sem recuo — e lia como enfeite: o
          operador não descobria que arrastar/clicar ali move o negócio. Numa
          ficha em que quase tudo é texto, o único jeito de dizer "isto se
          opera" é dar superfície e moldura, como se dá a um seletor.

          O rótulo acima não é redundante: ele nomeia a faixa e diz, em quatro
          palavras, o que fazer com ela. Instrução curta uma vez vale mais que
          um tooltip que só aparece depois da dúvida. */}
      {deal.status === 'open' && (
        <div className="flex flex-col gap-1.5 rounded-xl border border-surface-700 bg-surface-900/60 px-3 py-2.5" data-testid="deal-progress-band">
          <span className="text-3xs font-semibold uppercase tracking-wider text-surface-500">
            Etapa <span className="font-normal normal-case tracking-normal text-surface-600">· clique para mover</span>
          </span>
          <DealProgress pipeline={pipeline} deal={deal} history={history} onMoveToStage={onMoveToStage} tempoNaEtapa={tempoNaEtapa} />
        </div>
      )}

      {/* Linha 6 — ações */}
      <div className="flex items-center gap-2">
        {/* O menu "Mover ▾" saiu (10/09): a própria trilha/linha do tempo logo
            acima já move — clicar numa etapa chama o mesmo `onMoveToStage`.
            Eram duas portas para a mesma ação, e a de baixo era a pior: um
            menu de texto ao lado de um desenho que mostra ONDE o negócio está
            e para onde ele pode ir.

            Vale nos dois tipos de ficha: a linha do tempo do processo move
            pelo clique na etapa, e a trilha da venda move pelo `onSelect` —
            inclusive quando ela encolhe e vira "+N", porque o menu do grupo
            lista TODAS as etapas. Nenhuma etapa fica inalcançável.

            Os terminais continuam com botão próprio ("Marcar ganho/perdido"):
            fechar não é mover, exige motivo e não é reversível pelo mesmo
            gesto. */}

        {deal.status === 'open' && wonStage && (
          <button
            type="button"
            onClick={() => onMoveToStage(wonStage)}
            data-testid="deal-mark-won"
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium text-status-active hover:bg-status-active-bg transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Marcar {labels.won.toLowerCase()}
          </button>
        )}
        {deal.status === 'open' && lostStage && (
          <button
            type="button"
            onClick={() => onMoveToStage(lostStage)}
            data-testid="deal-mark-lost"
            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium text-surface-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" /> Marcar {labels.lost.toLowerCase()}
          </button>
        )}

        <Dropdown
          open={moreOpen}
          onClose={() => setMoreOpen(false)}
          align="right"
          className="w-52"
          anchor={
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              title="Mais ações"
              aria-label="Mais ações"
              data-testid="deal-more-button"
              className="ml-auto p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-800 transition-all"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          }
        >
          <div className="px-1 py-1 flex flex-col gap-0.5">
            <DropdownItem onClick={() => { setMoreOpen(false); setTransferOpen(true) }} disabled={otherPipelines.length === 0}>
              <ArrowRightLeft className="w-3.5 h-3.5" /> Transferir de funil
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem onClick={() => { setMoreOpen(false); setConfirmDelete(true) }} danger>
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </DropdownItem>
          </div>
        </Dropdown>
      </div>

      <TransferPipelineModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        pipelines={otherPipelines}
        onConfirm={onTransferPipeline}
      />

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => { setConfirmDelete(false); onDelete() }}
        title="Excluir negócio"
        description={`Tem certeza que deseja excluir "${deal.title}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
      />
    </div>
  )
}

/** Modal simples (não Dropdown) de propósito — evita o bug de ancorar um
 *  popover a um item de OUTRO menu que já fechou (posição instável). */
function TransferPipelineModal({
  open, onClose, pipelines, onConfirm,
}: {
  open: boolean
  onClose: () => void
  pipelines: Pipeline[]
  onConfirm: (pipelineId: string) => void
}) {
  const [pipelineId, setPipelineId] = useState('')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Transferir para outro funil"
      className="max-w-sm"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            type="button"
            variant="primary"
            disabled={!pipelineId}
            onClick={() => { if (pipelineId) { onConfirm(pipelineId); setPipelineId('') } }}
          >
            Transferir
          </Button>
        </div>
      }
    >
      <Select value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} aria-label="Funil de destino">
        <option value="">Escolha o funil…</option>
        {pipelines.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </Select>
    </Modal>
  )
}
