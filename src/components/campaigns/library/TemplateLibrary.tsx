// ─── TemplateLibrary ───────────────────────────────────────────────────────
// A tela da Biblioteca (D4/SCRUM-1023): o rail de facetas à esquerda e a
// grade de 3 cards à direita. Substitui o corpo da `TemplatesTab`, que fica
// como casca fina cuidando do que é fluxo (criador em tela cheia, modais) e
// não de biblioteca.
//
// Todo o raciocínio de filtro mora em `libraryFilters.ts`, que é puro. Aqui
// só há estado de interface, a ligação com os dados de uso e a montagem.
//
// UNIDADE: as medidas de caixa deste arquivo casam com a unidade do mockup.
// `--spacing` é `.25rem`, e o `:root{font-size:110%}` do desktop faz 1rem
// valer 17.6px a partir de 768px — então `px-6` renderiza 26.4px, não 24. Onde
// o mockup escreve px literal (`.lib` 232px, `.lg` 20px/24px, `.g3` gap 14px),
// aqui vai valor arbitrário literal. Token só onde o mockup também está em
// escala relativa. Misturar os dois no mesmo componente é o que quebra
// proporção: uma coluna cravada em 232px com padding em rem aperta 10% mais a
// cada passo da manopla.
import { useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useWorkspaceNumber } from '@/contexts/WorkspaceNumberContext'
import { formatPhone } from '@/lib/phone'
import { LANGUAGES } from '../constants'
import { LibraryRail } from './LibraryRail'
import { TemplateCard } from './TemplateCard'
import {
  EMPTY_FILTERS, applyFilters, buildRail, reconcileFilters, sortKeyFor, sortTemplates,
  type LibraryContext, type LibraryFilters, type RailGroup,
} from './libraryFilters'
import { useAutomationLinks, useTemplateUsage } from './useTemplateUsage'
import type { WhatsAppTemplate } from '@/types'

interface TemplateLibraryProps {
  templates: WhatsAppTemplate[]
  loading: boolean
  /** Sem linha conectada não dá para criar template — o convite do estado
   *  vazio some, em vez de levar a um formulário que o backend recusa. */
  canCreate: boolean
  onCreate: () => void
  onEdit: (template: WhatsAppTemplate) => void
  onUse: (template: WhatsAppTemplate) => void
  onRewrite: (template: WhatsAppTemplate) => void
  onDelete: (template: WhatsAppTemplate) => void
  onDuplicate: (template: WhatsAppTemplate) => void
  onAssignWaba: (template: WhatsAppTemplate) => void
  deletingId: string | null
}

/** Mesma regra de hoje (`canEditTemplate` da aba antiga): a Meta não deixa
 *  editar um template aprovado, e afrouxar isso é decisão de produto com
 *  risco de reprovação. O card mostra o lápis desabilitado com o motivo, em
 *  vez de escondê-lo. */
function canEditTemplate(template: WhatsAppTemplate): boolean {
  return template.status === 'REJECTED' || (template.status === 'PENDING' && !!template.rejectionReason)
}

const EDIT_BLOCKED_REASON: Record<string, string> = {
  APPROVED: 'A Meta não permite editar um template já aprovado — duplique e crie uma nova versão',
  PENDING:  'Em análise pela Meta: só dá para editar depois de uma resposta',
  PAUSED:   'Template pausado pela Meta — resolva a pausa antes de editar',
  DISABLED: 'Template desativado pela Meta',
}

function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.value === code)?.label ?? code
}

/** "usado 12× · última hoje". Sem `date-fns` no card: a frase é montada aqui,
 *  onde já se sabe se o BE.8 respondeu. */
function usageLabelFor(usage: { usageCount: number; lastUsedAt: string | null } | undefined): string | undefined {
  if (!usage || usage.usageCount === 0) return undefined
  const times = `usado ${usage.usageCount.toLocaleString('pt-BR')}×`
  if (!usage.lastUsedAt) return times
  const last = new Date(usage.lastUsedAt)
  const today = new Date()
  const sameDay = last.toDateString() === today.toDateString()
  return `${times} · última ${sameDay ? 'hoje' : last.toLocaleDateString('pt-BR')}`
}

export function TemplateLibrary({
  templates, loading, canCreate, onCreate,
  onEdit, onUse, onRewrite, onDelete, onDuplicate, onAssignWaba, deletingId,
}: TemplateLibraryProps) {
  const [filters, setFilters] = useState<LibraryFilters>(EMPTY_FILTERS)
  const { numbers } = useWorkspaceNumber()
  const { usage } = useTemplateUsage()
  const automationLinks = useAutomationLinks()

  const context: LibraryContext = useMemo(
    () => ({ usage, automationTemplateIds: new Set(automationLinks.keys()) }),
    [usage, automationLinks],
  )

  const lines = useMemo(
    () => numbers.map((n) => ({ id: n.id, label: n.label || formatPhone(n.displayPhoneNumber) })),
    [numbers],
  )

  // O rail é derivado do filtro corrente, e o filtro corrente precisa caber no
  // rail: sincronizar com a Meta pode apagar o último rejeitado enquanto
  // "Rejeitados" está escolhido, e sem reconciliar a grade fica vazia com um
  // filtro invisível ligado.
  const rail: RailGroup[] = useMemo(
    () => buildRail(templates, filters, context, { languageLabel, lines }),
    [templates, filters, context, lines],
  )
  const effectiveFilters = useMemo(() => reconcileFilters(filters, rail), [filters, rail])

  const visible = useMemo(
    () => sortTemplates(applyFilters(templates, effectiveFilters, context), context),
    [templates, effectiveFilters, context],
  )

  // Sem BE.8 não existe uso, e o rótulo diz o que a ordenação está fazendo de
  // verdade em vez de repetir "ordenado por uso" do mockup.
  const sortLabel = sortKeyFor(context) === 'usage' ? 'ordenado por uso' : 'ordenado por atualização'

  function change(axis: RailGroup['axis'], value: string) {
    setFilters((prev) => ({ ...prev, [axis]: value }))
  }

  return (
    <div className="grid grid-cols-[232px_1fr] flex-1 min-h-0">
      <LibraryRail
        groups={rail}
        filters={effectiveFilters}
        search={filters.search}
        onSearchChange={(search) => setFilters((prev) => ({ ...prev, search }))}
        onFilterChange={change}
      />

      <div className="px-[24px] py-[20px] overflow-auto min-w-0">
        {loading ? (
          <SkeletonList items={6} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={templates.length === 0 ? 'Nenhum template ainda' : 'Nenhum template com esse filtro'}
            action={
              templates.length === 0 && canCreate
                ? { label: 'Criar primeiro template', onClick: onCreate }
                : undefined
            }
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 mb-[14px]">
              <span className="text-xs text-surface-400">
                {visible.length.toLocaleString('pt-BR')} {visible.length === 1 ? 'template' : 'templates'} · {sortLabel}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-[14px]">
              {visible.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  usageLabel={usageLabelFor(usage?.get(template.id))}
                  attribution={
                    automationLinks.has(template.id)
                      ? `Automação "${automationLinks.get(template.id)?.automationName}"`
                      : undefined
                  }
                  canEdit={canEditTemplate(template)}
                  editBlockedReason={EDIT_BLOCKED_REASON[template.status]}
                  onEdit={() => onEdit(template)}
                  onUse={() => onUse(template)}
                  onRewrite={() => onRewrite(template)}
                  onDelete={() => onDelete(template)}
                  onDuplicate={lines.length > 1 ? () => onDuplicate(template) : undefined}
                  onAssignWaba={() => onAssignWaba(template)}
                  deleting={deletingId === template.id}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
