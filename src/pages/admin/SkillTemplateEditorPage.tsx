// ─── Skill Template Editor (admin) ─────────────────────────────────────────
// Page shell for /admin/skill-templates/new (create) and
// /admin/skill-templates/:id (edit). The actual form lives in
// components/admin/SkillTemplateForm — this page handles route params, fetch,
// loading + error states.

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { getSkillTemplate } from '@/services/skillTemplatesApi'
import type { SkillTemplate } from '@/types/skills'
import { SkillTemplateForm } from '@/components/admin/SkillTemplateForm'
import { SkillTemplateInstancesSection } from '@/components/admin/SkillTemplateInstancesSection'

export function SkillTemplateEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'
  const [template, setTemplate] = useState<SkillTemplate | null>(null)
  const [loading, setLoading] = useState(!isNew)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNew) return
    setLoading(true)
    setError(null)
    getSkillTemplate(id!)
      .then((row) => setTemplate(row))
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [id, isNew])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <button
          onClick={() => navigate('/admin/skill-templates')}
          className="inline-flex items-center gap-2 text-sm text-surface-400 hover:text-surface-200 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para o catálogo
        </button>

        <header className="mb-6">
          <h1 className="text-xl font-semibold text-surface-100">
            {isNew
              ? 'Novo template'
              : template
                ? `Editar: ${template.name}`
                : 'Editar template'}
          </h1>
          <p className="text-sm text-surface-400">
            {isNew
              ? 'Defina um novo molde de skill que poderá ser anexado aos agentes dos clientes.'
              : 'Edite os campos do template. Mudanças afetam todas as instâncias atribuídas.'}
          </p>
        </header>

        {loading && (
          <div className="flex items-center justify-center py-16 text-surface-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando template…
          </div>
        )}

        {error && !loading && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-danger/10 border border-danger/30 text-sm">
            <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-danger font-medium mb-1">Erro ao carregar</p>
              <p className="text-surface-400">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && (
          <SkillTemplateForm template={template} />
        )}

        {/* Cross-tenant view of every agent_skills row using this template.
            Only shown in edit mode — a freshly created template has no
            instances yet. Drift badges on the rows surface configs that
            need attention after a config_schema change. */}
        {!loading && !error && !isNew && template && (
          <SkillTemplateInstancesSection template={template} />
        )}
      </div>
    </div>
  )
}
