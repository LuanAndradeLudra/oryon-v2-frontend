// Aplicativos conectados (ORY-98, épico ORY-94) — os assistentes de IA de fora (Claude,
// ChatGPT…) conectados à Oryon. Todo mundo vê e desconecta os seus; o admin também vê e
// desconecta os do workspace. Desconectar vale na hora (o aplicativo perde o acesso).
import { useCallback, useEffect, useRef, useState } from 'react'
import { Unplug } from 'lucide-react'
import { SectionHeader } from '../SectionHeader'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { showToast } from '@/hooks/useToast'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminTier } from '@/lib/roleHelpers'
import {
  conexoesDoWorkspaceOAuth,
  desconectarOAuth,
  erroDoOAuth,
  mensagemDoOAuth,
  minhasConexoesOAuth,
  type ConexaoOAuth,
} from '@/services/oauthApi'

type Vista = 'minhas' | 'workspace'

function data(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function AplicativosConectadosSettings() {
  const { user } = useAuth()
  const admin = isAdminTier(user?.role)
  const [vista, setVista] = useState<Vista>('minhas')
  const [conexoes, setConexoes] = useState<ConexaoOAuth[]>([])
  const [total, setTotal] = useState(0)
  const [mensagemDeErro, setMensagemDeErro] = useState<string | undefined>(undefined)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)
  const [desconectando, setDesconectando] = useState<ConexaoOAuth | null>(null)
  const [enviando, setEnviando] = useState(false)
  // Revisão ORY-94: só a resposta do pedido MAIS RECENTE vale (trocar rápido de vista não
  // mostra a lista da outra).
  const ultimoPedido = useRef(0)

  const carregar = useCallback(() => {
    const meu = ++ultimoPedido.current
    setCarregando(true)
    ;(vista === 'workspace' ? conexoesDoWorkspaceOAuth() : minhasConexoesOAuth())
      .then((r) => {
        if (meu !== ultimoPedido.current) return
        setConexoes(r.conexoes)
        setTotal(r.total)
        setErro(false)
      })
      .catch((e: unknown) => {
        if (meu !== ultimoPedido.current) return
        setMensagemDeErro(mensagemDoOAuth(e, 'Tente de novo em instantes.'))
        setErro(true)
      })
      .finally(() => meu === ultimoPedido.current && setCarregando(false))
  }, [vista])

  useEffect(() => {
    carregar()
  }, [carregar])

  const confirmar = async () => {
    if (!desconectando) return
    setEnviando(true)
    try {
      await desconectarOAuth(desconectando.id)
      setConexoes((cs) => cs.filter((c) => c.id !== desconectando.id))
      // Revisão do épico (18/11, 3ª rodada): o total desce junto (senão aparecia "as 2 de 3").
      setTotal((t) => Math.max(0, t - 1))
      showToast(`${desconectando.cliente.nome} foi desconectado.`)
      setDesconectando(null)
    } catch (e) {
      if (erroDoOAuth(e).status === 404) {
        // Já não existia (desconectada em outra aba, vencida): some da lista e a lista recarrega.
        setConexoes((cs) => cs.filter((c) => c.id !== desconectando.id))
        setDesconectando(null)
        showToast('Esta conexão já tinha sido encerrada.')
        carregar()
      } else {
        showToast(mensagemDoOAuth(e, 'Não foi possível desconectar.'), 'error')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <SectionHeader
        title="Aplicativos conectados"
        description="Assistentes de IA de fora (como Claude e ChatGPT) conectados à Oryon. Desconecte quando quiser: o aplicativo perde o acesso na hora."
      />

      {admin && (
        <SegmentedControl<Vista>
          label="Quais conexões"
          value={vista}
          onChange={setVista}
          options={[
            { value: 'minhas', label: 'As minhas' },
            { value: 'workspace', label: 'Do workspace' },
          ]}
        />
      )}

      {carregando ? (
        <SkeletonCard />
      ) : erro ? (
        <ErrorState title="Não foi possível carregar as conexões" hint={mensagemDeErro} onRetry={carregar} />
      ) : conexoes.length === 0 ? (
        <EmptyState
          icon={Unplug}
          title={vista === 'workspace' ? 'Nenhum aplicativo conectado neste workspace' : 'Nenhum aplicativo conectado'}
          hint="Para conectar, adicione a Oryon como conector no seu assistente de IA. O administrador do workspace precisa ter liberado o aplicativo."
        />
      ) : (
        <>
        {total > conexoes.length && (
          <p className="text-xs text-surface-400">
            Mostrando as {conexoes.length} conexões mais recentes de {total}.
          </p>
        )}
        <ul className="flex flex-col gap-2" aria-label="Aplicativos conectados">
          {conexoes.map((c) => (
            <li key={c.id} className="flex items-start gap-3 rounded-[10px] bg-surface-800 px-4 py-3.5">
              <div aria-hidden className="w-10 h-10 rounded-[8px] bg-surface-700 text-surface-100 flex items-center justify-center text-base font-semibold flex-shrink-0">
                {c.cliente.nome.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-surface-100">
                  {c.cliente.nome}
                  <span className="ml-2 inline-block rounded-[6px] bg-surface-700 px-1.5 py-0.5 text-[11px] font-normal text-surface-200 align-middle">
                    {c.nivel === 'escrita' ? 'Consulta e altera' : 'Só consulta'}
                  </span>
                  {c.limitado && (
                    <span className="ml-1.5 inline-block rounded-[6px] bg-surface-700 px-1.5 py-0.5 text-[11px] font-normal text-surface-300 align-middle">
                      limitado pelo administrador
                    </span>
                  )}
                </p>
                <p className="text-xs text-surface-400 truncate">
                  {c.cliente.dominio}
                  {c.cliente.local ? ' · no computador da pessoa' : ''}
                  {c.pessoa ? ` · ${c.pessoa.nome || 'Pessoa'}` : ''}
                </p>
                <p className="text-xs text-surface-500 mt-1">
                  Conectado em {data(c.conectadoEm)} · última atividade {data(c.ultimaAtividade)}
                </p>
                {c.grupos.length > 0 && <p className="text-xs text-surface-400 mt-1 line-clamp-2">{c.grupos.map((g) => g.grupo).join(', ')}</p>}
              </div>
              <Button variant="secondary" size="sm" onClick={() => setDesconectando(c)}>
                Desconectar
              </Button>
            </li>
          ))}
        </ul>
        </>
      )}

      <ConfirmModal
        open={desconectando !== null}
        onClose={() => setDesconectando(null)}
        onConfirm={() => void confirmar()}
        title={`Desconectar ${desconectando?.cliente.nome ?? ''}?`}
        description={
          desconectando?.pessoa
            ? `A conexão de ${desconectando.pessoa.nome || 'esta pessoa'} perde o acesso à Oryon na hora. Ela pode conectar de novo se a política deixar.`
            : 'O aplicativo perde o acesso à Oryon na hora. Você pode conectar de novo quando quiser.'
        }
        confirmLabel="Desconectar"
        danger
        loading={enviando}
      />
    </div>
  )
}
