import { useState, useRef, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X, Upload, FileText, FileJson, FileCode2, ChevronDown,
  CheckCircle2, AlertCircle, Loader2, ArrowRight, ArrowLeft,
  Users, ClipboardPaste, FolderOpen, Sparkles,
} from 'lucide-react'
import { appLogger } from '@/services/appLogger'
import { Banner } from '@/components/ui/Banner'
import { useMultiPipeline } from '@/hooks/useMultiPipeline'
import { cn, getPipelineStages, getActivePipelines } from '@/lib/utils'
import type { Contact, ContactSource, Pipeline } from '@/types'

// Anthropic SDK removed — AI-powered import mapping will use Agent Server in the future
const anthropic = {
  messages: {
    async create(_opts: Record<string, unknown>) {
      return { content: [{ type: 'text' as const, text: '[]' }], usage: { input_tokens: 0, output_tokens: 0 } }
    },
  },
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'map' | 'preview' | 'importing' | 'done'

type TargetField =
  | 'displayName' | 'waId' | 'email' | 'company'
  | 'jobTitle' | 'source' | 'stage' | '__skip__'

interface FieldDef { key: TargetField; label: string; required?: boolean }

const TARGET_FIELDS: FieldDef[] = [
  { key: 'displayName', label: 'Nome',      required: true },
  { key: 'waId',        label: 'WhatsApp',  required: true },
  { key: 'email',       label: 'E-mail' },
  { key: 'company',     label: 'Empresa' },
  { key: 'jobTitle',    label: 'Cargo' },
  { key: 'source',      label: 'Origem' },
  { key: 'stage',       label: 'Estágio do contato' },
  { key: '__skip__',    label: '— Ignorar coluna —' },
]

type ColumnMap = Record<string, TargetField>  // csvColumn → targetField
type ParsedRow  = Record<string, string>

interface ImportContactDrawerProps {
  open: boolean
  onClose: () => void
  onCreate: (dto: Partial<Contact> & { displayName: string; waId: string; pipelineId?: string; pipelineStageId?: string }) => Promise<Contact>
  onDone?: (count: number) => void
  /** Funis de negócio do tenant — todo contato importado nasce com um negócio
   *  neste funil (mesma regra do "Novo Lead" manual, spec 2026-07-09). */
  pipelines: Pipeline[]
  defaultPipelineId?: string | null
}

// ─── Parsers ──────────────────────────────────────────────────────────────────

function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean)
  if (lines.length === 0) return { headers: [], rows: [] }

  const parseRow = (line: string): string[] => {
    const cells: string[] = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
        else inQ = !inQ
      } else if ((ch === ',' || ch === ';') && !inQ) {
        cells.push(cur.trim()); cur = ''
      } else {
        cur += ch
      }
    }
    cells.push(cur.trim())
    return cells
  }

  const headers = parseRow(lines[0]).map((h) => h.replace(/^["']|["']$/g, ''))
  const rows = lines.slice(1).map((line) => {
    const vals = parseRow(line)
    const row: ParsedRow = {}
    headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
    return row
  })
  return { headers, rows }
}

function parseJSON(text: string): { headers: string[]; rows: ParsedRow[] } {
  const data = JSON.parse(text)
  const arr: Record<string, unknown>[] = Array.isArray(data) ? data : data.contacts ?? data.data ?? []
  if (arr.length === 0) return { headers: [], rows: [] }
  const headers = Array.from(new Set(arr.flatMap(Object.keys)))
  const rows = arr.map((item) => {
    const row: ParsedRow = {}
    headers.forEach((h) => { row[h] = String(item[h] ?? '') })
    return row
  })
  return { headers, rows }
}

function parseXML(text: string): { headers: string[]; rows: ParsedRow[] } {
  const doc = new DOMParser().parseFromString(text, 'text/xml')
  const items = Array.from(doc.querySelectorAll('contact, Contact, item, Item, record, Record, row, Row'))
  if (items.length === 0) return { headers: [], rows: [] }
  const headers = Array.from(new Set(items.flatMap((el) =>
    Array.from(el.children).map((c) => c.tagName),
  )))
  const rows = items.map((el) => {
    const row: ParsedRow = {}
    headers.forEach((h) => { row[h] = el.querySelector(h)?.textContent?.trim() ?? '' })
    return row
  })
  return { headers, rows }
}

// ─── Auto-detect column mapping ───────────────────────────────────────────────

const HINTS: Record<TargetField, string[]> = {
  displayName: ['nome', 'name', 'full_name', 'fullname', 'contact', 'contato', 'cliente', 'customer'],
  waId:        ['whatsapp', 'telefone', 'phone', 'celular', 'numero', 'wa_id', 'waid', 'mobile', 'fone', 'tel'],
  email:       ['email', 'e-mail', 'mail', 'correio'],
  company:     ['empresa', 'company', 'negocio', 'organization', 'org', 'organização'],
  jobTitle:    ['cargo', 'job', 'position', 'funcao', 'titulo', 'role', 'title'],
  source:      ['origem', 'source', 'canal', 'channel'],
  stage:       ['estagio', 'stage', 'etapa', 'fase', 'status', 'pipeline'],
  __skip__:    [],
}

function autoDetect(headers: string[]): ColumnMap {
  const map: ColumnMap = {}
  const used = new Set<TargetField>()
  headers.forEach((h) => {
    const norm = h.toLowerCase().replace(/[\s_-]/g, '')
    for (const [field, hints] of Object.entries(HINTS) as [TargetField, string[]][]) {
      if (field === '__skip__') continue
      if (!used.has(field) && hints.some((hint) => norm.includes(hint.replace(/[\s_-]/g, '')))) {
        map[h] = field
        used.add(field)
        return
      }
    }
    map[h] = '__skip__'
  })
  return map
}

// ─── AI column analysis ───────────────────────────────────────────────────────

export type AiConfidence = 'high' | 'medium' | 'low'
export type AiSuggestions = Record<string, { field: TargetField; confidence: AiConfidence }>

async function analyzeWithAI(headers: string[], rows: ParsedRow[]): Promise<AiSuggestions> {
  const sample = rows.slice(0, 3).map((r) =>
    headers.map((h) => `${h}: ${r[h] ?? ''}`).join(' | '),
  ).join('\n')

  const prompt = `You are a CRM data mapping assistant. Map each column header to the best CRM field.

Available CRM fields:
- displayName: Contact full name
- waId: WhatsApp phone number (digits only, international format, e.g. 5511999887766)
- email: Email address
- company: Company or organization name
- jobTitle: Job title, role or position
- source: Lead origin channel (whatsapp/instagram/facebook/website/referral/campaign/manual/other)
- stage: CRM pipeline stage name
- __skip__: Does not match any field

Column headers: ${JSON.stringify(headers)}

Sample data (up to 3 rows):
${sample}

Return ONLY a compact JSON object. For each header key, output an object with "field" and "confidence" ("high"/"medium"/"low").
Example: {"Nome Completo": {"field": "displayName", "confidence": "high"}, "Celular": {"field": "waId", "confidence": "high"}}
Rules:
- Prefer "high" when the column name or data clearly identifies the field
- Use "medium" when it's a reasonable guess
- Use "low" or "__skip__" when uncertain
- Never map two columns to the same non-__skip__ field (pick the best match)
Return ONLY the JSON, no explanation.`

  const t0 = Date.now()
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })
  appLogger.logAIExecution({
    execution_type: 'import_column_mapping',
    model: 'claude-haiku-4-5-20251001',
    input_summary: `${headers.length} columns: ${headers.slice(0, 5).join(', ')}`,
    input_tokens: res.usage.input_tokens,
    output_tokens: res.usage.output_tokens,
    latency_ms: Date.now() - t0,
    status: 'success',
  })

  const text  = res.content[0].type === 'text' ? res.content[0].text : '{}'
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return {}

  const raw = JSON.parse(match[0]) as Record<string, { field: string; confidence: string }>

  // Deduplicate: if two cols map to the same field, keep only the first (highest in file order)
  const usedFields = new Set<TargetField>()
  const result: AiSuggestions = {}
  for (const h of headers) {
    const entry = raw[h]
    if (!entry) continue
    const field = entry.field as TargetField
    const confidence = (entry.confidence as AiConfidence) ?? 'medium'
    if (field !== '__skip__' && usedFields.has(field)) {
      result[h] = { field: '__skip__', confidence: 'low' }
    } else {
      result[h] = { field, confidence }
      if (field !== '__skip__') usedFields.add(field)
    }
  }
  return result
}

// ─── Row validation ───────────────────────────────────────────────────────────

function validateRow(row: ParsedRow, colMap: ColumnMap): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  const get = (field: TargetField) => {
    const col = Object.entries(colMap).find(([, f]) => f === field)?.[0]
    return col ? (row[col] ?? '').trim() : ''
  }
  if (!get('displayName')) issues.push('Nome vazio')
  const waId = get('waId').replace(/\D/g, '')
  if (!waId)            issues.push('WhatsApp vazio')
  else if (waId.length < 10 || waId.length > 15) issues.push('WhatsApp inválido')
  return { valid: issues.length === 0, issues }
}

// ─── Small UI helpers ─────────────────────────────────────────────────────────

const FILE_ICONS: Record<string, React.ElementType> = {
  csv: FileText, json: FileJson, xml: FileCode2,
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'upload',    label: 'Arquivo' },
    { id: 'map',       label: 'Mapeamento' },
    { id: 'preview',   label: 'Revisão' },
    { id: 'importing', label: 'Importando' },
  ]
  const order: Step[] = ['upload', 'map', 'preview', 'importing', 'done']
  const cur = order.indexOf(step === 'done' ? 'importing' : step)
  return (
    <div className="flex items-center gap-0 px-5 py-3 border-b border-surface-800 flex-shrink-0">
      {steps.map((s, i) => {
        const idx  = order.indexOf(s.id)
        const done = cur > idx
        const active = cur === idx
        return (
          <div key={s.id} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <div className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors',
                done   ? 'bg-brand-500 text-surface-950' :
                active ? 'bg-brand-500/20 border border-brand-500 text-brand-400' :
                         'bg-surface-800 border border-surface-700 text-surface-600',
              )}>
                {done ? <CheckCircle2 className="w-3 h-3" /> : i + 1}
              </div>
              <span className={cn(
                'text-[11px] font-medium',
                active ? 'text-surface-200' : done ? 'text-surface-400' : 'text-surface-600',
              )}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('w-8 h-px mx-2', done ? 'bg-brand-500/50' : 'bg-surface-800')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main drawer ──────────────────────────────────────────────────────────────

export function ImportContactsDrawer({ open, onClose, onCreate, onDone, pipelines, defaultPipelineId }: ImportContactDrawerProps) {
  const [step, setStep]         = useState<Step>('upload')
  const [uploadMode, setUploadMode] = useState<'file' | 'paste'>('file')
  const [pasteText, setPasteText]   = useState('')
  const [pasteFormat, setPasteFormat] = useState<'csv' | 'json'>('csv')
  const [file, setFile]         = useState<File | null>(null)
  const [headers, setHeaders]   = useState<string[]>([])
  const [rows, setRows]         = useState<ParsedRow[]>([])
  const [colMap, setColMap]         = useState<ColumnMap>({})
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestions>({})
  const [aiLoading, setAiLoading]   = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [progress, setProgress]     = useState(0)
  const [importedCount, setImportedCount] = useState(0)
  const [errors, setErrors]         = useState<string[]>([])
  const [dragging, setDragging]     = useState(false)
  const multiPipeline = useMultiPipeline()
  const [pipelineId, setPipelineId] = useState('')
  const [pipelineStageId, setPipelineStageId] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStep('upload'); setFile(null); setHeaders([]); setRows([])
    setColMap({}); setAiSuggestions({}); setAiLoading(false)
    setParseError(null); setProgress(0)
    setImportedCount(0); setErrors([]); setDragging(false)
    setPasteText(''); setUploadMode('file'); setPipelineId(''); setPipelineStageId('')
  }

  // Reseta ao abrir — o drawer fica sempre montado (o pai só alterna
  // `open`), e o fluxo normal de conclusão (handleImport → onDone) fecha via
  // o pai sem passar por `handleClose`/`reset()`. Sem isto, reabrir "Importar"
  // reaproveitava silenciosamente o funil (e o step/arquivo) da importação
  // anterior em vez de recomeçar do zero.
  useEffect(() => {
    if (open) reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Funil pré-selecionado ao abrir (funil em vista, senão o default do
  // tenant) — mesma regra do drawer de Novo Lead. Reage a `pipelines`
  // chegando depois do open para não travar em '' (mesma corrida corrigida
  // em NewContactDrawer).
  // F9 (SCRUM-878): funil de destino é OPCIONAL — default = nenhum; só
  // pré-seleciona quando o chamador está dentro de um funil.
  useEffect(() => {
    if (open && !pipelineId && defaultPipelineId && pipelines.some((p) => p.id === defaultPipelineId)) {
      setPipelineId(defaultPipelineId)
    }
  }, [open, pipelines, defaultPipelineId, pipelineId])

  // "Estágio do funil" — aplica-se a TODOS os negócios criados nesta
  // importação (eixo distinto da coluna "Estágio do contato" mapeada por
  // linha, ver TARGET_FIELDS). Reativo à troca de funil: se o estágio
  // selecionado não existe mais no funil atual, recai pro 1º não-terminal.
  useEffect(() => {
    const opts = getPipelineStages(pipelines, pipelineId)
    if (!opts.some((s) => s.id === pipelineStageId)) {
      setPipelineStageId(opts[0]?.id ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipelineId, pipelines])

  const handleClose = () => { reset(); onClose() }

  // ── Parse helpers ──────────────────────────────────────────────────────────

  const applyParsed = useCallback((parsed: { headers: string[]; rows: ParsedRow[] }, errorMsg: string) => {
    if (parsed.headers.length === 0) { setParseError(errorMsg); return false }
    setHeaders(parsed.headers)
    setRows(parsed.rows)
    // Start with heuristic mapping immediately, then upgrade with AI
    setColMap(autoDetect(parsed.headers))
    setAiSuggestions({})
    setAiLoading(true)
    setParseError(null)
    setStep('map')
    // Fire AI analysis in the background — upgrades colMap when it resolves
    analyzeWithAI(parsed.headers, parsed.rows).then((suggestions) => {
      setAiSuggestions(suggestions)
      setColMap(
        Object.fromEntries(parsed.headers.map((h) => [
          h,
          suggestions[h]?.field ?? autoDetect(parsed.headers)[h] ?? '__skip__',
        ])),
      )
    }).catch(() => { /* keep heuristic mapping on error */ }).finally(() => setAiLoading(false))
    return true
  }, [])

  const processFile = useCallback((f: File) => {
    // File size limit — 5MB
    if (f.size > 5 * 1024 * 1024) {
      setParseError('Arquivo excede o limite de 5MB.')
      return
    }

    setFile(f); setParseError(null)
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      try {
        const parsed =
          ext === 'json' ? parseJSON(text) :
          ext === 'xml'  ? parseXML(text)  :
                           parseCSV(text)

        // Sanitize cell values — prevent formula injection (=, +, -, @)
        for (const row of parsed.rows) {
          for (const [key, val] of Object.entries(row)) {
            if (typeof val === 'string' && /^[=+\-@]/.test(val)) {
              ;(row as Record<string, unknown>)[key] = "'" + val
            }
          }
        }

        applyParsed(parsed, 'Arquivo sem colunas detectadas. Verifique o formato.')
      } catch {
        setParseError('Não foi possível interpretar o arquivo. Verifique se está bem formatado.')
      }
    }
    reader.readAsText(f, 'utf-8')
  }, [applyParsed])

  const detectPasteFormat = (text: string): 'csv' | 'json' =>
    /^\s*[\[{]/.test(text) ? 'json' : 'csv'

  const processPaste = useCallback(() => {
    if (!pasteText.trim()) { setParseError('Cole algum conteúdo antes de continuar.'); return }
    setParseError(null)
    // Always auto-detect from content — ignores the manual selector to prevent user error
    const detected = detectPasteFormat(pasteText)
    setPasteFormat(detected)
    try {
      const parsed = detected === 'json' ? parseJSON(pasteText) : parseCSV(pasteText)
      applyParsed(parsed, 'Nenhuma coluna detectada. Verifique o formato do texto colado.')
    } catch (err) {
      // If auto-detect guessed wrong, try the other parser before giving up
      try {
        const fallback = detected === 'json' ? parseCSV(pasteText) : parseJSON(pasteText)
        applyParsed(fallback, 'Nenhuma coluna detectada. Verifique o formato do texto colado.')
      } catch {
        setParseError('Não foi possível interpretar o texto. Verifique se é um JSON ou CSV válido.')
      }
    }
  }, [pasteText, applyParsed])

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) processFile(f)
  }

  // ── Import ─────────────────────────────────────────────────────────────────

  const validRows = rows.filter((r) => validateRow(r, colMap).valid)

  const handleImport = async () => {
    setStep('importing'); setProgress(0); setImportedCount(0); setErrors([])
    const errs: string[] = []
    let done = 0
    const get = (row: ParsedRow, field: TargetField) => {
      const col = Object.entries(colMap).find(([, f]) => f === field)?.[0]
      return col ? (row[col] ?? '').trim() : ''
    }
    for (const row of validRows) {
      try {
        const dto = {
          displayName: get(row, 'displayName'),
          waId:        get(row, 'waId').replace(/\D/g, ''),
          ...(get(row, 'email')    && { email:    get(row, 'email') }),
          ...(get(row, 'company')  && { company:  get(row, 'company') }),
          ...(get(row, 'jobTitle') && { jobTitle: get(row, 'jobTitle') }),
          ...(get(row, 'source')   && { source:   get(row, 'source') as ContactSource }),
          ...(get(row, 'stage')    && { stage:    get(row, 'stage') }),
          source: (get(row, 'source') as ContactSource) || 'import' as ContactSource,
          // F9 (SCRUM-878): com funil, o backend faz o `enter(origin=import)`
          // na mesma transação do contato (F2-836) — sem `POST /deals` daqui.
          ...(multiPipeline && pipelineId && { pipelineId, ...(pipelineStageId && { pipelineStageId }) }),
        }
        await onCreate(dto)
        done++
        setImportedCount(done)
        setProgress(Math.round((done / validRows.length) * 100))
      } catch {
        errs.push(`Linha ${rows.indexOf(row) + 2}: falha ao criar contato`)
      }
    }
    setErrors(errs)
    setStep('done')
    onDone?.(done)
  }

  // ── Render steps ───────────────────────────────────────────────────────────

  const ext = file?.name.split('.').pop()?.toLowerCase() ?? ''
  const FileIcon = FILE_ICONS[ext] ?? FileText

  const validCount   = rows.filter((r) => validateRow(r, colMap).valid).length
  const invalidCount = rows.length - validCount

  const hasRequiredMapped =
    Object.values(colMap).includes('displayName') &&
    Object.values(colMap).includes('waId')

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="ic-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 z-[39]"
            onClick={handleClose}
          />

          <motion.div
            key="ic-drawer"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.9 }}
            className="fixed top-0 right-0 bottom-0 w-[560px] z-40 bg-surface-950 border-l overlay-frame flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800 flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-surface-50">Importar contatos</h2>
                <p className="text-xs text-surface-500 mt-0.5">CSV, JSON ou XML — até 1.000 contatos por vez</p>
              </div>
              <button onClick={handleClose} className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            {step !== 'upload' && step !== 'done' && <StepIndicator step={step} />}

            {/* Body */}
            <div className="flex-1 overflow-y-auto">

              {/* ── Step 1: Upload ── */}
              {step === 'upload' && (
                <div className="p-5 flex flex-col gap-4">

                  {/* Mode tabs */}
                  <div className="flex items-center bg-surface-800 border border-surface-700 rounded-xl p-1 w-fit">
                    <button
                      onClick={() => { setUploadMode('file'); setParseError(null) }}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                        uploadMode === 'file'
                          ? 'bg-surface-700 text-surface-100 shadow-sm'
                          : 'text-surface-400 hover:text-surface-200',
                      )}
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      Arquivo
                    </button>
                    <button
                      onClick={() => { setUploadMode('paste'); setParseError(null) }}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                        uploadMode === 'paste'
                          ? 'bg-surface-700 text-surface-100 shadow-sm'
                          : 'text-surface-400 hover:text-surface-200',
                      )}
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      Colar texto
                    </button>
                  </div>

                  {/* ── File mode ── */}
                  {uploadMode === 'file' && (
                    <>
                      <div
                        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={onDrop}
                        onClick={() => inputRef.current?.click()}
                        className={cn(
                          'border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 py-14 cursor-pointer transition-all',
                          dragging
                            ? 'border-brand-500 bg-brand-500/5'
                            : 'border-surface-700 hover:border-surface-600 hover:bg-surface-800/40',
                        )}
                      >
                        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center transition-colors', dragging ? 'bg-brand-500/20' : 'bg-surface-800')}>
                          <Upload className={cn('w-5 h-5', dragging ? 'text-brand-400' : 'text-surface-500')} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-surface-200">
                            {dragging ? 'Solte o arquivo aqui' : 'Arraste ou clique para selecionar'}
                          </p>
                          <p className="text-xs text-surface-600 mt-1">Suporta .csv, .tsv, .json, .xml</p>
                        </div>
                        <input
                          ref={inputRef}
                          type="file"
                          accept=".csv,.tsv,.txt,.json,.xml"
                          className="hidden"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }}
                        />
                      </div>

                      {/* Format guides */}
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { ext: 'CSV', icon: FileText, desc: 'Primeira linha como cabeçalho. Vírgula ou ponto-e-vírgula como separador.' },
                          { ext: 'JSON', icon: FileJson, desc: 'Array de objetos ou {"contacts": [...]}' },
                          { ext: 'XML', icon: FileCode2, desc: 'Tags <contact> com campos como sub-elementos.' },
                        ].map(({ ext: e, icon: Icon, desc }) => (
                          <div key={e} className="bg-surface-800/60 border border-surface-700/50 rounded-xl p-3 flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <Icon className="w-3.5 h-3.5 text-brand-400" />
                              <span className="text-xs font-semibold text-surface-300">.{e.toLowerCase()}</span>
                            </div>
                            <p className="text-[11px] text-surface-600 leading-relaxed">{desc}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* ── Paste mode ── */}
                  {uploadMode === 'paste' && (
                    <div className="flex flex-col gap-3">
                      {/* Auto-detect indicator + example buttons */}
                      <div className="flex items-center justify-between gap-3">
                        {/* Live format badge — updated as user types */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-surface-600">Formato detectado:</span>
                          {pasteText.trim() ? (
                            <span className={cn(
                              'text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border',
                              detectPasteFormat(pasteText) === 'json'
                                ? 'text-status-pending bg-status-pending-bg border-status-pending-border'
                                : 'text-brand-400 bg-brand-500/10 border-brand-500/25',
                            )}>
                              {detectPasteFormat(pasteText)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-surface-700 italic">automático</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => { setPasteText('nome,whatsapp,email,empresa\nJoão Silva,5511999887766,joao@email.com,Empresa X\nMaria Souza,5521988776655,maria@email.com,Empresa Y'); setParseError(null) }}
                            className="text-[11px] text-surface-500 hover:text-surface-300 transition-colors"
                          >
                            Exemplo CSV
                          </button>
                          <button
                            onClick={() => { setPasteText('[{"nome":"João Silva","whatsapp":"5511999887766","email":"joao@email.com"},{"nome":"Maria Souza","whatsapp":"5521988776655","email":"maria@email.com"}]'); setParseError(null) }}
                            className="text-[11px] text-surface-500 hover:text-surface-300 transition-colors"
                          >
                            Exemplo JSON
                          </button>
                        </div>
                      </div>

                      {/* Textarea */}
                      <div className="relative">
                        <textarea
                          value={pasteText}
                          onChange={(e) => { setPasteText(e.target.value); setParseError(null); setPasteFormat(detectPasteFormat(e.target.value)) }}
                          placeholder={
                            pasteFormat === 'csv'
                              ? 'nome,whatsapp,email\nJoão Silva,5511999887766,joao@empresa.com\n…'
                              : '[{"nome": "João Silva", "whatsapp": "5511999887766"}, …]'
                          }
                          spellCheck={false}
                          rows={12}
                          className={cn(
                            'w-full bg-surface-950 border rounded-xl px-4 py-3 text-xs font-mono text-surface-200',
                            'placeholder-surface-700 resize-none focus:outline-none focus:ring-1 transition-colors',
                            parseError
                              ? 'border-red-500/50 focus:ring-red-500/30'
                              : 'border-surface-700 focus:ring-brand-500/40 focus:border-brand-500/50',
                          )}
                        />
                        {pasteText && (
                          <button
                            onClick={() => { setPasteText(''); setParseError(null) }}
                            className="absolute top-2.5 right-2.5 p-1 rounded text-surface-600 hover:text-surface-400 hover:bg-surface-800 transition-all"
                            title="Limpar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Hint — follows live detection */}
                      {pasteText.trim() && detectPasteFormat(pasteText) === 'csv' && (
                        <p className="text-[11px] text-surface-600">
                          Primeira linha detectada como cabeçalho CSV. Use vírgula <code className="text-surface-500">,</code> ou ponto-e-vírgula <code className="text-surface-500">;</code> como separador.
                        </p>
                      )}
                      {pasteText.trim() && detectPasteFormat(pasteText) === 'json' && (
                        <p className="text-[11px] text-surface-600">
                          JSON detectado. Aceita array <code className="text-surface-500">{"[{...}]"}</code> ou objeto com chave <code className="text-surface-500">contacts</code> / <code className="text-surface-500">data</code>. Telefones com máscara (<code className="text-surface-500">+55 11 98765-4321</code>) são aceitos.
                        </p>
                      )}
                      {!pasteText.trim() && (
                        <p className="text-[11px] text-surface-600">
                          Cole qualquer formato — CSV, JSON. O formato é detectado automaticamente pelo conteúdo.
                        </p>
                      )}

                      <button
                        onClick={processPaste}
                        disabled={!pasteText.trim()}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium bg-brand-600 hover:bg-brand-500 text-surface-950 disabled:opacity-40 transition-all"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        Processar texto
                      </button>
                    </div>
                  )}

                  {parseError && (
                    <Banner variant="danger">{parseError}</Banner>
                  )}
                </div>
              )}

              {/* ── Step 2: Column mapping ── */}
              {step === 'map' && (
                <div className="p-5 flex flex-col gap-4">

                  {/* File / source badge */}
                  <div className="flex items-center gap-2 p-3 bg-surface-800/60 border border-surface-700/50 rounded-xl">
                    <FileIcon className="w-4 h-4 text-brand-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-surface-300 truncate">
                      {file?.name ?? 'Texto colado'}
                    </span>
                    <span className="text-xs text-surface-600 ml-auto flex-shrink-0">{rows.length} linhas</span>
                  </div>

                  {/* AI status banner */}
                  <AnimatePresence mode="wait">
                    {aiLoading ? (
                      <motion.div
                        key="ai-loading"
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      >
                        <Banner variant="info" icon={<Loader2 className="w-4 h-4 animate-spin" />}>
                          <p className="font-medium">IA analisando colunas…</p>
                          <p className="text-white/70 mt-0.5">Identificando campos automaticamente, mesmo com nomes diferentes</p>
                        </Banner>
                      </motion.div>
                    ) : Object.keys(aiSuggestions).length > 0 ? (
                      <motion.div
                        key="ai-done"
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      >
                        <Banner variant="info" icon={<Sparkles className="w-4 h-4" />}>
                          <p className="font-medium">
                            IA mapeou {Object.values(aiSuggestions).filter((s) => s.field !== '__skip__').length} de {headers.length} colunas
                          </p>
                          <p className="text-white/70 mt-0.5">Revise abaixo e ajuste se necessário</p>
                        </Banner>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>

                  <div>
                    <p className="text-xs font-semibold text-surface-400 mb-3">
                      Mapeamento de colunas — ajuste se necessário:
                    </p>
                    <div className="flex flex-col gap-2">
                      {headers.map((h) => {
                        const suggestion = aiSuggestions[h]
                        const isAiMapped = !aiLoading && suggestion && suggestion.field !== '__skip__'
                        const confColor =
                          suggestion?.confidence === 'high'   ? 'text-status-active bg-status-active-bg border-status-active-border' :
                          suggestion?.confidence === 'medium' ? 'text-status-pending bg-status-pending-bg border-status-pending-border' :
                                                                'text-surface-500 bg-surface-800 border-surface-700'
                        const confLabel =
                          suggestion?.confidence === 'high'   ? 'Alta confiança' :
                          suggestion?.confidence === 'medium' ? 'Confiança média' : ''

                        return (
                          <div
                            key={h}
                            className={cn(
                              'flex items-center gap-3 p-2.5 border rounded-xl transition-colors',
                              isAiMapped
                                ? 'bg-status-pending-bg border-status-pending-border'
                                : 'bg-surface-800/40 border-surface-700/50',
                            )}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs font-mono text-surface-300 truncate">{h}</p>
                                {isAiMapped && confLabel && (
                                  <span className={cn('text-[9px] font-semibold px-1.5 py-0.5 rounded-full border leading-none', confColor)}>
                                    {confLabel}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-surface-600 truncate mt-0.5">
                                ex: {rows[0]?.[h] || '—'}
                              </p>
                            </div>

                            <ArrowRight className={cn('w-3.5 h-3.5 flex-shrink-0', isAiMapped ? 'text-brand-500/50' : 'text-surface-700')} />

                            <div className="relative w-44 flex-shrink-0">
                              <select
                                value={colMap[h] ?? '__skip__'}
                                onChange={(e) => {
                                  setColMap((m) => ({ ...m, [h]: e.target.value as TargetField }))
                                  // Clear AI suggestion if user overrides
                                  setAiSuggestions((s) => { const n = { ...s }; delete n[h]; return n })
                                }}
                                className={cn(
                                  'w-full appearance-none border rounded-lg py-1.5 text-xs text-surface-100',
                                  'focus:outline-none focus:ring-1 focus:ring-brand-500/40 focus:border-brand-500/60 pr-7 transition-colors',
                                  isAiMapped
                                    ? 'bg-status-pending-bg border-status-pending-border pl-7'
                                    : 'bg-surface-800 border-surface-700 pl-2.5',
                                )}
                              >
                                {TARGET_FIELDS.map((f) => (
                                  <option key={f.key} value={f.key}>
                                    {f.label}{f.required ? ' *' : ''}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-surface-500" />
                              {isAiMapped && (
                                <Sparkles className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-brand-400" />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {!hasRequiredMapped && !aiLoading && (
                    <Banner variant="warning">
                      A IA não conseguiu identificar os campos <strong>Nome</strong> e <strong>WhatsApp</strong>. Selecione manualmente.
                    </Banner>
                  )}
                </div>
              )}

              {/* ── Step 3: Preview ── */}
              {step === 'preview' && (
                <div className="p-5 flex flex-col gap-4">
                  {/* Summary pills */}
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-status-active bg-status-active-bg border border-status-active-border px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      {validCount} prontos para importar
                    </span>
                    {invalidCount > 0 && (
                      <span
                        className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full color-chip border"
                        style={{ ['--chip']: 'var(--color-danger)' } as React.CSSProperties}
                      >
                        <AlertCircle className="w-3 h-3" />
                        {invalidCount} com erros (serão ignorados)
                      </span>
                    )}
                  </div>

                  {/* Funil + estágio de destino — todo contato importado nasce
                      com um negócio neste funil (mesma regra do "Novo Lead"
                      manual). "Estágio do funil" é a coluna do board em que o
                      negócio nasce; eixo distinto do "Estágio do contato"
                      mapeado por coluna acima (ciclo de vida).
                      Só com o gate de múltiplos funis (SCRUM-498). */}
                  {multiPipeline && (
                  <>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-surface-400 mb-1.5 block">
                        Funil de destino <span className="text-surface-500 font-normal">(opcional)</span>
                      </label>
                      <div className="relative w-full">
                        <select
                          value={pipelineId}
                          onChange={(e) => setPipelineId(e.target.value)}
                          className="w-full appearance-none bg-surface-800 border border-surface-700 rounded-lg py-1.5 pl-2.5 pr-7 text-xs text-surface-100 focus:outline-none focus:ring-1 focus:ring-brand-500/40 focus:border-brand-500/60 transition-colors"
                          data-testid="import-pipeline"
                        >
                          <option value="">— nenhum —</option>
                          {getActivePipelines(pipelines).map((p) => (
                            <option key={p.id} value={p.id}>{p.name}{p.isDefault ? ' (padrão)' : ''}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-surface-500" />
                      </div>
                    </div>

                    <div className="flex-1">
                      <label className="text-xs font-semibold text-surface-400 mb-1.5 block">
                        Estágio do funil
                      </label>
                      <div className="relative w-full">
                        <select
                          value={pipelineStageId}
                          onChange={(e) => setPipelineStageId(e.target.value)}
                          className="w-full appearance-none bg-surface-800 border border-surface-700 rounded-lg py-1.5 pl-2.5 pr-7 text-xs text-surface-100 focus:outline-none focus:ring-1 focus:ring-brand-500/40 focus:border-brand-500/60 transition-colors"
                        >
                          {getPipelineStages(pipelines, pipelineId).length === 0 && (
                            <option value="">Nenhum estágio disponível</option>
                          )}
                          {getPipelineStages(pipelines, pipelineId).map((s) => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-surface-500" />
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-surface-600 -mt-1">
                    Com funil, cada contato importado já entra na etapa escolhida — na mesma operação. Sem funil, só o contato é criado.
                  </p>
                  </>
                  )}

                  {/* Preview table */}
                  <div className="border border-surface-700/60 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-surface-700/60 bg-surface-800/60">
                            <th className="px-3 py-2 text-left font-semibold text-surface-500 w-8">#</th>
                            {Object.entries(colMap)
                              .filter(([, f]) => f !== '__skip__')
                              .map(([col, field]) => (
                                <th key={col} className="px-3 py-2 text-left font-semibold text-surface-400 whitespace-nowrap">
                                  {TARGET_FIELDS.find((f) => f.key === field)?.label ?? col}
                                </th>
                              ))}
                            <th className="px-3 py-2 text-left font-semibold text-surface-500">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.slice(0, 8).map((row, i) => {
                            const { valid, issues } = validateRow(row, colMap)
                            return (
                              <tr key={i} className={cn('border-b border-surface-800/60 last:border-0', !valid && 'bg-danger/5')}>
                                {/* Número da linha no ARQUIVO, não a posição na prévia — rows já
                                    exclui o cabeçalho (parseCSV faz lines.slice(1)), então a linha
                                    1 do arquivo é o header e rows[0] é a linha 2. Mesma fórmula (+2)
                                    usada nas mensagens de erro do import (`Linha ${idx+2}: ...`) —
                                    antes mostrava i+1, divergindo do que o erro reportaria pra essa
                                    mesma linha. */}
                                <td className="px-3 py-2 text-surface-600">{i + 2}</td>
                                {Object.entries(colMap)
                                  .filter(([, f]) => f !== '__skip__')
                                  .map(([col]) => (
                                    <td key={col} className="px-3 py-2 text-surface-300 max-w-[120px] truncate">
                                      {row[col] || <span className="text-surface-700">—</span>}
                                    </td>
                                  ))}
                                <td className="px-3 py-2">
                                  {valid
                                    ? <span className="text-status-active">✓</span>
                                    : <span className="text-red-400 text-[10px]" title={issues.join(', ')}>⚠ {issues[0]}</span>
                                  }
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    {rows.length > 8 && (
                      <div className="px-3 py-2 text-center text-[11px] text-surface-600 border-t border-surface-800/60">
                        + {rows.length - 8} linhas não exibidas
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── Step 4: Importing / Done ── */}
              {(step === 'importing' || step === 'done') && (
                <div className="p-5 flex flex-col items-center justify-center gap-5 min-h-64">
                  {step === 'importing' ? (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
                      </div>
                      <div className="w-full max-w-xs flex flex-col gap-2 text-center">
                        <p className="text-sm font-semibold text-surface-200">Importando contatos…</p>
                        <p className="text-xs text-surface-500">{importedCount} de {validCount} criados</p>
                        <div className="w-full h-2 bg-surface-800 rounded-full overflow-hidden mt-1">
                          <motion.div
                            className="h-full bg-brand-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ ease: 'easeOut' }}
                          />
                        </div>
                        <p className="text-xs text-surface-600">{progress}%</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-status-active-bg border border-status-active-border flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-status-active" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-surface-100">Importação concluída!</p>
                        <p className="text-xs text-surface-500 mt-1">
                          <span className="text-status-active font-medium">{importedCount}</span> contato{importedCount !== 1 ? 's' : ''} importado{importedCount !== 1 ? 's' : ''} com sucesso
                        </p>
                      </div>
                      {errors.length > 0 && (
                        <Banner variant="danger" className="w-full max-w-xs">
                          <p className="font-semibold">{errors.length} falha{errors.length !== 1 ? 's' : ''}</p>
                          <div className="mt-1 max-h-24 overflow-y-auto flex flex-col gap-0.5">
                            {errors.map((e, i) => (
                              <p key={i} className="text-white/80">{e}</p>
                            ))}
                          </div>
                        </Banner>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => { reset() }}
                          className="px-4 py-2 rounded-lg text-sm text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-all"
                        >
                          Nova importação
                        </button>
                        <button
                          onClick={handleClose}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-500 text-surface-950 transition-all"
                        >
                          <Users className="w-3.5 h-3.5" />
                          Ver contatos
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer navigation */}
            {(step === 'map' || step === 'preview') && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-surface-800 flex-shrink-0">
                <button
                  onClick={() => setStep(step === 'map' ? 'upload' : 'map')}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar
                </button>

                {step === 'map' ? (
                  <button
                    onClick={() => setStep('preview')}
                    disabled={!hasRequiredMapped || aiLoading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-500 text-surface-950 disabled:opacity-50 transition-all"
                  >
                    {aiLoading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Aguardando IA…</>
                      : <>Revisar {rows.length} contatos <ArrowRight className="w-3.5 h-3.5" /></>
                    }
                  </button>
                ) : (
                  <button
                    onClick={handleImport}
                    disabled={validCount === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 hover:bg-brand-500 text-surface-950 disabled:opacity-50 transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Importar {validCount} contato{validCount !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
