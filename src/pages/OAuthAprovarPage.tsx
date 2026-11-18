import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, ShieldAlert, XCircle } from 'lucide-react'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { MolduraOAuth } from '@/components/oauth/MolduraOAuth'
import { dentroDeIframe } from '@/components/oauth/dentroDeIframe'
import { useAuth } from '@/contexts/AuthContext'
import { decidirAprovacaoOAuth, detalharAprovacaoOAuth, erroDoOAuth, type DetalheDaAprovacao, type SituacaoDaAprovacao } from '@/services/oauthApi'

/**
 * ORY-97 (épico ORY-94, D6) — a pessoa aprova (ou recusa) aqui, no app, uma ação crítica que
 * um aplicativo de fora (Claude, ChatGPT…) preparou em nome dela: enviar mensagem, convidar
 * pessoa, mudar regras de agente… O aplicativo NÃO executa sem este clique, nem com "sempre
 * permitir" no lado dele. Depois de decidir, a pessoa volta ao aplicativo e diz que decidiu.
 */

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'pronto'; pedido: DetalheDaAprovacao }
  | { tipo: 'erro'; titulo: string; dica: string }
  | { tipo: 'decidido'; cliente: string; status: Exclude<SituacaoDaAprovacao, 'pendente'> }

const TITULO = 'Aprovar ação na Oryon'

// Revisão ORY-94: o mesmo 404 vale para vencido, já concluído, recusado ou de outra conta —
// o texto não manda refazer a ação (ela pode já ter sido feita).
const INDISPONIVEL = {
  titulo: 'Este pedido não está mais disponível',
  dica: 'Ele pode ter sido concluído, recusado, vencido ou ser de outra conta. Confira no aplicativo antes de pedir de novo.',
}

function hora(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function OAuthAprovarPage() {
  const { id = '' } = useParams()
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })
  const [enviando, setEnviando] = useState<'aprovar' | 'recusar' | null>(null)
  const [erro, setErro] = useState('')
  const emIframe = useMemo(dentroDeIframe, [])
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const outraConta = async () => {
    await logout()
    navigate('/login', { replace: true, state: { from: location } })
  }
  const conta = user ? (
    <p className="text-xs text-surface-400">
      Conectado como <span className="text-surface-200">{user.email}</span>.{' '}
      <button type="button" className="underline underline-offset-2 hover:text-surface-200" onClick={() => void outraConta()}>
        Usar outra conta
      </button>
    </p>
  ) : null

  useEffect(() => {
    if (emIframe) return
    let vivo = true
    detalharAprovacaoOAuth(id)
      .then((pedido) => {
        if (!vivo) return
        setEstado(pedido.status === 'pendente' ? { tipo: 'pronto', pedido } : { tipo: 'decidido', cliente: pedido.cliente, status: pedido.status })
      })
      .catch((err: unknown) => {
        if (!vivo) return
        const { codigo } = erroDoOAuth(err)
        setEstado(
          codigo === 'aprovacao_expirada'
            ? { tipo: 'erro', ...INDISPONIVEL }
            : { tipo: 'erro', titulo: 'Não foi possível carregar o pedido', dica: 'Verifique sua conexão e abra o link de novo.' },
        )
      })
    return () => {
      vivo = false
    }
  }, [id, emIframe])

  const decidir = async (pedido: DetalheDaAprovacao, aprovar: boolean) => {
    setErro('')
    setEnviando(aprovar ? 'aprovar' : 'recusar')
    try {
      const r = await decidirAprovacaoOAuth(pedido.id, { csrf: pedido.csrf, aprovar })
      if (r.status !== 'pendente') setEstado({ tipo: 'decidido', cliente: pedido.cliente, status: r.status })
    } catch (err: unknown) {
      const { codigo, mensagem } = erroDoOAuth(err)
      if (codigo === 'aprovacao_expirada') {
        setEstado({ tipo: 'erro', ...INDISPONIVEL })
      } else if (codigo === 'ja_decidido') {
        setErro('Este pedido já foi decidido. Recarregue a página para ver como ficou.')
      } else {
        setErro(mensagem ?? 'Não foi possível registrar a sua decisão. Tente de novo.')
      }
    } finally {
      setEnviando(null)
    }
  }

  if (emIframe) {
    return (
      <MolduraOAuth titulo={TITULO}>
        <Banner variant="danger">Por segurança, esta tela não abre dentro de outra página.</Banner>
      </MolduraOAuth>
    )
  }

  if (estado.tipo === 'carregando') {
    return (
      <MolduraOAuth titulo={TITULO}>
        <div className="flex justify-center py-10">
          <Spinner label="Carregando o pedido de aprovação" />
        </div>
      </MolduraOAuth>
    )
  }

  if (estado.tipo === 'erro') {
    return (
      <MolduraOAuth titulo={TITULO}>
        <ErrorState title={estado.titulo} hint={estado.dica} />
        <div className="mt-3 text-center">{conta}</div>
      </MolduraOAuth>
    )
  }

  if (estado.tipo === 'decidido') {
    const aprovada = estado.status === 'aprovada'
    return (
      <MolduraOAuth titulo={TITULO}>
        <div className="flex flex-col items-center gap-3 py-6 text-center" role="status">
          {aprovada ? (
            <CheckCircle2 className="w-9 h-9 text-success" aria-hidden />
          ) : (
            <XCircle className="w-9 h-9 text-surface-400" aria-hidden />
          )}
          <h2 className="text-lg font-semibold text-surface-50">{aprovada ? 'Ação aprovada' : 'Ação recusada'}</h2>
          <p className="text-sm text-surface-300 leading-relaxed max-w-xs">
            {aprovada
              ? `Volte ao ${estado.cliente} e diga que aprovou: ele termina a ação.`
              : `Nada foi feito. Volte ao ${estado.cliente} se quiser pedir outra coisa.`}
          </p>
          <p className="text-xs text-surface-500">Você já pode fechar esta página.</p>
        </div>
      </MolduraOAuth>
    )
  }

  const { pedido } = estado
  return (
    <MolduraOAuth titulo={TITULO}>
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div aria-hidden className="w-11 h-11 rounded-[10px] bg-surface-700 text-surface-100 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-surface-50 leading-snug">{pedido.cliente} quer fazer uma ação em seu nome</h2>
            <p className="mt-1 text-xs text-surface-400">Só acontece se você aprovar aqui. Vale até {hora(pedido.expiraEm)}.</p>
            <div className="mt-1">{conta}</div>
          </div>
        </div>

        <div className="rounded-[8px] bg-surface-900 px-4 py-3">
          <p className="text-xs font-medium text-surface-300 uppercase tracking-wide mb-1.5">A ação</p>
          <p className="text-sm text-surface-50 leading-relaxed break-words">{pedido.acao}</p>
        </div>

        {pedido.previa && (
          <div>
            <p className="text-xs font-medium text-surface-300 uppercase tracking-wide mb-1.5">Detalhes</p>
            <pre className="text-xs text-surface-200 leading-relaxed whitespace-pre-wrap break-words rounded-[8px] bg-surface-900 px-4 py-3 max-h-72 overflow-y-auto font-mono">
              {pedido.previa}
            </pre>
          </div>
        )}

        {pedido.previaCortada ? (
          <Banner variant="warning">
            Esta ação é grande demais para conferir inteira aqui. Recuse e faça a mudança direto no app da Oryon.
          </Banner>
        ) : (
          <Banner variant="neutral">
            Confira se foi você quem pediu isso ao {pedido.cliente}. Se não reconhece, recuse.
          </Banner>
        )}

        {erro && <Banner variant="danger">{erro}</Banner>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" loading={enviando === 'recusar'} disabled={enviando !== null} onClick={() => void decidir(pedido, false)}>
            Recusar
          </Button>
          <Button type="button" loading={enviando === 'aprovar'} disabled={enviando !== null || pedido.previaCortada} onClick={() => void decidir(pedido, true)}>
            Aprovar
          </Button>
        </div>
      </div>
    </MolduraOAuth>
  )
}
