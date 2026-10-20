// ─── Console "Termos" (super_admin, 20/10) ───────────────────────────────────
// Versões dos Termos de Uso e da Política de Privacidade: vigente, agendada
// (com o aviso por e-mail aos donos) e histórico. Publicar é definitivo — a
// versão é a prova do aceite, por isso a janela mostra o resumo antes.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, FileText, Mail, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Checkbox } from '@/components/ui/Checkbox'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { Textarea } from '@/components/ui/Textarea'
import { showToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'
import {
  adminTermsApi,
  TERMS_DOC_LABEL,
  type AdminTermsVersion,
  type TermsDocument,
} from '@/services/adminTermsApi'

const fmtData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')
const DOCS: TermsDocument[] = ['terms_of_use', 'privacy_policy']

function StatusChip({ v }: { v: AdminTermsVersion }) {
  if (v.status === 'current') return <Badge variant="resolved">Vigente</Badge>
  if (v.status === 'scheduled') return <Badge variant="pending">Agendada</Badge>
  return <Badge variant="abandoned">Anterior</Badge>
}

function TextoLink({ v }: { v: AdminTermsVersion }) {
  if (v.contentUrl) {
    return (
      <a href={v.contentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-400 hover:underline">
        abrir o texto <ExternalLink className="w-3 h-3" />
      </a>
    )
  }
  return <span>{v.hasContent ? 'texto guardado na plataforma' : 'sem texto'}</span>
}

export function TermsAdminPage() {
  const [data, setData] = useState<{ owners: number; versions: AdminTermsVersion[] } | null>(null)
  const [error, setError] = useState(false)
  const [publicar, setPublicar] = useState(false)
  const [avisando, setAvisando] = useState<string | null>(null)

  const load = useCallback(() => {
    setError(false)
    adminTermsApi.list().then(setData).catch(() => setError(true))
  }, [])
  useEffect(() => { load() }, [load])

  async function avisar(v: AdminTermsVersion) {
    setAvisando(v.id)
    try {
      const r = await adminTermsApi.notify(v.id)
      showToast(`Aviso em envio para ${r.recipients} dono(s). Quem já recebeu não recebe de novo.`, 'success')
      // O envio segue em segundo plano: recarrega em instantes para a barra andar.
      setTimeout(load, 4000)
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível avisar os donos'), 'error')
    } finally {
      setAvisando(null)
    }
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full bg-surface-950">
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-6">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold text-surface-50">Termos</h1>
              <p className="text-sm text-surface-400">Versões dos Termos de Uso e da Política de Privacidade. Uma versão publicada não pode ser editada nem apagada.</p>
            </div>
            <Button leftIcon={<Plus className="w-4 h-4" />} onClick={() => setPublicar(true)} disabled={!data}>Publicar nova versão</Button>
          </div>

          {error ? (
            <ErrorState onRetry={load} />
          ) : !data ? (
            <div className="grid gap-4 lg:grid-cols-2"><SkeletonCard lines={4} /><SkeletonCard lines={4} /></div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {DOCS.map((doc) => {
                const versoes = data.versions.filter((v) => v.document === doc)
                const destaque = versoes.filter((v) => v.status !== 'previous')
                const anteriores = versoes.filter((v) => v.status === 'previous')
                return (
                  <Card key={doc} className="p-4 min-w-0">
                    <h2 className="text-sm font-semibold text-surface-50 mb-3">{TERMS_DOC_LABEL[doc]}</h2>
                    {versoes.length === 0 ? (
                      <EmptyState icon={FileText} title="Nenhuma versão publicada" hint="Publique a primeira versão pelo botão acima." className="mt-0" />
                    ) : (
                      <div className="space-y-2.5">
                        {destaque.map((v) => {
                          const falta = Math.max(0, data.owners - v.noticeSent)
                          const pct = data.owners ? Math.min(100, Math.round((v.noticeSent / data.owners) * 100)) : 0
                          return (
                            <div key={v.id} className="rounded-xl border border-surface-800 p-3">
                              <div className="flex items-center gap-2 text-sm font-semibold text-surface-100">{v.version} <StatusChip v={v} /></div>
                              <p className="mt-1 text-xs text-surface-400 leading-relaxed">
                                {v.status === 'scheduled'
                                  ? <>Passa a valer em {fmtData(v.effectiveAt)} · publicada em {fmtData(v.createdAt)} · </>
                                  : <>Em vigor desde {fmtData(v.effectiveAt)} · aceita por {v.acceptances} usuário(s) · </>}
                                <TextoLink v={v} />
                              </p>
                              {v.status === 'scheduled' && (
                                <>
                                  <p className="mt-2 text-xs text-surface-400">
                                    Aviso por e-mail: <b className="text-surface-100">{v.noticeSent} de {data.owners} donos</b>
                                    {v.noticeProblems > 0 && <> · {v.noticeProblems} com problema</>}
                                  </p>
                                  <div className="mt-1.5 h-1.5 rounded-full bg-surface-800 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Donos avisados">
                                    <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                                  </div>
                                  <div className="mt-2.5 flex flex-wrap gap-2">
                                    {v.contentUrl && falta > 0 && (
                                      <Button size="sm" variant="secondary" loading={avisando === v.id} leftIcon={<Mail className="w-3.5 h-3.5" />} onClick={() => avisar(v)}>
                                        {v.noticeSent === 0 ? 'Avisar os donos' : 'Avisar quem falta'}
                                      </Button>
                                    )}
                                    <Link to="/admin/emails?tipo=terms.update&situacao=all" className="inline-flex items-center h-7 px-2 text-xs text-surface-400 hover:text-surface-200">
                                      Ver envios em E-mails
                                    </Link>
                                  </div>
                                </>
                              )}
                            </div>
                          )
                        })}
                        {anteriores.length > 0 && (
                          <div className="border-t border-surface-800 pt-2 text-xs text-surface-500 space-y-1">
                            {anteriores.map((v) => (
                              <div key={v.id} className="flex justify-between gap-3">
                                <span>{v.version} · anterior</span>
                                <span className="text-right">desde {fmtData(v.effectiveAt)} · {v.acceptances} aceite(s)</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {publicar && data && (
        <PublicarModal
          owners={data.owners}
          versoes={data.versions}
          onClose={() => setPublicar(false)}
          onDone={() => { setPublicar(false); load() }}
        />
      )}
    </div>
  )
}

/** Hoje + n dias, no formato do <input type="date">. */
const diaIso = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function PublicarModal({ owners, versoes, onClose, onDone }: {
  owners: number
  versoes: AdminTermsVersion[]
  onClose: () => void
  onDone: () => void
}) {
  const [doc, setDoc] = useState<TermsDocument>('terms_of_use')
  const [versao, setVersao] = useState('')
  const [data, setData] = useState(diaIso(30))
  const [url, setUrl] = useState('')
  const [texto, setTexto] = useState('')
  const [avisar, setAvisar] = useState(true)
  const [enviando, setEnviando] = useState(false)

  const futura = data > diaIso(0)
  const urlOk = /^https?:\/\/\S+\.\S+/.test(url.trim())
  const podeAvisar = futura && urlOk
  const repetida = useMemo(() => versoes.some((v) => v.document === doc && v.version.trim() === versao.trim()), [versoes, doc, versao])
  const erros = {
    versao: !versao.trim() ? 'Informe a versão.' : repetida ? 'Esta versão já foi publicada para este documento.' : undefined,
    url: url.trim() && !urlOk ? 'Use um link completo, com https://' : undefined,
    texto: !url.trim() && !texto.trim() ? 'Informe o link ou o texto completo.' : undefined,
  }
  const valido = !erros.versao && !erros.url && !erros.texto && !!data

  async function enviar() {
    if (!valido) return
    setEnviando(true)
    try {
      // Meio-dia local: a data escolhida não "volta um dia" por fuso.
      const effectiveAt = new Date(`${data}T12:00:00`).toISOString()
      const r = await adminTermsApi.publish({
        document: doc,
        version: versao.trim(),
        effectiveAt,
        ...(url.trim() ? { contentUrl: url.trim() } : {}),
        ...(texto.trim() ? { content: texto.trim() } : {}),
        notify: avisar && podeAvisar,
      })
      showToast(r.notice ? `Versão publicada. Aviso em envio para ${r.notice.recipients} dono(s).` : 'Versão publicada.', 'success')
      onDone()
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Não foi possível publicar a versão'), 'error')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      open
      onClose={enviando ? () => {} : onClose}
      title="Publicar nova versão"
      className="max-w-[560px]"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={enviando}>Cancelar</Button>
          <Button onClick={enviar} loading={enviando} disabled={!valido}>Publicar versão</Button>
        </div>
      }
    >
      <p className="text-xs text-surface-400 mb-4">Publicar é definitivo: a versão não pode ser editada nem apagada depois, porque é ela que vale como prova do aceite.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
        <FormField label="Documento">
          <SelectMenu value={doc} onValueChange={(v) => setDoc(v as TermsDocument)} aria-label="Documento">
            {(Object.keys(TERMS_DOC_LABEL) as TermsDocument[]).map((d) => <option key={d} value={d}>{TERMS_DOC_LABEL[d]}</option>)}
          </SelectMenu>
        </FormField>
        <FormField label="Versão" hint="Ex.: 2026-11 ou 3.2. Não pode repetir." error={versao ? erros.versao : undefined}>
          <Input value={versao} maxLength={32} onChange={(e) => setVersao(e.target.value)} placeholder="2026-11" />
        </FormField>
      </div>
      <FormField label="Começa a valer em" hint="Com data futura, os donos leem antes e o aceite é pedido a partir dessa data.">
        <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </FormField>
      <FormField label="Link público do texto" hint='Obrigatório para avisar por e-mail: é o link do botão "Ler a nova versão".' error={erros.url}>
        <Input value={url} maxLength={500} onChange={(e) => setUrl(e.target.value)} placeholder="https://oryon.com.br/termos/2026-11" />
      </FormField>
      <FormField label="Texto completo" requirement="optional" hint="Guardado na plataforma; é ele que aparece na tela de aceite." error={texto || url ? undefined : erros.texto}>
        <Textarea value={texto} rows={4} onChange={(e) => setTexto(e.target.value)} placeholder="Cole aqui o texto completo da versão." />
      </FormField>

      <label className="flex items-start gap-2.5 rounded-xl border border-surface-700 p-3 my-3 cursor-pointer has-[:disabled]:opacity-50 has-[:disabled]:cursor-not-allowed">
        <Checkbox checked={avisar && podeAvisar} disabled={!podeAvisar} onChange={(e) => setAvisar(e.target.checked)} className="mt-0.5" />
        <span>
          <span className="block text-sm font-semibold text-surface-100">Avisar os {owners} donos de conta por e-mail</span>
          <span className="block text-xs text-surface-400 mt-0.5">
            {podeAvisar
              ? 'Um e-mail por dono, com o link e a data. Quem já recebeu não recebe de novo.'
              : 'Precisa de data futura e do link público do texto.'}
          </span>
        </span>
      </label>

      {valido && (
        <Banner variant="warning">
          Confira antes de publicar: {TERMS_DOC_LABEL[doc]} · versão {versao.trim()} · vale a partir de {new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR')}
          {avisar && podeAvisar ? ` · aviso a ${owners} donos` : ' · sem aviso por e-mail'}.
        </Banner>
      )}
    </Modal>
  )
}
