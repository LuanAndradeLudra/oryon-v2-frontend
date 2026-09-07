// ─── Card "N alterações não publicadas" (A2 / SCRUM-1013) ────────────────────
// Superfície que o botão "Alterações (N)" do TopBar REVELA. Mockup
// `p2a-agentes.html:142`: card com borda de marca, título contando as
// alterações, subtítulo, "Publicar" à direita e, embaixo, uma linha por campo
// alterado — chip com o acento da seção dona + o que mudou.
//
// Por que o card existe: o botão do TopBar antes DESCARTAVA direto, sem
// confirmação, com rótulo substantivo e ícone de histórico. Nada ali anunciava
// destruição, e o usuário age pelo que a interface promete. "Alterações (N)"
// promete VER, então mostra. O Descartar mora aqui dentro, com nome de verbo e
// com confirmação — e é o próprio mockup, que já traz a lista e o Publicar
// juntos.

import { useState } from 'react'
import { Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/Modal'
import { accentColor, tint } from '@/components/ui/accentColor'
import type { AgentConfigWithTools } from '@/services/agentsApi'
import { changeSummary, fieldAccent, fieldLabel, type AgentDraft, type DraftField } from './agentDraftCore'

export function ChangesCard({
  agent,
  draft,
  changedFields,
  onPublish,
  onDiscard,
  publishing,
  publishError,
}: {
  agent: AgentConfigWithTools
  draft: AgentDraft | null
  changedFields: DraftField[]
  onPublish: () => void
  onDiscard: () => void
  publishing: boolean
  publishError: string | null
}) {
  const [confirming, setConfirming] = useState(false)
  const n = changedFields.length

  return (
    <div
      // `.card` do mockup: raio 24 (nominal) e a borda tingida de marca que
      // separa este card dos demais — é a única borda colorida da tela.
      className="w-80 rounded-2xl border bg-surface-800 p-4 shadow-sm"
      style={{ borderColor: tint('brand', 40) }}
    >
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-surface-100">
            {n} {n === 1 ? 'alteração não publicada' : 'alterações não publicadas'}
          </p>
          <p className="mt-0.5 text-xs text-surface-400">
            Testadas no simulador ao lado antes de ir ao ar.
          </p>
        </div>
        <Button size="sm" onClick={onPublish} disabled={publishing}>
          <Check className="h-4 w-4" />
          {publishing ? 'Publicando…' : 'Publicar'}
        </Button>
      </div>

      <ul className="flex flex-col gap-2">
        {changedFields.map(field => (
          <li key={field} className="flex items-start gap-2 text-xs">
            <span
              // `.chip.acc`: 11px, peso 600, fundo a 14% e borda a 30% do
              // acento. `text-2xs` é 11px fixo, que é o que o mockup pede.
              className="inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-2xs font-semibold"
              style={{
                color: accentColor(fieldAccent(field)),
                backgroundColor: tint(fieldAccent(field), 14),
                borderColor: tint(fieldAccent(field), 30),
              }}
            >
              {fieldLabel(field)}
            </span>
            <span className="min-w-0 text-surface-200">
              {changeSummary(agent, draft, field)}
            </span>
          </li>
        ))}
      </ul>

      {publishError && (
        <p role="alert" className="mt-3 text-xs text-status-danger">
          {publishError}
        </p>
      )}

      <div className="mt-3.5 border-t border-surface-700 pt-3">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={publishing}
          className="inline-flex items-center gap-1.5 text-xs text-surface-500 transition hover:text-status-danger disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Descartar alterações
        </button>
      </div>

      <ConfirmModal
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => { setConfirming(false); onDiscard() }}
        title="Descartar alterações?"
        description="O rascunho volta ao que está publicado. O que foi editado e ainda não publicado se perde, e não há como desfazer."
        impact={{ count: n, label: n === 1 ? 'alteração não publicada será perdida' : 'alterações não publicadas serão perdidas', tone: 'danger' }}
        confirmLabel="Descartar"
        danger
      />
    </div>
  )
}
