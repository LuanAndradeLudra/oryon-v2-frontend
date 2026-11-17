import { useState } from 'react'
import { ArchiveRestore, Eye, History, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { cn } from '@/lib/utils'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { useToast } from '@/hooks/useToast'
import { ehConfirmacao, jornadasApi } from '@/services/jornadas/jornadasApi'
import type { AlteracaoDoRascunho, Jornada, PreviaDaPublicacao, VersaoPublicada } from '@/services/jornadas/tipos'
import { Selo } from './comum'
import { dataHora, numero, useCarregar } from './apoio'
import { paraTextoAmigavel } from './editor/variaveis'

/**
 * ORY-60 — as versões publicadas (§2.12): cada publicação é imutável, quem
 * entrou numa versão termina nela, e "voltar" é publicar uma anterior de novo,
 * como versão nova, em DUAS ETAPAS (como publicar). O rascunho não muda.
 */
export function VersoesDaJornada({ jornada, open, onClose, onPronto, somenteLeitura, onVerNoDesenho, onRascunhoRestaurado }: {
  jornada: Jornada
  open: boolean
  onClose: () => void
  onPronto: (j: Jornada) => void
  somenteLeitura: boolean
  /** Abre a versão no desenho, só leitura (P1, 16/11, "View" da HubSpot). */
  onVerNoDesenho?: (v: VersaoPublicada) => void
  /** "Restaurar como rascunho" (P2, 16/11): o editor troca o desenho da tela. */
  onRascunhoRestaurado?: (j: Jornada) => void
}) {
  const [aba, setAba] = useState<'publicadas' | 'rascunho'>('publicadas')
  const [restaurando, setRestaurando] = useState<number | null>(null)
  const { toast } = useToast()
  const { dados: versoes } = useCarregar(() => (open ? jornadasApi.versoes(jornada.id) : Promise.resolve(null)), [open, jornada.id, jornada.publishedVersion])
  const [voltando, setVoltando] = useState<{ version: number; previa: PreviaDaPublicacao; token: string } | null>(null)
  const [ocupado, setOcupado] = useState<number | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const fechar = () => { setVoltando(null); setErro(null); onClose() }

  const pedirPrevia = async (version: number) => {
    setOcupado(version); setErro(null)
    try {
      const r = await jornadasApi.voltarParaVersao(jornada.id, version)
      if (ehConfirmacao(r)) setVoltando({ version, previa: r.preview, token: r.confirmationToken })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu para preparar a volta.')
    } finally {
      setOcupado(null)
    }
  }

  const confirmar = async () => {
    if (!voltando) return
    setOcupado(voltando.version); setErro(null)
    try {
      const r = await jornadasApi.voltarParaVersao(jornada.id, voltando.version, voltando.token)
      if (!ehConfirmacao(r)) {
        toast(`O desenho da v${voltando.version} voltou ao ar como v${r.publishedVersion}.`, 'success')
        onPronto(r)
        fechar()
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu para voltar.')
    } finally {
      setOcupado(null)
    }
  }

  return (
    <Modal
      open={open}
      onClose={fechar}
      title={<span className="inline-flex items-center gap-2"><History className="w-4 h-4" aria-hidden />Versões publicadas</span>}
      className="max-w-[600px]"
      footer={voltando ? (
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={() => setVoltando(null)} disabled={ocupado !== null}>Voltar à lista</Button>
          <Button onClick={confirmar} loading={ocupado !== null} leftIcon={<Undo2 className="w-4 h-4" />}>Publicar a v{voltando.version} de novo</Button>
        </div>
      ) : <div className="flex justify-end"><Button variant="ghost" onClick={fechar}>Fechar</Button></div>}
    >
      {!voltando && (
        <div className="mb-3">
          <SegmentedControl label="Versões ou mudanças do rascunho" size="32" value={aba} onChange={setAba} options={[
            { value: 'publicadas', label: 'Versões publicadas' },
            { value: 'rascunho', label: 'Mudanças no rascunho' },
          ]} />
        </div>
      )}
      {!voltando && aba === 'rascunho' ? (
        <HistoricoDoRascunho jornada={jornada} open={open} />
      ) : !voltando ? (
        <div className="space-y-3">
          <p className="text-[14px] leading-relaxed text-surface-400">Cada publicação vira uma versão que não muda. Quem entrou numa versão termina nela. Voltar publica uma versão anterior de novo, como versão nova; restaurar como rascunho traz o desenho para você ajustar antes de publicar.</p>
          {!versoes && <div className="space-y-2">{[0, 1].map((i) => <SkeletonCard key={i} lines={2} />)}</div>}
          {versoes && !versoes.length && <p className="text-[14px] text-surface-400">Esta jornada ainda não foi publicada.</p>}
          {versoes?.map((v, i) => (
            <div key={v.version} className="jornadas-aparecer rounded-[10px] bg-surface-800 px-3.5 py-3" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-semibold text-surface-50">v{v.version}</span>
                {v.status === 'published' ? <Selo tom="verde">No ar</Selo> : <Selo tom="cinza">Anterior</Selo>}
                <span className="text-[12px] text-surface-400">{dataHora(v.publishedAt)} · {v.publishedBy}</span>
                {v.enrolledNow > 0 && <span className="ml-auto text-[12px] text-surface-300">{numero(v.enrolledNow)} pessoa{v.enrolledNow > 1 ? 's' : ''} ainda nela</span>}
              </div>
              {v.note && <p className="mt-2 rounded-[8px] bg-surface-900 px-3 py-2 text-[14px] text-surface-100">“{v.note}”</p>}
              <ul className="mt-2 space-y-0.5">
                {v.changes.map((c) => <li key={c} className="text-[14px] leading-relaxed text-surface-300">· {c}</li>)}
              </ul>
              {(onVerNoDesenho || onRascunhoRestaurado || (v.status !== 'published' && !somenteLeitura)) && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {onVerNoDesenho && (
                    <Button variant="ghost" size="sm" leftIcon={<Eye className="w-3.5 h-3.5" />} onClick={() => onVerNoDesenho(v)}>Ver no desenho</Button>
                  )}
                  {onRascunhoRestaurado && !somenteLeitura && (
                    <Button variant="ghost" size="sm" leftIcon={<ArchiveRestore className="w-3.5 h-3.5" />} onClick={() => setRestaurando(v.version)}>Restaurar como rascunho</Button>
                  )}
                  {v.status !== 'published' && !somenteLeitura && (
                    <Button variant="secondary" size="sm" leftIcon={<Undo2 className="w-3.5 h-3.5" />} loading={ocupado === v.version} onClick={() => pedirPrevia(v.version)}>
                      Voltar para esta
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[14px] leading-relaxed text-surface-200">
            O desenho da <strong>v{voltando.version}</strong> volta ao ar como <strong>v{voltando.previa.toVersion}</strong>{voltando.previa.mode === 'shadow' ? ', em sombra' : ''}.
          </p>
          <ul className="space-y-1">
            {[...voltando.previa.changes, ...voltando.previa.warnings].map((t) => <li key={t} className="rounded-[8px] bg-surface-800 px-3 py-2 text-[14px] text-surface-300">{t}</li>)}
          </ul>
          {voltando.previa.enrolledInPreviousVersions > 0 && (
            <p className="rounded-[10px] jt-ambar px-3 py-2.5 text-[14px]">{numero(voltando.previa.enrolledInPreviousVersions)} pessoas continuam nas versões em que entraram.</p>
          )}
        </div>
      )}
      {erro && <p className="mt-3 rounded-[8px] jt-vermelho px-3 py-2 text-[14px]">{erro}</p>}
      <ConfirmModal
        open={restaurando !== null}
        onClose={() => setRestaurando(null)}
        onConfirm={async () => {
          if (restaurando === null) return
          const j = await jornadasApi.restaurarComoRascunho(jornada.id, restaurando)
          toast(`O rascunho agora é o desenho da v${restaurando}. Ajuste e publique quando quiser.`, 'success')
          setRestaurando(null)
          onRascunhoRestaurado?.(j)
        }}
        title={`Restaurar a v${restaurando ?? ''} como rascunho?`}
        description="O rascunho atual é trocado pelo desenho desta versão. Nada vai ao ar até você publicar. As mudanças de agora ficam registradas no histórico do rascunho."
        confirmLabel="Restaurar"
      />
    </Modal>
  )
}

/** Quem mudou o quê no rascunho, com o antes e o depois (P2, 16/11, como o Klaviyo). */
function HistoricoDoRascunho({ jornada, open }: { jornada: Jornada; open: boolean }) {
  const { dados: itens } = useCarregar(() => (open ? jornadasApi.historicoDoRascunho(jornada.id) : Promise.resolve(null)), [open, jornada.id, jornada.updatedAt])
  const [pessoa, setPessoa] = useState('')
  const [tipo, setTipo] = useState('')
  const pessoas = [...new Set((itens ?? []).map((x) => x.author))]
  const visiveis = (itens ?? []).filter((x) => (!pessoa || x.author === pessoa) && (!tipo || x.tipo === tipo))
  const TOM: Record<AlteracaoDoRascunho['tipo'], 'verde' | 'ambar' | 'vermelho' | 'cinza'> = { novo: 'verde', mudou: 'ambar', saiu: 'vermelho', outra: 'cinza' }
  const ROTULO: Record<AlteracaoDoRascunho['tipo'], string> = { novo: 'Novo', mudou: 'Mudou', saiu: 'Saiu', outra: 'Geral' }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select size="sm" className="w-auto" value={pessoa} onChange={(e) => setPessoa(e.target.value)} aria-label="Quem mudou">
          <option value="">Todas as pessoas</option>
          {pessoas.map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
        <Select size="sm" className="w-auto" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo de mudança">
          <option value="">Qualquer mudança</option>
          <option value="novo">Passo novo</option>
          <option value="mudou">Passo mudou</option>
          <option value="saiu">Passo saiu</option>
          <option value="outra">Entrada, metas e regras</option>
        </Select>
      </div>
      {!itens && <div className="space-y-2">{[0, 1].map((i) => <SkeletonCard key={i} lines={2} />)}</div>}
      {itens && !visiveis.length && <p className="text-[14px] text-surface-400">Nenhuma mudança registrada{pessoa || tipo ? ' com esses filtros' : ' no rascunho'}.</p>}
      <ul className="space-y-2">
        {visiveis.map((x) => (
          <li key={x.id} className="rounded-[10px] bg-surface-800 px-3.5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <Selo tom={TOM[x.tipo]}>{ROTULO[x.tipo]}</Selo>
              <span className="text-[14px] text-surface-100">{x.titulo}</span>
              <span className="ml-auto text-[12px] text-surface-400">{x.author} · {dataHora(x.at)}</span>
            </div>
            {(x.antes || x.depois) && (
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {x.antes !== undefined && <p className={cn('rounded-[8px] px-2.5 py-1.5 text-[12px] leading-relaxed', 'jt-vermelho')}><span className="font-semibold">Antes: </span>{paraTextoAmigavel(x.antes)}</p>}
                {x.depois !== undefined && <p className={cn('rounded-[8px] px-2.5 py-1.5 text-[12px] leading-relaxed', 'jt-verde')}><span className="font-semibold">Depois: </span>{paraTextoAmigavel(x.depois)}</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
