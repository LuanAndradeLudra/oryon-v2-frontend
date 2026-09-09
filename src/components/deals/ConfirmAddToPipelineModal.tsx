import { useState, useEffect } from 'react'
import { User as UserIcon, ArrowRight, MessageSquare } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { pipelineKindOf, pipelineKindOption, pipelineNoun } from '@/lib/pipelineKinds'
import type { Pipeline } from '@/types'

/**
 * Confirmação do "Adicionar ao funil" em funil de PROCESSO.
 *
 * Até aqui o clique num funil do menu criava o registro na hora — o operador
 * via o resultado num toast, depois do fato. Em funil de venda o `NewDealDialog`
 * sempre serviu de confirmação; em processo não havia nenhuma, e o menu é uma
 * lista de funis parecidos: errar a linha adiciona o contato no funil errado.
 *
 * O que torna isso grave é que **não existe desfazer**: a API de negócios não
 * tem `delete`, e a única saída é mover o registro para uma etapa terminal —
 * que exige motivo de fechamento e deixa um registro cancelado no funil. Sem
 * reversão possível, a confirmação é a única proteção.
 *
 * É uma tela de LEITURA, não um formulário: mostra o que vai acontecer e
 * pergunta se é isso. Quem quer preencher título, escopo ou dono tem a saída
 * "Preencher detalhes…", que leva ao mesmo `NewDealDialog` — sem obrigar a
 * cancelar e recomeçar pelo outro item do menu.
 *
 * A dispensa ("não perguntar de novo neste funil") existe porque o acidente e
 * a repetição moram em funis diferentes: erra-se no funil que se usa pouco, e
 * repete-se no que se usa todo dia. Quem põe dezenas de pessoas por dia em
 * "Confirmação de consulta" marca a caixa uma vez e recupera o 1-clique.
 */
export interface ConfirmAddToPipelineModalProps {
  open: boolean
  onClose: () => void
  contactName: string
  pipeline: Pipeline | null
  /** Conversa de origem — quando existe, o registro nasce ligado a ela. */
  fromConversation?: boolean
  busy?: boolean
  onConfirm: (opts: { naoPerguntarMais: boolean }) => void
  /** Escape para o formulário completo, sem cancelar e recomeçar. */
  onDetails: () => void
}

function Linha({ icone, rotulo, valor }: { icone: React.ReactNode; rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 text-surface-500 shrink-0" aria-hidden>{icone}</span>
      <span className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[11px] text-surface-500">{rotulo}</span>
        <span className="text-sm text-surface-100 break-words">{valor}</span>
      </span>
    </div>
  )
}

export function ConfirmAddToPipelineModal({
  open,
  onClose,
  contactName,
  pipeline,
  fromConversation,
  busy,
  onConfirm,
  onDetails,
}: ConfirmAddToPipelineModalProps) {
  const [naoPerguntarMais, setNaoPerguntarMais] = useState(false)

  // O modal não desmonta entre aberturas: sem isto, a caixa marcada numa
  // confirmação chegaria marcada na próxima, para outro funil.
  useEffect(() => { if (open) setNaoPerguntarMais(false) }, [open])

  if (!pipeline) return null

  const opcao = pipelineKindOption(pipelineKindOf(pipeline))
  const Icone = opcao.icon
  const noun = pipelineNoun(pipeline)
  const primeira = pipeline.stages
    .slice()
    .sort((a, b) => a.order - b.order)
    .find((s) => !s.isWon && !s.isLost)

  const heading = (
    <div className="flex items-center gap-3 min-w-0">
      <span className="w-9 h-9 rounded-xl bg-surface-800 border border-surface-700 flex items-center justify-center flex-shrink-0">
        <Icone className="w-4 h-4 text-surface-300" aria-hidden />
      </span>
      <span className="flex flex-col min-w-0">
        <span className="text-base font-display font-semibold text-surface-50 leading-tight">
          Adicionar ao funil?
        </span>
        <span className="text-xs text-surface-400 truncate leading-tight mt-0.5">
          {opcao.label} · {pipeline.name}
        </span>
      </span>
    </div>
  )

  return (
    <Modal open={open} onClose={onClose} title={heading} className="max-w-md">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-surface-300">
          Um {noun} novo vai nascer em <strong className="font-semibold text-surface-100">{pipeline.name}</strong>.
        </p>

        <div className="rounded-xl border border-surface-700 bg-surface-800/40 px-3 divide-y divide-surface-800">
          <Linha
            icone={<UserIcon className="w-4 h-4" />}
            rotulo="Contato"
            valor={contactName || 'Contato sem nome'}
          />
          <Linha
            icone={<ArrowRight className="w-4 h-4" />}
            rotulo="Nasce na etapa"
            valor={primeira?.label ?? 'primeira etapa'}
          />
          {fromConversation && (
            <Linha
              icone={<MessageSquare className="w-4 h-4" />}
              rotulo="Origem"
              valor="Esta conversa — o registro nasce ligado a ela"
            />
          )}
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={naoPerguntarMais}
            onChange={(e) => setNaoPerguntarMais(e.target.checked)}
            className="w-4 h-4 rounded border-surface-600 bg-surface-800 accent-brand-500 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
          />
          <span className="text-xs text-surface-400">
            Não perguntar de novo em <span className="text-surface-300">{pipeline.name}</span>
          </span>
        </label>

        <div className="flex flex-col gap-2 border-t border-surface-800 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onDetails}
            className="self-start text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors cursor-pointer min-h-11 sm:min-h-0"
          >
            Preencher detalhes…
          </button>
          <div className="flex items-center gap-2 sm:justify-end">
            <Button variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
            <Button
              variant="neutral"
              loading={busy}
              onClick={() => onConfirm({ naoPerguntarMais })}
            >
              Adicionar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
