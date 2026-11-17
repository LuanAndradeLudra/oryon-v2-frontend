import { useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/hooks/useToast'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import { diferencasDoDesenho, frasesDasDiferencas } from '@/services/jornadas/diff'
import type { Catalogo, PropostaDaIa, VersaoDaJornada } from '@/services/jornadas/tipos'

/**
 * "Mudar com IA" (P2, 16/11, Copiloto v2): a pessoa descreve a mudança, a IA
 * propõe, a tela mostra O QUE MUDA (o mesmo diff da publicação) e só então a
 * pessoa aplica. Vai para o rascunho: nada do que está no ar muda, e Ctrl+Z desfaz.
 */
const EXEMPLOS = [
  'Mandar um lembrete curto 2 horas depois do primeiro envio.',
  'Quem não responder, avisar a equipe.',
]

export function MudarComIa({ open, onClose, jornadaId, versao, catalogo, onAplicar }: {
  open: boolean
  onClose: () => void
  jornadaId: string
  versao: VersaoDaJornada
  catalogo: Catalogo
  onAplicar: (nova: VersaoDaJornada) => void
}) {
  const { toast } = useToast()
  const [descricao, setDescricao] = useState('')
  const [proposta, setProposta] = useState<PropostaDaIa | null>(null)
  const [pensando, setPensando] = useState(false)
  const fechar = () => { setProposta(null); setDescricao(''); onClose() }
  const propor = async () => {
    setPensando(true)
    try { setProposta(await jornadasApi.proporComIa({ descricao, journeyId: jornadaId, draft: versao })) }
    catch (e) { toast(e instanceof Error ? e.message : 'A IA não conseguiu propor agora. Tente de novo.', 'error') }
    finally { setPensando(false) }
  }
  const mudancas = proposta ? frasesDasDiferencas(diferencasDoDesenho(versao, proposta.version, catalogo)) : []
  return (
    <Modal open={open} onClose={fechar} title="Mudar com IA" className="max-w-[580px]"
      footer={
        <div className="flex justify-end gap-2">
          {proposta ? (
            <>
              <Button variant="ghost" onClick={() => setProposta(null)}>Mudar o pedido</Button>
              <Button onClick={() => { const v = proposta.version; setProposta(null); setDescricao(''); onAplicar(v) }} disabled={!mudancas.length}>Aplicar no rascunho</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={fechar}>Cancelar</Button>
              <Button leftIcon={<Sparkles className="w-4 h-4" />} onClick={propor} loading={pensando} disabled={descricao.trim().length < 8}>Ver a proposta</Button>
            </>
          )}
        </div>
      }>
      {proposta ? (
        <div className="space-y-4 text-sm text-surface-200">
          <div className="rounded-[10px] bg-surface-800 px-3 py-2.5">
            <p className="mb-1 inline-flex items-center gap-1.5 text-[12px] font-semibold jt-texto-violeta"><Sparkles className="h-3.5 w-3.5" aria-hidden />Como a IA pensou</p>
            <ul className="space-y-1">{proposta.explanation.map((t) => <li key={t} className="text-[14px] leading-snug text-surface-100">{t}</li>)}</ul>
          </div>
          <div>
            <p className="mb-1.5 text-[12px] font-semibold text-surface-300">O que muda no rascunho</p>
            {mudancas.length ? (
              <ul className="space-y-1 rounded-[10px] bg-surface-800 p-2">
                {mudancas.map((m) => (
                  <li key={m} className="flex items-start gap-2 rounded-[8px] px-1.5 py-1 text-[14px] text-surface-100">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full jt-verde"><Plus className="h-3 w-3" strokeWidth={3} aria-hidden /></span>{m}
                  </li>
                ))}
              </ul>
            ) : <p className="text-[14px] text-surface-400">Nada muda com esse pedido. Tente descrever de outro jeito.</p>}
          </div>
          <ul className="space-y-0.5 text-[12px] text-surface-400">{proposta.checks.map((c) => <li key={c}>{c}</li>)}</ul>
        </div>
      ) : (
        <div className="space-y-3 text-sm text-surface-200">
          <p className="text-surface-300">Descreva o que mudar no desenho. A IA propõe e mostra o que muda; só entra no rascunho se você aplicar.</p>
          <Textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: quem não responder, avisar a equipe." autoFocus aria-label="O que mudar no desenho" />
          <div className="flex flex-wrap gap-1.5">
            {EXEMPLOS.map((t) => (
              <button key={t} type="button" onClick={() => setDescricao(t)} className="rounded-[8px] bg-surface-800 px-2.5 py-1.5 text-left text-[12px] leading-snug text-surface-200 hover:bg-[var(--rowhover)] cursor-pointer">{t}</button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  )
}
