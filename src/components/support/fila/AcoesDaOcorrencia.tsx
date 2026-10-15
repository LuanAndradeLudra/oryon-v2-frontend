import { useState } from 'react'
import { Building2, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { showToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'
import { adminSupportApi } from '@/services/supportApi'
import type { ChamadoDaEquipe } from '@/types/support'
import { ehConflito } from './modeloDaFila'

type Aberto = 'empresa' | 'encerrar' | null

/**
 * OCORRÊNCIA INTERNA (SCRUM-1389) — o padrão que o motor de sinais achou, só
 * para a equipe. Quando a triagem confirma impacto no atendimento, "Abrir
 * chamado para a empresa" cria o chamado que ela vai ver (com o texto escrito
 * aqui) e liga os dois. Sem empresa para avaliar, quem encerra a ocorrência é
 * a equipe, com o motivo. No chamado da empresa aberto assim, mostra a origem.
 */
export function AcoesDaOcorrencia({ c, onAtualizar, onRecarregar, onAbrir }: {
  c: ChamadoDaEquipe
  onAtualizar: (c: ChamadoDaEquipe) => void
  onRecarregar: () => void
  onAbrir: (id: string) => void
}) {
  const [aberto, setAberto] = useState<Aberto>(null)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const ocorrencia = c.kind === 'oco'
  const encerrada = c.status === 'closed'

  if (!ocorrencia) {
    if (!c.ocorrencia) return null
    return (
      <p className="flex items-center gap-1.5 text-xs text-surface-300">
        <ShieldAlert className="w-3.5 h-3.5 text-surface-400" aria-hidden />
        Aberto a partir da ocorrência interna
        <button type="button" onClick={() => onAbrir(c.ocorrencia!.id)} className="font-mono font-semibold text-surface-100 hover:underline">
          {c.ocorrencia.numero}
        </button>
      </p>
    )
  }

  const abrir = (qual: Aberto) => {
    setAberto(qual)
    setTexto('')
  }
  const minimo = aberto === 'empresa' ? 10 : 5
  const enviar = async () => {
    if (texto.trim().length < minimo || enviando) return
    setEnviando(true)
    try {
      if (aberto === 'empresa') {
        const novo = await adminSupportApi.abrirParaEmpresa(c.id, texto.trim(), c.version)
        showToast(`Chamado ${novo.numero} aberto para a empresa. Ela recebe o aviso.`, 'success')
        setAberto(null)
        onAbrir(novo.id)
      } else {
        onAtualizar(await adminSupportApi.encerrarOcorrencia(c.id, texto.trim(), c.version))
        showToast('Ocorrência encerrada. O motivo ficou no histórico.', 'success')
        setAberto(null)
      }
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Não foi possível salvar. Tente de novo.'), 'error')
      if (ehConflito(err)) onRecarregar()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-[8px] border border-surface-700 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-surface-100">
        <ShieldAlert className="w-3.5 h-3.5 text-[var(--color-warning)]" aria-hidden />
        Ocorrência interna — a empresa não vê
      </p>
      {c.chamadoDaEmpresa ? (
        <p className="flex items-center gap-1.5 text-xs text-surface-300">
          <Building2 className="w-3.5 h-3.5 text-surface-400" aria-hidden />
          Chamado da empresa:
          <button type="button" onClick={() => onAbrir(c.chamadoDaEmpresa!.id)} className="font-mono font-semibold text-surface-100 hover:underline">
            {c.chamadoDaEmpresa.numero}
          </button>
        </p>
      ) : !encerrada && aberto !== 'empresa' && (
        <p className="text-[11px] text-surface-400">Confirmou impacto no atendimento? Abra o chamado que a empresa vai ver.</p>
      )}
      {aberto === 'empresa' && (
        <Textarea rows={3} maxLength={5000} value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus
          aria-label="O que a empresa vai ler" placeholder="O que aconteceu, o que a Oryon já está fazendo e o que vem a seguir." />
      )}
      {aberto === 'encerrar' && (
        <Input size="sm" maxLength={500} value={texto} onChange={(e) => setTexto(e.target.value)} autoFocus
          aria-label="Motivo do encerramento" placeholder="Ex.: falso positivo; corrigido no cadastro" />
      )}
      {!encerrada && (
        <div className="flex flex-wrap gap-1.5">
          {aberto ? (
            <>
              <Button size="sm" disabled={texto.trim().length < minimo} loading={enviando} onClick={() => void enviar()}>
                {aberto === 'empresa' ? 'Abrir chamado' : 'Encerrar'}
              </Button>
              <Button size="sm" variant="neutral" onClick={() => abrir(null)}>Cancelar</Button>
            </>
          ) : (
            <>
              {!c.chamadoDaEmpresa && <Button size="sm" variant="neutral" onClick={() => abrir('empresa')}>Abrir chamado para a empresa</Button>}
              <Button size="sm" variant="ghost" onClick={() => abrir('encerrar')}>Encerrar ocorrência</Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
