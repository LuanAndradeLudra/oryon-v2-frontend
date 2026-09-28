import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { conversationsApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'
import { useDashboardAgora } from '@/hooks/useDashboardAgora'
import { useRegisterTopBarSubtitle } from '@/contexts/TopBarActionsContext'
import type { AbaDoPainel } from '@/lib/abaDoPainel'
import { getApiErrorMessage } from '@/lib/utils'
import type { ItemDaFila } from '@/lib/filaAgora'
import { lerPagina } from '@/lib/paginar'
import { ErrorState } from '@/components/ui/ErrorState'
import { FaixaDoAgora } from './FaixaDoAgora'
import { FilaAoVivo, type FiltroDaFila } from './FilaAoVivo'
import { EquipeAgora } from './EquipeAgora'
import { CabecalhoDoPainel } from '../CabecalhoDoPainel'

// Aba "Agora" do Dashboard (direção A · Fila primeiro, PO 27/09): a faixa do
// momento, a fila de quem espera uma pessoa e a equipe (IA primeiro). O filtro
// da fila vive na URL (`?fila=`), como todo estado de tela (regra do PO).

function lerFiltro(v: string | null): FiltroDaFila {
  return v === 'sem-dono' || v === 'ia-passou' ? v : 'todas'
}

function nomeDe(u: { firstName: string; lastName?: string | null }): string {
  return [u.firstName, u.lastName].filter(Boolean).join(' ')
}

function haQuanto(de: Date, agora: number): string {
  const s = Math.max(0, Math.floor((agora - de.getTime()) / 1000))
  if (s < 60) return 'agora há pouco'
  const m = Math.floor(s / 60)
  return m < 60 ? `há ${m} min` : `há ${Math.floor(m / 60)} h`
}

interface Props {
  aba: AbaDoPainel
  onAba: (a: AbaDoPainel) => void
  celular?: boolean
}

export function AbaAgora({ aba, onAba, celular = false }: Props) {
  const d = useDashboardAgora()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const filtro = lerFiltro(searchParams.get('fila'))
  const paginaDaFila = lerPagina(searchParams.get('filaPag'))
  const paginaDaEquipe = lerPagina(searchParams.get('equipePag'))
  const [ocupadaId, setOcupadaId] = useState<string | null>(null)
  const [relogio, setRelogio] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setRelogio(Date.now()), 15_000)
    return () => clearInterval(id)
  }, [])

  // O subtítulo da TopBar diz de quando é o dado (a tela atualiza sozinha).
  useRegisterTopBarSubtitle(
    d.atualizadoEm ? `Ao vivo · atualizado ${haQuanto(d.atualizadoEm, relogio)}` : 'Ao vivo',
    [d.atualizadoEm, relogio],
  )

  const cabecalho = (
    <CabecalhoDoPainel
      aba={aba}
      onAba={onAba}
      direita={
        <>
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-surface-400">
            <span className="w-1.5 h-1.5 rounded-full bg-online" aria-hidden />
            ao vivo
            {d.atualizadoEm && <span className="hidden sm:inline text-surface-500">· {haQuanto(d.atualizadoEm, relogio)}</span>}
          </span>
          <button
            type="button"
            onClick={d.recarregar}
            className="w-7 h-7 inline-flex items-center justify-center rounded-sm border border-[var(--bd2)] text-surface-400 hover:text-surface-200 hover:bg-[var(--rowhover)] transition-colors"
            title="Atualizar agora"
            aria-label="Atualizar agora"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${d.carregando ? 'animate-spin' : ''}`} />
          </button>
        </>
      }
    />
  )

  const setFiltro = (f: FiltroDaFila) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (f === 'todas') next.delete('fila')
      else next.set('fila', f)
      // Outro filtro, outra lista: começa da primeira página.
      next.delete('filaPag')
      return next
    }, { replace: true })
  }

  const setPagina = (param: 'filaPag' | 'equipePag', p: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (p <= 1) next.delete(param)
      else next.set(param, String(p))
      return next
    }, { replace: true })
  }

  const abrir = (item: ItemDaFila) => navigate(`/conversations?id=${item.conversa.id}`)

  const assumir = async (item: ItemDaFila) => {
    if (!user) return
    setOcupadaId(item.conversa.id)
    try {
      await conversationsApi.assign(item.conversa.id, user.id)
      navigate(`/conversations?id=${item.conversa.id}`)
    } catch (e) {
      toast(getApiErrorMessage(e, 'Não foi possível assumir a conversa.'), 'error')
      setOcupadaId(null)
    }
  }

  const atribuir = async (item: ItemDaFila, userId: string | null) => {
    setOcupadaId(item.conversa.id)
    try {
      await conversationsApi.assign(item.conversa.id, userId)
      const pessoa = userId ? d.equipe.find((u) => u.id === userId) : null
      const quem = userId === user?.id ? 'você' : pessoa ? nomeDe(pessoa) : null
      toast(userId === null ? 'Conversa sem dono.' : quem ? `Conversa atribuída a ${quem}.` : 'Conversa atribuída.', 'success')
      d.recarregar()
    } catch (e) {
      toast(getApiErrorMessage(e, 'Não foi possível atribuir a conversa.'), 'error')
    } finally {
      setOcupadaId(null)
    }
  }

  if (d.carregando) {
    return (
      <div className="space-y-3.5" aria-busy="true" aria-label="Carregando o painel">
        {cabecalho}
        <div className="h-[84px] bg-surface-800 border border-surface-700 rounded-lg animate-pulse" />
        <div className="grid grid-cols-12 gap-3.5">
          <div className="col-span-12 xl:col-span-8 h-80 bg-surface-800 border border-surface-700 rounded-lg animate-pulse" />
          <div className="col-span-12 xl:col-span-4 h-80 bg-surface-800 border border-surface-700 rounded-lg animate-pulse" />
        </div>
      </div>
    )
  }

  // Sem nenhuma leitura boa: a tela de erro. Com uma leitura anterior, os dados
  // ficam e um aviso diz que a atualização falhou (não zera nada).
  if (d.erro && !d.atualizadoEm) return <div className="space-y-3.5">{cabecalho}<ErrorState onRetry={d.recarregar} /></div>

  const contagens: Record<FiltroDaFila, number> = {
    todas: d.fila.length,
    'sem-dono': d.fila.filter((i) => i.semDono).length,
    'ia-passou': d.fila.filter((i) => i.iaPassou).length,
  }
  const itens = filtro === 'sem-dono' ? d.fila.filter((i) => i.semDono)
    : filtro === 'ia-passou' ? d.fila.filter((i) => i.iaPassou)
    : d.fila

  return (
    <div className="space-y-3.5">
      {cabecalho}
      {d.erro && (
        <p role="status" className="px-3.5 py-2 rounded-lg border border-status-pending-border bg-status-pending-bg text-[12.5px] text-status-pending">
          A última atualização falhou. Os dados abaixo são de {d.atualizadoEm?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.
        </p>
      )}
      <FaixaDoAgora fila={d.fila} linhas={d.linhas} linhasComIA={d.linhasComIA} />
      <div className="grid grid-cols-12 gap-3.5 items-start">
        <div className="col-span-12 xl:col-span-8">
          <FilaAoVivo
            itens={itens}
            contagens={contagens}
            filtro={filtro}
            onFiltro={setFiltro}
            equipe={d.equipe}
            meuId={user?.id}
            mostrarLinha={d.linhas.length > 1}
            truncada={d.filaTruncada}
            ocupadaId={ocupadaId}
            onAbrir={abrir}
            onAssumir={(i) => void assumir(i)}
            onAtribuir={(i, u) => void atribuir(i, u)}
            pagina={paginaDaFila}
            onPagina={(p) => setPagina('filaPag', p)}
            celular={celular}
          />
        </div>
        <div className="col-span-12 xl:col-span-4">
          <EquipeAgora
            agentes={d.agentes}
            linhas={d.linhas}
            equipe={d.equipe}
            meuId={user?.id}
            pagina={paginaDaEquipe}
            onPagina={(p) => setPagina('equipePag', p)}
          />
        </div>
      </div>
    </div>
  )
}
