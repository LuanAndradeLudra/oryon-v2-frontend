import { useEffect, useState } from 'react'
import { Search, ShieldAlert, UserRoundPlus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/hooks/useToast'
import { ehConfirmacaoDeInscricao, jornadasApi } from '@/services/jornadas/jornadasApi'
import type { ContatoParaInscrever, Jornada, PreviaDaInscricao } from '@/services/jornadas/tipos'
import { numero } from './apoio'

/**
 * ORY-60 — a porta "Manual" (§2.4): escolher contatos e inscrever. Quando a
 * jornada envia mensagem, são DUAS ETAPAS, como publicar (§2.10): a prévia diz
 * quantos entram e quem é barrado; só a confirmação inscreve.
 */
export function InscreverContatos({ jornada, open, onClose, onInscritos }: { jornada: Jornada; open: boolean; onClose: () => void; onInscritos: () => void }) {
  const { toast } = useToast()
  const [busca, setBusca] = useState('')
  const [achados, setAchados] = useState<ContatoParaInscrever[]>([])
  const [escolhidos, setEscolhidos] = useState<ContatoParaInscrever[]>([])
  const [previa, setPrevia] = useState<{ dados: PreviaDaInscricao; token: string } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let vivo = true
    const t = window.setTimeout(() => { void jornadasApi.buscarContatos(busca).then((r) => { if (vivo) setAchados(r) }) }, 160)
    return () => { vivo = false; window.clearTimeout(t) }
  }, [busca, open])

  const fechar = () => {
    setBusca(''); setEscolhidos([]); setPrevia(null); setErro(null); setEnviando(false)
    onClose()
  }
  const alternar = (c: ContatoParaInscrever) => setEscolhidos((l) => (l.some((x) => x.id === c.id) ? l.filter((x) => x.id !== c.id) : [...l, c]))
  const ids = escolhidos.map((c) => c.id)

  const terminar = (n: number) => {
    toast(n === 1 ? '1 pessoa inscrita na jornada.' : `${numero(n)} pessoas inscritas na jornada.`, 'success')
    onInscritos()
    fechar()
  }

  const revisar = async () => {
    setEnviando(true); setErro(null)
    try {
      const r = await jornadasApi.inscrever(jornada.id, ids)
      if (ehConfirmacaoDeInscricao(r)) setPrevia({ dados: r.preview, token: r.confirmationToken })
      else terminar(r.enrolled)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu para inscrever.')
    } finally {
      setEnviando(false)
    }
  }

  const confirmar = async () => {
    if (!previa) return
    setEnviando(true); setErro(null)
    try {
      const r = await jornadasApi.inscrever(jornada.id, ids, previa.token)
      if (!ehConfirmacaoDeInscricao(r)) terminar(r.enrolled)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu para inscrever.')
      setEnviando(false)
    }
  }

  const rodape = previa ? (
    <div className="flex items-center justify-between gap-2">
      <Button variant="ghost" onClick={() => setPrevia(null)} disabled={enviando}>Voltar</Button>
      <Button onClick={confirmar} loading={enviando} disabled={!previa.dados.willEnter}>
        {previa.dados.willEnter === 1 ? 'Inscrever 1 pessoa' : `Inscrever ${numero(previa.dados.willEnter)} pessoas`}
      </Button>
    </div>
  ) : (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[14px] text-surface-400">{escolhidos.length ? `${escolhidos.length} escolhido${escolhidos.length > 1 ? 's' : ''}` : 'Ninguém escolhido'}</span>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={fechar}>Cancelar</Button>
        <Button onClick={revisar} loading={enviando} disabled={!escolhidos.length}>Revisar</Button>
      </div>
    </div>
  )

  return (
    <Modal open={open} onClose={fechar} title="Inscrever contatos" className="max-w-[520px]" footer={rodape}>
      {!previa ? (
        <div className="space-y-3">
          <p className="text-[14px] leading-relaxed text-surface-400">
            Cada pessoa passa pelo filtro de entrada, pela regra de reentrada e pelas barreiras (quem pediu para não receber nunca entra).
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" aria-hidden />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou final do telefone" aria-label="Buscar contato" autoFocus
              className="w-full h-9 rounded-[8px] border border-surface-700 bg-[var(--sf2)] pl-9 pr-3 text-[14px] text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500" />
          </div>
          <ul className="max-h-[300px] overflow-y-auto rounded-[10px] border border-surface-700 divide-y divide-surface-700">
            {achados.map((c) => {
              const ligado = escolhidos.some((x) => x.id === c.id)
              return (
                <li key={c.id}>
                  <label className="flex items-center gap-3 px-3 py-2.5 bg-surface-800 hover:bg-[var(--rowhover)] cursor-pointer">
                    <Checkbox checked={ligado} onChange={() => alternar(c)} aria-label={`Escolher ${c.name}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium text-surface-100">{c.name}</span>
                      <span className="block text-[12px] text-surface-500">{c.phoneMasked}</span>
                    </span>
                  </label>
                </li>
              )
            })}
            {!achados.length && <li className="px-3 py-4 text-[14px] text-surface-400">Nenhum contato com "{busca}".</li>}
          </ul>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[10px] bg-surface-800 px-3 py-2.5">
              <p className="text-[12px] text-surface-500">Escolhidos</p>
              <p className="text-[20px] font-semibold text-surface-50 tabular-nums">{numero(previa.dados.contacts)}</p>
            </div>
            <div className="rounded-[10px] jt-verde px-3 py-2.5">
              <p className="text-[12px]">Entram agora</p>
              <p className="text-[20px] font-semibold tabular-nums">{numero(previa.dados.willEnter)}</p>
            </div>
          </div>
          {previa.dados.blocked.length > 0 && (
            <ul className="space-y-1">
              {previa.dados.blocked.map((b) => (
                <li key={b.reason} className="flex items-center justify-between rounded-[8px] bg-surface-800 px-3 py-2 text-[14px] text-surface-300">
                  <span>Não entram: {b.reason}</span><span className="font-semibold tabular-nums">{numero(b.count)}</span>
                </li>
              ))}
            </ul>
          )}
          {previa.dados.sendsMessages && (
            <p className="flex items-start gap-2 rounded-[10px] jt-ambar px-3 py-2.5 text-[14px] leading-relaxed">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
              Esta jornada envia mensagens: quem entrar começa a receber agora{jornada.status === 'shadow' ? ' (em sombra, só fica registrado o que teria sido enviado)' : ''}.
            </p>
          )}
          <p className="flex items-center gap-1.5 text-[12px] text-surface-500"><UserRoundPlus className="w-3.5 h-3.5" aria-hidden />Fica no histórico da jornada quem inscreveu e quando.</p>
        </div>
      )}
      {erro && <p className="mt-3 rounded-[8px] jt-vermelho px-3 py-2 text-[14px]">{erro}</p>}
    </Modal>
  )
}
