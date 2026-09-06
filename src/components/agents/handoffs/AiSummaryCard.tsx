// ─── Card de resumo do painel (A6 / SCRUM-1017) ──────────────────────────────
import { Sparkles } from 'lucide-react'
import { accentColor, tint, type Accent } from '@/components/ui/accentColor'
import type { ConversationAnalysisResult } from '@/types'
import type { OrigemDoResumo } from './useHandoffDetail'

/** Cor por índice, determinística — nome de acento, nunca hex (Carta §7). */
const ACENTOS: Accent[] = ['rose', 'cyan', 'amber', 'violet', 'green', 'blue']

function Chip({ texto, i }: { texto: string; i: number }) {
  const acento = ACENTOS[i % ACENTOS.length]
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-3xs font-medium"
      style={{ background: tint(acento, 15), color: accentColor(acento), borderColor: tint(acento, 28) }}
    >
      {texto}
    </span>
  )
}

/**
 * Os três níveis da cascata, e o rótulo muda junto com a origem:
 *
 * 1. `HandoffItem.summary` — snapshot tirado no momento do evento pelo BE.6.
 *    É o dado certo, e o card se chama **"Resumo da IA"**.
 * 2. `GET /conversations/:id/analysis` — existe, mas é o analisador de
 *    **conversão de vendas**. O card passa a se chamar **"Análise da
 *    conversa"** e os chips saem sob os próprios rótulos, *sinais* e
 *    *objeções*. Não disfarço análise de conversão de resumo de triagem: o
 *    texto é real, o rótulo também tem que ser.
 * 3. Nenhum dos dois — **o card não renderiza**. Sem esqueleto eterno, sem
 *    "resumo indisponível" ocupando 120px do painel.
 *
 * Os 3 chips do mockup ("sentimento negativo", "defeito · troca", "risco de
 * churn") são classificação de intenção/sentimento que **nenhum endpoint
 * produz hoje**. No nível 1 o card sai sem chips: chip inventado é pior que
 * chip ausente.
 */
export function AiSummaryCard({
  origem, resumo, analise,
}: {
  origem: OrigemDoResumo
  resumo: string | null
  analise: ConversationAnalysisResult | null
}) {
  if (origem === 'nenhuma' || !resumo) return null

  const daAnalise = origem === 'analise'
  const sinais = daAnalise ? (analise?.signals ?? []) : []
  const objecoes = daAnalise ? (analise?.objections ?? []) : []

  return (
    <section className="rounded-lg border border-surface-700 bg-surface-800 p-3">
      <header className="flex items-center gap-1.5 text-3xs font-bold uppercase tracking-[0.12em] text-brand-400">
        <Sparkles className="h-3 w-3" aria-hidden />
        {daAnalise ? 'Análise da conversa' : 'Resumo da IA'}
      </header>

      <p className="mt-2 text-xs leading-[1.5] text-surface-300">{resumo}</p>

      {daAnalise && (sinais.length > 0 || objecoes.length > 0) && (
        <div className="mt-2.5 flex flex-col gap-1.5">
          {sinais.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-3xs text-surface-500">sinais</span>
              {sinais.map((s, i) => <Chip key={s} texto={s} i={i} />)}
            </div>
          )}
          {objecoes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-3xs text-surface-500">objeções</span>
              {objecoes.map((o, i) => <Chip key={o} texto={o} i={i + sinais.length} />)}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
