// Seção "Ferramentas" do Workspace (A2 / SCRUM-1013) — decisão 2 do Maestro.
//
// A visão principal é a do mockup (`p2a-agentes.html:161`): cards de
// integração, um por ferramenta, com o que a pessoa que configura o agente
// precisa saber de relance — o nome, para onde chama e se está respondendo.
// O editor HTTP cru de hoje (`ToolsTab`) e as "Métricas de ferramentas"
// (`MetricsTab`) descem para o bloco "Avançado", recolhido. Nenhum dos dois é
// descartado e nenhum vira seção própria na nav.
//
// Por que recolhido e não removido: montar uma chamada HTTP com cabeçalho,
// corpo e parâmetros é trabalho de quem integra, não de quem escreve o
// comportamento do agente — mas é trabalho real e não tem outra porta no
// produto. Recolhido, some do caminho de quem não precisa e continua a um
// clique de quem precisa.
//
// O que o mockup pede e NÃO entra: o banner âmbar de token expirando e o chip
// "Expira em 4d". Os dois dependem do `health` do AS.3, que não existe. Ver
// `toolsCore.ts` para o porquê de nem sequer o chip verde aparecer quando a
// medição falha.

import { useEffect, useState } from 'react'
import { Plug, Loader2 } from 'lucide-react'
import { CollapsibleSection } from '@/components/ui/CollapsibleSection'
import { ToolsTab } from '@/components/agents/detail/tabs/ToolsTab'
import { MetricsTab } from '@/components/agents/detail/tabs/MetricsTab'
import { getToolMetrics } from '@/services/agentsApi'
import type { AgentConfigWithTools, AgentTool, ToolMetricRow } from '@/services/agentsApi'
import { cn } from '@/lib/utils'
import { accentColor, tint } from '@/components/ui/accentColor'
import { hostDe, indexarMetricas, ordenarFerramentas, toolStatus, type ToolStatus } from '../toolsCore'

// `.chip.st` do mockup (`p1-head.html:126`): pílula, fundo em 12% do acento,
// borda em 25%, TEXTO na cor do acento — e o ponto de 6px herda a cor do texto
// (`.chip .dot` usa `currentColor`, linha 129). Zero hex: as três porcentagens
// saem de `tint()`, que é o mesmo `color-mix` que o mockup escreve à mão.
//
// Tamanho em `text-2xs` (11px cravado) e não `text-xs`: o mockup pede 12px
// EMITIDO e nenhum token emite 12 no desktop, onde `text-xs` vira 13,2. Entre
// os dois vizinhos, o menor é o que preserva a relação — e é o mesmo valor que
// o chip de status do TopBar já usa, que aparece na tela ao mesmo tempo que
// estes.
function StatusChip({ status }: { status: ToolStatus }) {
  const neutro = status.accent === null
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-2xs font-medium"
      style={
        neutro
          ? undefined
          : {
              backgroundColor: tint(status.accent!, 12),
              borderColor: tint(status.accent!, 25),
              color: accentColor(status.accent!),
            }
      }
    >
      {!neutro && <i className="h-1.5 w-1.5 rounded-full bg-current" />}
      {status.label}
    </span>
  )
}

function IntegrationCard({ tool, status }: { tool: AgentTool; status: ToolStatus }) {
  return (
    <div
      className={cn(
        // `.card.tight` (p1-head.html:136): raio 16 (`rounded-lg` nesta escala,
        // onde `2xl` é 24) e padding 14 — `p-3.5`, não `p-4`.
        'flex items-center justify-between gap-3 rounded-lg border border-surface-700 bg-surface-800 p-3.5',
        // O `.65` do mockup para o item desligado.
        !tool.enabled && 'opacity-65',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {/* `.kb` com os overrides do card de ferramenta: 36px e raio 10 —
            `--radius-sm` JÁ é 10px nesta escala, então não é literal. */}
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-surface-700 bg-surface-900 text-accent-blue">
          <Plug className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-surface-100">{tool.name}</p>
          {/* Método + host, não a URL inteira: o caminho é detalhe do editor. */}
          <p className="truncate text-xs text-surface-500">
            {tool.method} · {hostDe(tool.url)}
          </p>
        </div>
      </div>
      <StatusChip status={status} />
    </div>
  )
}

export function ToolsSection({
  agent,
  onToolsChange,
}: {
  agent: AgentConfigWithTools
  onToolsChange: (tools: AgentTool[]) => void
}) {
  // A medição carrega o ID de quem ela mediu. Guardar só as linhas exigiria um
  // `setMedindo(true)` no corpo do efeito para invalidar na troca de agente — e
  // aí a medição do agente anterior apareceria por um render no agente novo.
  // Com o ID junto, "ainda não medi ESTE agente" é uma comparação, não um
  // estado que alguém precisa lembrar de zerar.
  const [medicao, setMedicao] = useState<{ agentId: string; rows: ToolMetricRow[] | null } | null>(null)

  useEffect(() => {
    let vivo = true
    getToolMetrics(7)
      .then((resp) => { if (vivo) setMedicao({ agentId: agent.id, rows: resp.tools }) })
      // Admin-only no backend: quem não é admin não mede, e o card fica sem
      // chip de estado em vez de ganhar um chip otimista.
      .catch(() => { if (vivo) setMedicao({ agentId: agent.id, rows: null }) })
    return () => { vivo = false }
  }, [agent.id])

  const medindo = medicao?.agentId !== agent.id
  const metricas = medindo ? null : medicao.rows
  const porNome = indexarMetricas(metricas ?? [])
  const ferramentas = ordenarFerramentas(agent.tools)

  return (
    <div className="space-y-6">
      {ferramentas.length === 0 ? (
        <div className="rounded-2xl border border-surface-800/60 bg-surface-900/60 p-6 text-center">
          <p className="text-sm font-semibold text-surface-300">Nenhuma integração conectada</p>
          <p className="mx-auto mt-1 max-w-[46ch] text-xs text-surface-500">
            Ferramentas são chamadas HTTP que o agente dispara durante a conversa — consultar
            estoque, aplicar cupom, rastrear pedido. Conecte a primeira no bloco Avançado.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {ferramentas.map((tool) => (
            <IntegrationCard
              key={tool.id}
              tool={tool}
              status={toolStatus(tool, metricas ? porNome.get(tool.name) : undefined)}
            />
          ))}
          {medindo && (
            <p className="flex items-center gap-1.5 px-1 text-2xs text-surface-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              medindo as execuções dos últimos 7 dias…
            </p>
          )}
          {!medindo && metricas === null && (
            // Silêncio explicado. Sem isto, cinco cards sem chip pareceriam
            // cinco integrações paradas.
            <p className="px-1 text-2xs text-surface-600">
              Sem estado de execução: as métricas de ferramentas são visíveis só para
              administradores.
            </p>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-surface-800/60 bg-surface-900/60 divide-y divide-surface-800/60">
        <CollapsibleSection
          title="Avançado"
          defaultOpen={false}
          storageKey="workspace.tools.avancado"
          className="px-3 py-2"
          actions={
            <span className="text-2xs text-surface-600">chamadas HTTP e execuções</span>
          }
        >
          <div className="space-y-6 py-3">
            <ToolsTab agent={agent} onToolsChange={onToolsChange} />
            <div>
              <p className="mb-3 text-xs font-medium text-surface-500">Métricas de ferramentas</p>
              <MetricsTab agent={agent} />
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  )
}
