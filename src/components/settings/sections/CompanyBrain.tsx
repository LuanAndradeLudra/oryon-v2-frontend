import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Bot, BarChart2, Sparkles,
  Globe, Instagram, Facebook, Linkedin, Twitter, Phone,
  UploadCloud, FileText, FileImage, File, X, CheckCircle2, AlertCircle, RefreshCw,
} from 'lucide-react'
import { SectionHeader } from '../SectionHeader'
import { SettingsSection } from '../SettingsSection'
import { Textarea } from '@/components/ui/Textarea'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { Button } from '@/components/ui/Button'
import { useToast, showToast } from '@/hooks/useToast'
import { useAuth } from '@/contexts/AuthContext'
import {
  loadHubOrNull, saveHubAndWait, syncBrainToRag, DEFAULT_HUB,
  type CompanyHubData, type BrandFile,
} from '@/services/companyContextService'
import { extractBrandFile } from '@/services/agentsApi'
import { ConfirmModal } from '@/components/ui/Modal'
import { KnowledgeDocArtifact } from '@/components/agents/KnowledgeDocArtifact'
import { cn } from '@/lib/utils'
import { SettingsSectionsProvider } from '../SettingsSection'
import { Check, Circle } from 'lucide-react'
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase'
import { ItensDaBaseDoCopilot } from '@/components/copilot/BaseDoCopilot'
import { useAvisoAoSair } from './useAvisoAoSair'

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
          ? 'bg-accent-soft border-brand-500/40 text-accent-dark'
          : 'bg-surface-800 border-surface-700 text-surface-300 hover:border-surface-600 hover:text-surface-100'
      }`}
    >
      {label}
    </button>
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
        <p className="text-xs text-brand-400 transition-all duration-500">{ANALYSIS_STEPS[step]}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1 bg-surface-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-surface-600 tabular-nums w-8 text-right">{elapsed}s</span>
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
      showToast(`"${raw.name}" excede o limite de ${MAX_FILE_MB} MB.`, 'error')
      return
    }
    if (!ACCEPTED_TYPES.includes(raw.type)) {
      showToast(`Tipo de arquivo não suportado: ${raw.type || raw.name}`, 'error')
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
        // Eixo 10: surface-800 é branco no claro — a 40/70% de opacidade a
        // zona quase some contra o fundo da página. --sf2/--rowhover têm
        // valor dedicado nos dois temas.
        className={`flex items-center gap-3 rounded-[6px] border-2 border-dashed px-4 py-3 cursor-pointer transition-all ${
          dragOver
            ? 'border-brand-500 bg-accent-soft'
            : 'border-surface-700 bg-[var(--sf2)] hover:border-surface-600 hover:bg-[var(--rowhover)]'
        }`}
      >
        <input ref={inputRef} type="file" multiple accept={ACCEPTED_ATTR} className="sr-only" onChange={handleInput} />
        <div className="w-8 h-8 rounded-[6px] bg-surface-800 border border-surface-700 flex items-center justify-center flex-shrink-0">
          <UploadCloud className="w-4 h-4 text-surface-400" />
        </div>
        <div>
          <p className="text-xs font-medium text-surface-200">
            Arraste ou <span className="text-brand-400">clique para selecionar</span>
          </p>
          <p className="text-xs text-surface-500 mt-0.5">PDF · DOCX · PNG · JPG · WEBP · TXT — até {MAX_FILE_MB} MB</p>
        </div>
      </div>

      {/* File list */}
      {entries.length > 0 && (
        <div className="mt-3 space-y-2">
          {entries.map(({ file, status, error: fileError }) => (
            <div key={file.id}>
              <div className="flex items-start gap-3 rounded-[6px] border border-surface-700 px-3 py-2.5">
                <div className="flex-shrink-0 mt-0.5">{fileIcon(file.mimeType)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-surface-200 truncate">{file.name}</p>
                    <span className="text-xs text-surface-600 flex-shrink-0">{formatBytes(file.size)}</span>
                  </div>
                  {status === 'analyzing' && <AnalysisProgress />}
                  {status === 'done' && file.extractedText ? (
                    <p className="text-xs text-status-active mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />{file.extractedText.length.toLocaleString()} caracteres extraídos
                    </p>
                  ) : status === 'done' && !file.extractedText ? (
                    <p className="text-xs text-red-400 mt-0.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />Sem conteúdo — edite manualmente
                    </p>
                  ) : null}
                  {status === 'error' && (
                    <p className="text-xs text-red-400 mt-0.5 flex items-center gap-1">
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
                      className="p-1 rounded-[6px] text-surface-600 hover:text-brand-400 hover:bg-[var(--rowhover)] transition"
                    >
                      {editingId === file.id ? <X className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemoveTarget(file.id)}
                      className="p-1 rounded-[6px] text-surface-600 hover:text-danger hover:bg-[var(--rowhover)] transition"
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
        <p className="mt-2 text-xs text-surface-500 text-center">
          Salve após a análise concluir para persistir os arquivos no contexto.
        </p>
      )}

      <ConfirmModal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={remove}
        title="Remover arquivo da marca"
        impact={{ label: `Arquivo ${entries.find(e => e.file.id === removeTarget)?.file.name ?? ''}`.trim(), tone: 'danger' }}
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
  const { toast } = useToast()
  const [form, setForm] = useState<CompanyHubData>({ ...DEFAULT_HUB })
  const [fetching, setFetching] = useState(true)
  // Revisão 11/10: leitura do contexto que falhou NÃO vira formulário vazio
  // salvável — gravar em cima de um vazio falso apagaria tudo no servidor.
  const [erroHub, setErroHub] = useState(false)
  const [tentativaHub, setTentativaHub] = useState(0)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  // O que está salvo, para dizer "alterações não salvas".
  const [salvoJson, setSalvoJson] = useState('')
  // Proposta SCRUM-1253 (PO, 08/10): a base do Copilot entrou aqui — um lugar
  // só para o que a IA sabe. As instruções salvam junto com o contexto.
  // Uma fonte só da base (revisão 11/10): esta instância é passada aos itens
  // do Copilot por props, e o hook compartilha o estado com o resto do app.
  const base = useKnowledgeBase(user?.tenantId)
  const basePronta = base.carga === 'pronta'
  const [instrucoes, setInstrucoes] = useState<string | null>(null)
  const instrucoesValor = instrucoes ?? base.kb.instructions
  const instrucoesMudaram = instrucoes !== null && instrucoes !== base.kb.instructions

  useEffect(() => {
    if (!user?.tenantId) { setFetching(false); return }
    let cancelled = false
    setFetching(true)
    setErroHub(false)
    loadHubOrNull(user.tenantId).then(hub => {
      if (cancelled) return
      if (hub) {
        setForm(hub)
        setSalvoJson(JSON.stringify(hub))
      } else {
        setErroHub(true)
      }
      setFetching(false)
    })
    return () => { cancelled = true }
  }, [user?.tenantId, tentativaHub])

  const patch = (partial: Partial<CompanyHubData>) =>
    setForm(prev => ({ ...prev, ...partial }))

  const toggleBusinessType = (value: string) =>
    setForm(prev => ({
      ...prev,
      businessType: prev.businessType.includes(value)
        ? prev.businessType.filter(v => v !== value)
        : [...prev.businessType, value],
    }))

  // Revisão 11/10: as duas gravações são esperadas; o "não salvo" só some
  // do que de fato gravou, e qualquer falha aparece.
  const save = async () => {
    if (erroHub || fetching) return
    setLoading(true)
    const erros: string[] = []
    try {
      const hubMudou = JSON.stringify(form) !== salvoJson
      if (hubMudou) {
        const r = await saveHubAndWait(user?.tenantId, form)
        if (r === 'ok') {
          const salvo = { ...form, lastUpdatedAt: new Date().toISOString() }
          setForm(salvo)
          setSalvoJson(JSON.stringify(salvo))
        } else {
          erros.push(r === 'forbidden' ? 'Só administradores podem alterar o contexto da empresa.' : 'O contexto da empresa não foi salvo.')
        }
      }
      if (instrucoesMudaram && instrucoes !== null) {
        if (!basePronta) {
          erros.push('As instruções do Copilot não foram salvas: a base do Copilot não carregou.')
        } else {
          const r = await base.setInstructions(instrucoes)
          if (r.ok) setInstrucoes(null)
          else erros.push(`Instruções do Copilot: ${r.erro}`)
        }
      }
      if (erros.length === 0) toast('Contexto salvo. Copilot, agentes e CRM já usam as novas informações.', 'success')
      else toast(erros.join(' '), 'error')
    } finally {
      setLoading(false)
    }
  }

  const lastUpdated = form.lastUpdatedAt
    ? new Date(form.lastUpdatedAt).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  const secoes = (
    <>
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
              <SelectMenu value={form.industry} onChange={e => patch({ industry: e.target.value })}>
                <option value="">Selecione...</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </SelectMenu>
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
              <Textarea
                value={form.description}
                onChange={e => patch({ description: e.target.value })}
                placeholder="Ex: Plataforma de atendimento via WhatsApp para PMEs. Centralizamos conversas, automatizamos follow-ups e ajudamos equipes a fechar mais negócios..."
                rows={3}
                className="resize-none"
              />
            </FormField>

            <FormField
              label="Produtos e serviços"
              hint="Liste o que você vende, com preços e detalhes para atendimento."
            >
              <Textarea
                value={form.productsServices}
                onChange={e => patch({ productsServices: e.target.value })}
                placeholder={`Plano Starter — R$199/mês (até 3 usuários)\nPlano Pro — R$499/mês (usuários ilimitados)\nImplementação — a partir de R$2.000`}
                rows={4}
                className="resize-none"
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
                <div className="w-7 h-7 rounded-[6px] bg-surface-800 border border-surface-700 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3 h-3 text-surface-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-surface-600 mb-0.5">{label}</p>
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
          <span className="color-chip-soft text-xs px-2 py-0.5 rounded-[6px] border font-medium" style={{ ['--chip']: 'var(--color-brand-500)' } as React.CSSProperties}>Analisado por IA</span>
        </div>
        <BrandFilesSection
          files={form.brandFiles ?? []}
          onChange={brandFiles => patch({ brandFiles })}
        />
      </SettingsSection>

      {(
        <SettingsSection
          title="Instruções para o Copilot"
          description="Como o Copilot deve responder a você e à equipe: tom, formato e o que priorizar. Os agentes que atendem clientes seguem a configuração de cada agente."
        >
          {base.carga === 'erro' ? (
            <div role="alert" className="flex items-center gap-3 rounded-[10px] border border-danger/30 bg-danger/5 px-4 py-3 text-xs text-danger">
              <span className="flex-1">{base.erroCarga ?? 'Não foi possível carregar as instruções do Copilot.'} Para não apagar o que está salvo, a edição fica bloqueada.</span>
              <button type="button" onClick={base.recarregar} className="font-semibold underline underline-offset-2 hover:opacity-80">Tentar de novo</button>
            </div>
          ) : (
            <Textarea
              value={instrucoesValor}
              onChange={(e) => setInstrucoes(e.target.value)}
              disabled={!basePronta}
              rows={5}
              placeholder={basePronta ? 'Ex.: responda de forma objetiva, em tópicos; quando falar de vendas, traga os números da semana.' : 'Carregando…'}
              aria-label="Instruções para o Copilot"
            />
          )}
        </SettingsSection>
      )}

      <SettingsSection
        title="Base do Copilot"
        description="Campos e documentos que o Copilot usa ao responder você e a equipe. Os agentes que atendem clientes usam Sobre o negócio e Arquivos da marca. Cada alteração aqui é salva na hora."
      >
        <ItensDaBaseDoCopilot base={base} />
      </SettingsSection>
    </>
  )

  const sincronizar = async () => {
    setSyncing(true)
    try {
      const result = await syncBrainToRag()
      toast(`${result.synced} documento(s) sincronizado(s) com a base de conhecimento.`, 'success')
    } catch {
      toast('Erro ao sincronizar com a base de conhecimento.', 'error')
    } finally {
      setSyncing(false)
    }
  }

  // ── SCRUM-1253 (PO, 07/10): o formulário à esquerda; à direita, o
  // que a IA já sabe (o quanto está preenchido, item a item, e quem usa) — no
  // lugar do banner verde. Salvar no cabeçalho fixo, com o estado ao lado.
  {
    const sujo = (!!salvoJson && JSON.stringify(form) !== salvoJson) || instrucoesMudaram
    useAvisoAoSair(sujo)
    const redes = [form.website, form.instagram, form.facebook, form.linkedin, form.twitter, form.whatsapp].filter((x) => x?.trim()).length
    const arquivos = form.brandFiles?.length ?? 0
    const itens = [
      { rotulo: 'Nome da empresa', feito: !!form.companyName.trim(), ancora: 'identidade' },
      { rotulo: 'Setor', feito: !!form.industry, ancora: 'identidade' },
      { rotulo: 'O que a empresa faz', feito: !!form.description.trim(), ancora: 'sobre-o-negocio' },
      { rotulo: 'Produtos e preços', feito: !!form.productsServices.trim(), ancora: 'sobre-o-negocio' },
      { rotulo: redes ? `Site e redes (${redes})` : 'Site e redes', feito: redes > 0, ancora: 'presenca-online' },
      { rotulo: arquivos ? `Arquivos da marca (${arquivos})` : 'Arquivos da marca', feito: arquivos > 0, ancora: 'arquivos-da-marca' },
      ...([{ rotulo: 'Instruções para o Copilot', feito: !!instrucoesValor.trim(), ancora: 'instrucoes-para-o-copilot' }]),
    ]
    const pct = Math.round((itens.filter((i) => i.feito).length / itens.length) * 100)
    return (
      <div className="w-full">
        <SectionHeader
          title="Contexto da IA"
          description="Configure uma vez: o Copilot, os agentes de IA e a configuração do CRM usam estas informações."
          fixo
          action={
            <div className="flex items-center gap-3">
              {erroHub ? (
                <span role="alert" className="inline-flex items-center gap-1.5 text-xs text-danger">
                  <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden sm:inline">O contexto não carregou.</span>
                  <button type="button" onClick={() => setTentativaHub((n) => n + 1)} className="font-semibold underline underline-offset-2">Tentar de novo</button>
                </span>
              ) : (
                <span className={cn('hidden items-center gap-1.5 text-xs sm:inline-flex', sujo ? 'text-status-pending' : 'text-surface-500')}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', sujo ? 'bg-status-pending' : 'bg-surface-500')} aria-hidden />
                  {sujo ? 'Alterações não salvas' : lastUpdated ? `Salvo · ${lastUpdated}` : 'Nada salvo ainda'}
                </span>
              )}
              <Button onClick={() => void save()} loading={loading} disabled={fetching || erroHub || !sujo}>Salvar contexto</Button>
            </div>
          }
        />
        {/* Painel ao lado só a partir de 1280px: em 1024 ele espremia as seções
            (coluna de títulos com ~100px e o botão de upload quebrando). */}
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_248px] xl:gap-8">
          {/* Provider próprio: o índice "Nesta página" do layout não duplica o painel ao lado. */}
          <SettingsSectionsProvider>
            <div className="min-w-0">{secoes}</div>
          </SettingsSectionsProvider>
          <aside className="mt-6 xl:mt-0">
            <div className="rounded-[10px] border border-surface-700 bg-surface-800 p-4 xl:sticky xl:top-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-semibold text-surface-100">O que a IA já sabe</p>
                <span className="text-xs font-semibold tabular-nums text-surface-300">{pct}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EAEEF3] [:root:not([data-theme=light])_&]:bg-surface-700" aria-hidden>
                <div className="h-full rounded-full bg-[var(--color-btn-primary-bg)]" style={{ width: `${pct}%` }} />
              </div>
              <ul className="mt-3 flex flex-col gap-1.5">
                {itens.map((i) => (
                  <li key={i.rotulo}>
                    <a href={`#${i.ancora}`} className="flex items-center gap-2 text-xs hover:underline">
                      {i.feito
                        ? <Check className="h-3.5 w-3.5 flex-shrink-0 text-accent-dark" aria-hidden />
                        : <Circle className="h-3.5 w-3.5 flex-shrink-0 text-surface-500" aria-hidden />}
                      <span className={i.feito ? 'text-surface-200' : 'text-surface-400'}>{i.rotulo}</span>
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-surface-700 pt-3">
                <p className="text-2xs text-surface-500">Quem usa este contexto</p>
                <ul className="mt-1.5 flex flex-col gap-1 text-xs text-surface-300">
                  <li className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-surface-400" aria-hidden />Copilot</li>
                  <li className="flex items-center gap-1.5"><Bot className="h-3.5 w-3.5 text-surface-400" aria-hidden />Agentes de IA</li>
                  <li className="flex items-center gap-1.5"><BarChart2 className="h-3.5 w-3.5 text-surface-400" aria-hidden />Configuração do CRM</li>
                </ul>
              </div>
              {arquivos > 0 && (
                <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => void sincronizar()} loading={syncing} leftIcon=<RefreshCw className="h-3.5 w-3.5" />>
                  Sincronizar arquivos com a IA
                </Button>
              )}
            </div>
          </aside>
        </div>
      </div>
    )
  }
}
