import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BadgeCheck, Eye, Pencil, ShieldCheck } from 'lucide-react'
import { MolduraOAuth } from '@/components/oauth/MolduraOAuth'
import { LogoDoAplicativo } from '@/components/oauth/LogoDoAplicativo'
import { dentroDeIframe } from '@/components/oauth/dentroDeIframe'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { FormField } from '@/components/ui/FormField'
import { Spinner } from '@/components/ui/Spinner'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { cn } from '@/lib/utils'
import { ContaDaSessao } from '@/components/oauth/ContaDaSessao'
import {
  decidirPedidoOAuth,
  detalharPedidoOAuth,
  erroDoOAuth,
  retornoSeguro,
  type DetalheDoPedidoOAuth,
  type NivelOAuth,
} from '@/services/oauthApi'

/**
 * ORY-96 (épico ORY-94) — "Conectar à Oryon": a tela onde a pessoa, logada no app,
 * autoriza (ou recusa) um aplicativo de fora (Claude, ChatGPT…) a usar o Oryon MCP
 * em nome dela.
 *
 * - O nome, o logo e o domínio vêm da LISTA da Oryon (nunca do pedido do aplicativo).
 * - Dois níveis: "Só consultar" (marcado) ou "Consultar e fazer alterações" (só se a
 *   política do workspace deixar).
 * - A senha é pedida em toda aprovação (o pedido é de uso único e preso a quem o abriu).
 * - Depois da decisão, volta ao aplicativo pela navegação de topo (o backend monta o
 *   endereço com `code`/`error`, `state` e `iss`).
 * - Não abre dentro de iframe (o cabeçalho da Vercel nega; aqui é a segunda trava).
 */

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'pronto'; pedido: DetalheDoPedidoOAuth }
  | { tipo: 'erro'; titulo: string; dica: string }
  | { tipo: 'voltando'; para: string }

const ERROS_DE_CARGA: Record<string, { titulo: string; dica: string }> = {
  // 2ª rodada: o mesmo 404 vale para vencido, já concluído ou aberto por outra conta.
  pedido_expirado: {
    titulo: 'Este pedido de conexão não está mais disponível',
    dica: 'Ele pode ter sido concluído, vencido ou ser de outra conta. Volte ao aplicativo e tente conectar à Oryon de novo.',
  },
  indisponivel: {
    titulo: 'Não foi possível conferir agora',
    dica: 'Tente de novo em instantes pelo aplicativo.',
  },
  cliente_nao_aprovado: {
    titulo: 'Aplicativo não aprovado',
    dica: 'Este aplicativo não está aprovado pela Oryon para se conectar.',
  },
  conta: {
    titulo: 'Sua conta não pode autorizar aplicativos agora',
    dica: 'Fale com o administrador do seu workspace.',
  },
}

const NIVEIS: Array<{ id: NivelOAuth; titulo: string; descricao: string }> = [
  { id: 'leitura', titulo: 'Só consultar', descricao: 'O aplicativo pode ver as informações, sem mudar nada.' },
  { id: 'escrita', titulo: 'Consultar e fazer alterações', descricao: 'O aplicativo também pode criar e alterar o que o seu papel permite e, se o seu papel tiver acesso, ver contatos sem máscara.' },
]

export function OAuthAutorizarPage() {
  const [params] = useSearchParams()
  const pedidoId = params.get('pedido') ?? ''
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })
  const [nivel, setNivel] = useState<NivelOAuth>('leitura')
  const [senha, setSenha] = useState('')
  const [pedirSenha, setPedirSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState<'aprovar' | 'recusar' | null>(null)
  const emIframe = useMemo(dentroDeIframe, [])

  useEffect(() => {
    if (emIframe) return
    if (!pedidoId) {
      setEstado({ tipo: 'erro', titulo: 'Pedido de conexão inválido', dica: 'Volte ao aplicativo e tente conectar à Oryon de novo.' })
      return
    }
    let vivo = true
    detalharPedidoOAuth(pedidoId)
      .then((pedido) => {
        if (!vivo) return
        setEstado({ tipo: 'pronto', pedido })
        setPedirSenha(pedido.precisaSenha)
      })
      .catch((err: unknown) => {
        if (!vivo) return
        const { codigo } = erroDoOAuth(err)
        const conhecido = codigo ? ERROS_DE_CARGA[codigo] : undefined
        setEstado({
          tipo: 'erro',
          titulo: conhecido?.titulo ?? 'Não foi possível carregar o pedido de conexão',
          dica: conhecido?.dica ?? 'Verifique sua conexão e tente de novo pelo aplicativo.',
        })
      })
    return () => {
      vivo = false
    }
  }, [pedidoId, emIframe])

  const voltar = (url: string, pedido: DetalheDoPedidoOAuth) => {
    if (!retornoSeguro(url)) {
      setErro('O endereço de retorno do aplicativo não é seguro. Nada foi enviado.')
      return
    }
    // ORY-116: o aplicativo local volta para este computador; o nome diz mais que "127.0.0.1:61234".
    setEstado({ tipo: 'voltando', para: pedido.cliente.local ? pedido.cliente.nome : pedido.retornoPara })
    window.location.assign(url)
  }

  const decidir = async (aprovar: boolean, pedido: DetalheDoPedidoOAuth) => {
    setErro('')
    setEnviando(aprovar ? 'aprovar' : 'recusar')
    try {
      const r = await decidirPedidoOAuth(pedido.pedido, {
        csrf: pedido.csrf,
        aprovar,
        ...(aprovar ? { nivel, ...(pedirSenha && senha ? { senha } : {}) } : {}),
      })
      voltar(r.redirecionarPara, pedido)
    } catch (err: unknown) {
      const { codigo, mensagem } = erroDoOAuth(err)
      if (codigo === 'senha_necessaria') {
        setPedirSenha(true)
        setErro('Confirme a sua senha para autorizar o aplicativo.')
      } else if (codigo === 'senha_incorreta') {
        setPedirSenha(true)
        setSenha('')
        setErro('Senha incorreta.')
      } else if (codigo && codigo !== 'indisponivel' && ERROS_DE_CARGA[codigo]) {
        // Falha passageira na decisão fica na tela (dá para tentar de novo); o resto encerra.
        setEstado({ tipo: 'erro', ...ERROS_DE_CARGA[codigo] })
      } else {
        setErro(mensagem ?? 'Não foi possível concluir agora. Tente de novo.')
      }
    } finally {
      setEnviando(null)
    }
  }

  if (emIframe) {
    return (
      <MolduraOAuth titulo="Conectar à Oryon">
        <Banner variant="danger">Por segurança, esta tela não abre dentro de outra página.</Banner>
      </MolduraOAuth>
    )
  }

  if (estado.tipo === 'carregando') {
    return (
      <MolduraOAuth titulo="Conectar à Oryon">
        <div className="flex justify-center py-10">
          <Spinner label="Carregando o pedido de conexão" />
        </div>
      </MolduraOAuth>
    )
  }

  if (estado.tipo === 'erro') {
    return (
      <MolduraOAuth titulo="Conectar à Oryon">
        <ErrorState title={estado.titulo} hint={estado.dica} />
        <ContaDaSessao className="mt-3 text-center text-xs text-surface-400" />
      </MolduraOAuth>
    )
  }

  if (estado.tipo === 'voltando') {
    return (
      <MolduraOAuth titulo="Conectar à Oryon">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Spinner />
          <p className="text-sm text-surface-300">Voltando para {estado.para}…</p>
        </div>
      </MolduraOAuth>
    )
  }

  const { pedido } = estado
  const bloqueado = !pedido.apiLiberada || !pedido.politica.liberado
  const grupos = pedido.niveis[nivel].grupos
  const podeAprovar = !bloqueado && pedido.niveis[nivel].disponivel && grupos.length > 0 && (!pedirSenha || senha.length > 0) && enviando === null

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (podeAprovar) void decidir(true, pedido)
  }

  return (
    <MolduraOAuth titulo="Conectar à Oryon">
      <form onSubmit={onSubmit} className="flex flex-col gap-5" aria-labelledby="titulo-consentimento">
        {/* Quem pede */}
        <div className="flex items-start gap-3">
          <LogoDoAplicativo nome={pedido.cliente.nome} endereco={pedido.cliente.dominio} />
          <div className="min-w-0">
            <h2 id="titulo-consentimento" className="text-lg font-semibold text-surface-50 leading-snug">
              {pedido.cliente.nome} quer acessar a sua conta Oryon
            </h2>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-surface-400">
              <BadgeCheck className="w-3.5 h-3.5 text-success flex-shrink-0" aria-hidden />
              <span className="break-words">
                {pedido.cliente.dominio}
                {pedido.cliente.local ? ' · no seu computador' : ''} · aplicativo aprovado pela Oryon
              </span>
            </p>
            <ContaDaSessao className="mt-1 text-xs text-surface-400" />
          </div>
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm rounded-[8px] bg-surface-900 px-4 py-3">
          <dt className="text-surface-400">Workspace</dt>
          <dd className="text-surface-100 truncate">{pedido.workspace.nome || '—'}</dd>
          <dt className="text-surface-400">Você</dt>
          <dd className="text-surface-100 truncate">{pedido.pessoa.nome || '—'}</dd>
          <dt className="text-surface-400">Volta para</dt>
          <dd className="text-surface-100 truncate">
            {/* ORY-116: o retorno do aplicativo local é este computador (127.0.0.1 com uma porta da hora). */}
            {pedido.cliente.local ? `${pedido.cliente.nome}, neste computador` : pedido.retornoPara}
          </dd>
        </dl>

        {!pedido.apiLiberada && (
          <Banner variant="danger">A API não está liberada para este workspace. Fale com a Oryon.</Banner>
        )}
        {pedido.apiLiberada && !pedido.politica.liberado && (
          <Banner variant="danger">{pedido.politica.motivo ?? 'O administrador deste workspace não liberou este aplicativo.'}</Banner>
        )}

        {!bloqueado && (
          <>
            <fieldset className="flex flex-col gap-2">
              <legend className="text-xs font-medium text-surface-300 uppercase tracking-wide mb-2">O que o aplicativo poderá fazer</legend>
              {NIVEIS.map((n) => {
                const disponivel = pedido.niveis[n.id].disponivel
                const marcado = nivel === n.id
                return (
                  <label
                    key={n.id}
                    className={cn(
                      'flex items-start gap-3 rounded-[8px] px-3.5 py-3 transition-colors select-none',
                      disponivel ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
                      marcado ? 'bg-surface-700' : 'bg-surface-900 hover:bg-surface-800',
                    )}
                  >
                    <input
                      type="radio"
                      name="nivel"
                      value={n.id}
                      checked={marcado}
                      disabled={!disponivel}
                      onChange={() => setNivel(n.id)}
                      className="mt-0.5 accent-brand-500"
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-surface-100">{n.titulo}</span>
                      <span className="text-xs text-surface-400">
                        {disponivel ? n.descricao : 'O administrador deste workspace só liberou consultas.'}
                      </span>
                    </span>
                  </label>
                )
              })}
            </fieldset>

            <div>
              <p className="text-xs font-medium text-surface-300 uppercase tracking-wide mb-2">
                {nivel === 'leitura' ? 'Poderá ver' : 'Poderá ver e alterar'}
              </p>
              {grupos.length === 0 ? (
                <p className="text-sm text-surface-400">O aplicativo não pediu nada que o seu papel possa conceder.</p>
              ) : (
                <ul className="flex flex-col gap-1.5" aria-label="O que o aplicativo poderá acessar">
                  {grupos.map((g) => (
                    <li key={g.grupo} className="flex items-center gap-2 text-sm text-surface-200">
                      {g.alterar ? (
                        <Pencil className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" aria-hidden />
                      ) : (
                        <Eye className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" aria-hidden />
                      )}
                      <span>
                        {g.grupo}
                        <span className="text-surface-500"> · {g.alterar ? 'ver e alterar' : 'ver'}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Banner variant="neutral" icon={<ShieldCheck className="w-4 h-4" aria-hidden />}>
              Ações importantes (enviar mensagens, convidar pessoas, mudar regras de agentes) sempre pedem a sua aprovação aqui na Oryon.
            </Banner>

            {pedirSenha && (
              <FormField label="Confirme a sua senha">
                <PasswordInput
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                />
              </FormField>
            )}
          </>
        )}

        {erro && <Banner variant="danger">{erro}</Banner>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            loading={enviando === 'recusar'}
            disabled={enviando !== null}
            onClick={() => void decidir(false, pedido)}
          >
            Recusar
          </Button>
          {!bloqueado && (
            <Button type="submit" loading={enviando === 'aprovar'} disabled={!podeAprovar}>
              Permitir
            </Button>
          )}
        </div>

        <p className="text-xs text-surface-500 leading-relaxed">
          Você pode desconectar este aplicativo quando quiser em Configurações.
        </p>
      </form>
    </MolduraOAuth>
  )
}
