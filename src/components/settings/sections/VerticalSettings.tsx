import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { useTenantVocab } from '@/contexts/TenantVocabContext'
import { VERTICAL_TEMPLATES } from '@/lib/verticalTemplates'
import { PIPELINE_KIND_OPTIONS } from '@/lib/pipelineKinds'
import { SectionHeader } from '../SectionHeader'
import { SettingsSection } from '../SettingsSection'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Button } from '@/components/ui/Button'
import type { TenantVocabulary } from '@/types'

// ─── Vocabulary keys and labels (editor avançado, "Outros termos") ───────────

const VOCAB_FIELDS: Array<{ key: keyof TenantVocabulary; label: string; hint: string }> = [
  { key: 'leadScore', label: 'Lead Score',       hint: 'ex: Lead Score, Prioridade, Temperatura' },
  { key: 'intent',    label: 'Intenção',         hint: 'ex: Intenção de compra, Urgência, Interesse' },
  { key: 'pipeline',  label: 'Pipeline / Funil', hint: 'ex: Funil, Agenda, Pipeline, Fila' },
  { key: 'company',   label: 'Empresa',          hint: 'ex: Empresa, Clínica, Escritório, Escola' },
  { key: 'jobTitle',  label: 'Cargo',            hint: 'ex: Cargo, Especialidade, Área' },
]

const ALL_VOCAB_FIELDS: Array<{ key: keyof TenantVocabulary; label: string }> = [
  { key: 'contact',   label: 'Contato (singular)' },
  { key: 'contacts',  label: 'Contatos (plural)' },
  { key: 'deal',      label: 'Negócio (singular)' },
  { key: 'deals',     label: 'Negócios (plural)' },
  { key: 'agent',     label: 'Agente (singular)' },
  { key: 'agents',    label: 'Agentes (plural)' },
  ...VOCAB_FIELDS,
]

const CONTACT_PRESETS = ['Contato', 'Cliente', 'Paciente', 'Lead']
const AGENT_PRESETS = ['Atendente', 'Agente', 'Recepcionista']
const CUSTOM = '__custom__'

// ─── Template picker — pílulas, sem card ──────────────────────────────────────

function TemplatePill({ emoji, label, color, isActive, onClick }: { emoji: string; label: string; color: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={isActive ? { borderColor: color, color } : undefined}
      className={cnPill(isActive)}
    >
      {isActive && <Check className="w-3 h-3" />}
      <span>{emoji}</span>
      {label}
    </button>
  )
}

function cnPill(active: boolean) {
  return [
    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
    active ? 'bg-surface-800' : 'border-surface-700 text-surface-400 hover:border-surface-600 hover:text-surface-200',
  ].join(' ')
}

// ─── Vocabulary Preview diff ──────────────────────────────────────────────────

function VocabDiff({ current, next }: { current: TenantVocabulary; next: TenantVocabulary }) {
  const changed = ALL_VOCAB_FIELDS.filter((f) => current[f.key] !== next[f.key])
  if (changed.length === 0) return null

  return (
    <div className="mt-4 rounded-md border border-status-pending-border bg-status-pending-bg p-3">
      <p className="text-[11px] font-semibold text-status-pending uppercase tracking-wide mb-2">
        Termos que serão alterados
      </p>
      <div className="flex flex-col gap-1.5">
        {changed.map((f) => (
          <div key={f.key} className="flex items-center gap-2 text-xs">
            <span className="text-surface-500 w-28 flex-shrink-0">{f.label}:</span>
            <span className="text-danger line-through">{String(current[f.key] ?? '')}</span>
            <span className="text-surface-500">→</span>
            <span className="text-success font-medium">{String(next[f.key] ?? '')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Custom vocabulary editor (termos restantes) ──────────────────────────────

function VocabEditor({ vocab, onChange }: { vocab: TenantVocabulary; onChange: (v: TenantVocabulary) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {VOCAB_FIELDS.map((f) => (
        <FormField key={f.key} label={f.label} hint={f.hint}>
          <Input
            value={vocab[f.key] as string}
            placeholder={f.hint}
            onChange={(e) => onChange({ ...vocab, [f.key]: e.target.value })}
          />
        </FormField>
      ))}
    </div>
  )
}

// ─── Stage preview ───────────────────────────────────────────────────────────

function StagePreview({ templateId }: { templateId: string }) {
  const template = VERTICAL_TEMPLATES.find((t) => t.id === templateId)
  if (!template) return null

  return (
    <div>
      <p className="text-[11px] font-semibold text-surface-400 uppercase tracking-wide mb-2">
        Estágios sugeridos para este setor
      </p>
      <div className="flex flex-wrap gap-2">
        {template.suggestedStages.map((s) => (
          <span
            key={s.label}
            className="color-chip flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border"
            style={{ ['--chip']: s.color } as React.CSSProperties}
          >
            {s.isTerminal && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />}
            {s.label}
          </span>
        ))}
      </div>
      <p className="text-[10px] text-surface-600 mt-2">
        * Os estágios são apenas sugestões. Configure em Configurações → CRM → Estágios.
      </p>
    </div>
  )
}

// ─── Select com opção "Personalizado" ─────────────────────────────────────────

function PersonSelect({
  value,
  presets,
  onChange,
}: {
  value: string
  presets: string[]
  onChange: (v: string) => void
}) {
  const isCustom = !presets.includes(value)
  return (
    <div className="flex flex-col gap-2">
      <SelectMenu
        value={isCustom ? CUSTOM : value}
        onChange={(e) => onChange(e.target.value === CUSTOM ? '' : e.target.value)}
      >
        {presets.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
        <option value={CUSTOM}>Personalizado</option>
      </SelectMenu>
      {isCustom && (
        <Input value={value} placeholder="Termo personalizado" onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VerticalSettings() {
  const { vocab, activeTemplateId, setVocab, applyTemplate, resetToDefault } = useTenantVocab()

  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null)
  const [customVocab, setCustomVocab] = useState<TenantVocabulary>(vocab)
  const [showCustomEditor, setShowCustomEditor] = useState(false)
  const [saved, setSaved] = useState(false)

  const pendingTemplate = pendingTemplateId ? VERTICAL_TEMPLATES.find((t) => t.id === pendingTemplateId) : null

  function flashSaved() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function update<K extends keyof TenantVocabulary>(key: K, value: TenantVocabulary[K]) {
    setVocab({ ...vocab, [key]: value })
    flashSaved()
  }

  function handleSelectTemplate(id: string) {
    if (id === pendingTemplateId) {
      setPendingTemplateId(null)
    } else {
      setPendingTemplateId(id)
      const template = VERTICAL_TEMPLATES.find((t) => t.id === id)
      if (template) setCustomVocab(template.vocabulary)
    }
  }

  function handleApplyTemplate() {
    if (!pendingTemplateId) return
    applyTemplate(pendingTemplateId)
    const tpl = VERTICAL_TEMPLATES.find((t) => t.id === pendingTemplateId)
    if (tpl) setCustomVocab(tpl.vocabulary)
    setPendingTemplateId(null)
    flashSaved()
  }

  function handleSaveCustom() {
    setVocab(customVocab)
    flashSaved()
  }

  const dealGender = vocab.dealGender ?? 'masculino'
  const wonAgreement = dealGender === 'feminino' ? 'ganha' : 'ganho'
  const dealLower = vocab.deal.toLowerCase()
  const dealsLower = vocab.deals.toLowerCase()

  const salesDefaults = PIPELINE_KIND_OPTIONS.find((o) => o.kind === 'sales')!.terminalLabels
  const processDefaults = PIPELINE_KIND_OPTIONS.find((o) => o.kind === 'process')!.terminalLabels

  return (
    <div>
      <SectionHeader
        title="Vocabulário"
        description="Como o Oryon chama as coisas na sua operação. Os termos abaixo substituem padrões em menus, tabelas, botões e mensagens do sistema — em todo o workspace."
        saved={saved}
      />

      {/* Registros do funil */}
      <SettingsSection
        title="Registros do funil"
        description={`Singular e plural. Usados em "Novo ${dealLower}", "3 ${dealsLower}", na coluna do Kanban e nas notificações.`}
      >
        <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Singular">
            <Input value={vocab.deal} onChange={(e) => update('deal', e.target.value)} />
          </FormField>
          <FormField label="Plural">
            <Input value={vocab.deals} onChange={(e) => update('deals', e.target.value)} />
          </FormField>
        </div>
        <FormField
          label={<>Gênero gramatical <span className="text-surface-500 font-normal">· para "novo/nova", "ganho/ganha"</span></>}
          className="max-w-xs"
        >
          <SegmentedControl
            label="Gênero gramatical"
            value={dealGender}
            onChange={(v) => update('dealGender', v)}
            options={[
              { value: 'masculino', label: 'Masculino' },
              { value: 'feminino', label: 'Feminino' },
            ]}
          />
        </FormField>
        <p className="text-xs text-surface-500 bg-[var(--sf2)] border border-surface-700 rounded-xs px-2.5 py-2 leading-[1.5]">
          Prévia: <span className="text-surface-100">"Novo {dealLower}" · "3 {dealsLower} em Proposta" · "{vocab.deal} {wonAgreement}"</span>
        </p>
        </div>
      </SettingsSection>

      {/* Fechamento */}
      <SettingsSection
        title="Fechamento"
        description={`Nome das etapas terminais. Funis do tipo "${PIPELINE_KIND_OPTIONS.find((o) => o.kind === 'process')!.label.toLowerCase()}" usam o segundo par automaticamente.`}
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <FormField label={<>Positivo <span className="text-surface-500 font-normal">· funil de {PIPELINE_KIND_OPTIONS.find((o) => o.kind === 'sales')!.noun}s</span></>}>
              <Input
                value={vocab.salesWonLabel ?? salesDefaults.won}
                onChange={(e) => update('salesWonLabel', e.target.value)}
              />
            </FormField>
            <FormField label="Negativo">
              <Input
                value={vocab.salesLostLabel ?? salesDefaults.lost}
                onChange={(e) => update('salesLostLabel', e.target.value)}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={<>Positivo <span className="text-surface-500 font-normal">· funil de {PIPELINE_KIND_OPTIONS.find((o) => o.kind === 'process')!.noun}s</span></>}>
              <Input
                value={vocab.processWonLabel ?? processDefaults.won}
                onChange={(e) => update('processWonLabel', e.target.value)}
              />
            </FormField>
            <FormField
              label="Negativo"
              requirement="required"
              filled={!!vocab.processLostLabel}
              error={!vocab.processLostLabel ? 'Obrigatório — usado no modal de motivo' : undefined}
            >
              <Input
                value={vocab.processLostLabel ?? ''}
                onChange={(e) => update('processLostLabel', e.target.value)}
              />
            </FormField>
          </div>
        </div>
      </SettingsSection>

      {/* Pessoas */}
      <SettingsSection title="Pessoas" description="Como chamar quem escreve e quem atende.">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Quem escreve">
            <PersonSelect value={vocab.contact} presets={CONTACT_PRESETS} onChange={(v) => update('contact', v)} />
          </FormField>
          <FormField label="Quem atende">
            <PersonSelect value={vocab.agent} presets={AGENT_PRESETS} onChange={(v) => update('agent', v)} />
          </FormField>
        </div>
        <p className="mt-2 text-[11.5px] text-surface-500">
          Opções: {CONTACT_PRESETS.join(' · ')} · Personalizado
        </p>
      </SettingsSection>

      {/* Onde isso aparece — referência, não editável */}
      <SettingsSection title="Onde isso aparece" description="Referência, não editável.">
        <div className="text-[12.5px]">
          {[
            ['Menu lateral', `Funis → coluna "${vocab.deals}"`],
            ['Ficha do contato', `Aba "${vocab.deals}" · botão "Novo ${dealLower}"`],
            ['Modal de fechamento', `"Mover para ${vocab.salesLostLabel ?? salesDefaults.lost}" · "Marcar como ${vocab.salesWonLabel ?? salesDefaults.won}"`],
            ['Agentes IA', 'Prompt do sistema usa os mesmos termos'],
          ].map(([left, right]) => (
            <div key={left} className="grid grid-cols-[160px_1fr] gap-2.5 py-[7px] border-b border-surface-700 last:border-b-0">
              <span className="text-surface-400">{left}</span>
              <span>{right}</span>
            </div>
          ))}
        </div>
      </SettingsSection>

      {/* Templates por setor — troca todo o vocabulário de uma vez */}
      <SettingsSection
        title="Templates por setor"
        description="Escolher um setor troca os termos em toda a interface e no contexto da IA de uma só vez."
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xs text-surface-500">
            Ativo: {VERTICAL_TEMPLATES.find((t) => t.id === activeTemplateId)?.emoji}{' '}
            {VERTICAL_TEMPLATES.find((t) => t.id === activeTemplateId)?.label}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {VERTICAL_TEMPLATES.map((t) => (
            <TemplatePill
              key={t.id}
              emoji={t.emoji}
              label={t.label}
              color={t.color}
              isActive={pendingTemplateId ? pendingTemplateId === t.id : activeTemplateId === t.id}
              onClick={() => handleSelectTemplate(t.id)}
            />
          ))}
        </div>

        <AnimatePresence>
          {pendingTemplate && pendingTemplateId !== activeTemplateId && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="mt-4 border-t border-surface-700 pt-4"
            >
              <p className="text-sm font-semibold text-surface-100 mb-1">
                Aplicar template <span style={{ color: pendingTemplate.color }}>{pendingTemplate.emoji} {pendingTemplate.label}</span>?
              </p>
              <p className="text-xs text-surface-400">{pendingTemplate.description}</p>
              <VocabDiff current={vocab} next={pendingTemplate.vocabulary} />

              <div className="mt-4 border-t border-surface-700 pt-4">
                <StagePreview templateId={pendingTemplateId!} />
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Button size="sm" variant="primary" onClick={handleApplyTemplate} leftIcon={<Check className="w-3.5 h-3.5" />}>
                  Aplicar template
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setPendingTemplateId(null)}>
                  Cancelar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SettingsSection>

      {/* Outros termos — editor avançado, campos que não têm seção dedicada acima */}
      <SettingsSection title="Outros termos" description="Ajuste fino, um a um. Sobrescreve o template ativo.">
        <button
          type="button"
          onClick={() => setShowCustomEditor((v) => !v)}
          className="flex items-center gap-2 text-sm font-medium text-surface-200 hover:text-surface-50 transition-colors"
        >
          {showCustomEditor ? <ChevronUp className="w-4 h-4 text-surface-400" /> : <ChevronDown className="w-4 h-4 text-surface-400" />}
          {showCustomEditor ? 'Ocultar editor' : 'Personalizar termos manualmente'}
        </button>

        <AnimatePresence initial={false}>
          {showCustomEditor && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div className="pt-4">
                <VocabEditor vocab={customVocab} onChange={setCustomVocab} />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Button size="sm" variant="primary" onClick={handleSaveCustom} leftIcon={saved ? <Check className="w-3.5 h-3.5" /> : undefined}>
                  {saved ? 'Salvo!' : 'Salvar alterações'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  onClick={() => {
                    resetToDefault()
                    setCustomVocab(VERTICAL_TEMPLATES[0].vocabulary)
                    setPendingTemplateId(null)
                  }}
                >
                  Restaurar padrão
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SettingsSection>
    </div>
  )
}
