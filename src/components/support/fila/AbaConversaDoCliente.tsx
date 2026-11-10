import { useEffect, useState } from 'react'
import { Eye, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ErrorState } from '@/components/ui/ErrorState'
import { showToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'
import { adminSupportApi } from '@/services/supportApi'
import type { ChamadoDaEquipe, ConversaDoChamado } from '@/types/support'
import { MensagensMarcadas } from '../SupportPieces'
import { dataCurta } from '../supportModel'

type Estado =
  | { id: string; pedido: number; tipo: 'conversa'; conversa: ConversaDoChamado }
  | { id: string; pedido: number; tipo: 'sem-acesso' }
  | { id: string; pedido: number; tipo: 'erro' }

const semAcesso = (err: unknown) => (err as { response?: { status?: number } } | null)?.response?.status === 403

/**
 * Aba CONVERSA DO CLIENTE (SCRUM-1385). A conversa é do cliente: abre só a
 * ligada ao chamado, com motivo, por 24 h, para quem pediu. A empresa vê
 * quem abriu e por quê no fio do chamado; cada leitura fica registrada.
 */
export function AbaConversaDoCliente({ c, onAtualizar }: { c: ChamadoDaEquipe; onAtualizar: (c: ChamadoDaEquipe) => void }) {
  const [pedido, setPedido] = useState(0)
  const [estado, setEstado] = useState<Estado | null>(null)
  const [motivo, setMotivo] = useState('')
  const [abrindo, setAbrindo] = useState(false)
  useEffect(() => {
    let vivo = true
    adminSupportApi.conversa(c.id)
      .then((conversa) => { if (vivo) setEstado({ id: c.id, pedido, tipo: 'conversa', conversa }) })
      .catch((err) => { if (vivo) setEstado({ id: c.id, pedido, tipo: semAcesso(err) ? 'sem-acesso' : 'erro' }) })
    return () => { vivo = false }
  }, [c.id, pedido])
  const atual = estado?.id === c.id && estado.pedido === pedido ? estado : null

  const abrir = async () => {
    setAbrindo(true)
    try {
      onAtualizar(await adminSupportApi.liberarConversa(c.id, motivo.trim()))
      setMotivo('')
      showToast('Conversa aberta por 24 h. O acesso ficou registrado e a empresa vê no chamado.', 'success')
      setPedido((v) => v + 1)
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Não foi possível abrir a conversa.'), 'error')
    } finally {
      setAbrindo(false)
    }
  }

  if (!atual) return <p className="text-xs text-surface-400" role="status">Carregando…</p>
  if (atual.tipo === 'erro') return <ErrorState compact title="Não foi possível abrir a conversa" onRetry={() => setPedido((v) => v + 1)} />
  if (atual.tipo === 'sem-acesso') {
    return (
      <section className="sup-cartao p-4 flex flex-col items-start gap-3">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-surface-100"><Lock className="w-4 h-4 text-surface-400" aria-hidden />A conversa é do cliente</p>
        <p className="text-xs text-surface-400 max-w-[62ch]">
          Dá para abrir porque ela está ligada a este chamado. O acesso vale por 24 horas, só para você; fica registrado, e a gestão da empresa vê quem abriu e por quê.
        </p>
        <label htmlFor="motivo-acesso" className="text-xs font-semibold text-surface-200">Motivo</label>
        <Input id="motivo-acesso" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500}
          placeholder="Ex.: conferir o contexto das respostas marcadas" className="max-w-[460px]" />
        <Button leftIcon={<Eye className="w-4 h-4" />} disabled={motivo.trim().length < 10} loading={abrindo} onClick={() => void abrir()}>
          Abrir conversa por 24 h
        </Button>
      </section>
    )
  }
  const { conversa } = atual
  const destacar = new Set(conversa.mensagens.filter((m) => m.marcada).map((m) => m.id))
  return (
    <div className="flex flex-col gap-3">
      <div className="sup-cartao sup-familia-aviso px-3 py-2.5 flex items-center gap-2.5" role="status">
        <span className="sup-cartao-icone w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0"><Eye className="w-[15px] h-[15px]" aria-hidden /></span>
        <p className="text-xs text-surface-200 flex-1">
          <b className="text-[13px] text-surface-100 block">Acesso de suporte ativo até {dataCurta(conversa.ate)}</b>
          Registrado e visível para a gestão da empresa. Dados pessoais mascarados; as mensagens marcadas no chamado estão destacadas.
        </p>
      </div>
      {conversa.mensagens.length
        ? <MensagensMarcadas mensagens={conversa.mensagens} destacar={destacar} />
        : <p className="text-xs text-surface-400">A conversa não tem mensagens.</p>}
    </div>
  )
}
