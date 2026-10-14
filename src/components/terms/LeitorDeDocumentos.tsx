// ─── Leitor de documentos legais embutido (SCRUM-1200) ───────────────────────
// Decisão de UX (13/10, PO): o texto fica ABERTO na tela, num leitor com altura
// fixa, e não atrás de um modal ou link. Quem aceita precisa ver o que está
// aceitando no mesmo lugar do checkbox (clickwrap: documento visível e
// consentimento junto dele). Um modal esconde o texto, quebra o contexto e
// tira o checkbox de vista; link para PDF quase ninguém abre.
//
// - abas por documento, com marca de "lido" quando a pessoa chega ao fim;
// - barra de progresso da leitura e um esmaecido no pé quando ainda há texto;
// - "Tela cheia" e "PDF" são ícones com legenda na linha das abas, e versão e
//   vigência ficam no topo do próprio texto: sem barra fixa, sobra altura para
//   ler (PO 13/10). O ícone de PDF só aparece se a versão tiver `contentUrl`;
// - lido = rolou o texto até o fim, aqui ou em tela cheia (abrir e voltar não
//   conta); só com PDF, conta ao abrir o PDF; texto que cabe inteiro já conta.
//   O primeiro acesso EXIGE a leitura para liberar o aceite (PO 13/10) e usa a
//   aba controlada (`ativo`/`onAtivo`) para levar ao documento que falta; o
//   re-aceite não exige. Os dois informam ao backend (`readToEnd`).
//
// O texto vem do `content` da versão publicada (o mesmo que gera o hash do
// aceite). Títulos numerados ("1. OBJETO") e cláusulas ("1.1.") ganham estilo.

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, ExternalLink, FileText, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'
import { DOCUMENT_LABEL, type TermsDocument } from '@/services/termsApi'

export interface DocumentoLegal {
  id: string
  titulo: string
  versao: string
  vigencia?: string
  url: string | null
  conteudo?: string | null
}

const dataBR = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : undefined)

/** Versões pendentes da API → documentos do leitor (o `content` é o texto publicado). */
export function paraDocumentos(pend: Array<{ id: string; document: string; version: string; contentUrl: string | null; effectiveAt?: string | null; content?: string | null }>): DocumentoLegal[] {
  return pend.map((v) => ({
    id: v.id, titulo: DOCUMENT_LABEL[v.document as TermsDocument] ?? v.document, versao: v.version,
    vigencia: dataBR(v.effectiveAt), url: v.contentUrl, conteudo: v.content ?? null,
  }))
}

/** Texto puro → blocos com estilo (título, seção numerada, cláusula, parágrafo). */
function Texto({ conteudo, amplo, meta }: { conteudo: string; amplo?: boolean; meta?: string }) {
  const blocos = conteudo.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  return (
    <div className={cn('space-y-3 text-surface-200', amplo ? 'text-sm leading-7' : 'text-[14px] leading-[26px]')}>
      {blocos.map((b, i) => {
        if (i === 0 && b === b.toUpperCase()) {
          return (
            <div key={i}>
              <h3 className="text-sm font-semibold text-surface-50 tracking-wide">{b}</h3>
              {meta && <p className="mt-1 text-xs text-surface-500">{meta}</p>}
            </div>
          )
        }
        const secao = /^(\d+)\.\s+([^\d].*)$/.exec(b)
        if (secao && secao[2] === secao[2].toUpperCase()) {
          return <h4 key={i} className="pt-2 text-[13px] font-semibold text-surface-100">{secao[1]}. {secao[2]}</h4>
        }
        const clausula = /^(\d+\.\d+(?:\.\d+)*\.)\s+(.*)$/s.exec(b)
        if (clausula) {
          return (
            <p key={i} className="flex gap-2.5">
              <span className="text-surface-500 tabular-nums flex-shrink-0">{clausula[1]}</span>
              <span>{clausula[2]}</span>
            </p>
          )
        }
        return <p key={i} className="text-surface-300">{b}</p>
      })}
    </div>
  )
}

const ICONE = 'inline-flex items-center justify-center w-8 h-8 rounded-[6px] text-surface-400 hover:text-surface-100 hover:bg-[var(--rowhover)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40'

export function LeitorDeDocumentos({ documentos, onLidos, altura = 'h-[340px]', ativo: ativoExterno, onAtivo }: {
  documentos: DocumentoLegal[]
  onLidos?: (ids: string[]) => void
  altura?: string
  /** Aba ativa controlada por fora (opcional). */
  ativo?: string
  onAtivo?: (id: string) => void
}) {
  const semMovimento = useReducedMotion()
  const [ativoInterno, setAtivoInterno] = useState(documentos[0]?.id)
  const ativo = ativoExterno ?? ativoInterno
  const setAtivo = (id: string) => { setAtivoInterno(id); onAtivo?.(id) }
  const marcarLido = (id: string) => setLidos((l) => (l.includes(id) ? l : [...l, id]))
  const ampla = useRef<HTMLDivElement>(null)
  const [lidos, setLidos] = useState<string[]>([])
  const [progresso, setProgresso] = useState(0)
  const [ampliado, setAmpliado] = useState(false)
  const area = useRef<HTMLDivElement>(null)
  const doc = documentos.find((d) => d.id === ativo) ?? documentos[0]

  useEffect(() => { onLidos?.(lidos) }, [lidos]) // eslint-disable-line react-hooks/exhaustive-deps
  // Trocar de documento volta ao topo do texto.
  useEffect(() => { if (area.current) area.current.scrollTop = 0; medir() }, [ativo]) // eslint-disable-line react-hooks/exhaustive-deps

  function medir() {
    const el = area.current
    if (!el || !doc) return
    const max = el.scrollHeight - el.clientHeight
    const p = max <= 0 ? 1 : Math.min(1, el.scrollTop / max)
    setProgresso(p)
    if (p > 0.97) marcarLido(doc.id)
  }

  if (!doc) return null
  const fim = progresso > 0.97

  return (
    <div className="rounded-[10px] border border-surface-700 overflow-hidden bg-surface-900 shadow-[inset_0_1px_2px_rgb(0_0_0/0.18)]">
      {/* Abas por documento */}
      <div className="flex items-end justify-between gap-2 px-2 pt-2 border-b border-surface-700 bg-surface-950">
      <div role="tablist" aria-label="Documentos" className="flex items-end gap-1 min-w-0">
        {documentos.map((d) => {
          const sel = d.id === doc.id
          return (
            <button key={d.id} type="button" role="tab" aria-selected={sel} onClick={() => setAtivo(d.id)}
              className={cn('relative inline-flex items-center gap-1.5 px-3 h-9 text-[13px] rounded-t-[6px] transition-colors',
                sel ? 'text-surface-50 font-medium bg-surface-900' : 'text-surface-400 hover:text-surface-100')}>
              <FileText className="w-3.5 h-3.5" />
              {d.titulo}
              <AnimatePresence>
                {lidos.includes(d.id) && (
                  <motion.span initial={semMovimento ? false : { scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="w-4 h-4 rounded-full bg-accent-soft text-accent-dark flex items-center justify-center" title="Lido até o fim">
                    <Check className="w-2.5 h-2.5" strokeWidth={3} />
                  </motion.span>
                )}
              </AnimatePresence>
              {sel && <motion.span layoutId="aba-doc" className="absolute inset-x-0 -bottom-px h-0.5 bg-brand-500" transition={{ duration: semMovimento ? 0 : 0.2 }} />}
            </button>
          )
        })}
      </div>
      {/* Ações do documento: secundárias, só ícone com legenda. */}
      <span className="flex items-center gap-0.5 pb-1 flex-shrink-0">
        {doc.url && (
          <Tooltip content="Abrir PDF" side="top">
            <a href={doc.url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir PDF: ${doc.titulo}`} className={ICONE}
              onClick={() => { if (!doc.conteudo) marcarLido(doc.id) }}>
              <ExternalLink className="w-4 h-4" />
            </a>
          </Tooltip>
        )}
        {doc.conteudo && (
          <Tooltip content="Ler em tela cheia" side="top">
            <button type="button" aria-label="Ler em tela cheia" onClick={() => setAmpliado(true)} className={ICONE}>
              <Maximize2 className="w-4 h-4" />
            </button>
          </Tooltip>
        )}
      </span>
      </div>

      {/* Texto */}
      <div className="relative bg-surface-900">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-transparent z-10" aria-hidden>
          <div className="h-full bg-brand-500/70 transition-[width] duration-150" style={{ width: `${Math.round(progresso * 100)}%` }} />
        </div>
        <div ref={area} onScroll={medir} tabIndex={0} aria-label={`Texto: ${doc.titulo}`}
          className={cn(altura, 'overflow-y-auto px-5 py-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/40')}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={doc.id}
              initial={semMovimento ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={semMovimento ? undefined : { opacity: 0 }}
              transition={{ duration: 0.18 }}
              onAnimationComplete={medir}>
              {doc.conteudo
                ? <Texto conteudo={doc.conteudo} meta={`Versão ${doc.versao}${doc.vigencia ? ` · vigente desde ${doc.vigencia}` : ''}`} />
                : <p className="text-[13px] text-surface-400">{`Versão ${doc.versao}${doc.vigencia ? ` · vigente desde ${doc.vigencia}` : ''}`}. O texto desta versão está no PDF: abra pelo ícone acima antes de aceitar.</p>}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface-900 to-transparent transition-opacity duration-200', fim ? 'opacity-0' : 'opacity-100')} aria-hidden />
      </div>

      <Modal open={ampliado} onClose={() => setAmpliado(false)} className="max-w-3xl" title={`${doc.titulo} · versão ${doc.versao}`}
        footer={<div className="flex justify-end"><Button onClick={() => setAmpliado(false)}>Voltar para o aceite</Button></div>}>
        {/* Em tela cheia também só conta como lido quem rola até o fim. */}
        <div ref={ampla} className="max-h-[65vh] overflow-y-auto pr-1"
          onScroll={() => { const el = ampla.current; if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 8) marcarLido(doc.id) }}>
          {doc.conteudo && <Texto conteudo={doc.conteudo} amplo meta={`Versão ${doc.versao}${doc.vigencia ? ` · vigente desde ${doc.vigencia}` : ''}`} />}
        </div>
      </Modal>
    </div>
  )
}
