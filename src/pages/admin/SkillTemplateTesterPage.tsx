// ─── Skill Template Tester (admin) ─────────────────────────────────────────
// Page shell for /admin/skill-templates/:id/test. Loads the template once and
// hands it off to the Tester panel.

import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Beaker, Loader2, AlertCircle, Edit3 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getSkillTemplate } from '@/services/skillTemplatesApi'
import type { SkillTemplate } from '@/types/skills'
import { SkillTemplateTester } from '@/components/admin/SkillTemplateTester'

export function SkillTemplateTesterPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [template, setTemplate] = useState<SkillTemplate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    getSkillTemplate(id)
      .then(setTemplate)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/admin/skill-templates')}
        leftIcon={<ArrowLeft className="w-4 h-4" />}
        className="mb-4 -ml-3"
      >
        Voltar para o catálogo
      </Button>

      <header className="flex items-start justify-between gap-6 mb-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-surface-100 flex items-center gap-2">
            <Beaker className="w-5 h-5 text-brand-400 flex-shrink-0" />
            {template ? `Testar: ${template.name}` : 'Testar template'}
          </h1>
          <p className="text-sm text-surface-400">
            Dispara uma chamada real ao n8n com valores de teste e mostra envelope, headers HMAC e resposta.
          </p>
          {template && (
            <p className="text-xs text-surface-500 font-mono mt-1">
              {template.slug} → <span className="text-surface-300">{template.webhook_path}</span>
            </p>
          )}
        </div>
        {template && (
          <Button
            variant="neutral"
            size="sm"
            onClick={() => navigate(`/admin/skill-templates/${template.id}`)}
            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
            className="flex-shrink-0 self-start"
          >
            Editar template
          </Button>
        )}
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
            <p className="text-danger font-medium mb-1">Erro ao carregar template</p>
            <p className="text-surface-400">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && template && (
        <SkillTemplateTester template={template} />
      )}
      </div>
    </div>
  )
}
