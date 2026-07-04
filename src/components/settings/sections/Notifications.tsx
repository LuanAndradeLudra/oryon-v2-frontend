import { Bell, Volume2, Lock, RotateCcw } from 'lucide-react'
import { SectionHeader } from '../SectionHeader'
import { Switch } from '@/components/ui/Switch'
import { Banner } from '@/components/ui/Banner'
import { SkeletonCard } from '@/components/ui/Skeleton'
import {
  useNotificationPreferences,
  type ResolvedPreference,
  type NotificationCategory,
} from '@/hooks/useNotificationPreferences'
import { useNotificationSound } from '@/hooks/useNotificationSound'

/**
 * Phase 19: dedicated Settings page for notification preferences. Groups
 * the 14 types by category and renders each as a toggle with description.
 * Mandatory types render locked (security_alert, whatsapp_integration_error).
 */

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  conversations: 'Conversas',
  team: 'Equipe',
  campaigns: 'Campanhas',
  automations: 'Automações',
  security: 'Segurança & integrações',
}

const CATEGORY_ORDER: NotificationCategory[] = [
  'conversations',
  'team',
  'campaigns',
  'automations',
  'security',
]

export function Notifications() {
  const { preferences, loading, saving, error, update, reset } = useNotificationPreferences()
  const { enabled: soundEnabled, toggle: toggleSound } = useNotificationSound()

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Notificações" description="Controle quais notificações você recebe e como." />
        <div className="flex flex-col gap-6">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    )
  }

  // Group by category preserving our defined order.
  const byCategory = new Map<NotificationCategory, ResolvedPreference[]>()
  for (const p of preferences) {
    const bucket = byCategory.get(p.category) ?? []
    bucket.push(p)
    byCategory.set(p.category, bucket)
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Notificações"
        description="Controle quais eventos geram notificação no sino e como você é avisado."
      />

      {/* Sound preference — stored locally in the browser via useNotificationSound */}
      <div className="bg-surface-900 border border-surface-800 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-surface-300 mb-4">Som de notificação</h3>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-surface-400">
              <Volume2 className="w-4 h-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-surface-100">Tocar som</p>
              <p className="text-xs text-surface-400">
                Som curto toca a cada notificação nova. Preferência salva neste navegador.
              </p>
            </div>
          </div>
          <Switch checked={soundEnabled} onChange={toggleSound} />
        </div>
      </div>

      {error && (
        <Banner variant="danger">{error}</Banner>
      )}

      {/* Per-type preferences grouped by category */}
      {CATEGORY_ORDER.map((cat) => {
        const items = byCategory.get(cat)
        if (!items || items.length === 0) return null
        return (
          <div key={cat} className="bg-surface-900 border border-surface-800 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-surface-300 mb-4">{CATEGORY_LABELS[cat]}</h3>
            <div className="flex flex-col gap-4">
              {items.map((pref) => (
                <PreferenceRow
                  key={pref.type}
                  pref={pref}
                  saving={saving}
                  onToggle={(enabled) => update(pref.type, enabled).catch(() => {})}
                  onReset={() => reset(pref.type).catch(() => {})}
                />
              ))}
            </div>
          </div>
        )
      })}

      <p className="text-[11px] text-surface-500">
        <Bell className="w-3 h-3 inline mr-1" />
        Notificações obrigatórias (como alertas de segurança) não podem ser desativadas por motivo de conformidade.
      </p>
    </div>
  )
}

function PreferenceRow({
  pref,
  saving,
  onToggle,
  onReset,
}: {
  pref: ResolvedPreference
  saving: boolean
  onToggle: (enabled: boolean) => void
  onReset: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        {pref.mandatory ? (
          <span className="mt-0.5 text-warning" title="Obrigatória">
            <Lock className="w-4 h-4" />
          </span>
        ) : (
          <span className="mt-0.5 text-surface-400">
            <Bell className="w-4 h-4" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-surface-100 flex items-center gap-2">
            {pref.label}
            {pref.isOverride && !pref.mandatory && (
              <span className="text-[10px] font-normal text-brand-300 bg-brand-600/15 border border-brand-600/30 rounded px-1.5 py-0.5">
                customizado
              </span>
            )}
          </p>
          <p className="text-xs text-surface-400">{pref.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {pref.isOverride && !pref.mandatory && (
          <button
            onClick={onReset}
            disabled={saving}
            className="text-[11px] text-surface-500 hover:text-surface-200 transition-colors flex items-center gap-1"
            title="Voltar ao padrão do seu cargo"
          >
            <RotateCcw className="w-3 h-3" />
            padrão
          </button>
        )}
        <Switch
          checked={pref.enabled}
          onChange={onToggle}
          disabled={pref.mandatory || saving}
        />
      </div>
    </div>
  )
}
