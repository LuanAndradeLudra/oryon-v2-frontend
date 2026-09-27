import { useCallback, useEffect, useRef, useState } from 'react'
import { BookOpen, Eye, FileText, FileUp, PenLine, RefreshCw, Trash2 } from 'lucide-react'
import {
  addAgentKnowledge, deleteAgentKnowledge, extractBrandFileDetailed, getAgentKnowledgeDoc, listAgentKnowledge,
  updateAgentKnowledge, type AgentConfigWithTools, type AgentKnowledgeDoc,
} from '@/services/agentsApi'
import { KnowledgeDocArtifact } from '@/components/agents/KnowledgeDocArtifact'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/hooks/useToast'
import { useSalvamento } from '../salvamentoContexto'
import { CabecalhoDaSecao } from './Estrutura'
import { useTamanhoDeToque } from '../useToque'

const ACEITOS = '.pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp'

const STATUS_DOC: Record<string, { rotulo: string; cor: string }> = {
  ready: { rotulo: 'Pronto', cor: 'var(--color-status-active)' },
  processing: { rotulo: 'Processando', cor: 'var(--color-status-pending)' },
  error: { rotulo: 'Erro', cor: 'var(--color-danger)' },
}

const ORIGEM: Record<string, string> = { file: 'Arquivo', text: 'Texto', url: 'Página' }

function ChipDoDocumento({ status }: { status: string }) {
  const s = STATUS_DOC[status] ?? { rotulo: 'Pendente', cor: 'var(--color-status-muted)' }
  return (
    <span
      className="inline-flex h-5 items-center rounded-xs border px-[7px] text-2xs font-semibold whitespace-nowrap"
      style={{
        color: s.cor,
        backgroundColor: `color-mix(in srgb, ${s.cor} 12%, transparent)`,
        borderColor: `color-mix(in srgb, ${s.cor} 25%, transparent)`,
      }}
    >
      {s.rotulo}
    </span>
  )
}

/** Lê o arquivo como texto (texto puro) ou base64 (o resto) para a extração. */
async function lerArquivo(file: File): Promise<{ conteudo: string; tipo: 'base64' | 'text' }> {
  const ehTexto = file.type.startsWith('text/') || /\.(md|txt)$/i.test(file.name)
  if (ehTexto) return { conteudo: await file.text(), tipo: 'text' }
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binario = ''
  for (let i = 0; i < bytes.length; i++) binario += String.fromCharCode(bytes[i])
  return { conteudo: btoa(binario), tipo: 'base64' }
}

/** Progresso do envio: a extração leva segundos e não reporta etapas. */
function ProgressoDoEnvio({ nome }: { nome: string }) {
  const [segundos, setSegundos] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="flex items-center gap-3 rounded-md border border-surface-700 bg-[var(--sf2)] px-3 py-2.5" role="status">
      <RefreshCw className="h-4 w-4 flex-shrink-0 animate-spin text-accent-dark" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-surface-100">{nome}</p>
        <p className="text-xs text-surface-400">Extraindo o texto e indexando na base…</p>
      </div>
      <span className="text-xs tabular-nums text-surface-500">{segundos}s</span>
    </div>
  )
}

export function SecaoConhecimento({ agent, onMudou }: { agent: AgentConfigWithTools; onMudou: () => void }) {
  const tam = useTamanhoDeToque()
  const { toast } = useToast()
  const { salvar } = useSalvamento()
  const [docs, setDocs] = useState<AgentKnowledgeDoc[]>([])
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState<string | null>(null)
  const [aberto, setAberto] = useState<{ id: string; conteudo: string } | null>(null)
  const [abrindo, setAbrindo] = useState<string | null>(null)
  const [gravandoDoc, setGravandoDoc] = useState(false)
  const [atualizando, setAtualizando] = useState<string | null>(null)
  const [excluir, setExcluir] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [compondo, setCompondo] = useState(false)
  const [texto, setTexto] = useState({ nome: '', conteudo: '' })
  const [adicionandoTexto, setAdicionandoTexto] = useState(false)
  const arquivoNovo = useRef<HTMLInputElement>(null)
  const arquivoTroca = useRef<HTMLInputElement>(null)

  const recarregar = useCallback(async () => {
    try {
      setDocs(await listAgentKnowledge(agent.id))
    } catch {
      toast('Não foi possível carregar a base de conhecimento.', 'error')
    } finally {
      setCarregando(false)
    }
  }, [agent.id, toast])

  useEffect(() => {
    let vivo = true
    listAgentKnowledge(agent.id)
      .then((d) => { if (vivo) setDocs(d) })
      .catch(() => { if (vivo) toast('Não foi possível carregar a base de conhecimento.', 'error') })
      .finally(() => { if (vivo) setCarregando(false) })
    return () => { vivo = false }
  }, [agent.id, toast])

  const enviarArquivo = async (file: File, trocarId?: string) => {
    setEnviando(file.name)
    try {
      const { conteudo, tipo } = await lerArquivo(file)
      const { text: extraido, warning } = await extractBrandFileDetailed(file.name, file.type || 'text/plain', conteudo, tipo)
      if (trocarId) {
        await salvar(() => updateAgentKnowledge(agent.id, trocarId, { content: extraido, document_name: file.name }))
        setAberto({ id: trocarId, conteudo: extraido })
      } else {
        const novo = await salvar(() => addAgentKnowledge(agent.id, {
          document_id: `kb-${Date.now()}`,
          document_name: file.name,
          content: extraido,
          source_type: 'file',
        }))
        setAberto({ id: novo.id, conteudo: extraido })
      }
      await recarregar()
      onMudou()
      // Arquivo lido só em parte: o final não está na base, e o dono precisa saber.
      if (warning) toast(warning, 'warning')
    } catch (err) {
      // A rota explica o motivo (formato não suportado, arquivo sem texto...).
      toast(err instanceof Error && err.message ? err.message : `Não foi possível enviar "${file.name}".`, 'error')
    } finally {
      setEnviando(null)
      setAtualizando(null)
    }
  }

  const adicionarTexto = async () => {
    const conteudo = texto.conteudo.trim()
    if (!conteudo) return
    setAdicionandoTexto(true)
    try {
      await salvar(() => addAgentKnowledge(agent.id, {
        document_id: `kb-text-${Date.now()}`,
        document_name: texto.nome.trim() || `Texto ${docs.length + 1}`,
        content: conteudo,
        source_type: 'text',
      }))
      setTexto({ nome: '', conteudo: '' })
      setCompondo(false)
      await recarregar()
      onMudou()
    } catch {
      toast('Não foi possível adicionar o texto.', 'error')
    } finally {
      setAdicionandoTexto(false)
    }
  }

  const abrir = async (id: string) => {
    setAbrindo(id)
    try {
      const doc = await getAgentKnowledgeDoc(agent.id, id)
      setAberto({ id, conteudo: doc.content ?? '' })
    } catch {
      toast('Não foi possível abrir o documento.', 'error')
    } finally {
      setAbrindo(null)
    }
  }

  const gravarDocumento = async () => {
    if (!aberto) return
    setGravandoDoc(true)
    try {
      await salvar(() => updateAgentKnowledge(agent.id, aberto.id, { content: aberto.conteudo }))
      setAberto(null)
      await recarregar()
    } catch {
      toast('Não foi possível salvar o documento.', 'error')
    } finally {
      setGravandoDoc(false)
    }
  }

  const confirmarExclusao = async () => {
    if (!excluir) return
    setExcluindo(true)
    try {
      await salvar(() => deleteAgentKnowledge(agent.id, excluir))
      setDocs((d) => d.filter((x) => x.id !== excluir))
      onMudou()
    } catch {
      toast('Não foi possível excluir o documento.', 'error')
    } finally {
      setExcluindo(false)
      setExcluir(null)
    }
  }

  const docAberto = docs.find((d) => d.id === aberto?.id)
  const docExcluir = docs.find((d) => d.id === excluir)

  return (
    <div>
      <CabecalhoDaSecao
        id="conhecimento"
        acoes={
          <>
            <Button variant="neutral" size={tam} leftIcon={<PenLine className="h-3.5 w-3.5" />} onClick={() => setCompondo(true)}>
              Escrever texto
            </Button>
            <Button size={tam} leftIcon={<FileUp className="h-3.5 w-3.5" />} onClick={() => arquivoNovo.current?.click()} disabled={!!enviando}>
              Enviar arquivo
            </Button>
          </>
        }
      >
        <p className="mt-1 text-xs text-surface-500">PDF, DOCX, TXT, MD ou imagem — o texto é extraído automaticamente.</p>
      </CabecalhoDaSecao>

      <input ref={arquivoNovo} type="file" accept={ACEITOS} className="hidden" aria-hidden tabIndex={-1}
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void enviarArquivo(f) }} />
      <input ref={arquivoTroca} type="file" accept={ACEITOS} className="hidden" aria-hidden tabIndex={-1}
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f && atualizando) void enviarArquivo(f, atualizando) }} />

      {enviando && <div className="mb-3"><ProgressoDoEnvio nome={enviando} /></div>}

      {carregando ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full bg-[var(--sf2)]" />)}
        </div>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="A base de conhecimento está vazia"
          hint="Envie tabelas de preço, convênios, políticas ou perguntas frequentes. A IA consulta esses documentos antes de responder."
          action={{ label: 'Enviar o primeiro arquivo', onClick: () => arquivoNovo.current?.click() }}
        />
      ) : (
        <ul className="divide-y divide-surface-700 overflow-hidden rounded-lg border border-surface-700">
          {docs.map((doc) => {
            const previa = (doc.content_preview ?? '').replace(/\s+/g, ' ').trim()
            return (
              <li key={doc.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 bg-[var(--sf2)] px-4 py-3">
                <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-surface-500" aria-hidden />
                <div className="min-w-0 flex-1 basis-[calc(100%-2rem)] sm:basis-auto">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="min-w-0 truncate text-sm font-semibold text-surface-100">{doc.document_name}</p>
                    <ChipDoDocumento status={doc.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-surface-500">
                    {ORIGEM[doc.source_type] ?? doc.source_type} · adicionado em {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                  </p>
                  {previa && <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-surface-400">{previa}</p>}
                </div>
                <div className="flex w-full flex-shrink-0 items-center justify-end gap-1 sm:w-auto">
                  <Button variant="ghost" size={tam} loading={abrindo === doc.id} leftIcon={<Eye className="h-3.5 w-3.5" />} onClick={() => void abrir(doc.id)}>
                    Abrir
                  </Button>
                  {doc.source_type === 'file' && (
                    <Button variant="ghost" size={tam} iconOnly aria-label={`Trocar o arquivo de ${doc.document_name}`} title="Trocar arquivo"
                      onClick={() => { setAtualizando(doc.id); arquivoTroca.current?.click() }} disabled={!!enviando}>
                      <FileUp className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size={tam} iconOnly aria-label={`Excluir ${doc.document_name}`} title="Excluir" onClick={() => setExcluir(doc.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmModal
        open={!!excluir}
        onClose={() => setExcluir(null)}
        onConfirm={() => void confirmarExclusao()}
        title="Excluir documento"
        description="O documento sai da base e a IA deixa de consultá-lo. Isso não pode ser desfeito."
        impact={docExcluir ? { label: `Documento "${docExcluir.document_name}"`, tone: 'danger' } : undefined}
        confirmLabel="Excluir documento"
        danger
        loading={excluindo}
      />

      <Modal open={!!aberto} onClose={() => setAberto(null)} title={docAberto?.document_name ?? 'Documento'} className="max-w-3xl">
        {aberto && (
          <KnowledgeDocArtifact
            title=""
            content={aberto.conteudo}
            onChange={(v) => setAberto((a) => (a ? { ...a, conteudo: v } : a))}
            onSave={() => void gravarDocumento()}
            onCancel={() => setAberto(null)}
            saving={gravandoDoc}
          />
        )}
      </Modal>

      <Modal open={compondo} onClose={() => setCompondo(false)} title="Escrever texto para a base" className="max-w-2xl">
        <div className="space-y-4">
          <FormField label="Nome do documento" hint="Opcional. Ex.: Política de cancelamento.">
            <Input value={texto.nome} onChange={(e) => setTexto((t) => ({ ...t, nome: e.target.value }))} />
          </FormField>
          <FormField label="Conteúdo" hint={`${texto.conteudo.length.toLocaleString('pt-BR')} caracteres`}>
            <Textarea rows={14} value={texto.conteudo} onChange={(e) => setTexto((t) => ({ ...t, conteudo: e.target.value }))}
              placeholder="Cole ou escreva o que a IA deve saber…" className="leading-relaxed" />
          </FormField>
          <div className="flex justify-end gap-2 border-t border-surface-700 pt-4">
            <Button variant="neutral" onClick={() => setCompondo(false)}>Cancelar</Button>
            <Button onClick={() => void adicionarTexto()} loading={adicionandoTexto} disabled={!texto.conteudo.trim()}>
              Adicionar à base
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
