import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Brain, Bot, BarChart2, Sparkles,
  Globe, Instagram, Facebook, Linkedin, Twitter, Phone,
  UploadCloud, FileText, FileImage, File, X, Loader2, CheckCircle2, AlertCircle, RefreshCw,
} from 'lucide-react'
import { SectionHeader } from '../SectionHeader'
import { SettingsSection } from '../SettingsSection'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { ToastContainer } from '@/components/ui/Toast'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/contexts/AuthContext'
import {
  loadHubAsync, saveHub, syncBrainToRag, DEFAULT_HUB,
  type CompanyHubData, type BrandFile,
} from '@/services/companyContextService'
import { extractBrandFile } from '@/services/agentsApi'
import { ConfirmModal } from '@/components/ui/Modal'
import { KnowledgeDocArtifact } from '@/components/agents/KnowledgeDocArtifact'

// ─── Static data ──────────────────────────────────────────────────────────────

const INDUSTRIES = [
  'SaaS / Software', 'E-commerce / Varejo', 'Saúde e Bem-estar', 'Educação',
  'Imobiliário', 'Serviços Financeiros', 'Consultoria', 'Agência de Marketing',
  'Indústria / Manufatura', 'Alimentação e Bebidas', 'Construção e Reforma',
  'Logística e Transporte', 'Turismo e Hospitalidade', 'Jurídico', 'Outro',
]

const BUSINESS_TYPES = ['B2B — Vendo para empresas', 'B2C — Vendo para pessoas', 'B2B2C — Ambos']

const TEAM_SIZES = [
  'Só eu (1 pessoa)', '2 a 10 pessoas', '11 a 50 pessoas',
  '51 a 200 pessoas', 'Mais de 200 pessoas',
]

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'text/plain', 'text/markdown',
]
const ACCEPTED_ATTR = '.pdf,.docx,.png,.jpg,.jpeg,.webp,.gif,.txt,.md'
const MAX_FILE_MB = 10

// ─── Sub-components ───────────────────────────────────────────────────────────

function PillToggle({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        selected
          ? 'bg-brand-600 border-brand-500 text-surface-950 shadow-sm shadow-brand-900/40'
          : 'bg-surface-800 border-surface-700 text-surface-300 hover:border-surface-600 hover:text-surface-100'
      }`}
    >
      {label}
    </button>
  )
}

function UsedByBadges() {
  return (
    <div className="flex items-center flex-wrap gap-2">
      <span className="text-xs text-surface-500">Alimenta automaticamente:</span>
      {[
        { icon: Sparkles,  label: 'Copilot',       color: 'text-brand-400 bg-brand-500/10 border-brand-500/25' },
        { icon: Bot,       label: 'Agent Builder', color: 'text-status-active bg-status-active-bg border-status-active-border' },
        { icon: BarChart2, label: 'CRM Setup',     color: 'text-status-pending bg-status-pending-bg border-status-pending-border' },
      ].map(({ icon: Icon, label, color }) => (
        <span key={label} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${color}`}>
          <Icon className="w-3 h-3" />{label}
        </span>
      ))}
    </div>
  )
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <FileImage className="w-4 h-4 text-sky-400" />
  if (mimeType === 'application/pdf') return <FileText className="w-4 h-4 text-red-400" />
  return <File className="w-4 h-4 text-surface-400" />
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── AI Analysis Progress ─────────────────────────────────────────────────────

const ANALYSIS_STEPS = [
  'Lendo documento...',
  'Extraindo conteúdo textual...',
  'Identificando estrutura...',
  'Processando com IA...',
  'Analisando contexto de marca...',
  'Finalizando extração...',
]

function AnalysisProgress() {
  const [step, setStep] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setStep((s) => (s + 1) % ANALYSIS_STEPS.length)
    }, 8000)
    const elapsedTimer = setInterval(() => {
      setElapsed((e) => e + 1)
    }, 1000)
    return () => { clearInterval(stepTimer); clearInterval(elapsedTimer) }
  }, [])

  const progress = Math.min(95, elapsed * 1.5) // Slow progress bar that never reaches 100%

  return (
    <div className="mt-1 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <div className="relative w-3.5 h-3.5 flex-shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-brand-500/30" />
          <div className="absolute inset-0 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
        </div>
        <p className="text-[11px] text-brand-400 transition-all duration-500">{ANALYSIS_STEPS[step]}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-surface-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-surface-600 tabular-nums w-8 text-right">{elapsed}s</span>
      </div>
    </div>
  )
}

// ─── Brand Files Section ──────────────────────────────────────────────────────

interface FileEntry {
  file: BrandFile
  status: 'done' | 'analyzing' | 'error'
  error?: string
}

function BrandFilesSection({
  files,
  onChange,
}: {
  files: BrandFile[]
  onChange: (files: BrandFile[]) => void
}) {
  const [entries, setEntries] = useState<FileEntry[]>(
    () => files.map(f => ({ file: f, status: 'done' as const })),
  )
  const [dragOver, setDragOver] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep parent in sync whenever entries change
  useEffect(() => {
    onChange(entries.filter(e => e.status === 'done').map(e => e.file))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries])

  const processFile = useCallback(async (raw: File) => {
    if (raw.size > MAX_FILE_MB * 1024 * 1024) {
      alert(`"${raw.name}" excede o limite de ${MAX_FILE_MB} MB.`)
      return
    }
    if (!ACCEPTED_TYPES.includes(raw.type)) {
      alert(`Tipo de arquivo não suportado: ${raw.type || raw.name}`)
      return
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const placeholder: FileEntry = {
      file: { id, name: raw.name, size: raw.size, mimeType: raw.type, extractedText: '', addedAt: new Date().toISOString() },
      status: 'analyzing',
    }
    setEntries(prev => [placeholder, ...prev])

    try {
      const isText = raw.type.startsWith('text/')
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        if (isText) reader.readAsText(raw)
        else reader.readAsDataURL(raw)
      })

      // For base64 DataURL, strip the prefix (data:mime;base64,...)
      const contentType = isText ? 'text' : 'base64'
      const payload = isText ? content : content.split(',')[1] ?? content

      const extractedText = await extractBrandFile(raw.name, raw.type, payload, contentType)

      setEntries(prev => prev.map(e =>
        e.file.id === id
          ? { ...e, status: 'done', file: { ...e.file, extractedText } }
          : e,
      ))
    } catch (err) {
      setEntries(prev => prev.map(e =>
        e.file.id === id
          ? { ...e, status: 'error', error: err instanceof Error ? err.message : 'Erro ao analisar arquivo' }
          : e,
      ))
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    Array.from(e.dataTransfer.files).forEach(f => void processFile(f))
  }, [processFile])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach(f => void processFile(f))
    e.target.value = ''
  }

  const [removeTarget, setRemoveTarget] = useState<string | null>(null)
  const remove = () => {
    if (!removeTarget) return
    setEntries(prev => prev.filter(e => e.file.id !== removeTarget))
    setRemoveTarget(null)
  }

  const analyzing = entries.some(e => e.status === 'analyzing')

  return (
    <div>
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`flex items-center gap-3 rounded-xl border-2 border-dashed px-4 py-3 cursor-pointer transition-all ${
          dragOver
            ? 'border-brand-500 bg-brand-500/8'
            : 'border-surface-700 bg-surface-800/40 hover:border-surface-600 hover:bg-surface-800/70'
        }`}
      >
        <input ref={inputRef} type="file" multiple accept={ACCEPTED_ATTR} className="sr-only" onChange={handleInput} />
        <div className="w-8 h-8 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center flex-shrink-0">
          <UploadCloud className="w-4 h-4 text-surface-400" />
        </div>
        <div>
          <p className="text-xs font-medium text-surface-200">
            Arraste ou <span className="text-brand-400">clique para selecionar</span>
          </p>
          <p className="text-[11px] text-surface-500 mt-0.5">PDF · DOCX · PNG · JPG · WEBP · TXT — até {MAX_FILE_MB} MB</p>
        </div>
      </div>

      {/* File list */}
      {entries.length > 0 && (
        <div className="mt-3 space-y-2">
          {entries.map(({ file, status, error: fileError }) => (
            <div key={file.id}>
              <div className="flex items-start gap-3 rounded-xl bg-surface-800/60 border border-surface-700/60 px-3 py-2.5">
                <div className="flex-shrink-0 mt-0.5">{fileIcon(file.mimeType)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-surface-200 truncate">{file.name}</p>
                    <span className="text-[10px] text-surface-600 flex-shrink-0">{formatBytes(file.size)}</span>
                  </div>
                  {status === 'analyzing' && <AnalysisProgress />}
                  {status === 'done' && file.extractedText ? (
                    <p className="text-[11px] text-status-active mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />{file.extractedText.length.toLocaleString()} caracteres extraídos
                    </p>
                  ) : status === 'done' && !file.extractedText ? (
                    <p className="text-[11px] text-red-400 mt-0.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />Sem conteúdo — edite manualmente
                    </p>
                  ) : null}
                  {status === 'error' && (
                    <p className="text-[11px] text-red-400 mt-0.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{fileError ?? 'Erro ao analisar'}
                    </p>
                  )}
                </div>
                {status !== 'analyzing' && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (editingId === file.id) { setEditingId(null) }
                        else { setEditingId(file.id); setEditText(file.extractedText ?? '') }
                      }}
                      title="Ver/Editar texto"
                      className="p-1 rounded-lg text-surface-600 hover:text-brand-400 hover:bg-surface-700 transition"
                    >
                      {editingId === file.id ? <X className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemoveTarget(file.id)}
                      className="p-1 rounded-lg text-surface-600 hover:text-red-400 hover:bg-surface-700 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {/* Artifact editor */}
              {editingId === file.id && (
                <div className="mt-2">
                  <KnowledgeDocArtifact
                    title={file.name}
                    content={editText}
                    onChange={setEditText}
                    onSave={() => {
                      setEntries(prev => prev.map(e =>
                        e.file.id === file.id
                          ? { ...e, file: { ...e.file, extractedText: editText } }
                          : e,
                      ))
                      setEditingId(null)
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {analyzing && (
        <p className="mt-2 text-[11px] text-surface-500 text-center">
          Salve após a análise concluir para persistir os arquivos no contexto.
        </p>
      )}

      <ConfirmModal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={remove}
        title="Remover arquivo da marca"
        description="O arquivo será removido do contexto da empresa. Salve para confirmar a remoção permanente."
        confirmLabel="Remover arquivo"
        danger
      />
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function CompanyBrain() {
  const { user } = useAuth()
  const { toast, toasts, dismiss } = useToast()
  const [form, setForm] = useState<CompanyHubData>({ ...DEFAULT_HUB })
  const [fetching, setFetching] = useState(true)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (!user?.tenantId) { setFetching(false); return }
    let cancelled = false
    setFetching(true)
    loadHubAsync(user.tenantId).then(hub => {
      if (cancelled) return
      setForm(hub)
      setFetching(false)
    })
    return () => { cancelled = true }
  }, [user?.tenantId])

  const patch = (partial: Partial<CompanyHubData>) =>
    setForm(prev => ({ ...prev, ...partial }))

  const toggleBusinessType = (value: string) =>
    setForm(prev => ({
      ...prev,
      businessType: prev.businessType.includes(value)
        ? prev.businessType.filter(v => v !== value)
        : [...prev.businessType, value],
    }))

  const save = () => {
    setLoading(true)
    try {
      saveHub(user?.tenantId, form)
      toast('Contexto salvo. Copilot, agentes e CRM já usam as novas informações.', 'success')
    } catch {
      toast('Erro ao salvar. Tente novamente.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const hasContent = !!(form.companyName.trim() || form.industry || form.description.trim())
  const lastUpdated = form.lastUpdatedAt
    ? new Date(form.lastUpdatedAt).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  return (
    <div className="w-full">
      <SectionHeader
        title="Contexto da IA"
        description="Configure uma vez. Copilot, Agent Builder e o setup do CRM usam essas informações automaticamente."
      />

      {/* Status banner */}
      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 mb-4 border ${
        hasContent ? 'bg-status-active-bg border-status-active-border' : 'bg-brand-950/50 border-brand-500/20'
      }`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
          hasContent ? 'bg-status-active-bg' : 'bg-brand-500/20'
        }`}>
          <Brain className={`w-3.5 h-3.5 ${hasContent ? 'text-status-active' : 'text-brand-400'}`} />
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-4 flex-wrap">
          <div>
            <span className="text-xs font-semibold text-surface-100">
              {hasContent ? 'Contexto configurado' : 'Preencha o contexto da sua empresa'}
            </span>
            {hasContent && lastUpdated && (
              <span className="text-xs text-surface-500 ml-2">· Atualizado {lastUpdated}</span>
            )}
            {!hasContent && (
              <span className="text-xs text-surface-500 ml-2">· Injetado automaticamente no Copilot, agentes e CRM</span>
            )}
          </div>
          <UsedByBadges />
        </div>
      </div>

      {/* Identidade */}
      <SettingsSection
        title="Identidade"
        description="Nome, setor e porte orientam o tom e o contexto das respostas da IA."
      >
        <div className="space-y-3">
            <FormField label="Nome da empresa" required>
              <Input
                value={form.companyName}
                onChange={e => patch({ companyName: e.target.value })}
                placeholder="Ex: Oryon Tech, Clínica Bem Estar"
              />
            </FormField>

            <FormField label="Setor / Indústria">
              <Select value={form.industry} onChange={e => patch({ industry: e.target.value })}>
                <option value="">Selecione...</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </Select>
            </FormField>

            <FormField label="Modelo de negócio">
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {BUSINESS_TYPES.map(t => (
                  <PillToggle key={t} label={t} selected={form.businessType.includes(t)} onClick={() => toggleBusinessType(t)} />
                ))}
              </div>
            </FormField>

            <FormField label="Tamanho da equipe">
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {TEAM_SIZES.map(s => (
                  <PillToggle key={s} label={s} selected={form.teamSize === s} onClick={() => patch({ teamSize: form.teamSize === s ? '' : s })} />
                ))}
              </div>
            </FormField>
        </div>
      </SettingsSection>

      {/* Sobre o Negócio */}
      <SettingsSection
        title="Sobre o negócio"
        description="É daqui que o Copilot e os agentes tiram o que dizer sobre sua empresa, produtos e preços."
      >
        <div className="space-y-3">
            <FormField
              label="O que você faz?"
              hint="Missão, público-alvo e principais diferenciais."
            >
              <textarea
                value={form.description}
                onChange={e => patch({ description: e.target.value })}
                placeholder="Ex: Plataforma de atendimento via WhatsApp para PMEs. Centralizamos conversas, automatizamos follow-ups e ajudamos equipes a fechar mais negócios..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
              />
            </FormField>

            <FormField
              label="Produtos e serviços"
              hint="Liste o que você vende, com preços e detalhes para atendimento."
            >
              <textarea
                value={form.productsServices}
                onChange={e => patch({ productsServices: e.target.value })}
                placeholder={`Plano Starter — R$199/mês (até 3 usuários)\nPlano Pro — R$499/mês (usuários ilimitados)\nImplementação — a partir de R$2.000`}
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none focus:border-brand-500 transition-colors resize-none"
              />
            </FormField>
        </div>
      </SettingsSection>

      {/* Presença Online */}
      <SettingsSection
        title="Presença online"
        description="Site e redes sociais que a IA pode citar ao responder seus clientes."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            {([
              { key: 'website',   label: 'Site',               icon: Globe,      placeholder: 'https://seusite.com.br' },
              { key: 'whatsapp',  label: 'WhatsApp',            icon: Phone,      placeholder: '(11) 99999-9999 ou link' },
              { key: 'instagram', label: 'Instagram',           icon: Instagram,  placeholder: '@handle ou link completo' },
              { key: 'facebook',  label: 'Facebook',            icon: Facebook,   placeholder: 'facebook.com/sua-pagina' },
              { key: 'linkedin',  label: 'LinkedIn',            icon: Linkedin,   placeholder: 'linkedin.com/company/...' },
              { key: 'twitter',   label: 'Twitter / X',         icon: Twitter,    placeholder: '@handle ou link' },
            ] as const).map(({ key, label, icon: Icon, placeholder }) => (
              <div key={key} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3 h-3 text-surface-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-surface-600 mb-0.5">{label}</p>
                  <Input value={form[key]} onChange={e => patch({ [key]: e.target.value })} placeholder={placeholder} aria-label={label} />
                </div>
              </div>
            ))}
        </div>
      </SettingsSection>

      {/* Arquivos da Marca */}
      <SettingsSection
        title="Arquivos da marca"
        description="PDFs, DOCX, imagens e textos são lidos pela IA e o conteúdo alimenta o Copilot e os agentes."
      >
        <div className="flex justify-end mb-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 font-medium">Analisado por IA</span>
        </div>
        <BrandFilesSection
          files={form.brandFiles ?? []}
          onChange={brandFiles => patch({ brandFiles })}
        />
      </SettingsSection>

      <div className="flex justify-end gap-3 mt-6">
        <Button
          variant="secondary"
          onClick={async () => {
            setSyncing(true)
            try {
              const result = await syncBrainToRag()
              toast(`${result.synced} documento(s) sincronizado(s) com a base de conhecimento.`, 'success')
            } catch {
              toast('Erro ao sincronizar com a base de conhecimento.', 'error')
            } finally {
              setSyncing(false)
            }
          }}
          disabled={!(form.brandFiles?.length)}
          loading={syncing}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Sincronizar com IA
        </Button>
        <Button onClick={save} loading={loading} disabled={fetching}>Salvar contexto</Button>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
