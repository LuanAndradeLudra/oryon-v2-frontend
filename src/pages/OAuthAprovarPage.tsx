import { useEffect, useId, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useParams } from 'react-router-dom'
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  ListChecks,
  Megaphone,
  MessageSquareText,
  Paperclip,
  ShieldAlert,
  ShieldCheck,
  Timer,
  UserPlus,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { OryonLogo } from '@/components/brand/OryonLogo'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { ErrorState } from '@/components/ui/ErrorState'
import { CURVA_SUAVE, MolduraOAuth } from '@/components/oauth/MolduraOAuth'
import { LogoDoAplicativo } from '@/components/oauth/LogoDoAplicativo'
import { resumoSemCitacao } from '@/components/oauth/resumoSemCitacao'
import { dentroDeIframe } from '@/components/oauth/dentroDeIframe'
import { ContaDaSessao } from '@/components/oauth/ContaDaSessao'
import { useGestoNaPagina } from '@/components/oauth/useGestoNaPagina'
import { decidirAprovacaoOAuth, detalharAprovacaoOAuth, erroDoOAuth, type DetalheDaAprovacao, type SituacaoDaAprovacao } from '@/services/oauthApi'

/**
 * ORY-97 (épico ORY-94, D6) — a pessoa aprova (ou recusa) aqui, no app, uma ação crítica que
 * um aplicativo de fora (Claude, ChatGPT…) preparou em nome dela: enviar mensagem, convidar
 * pessoa, mudar regras de agente… O aplicativo NÃO executa sem este clique, nem com "sempre
 * permitir" no lado dele. Depois de decidir, a pessoa volta ao aplicativo: ele percebe a decisão
 * sozinho (espera ativa, ORY-117) ou, se já parou de esperar, a pessoa avisa.
 *
 * Revisão de 18/11 (pedido do João, referência: a tela de autorização do GitHub): cartão mais
 * largo, a ação escrita para gente (com a mensagem ou o prompt inteiro), os detalhes técnicos
 * recolhidos e os botões fixos no rodapé, sempre à vista.
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

/** O ícone da ação, pelo nome dela (as ações críticas da Oryon). */
function iconeDaAcao(titulo: string | undefined): LucideIcon {
  const t = (titulo ?? '').toLowerCase()
  if (t.includes('arquivo')) return Paperclip
  if (t.includes('mensagem') || t.includes('modelo')) return MessageSquareText
  if (t.includes('campanha')) return Megaphone
  if (t.includes('ferramenta')) return Wrench
  if (t.includes('equipe')) return UserPlus
  if (t.includes('inatividade')) return Timer
  if (t.includes('plano')) return ListChecks
  if (t.includes('agente') || t.includes('prompt') || t.includes('instruções')) return Bot
  return ShieldAlert
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
  const [senha, setSenha] = useState('')
  const emIframe = useMemo(dentroDeIframe, [])
  const conta = <ContaDaSessao />
  // 2ª rodada: "Aprovar" só depois de um gesto nesta página (contra o double-clickjacking).
  // 3ª rodada: e o clique só vale se o gesto veio antes dele (o próprio toque não libera).
  const { liberado, cliqueValido } = useGestoNaPagina(estado.tipo === 'pronto')

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
      const r = await decidirAprovacaoOAuth(pedido.id, {
        csrf: pedido.csrf,
        aprovar,
        ...(aprovar && pedido.precisaSenha ? { senha } : {}),
      })
      setSenha('')
      if (r.status !== 'pendente') setEstado({ tipo: 'decidido', cliente: pedido.cliente, status: r.status })
    } catch (err: unknown) {
      const { codigo, mensagem } = erroDoOAuth(err)
      if (codigo === 'senha_necessaria') {
        // O detalhe não tinha pedido a senha (resposta antiga): mostra o campo em vez de travar.
        setEstado({ tipo: 'pronto', pedido: { ...pedido, precisaSenha: true } })
        setErro('Confirme a sua senha para aprovar.')
      } else if (codigo === 'senha_incorreta') {
        setSenha('')
        setErro('Senha incorreta.')
      } else if (codigo === 'muitas_tentativas') {
        setSenha('')
        setErro(mensagem ?? 'Muitas tentativas de senha. Espere alguns minutos e tente de novo.')
      } else if (codigo === 'aprovacao_expirada') {
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
      <MolduraOAuth titulo={TITULO} largura="larga" chave="carregando">
        <EsqueletoDoPedido />
      </MolduraOAuth>
    )
  }

  if (estado.tipo === 'erro') {
    return (
      <MolduraOAuth titulo={TITULO} chave="erro">
        <ErrorState title={estado.titulo} hint={estado.dica} />
        <div className="mt-3 text-center">{conta}</div>
      </MolduraOAuth>
    )
  }

  if (estado.tipo === 'decidido') {
    const aprovada = estado.status === 'aprovada'
    return (
      <MolduraOAuth titulo={TITULO} chave="decidido">
        <div className="flex flex-col items-center gap-3 py-6 text-center" role="status">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
          >
            {aprovada ? (
              <CheckCircle2 className="w-9 h-9 text-success" aria-hidden />
            ) : (
              <XCircle className="w-9 h-9 text-surface-400" aria-hidden />
            )}
          </motion.div>
          <h2 className="text-lg font-semibold text-surface-50">{aprovada ? 'Ação aprovada' : 'Ação recusada'}</h2>
          <p className="text-sm text-surface-300 leading-relaxed max-w-sm">
            {aprovada
              ? `Volte ao ${estado.cliente}: ele segue sozinho em alguns segundos. Se ele já tiver parado de esperar, diga que aprovou.`
              : `Nada foi feito. O ${estado.cliente} fica sabendo sozinho em alguns segundos; se ele já tiver parado de esperar, diga que recusou.`}
          </p>
          <p className="text-xs text-surface-500">Você já pode fechar esta página.</p>
        </div>
      </MolduraOAuth>
    )
  }

  const { pedido } = estado
  const Icone = iconeDaAcao(pedido.titulo)
  return (
    <MolduraOAuth titulo={TITULO} largura="larga" chave="pedido">
      <div className="flex flex-col gap-5">
        {/* Quem pede: o aplicativo agindo na sua conta Oryon (como nas telas de autorização). */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex items-center gap-2" aria-hidden>
            <LogoDoAplicativo nome={pedido.cliente} endereco={pedido.clienteId} />
            <span className="flex items-center gap-1 text-surface-500">
              <span className="w-1 h-1 rounded-full bg-current" />
              <span className="w-1 h-1 rounded-full bg-current" />
              <ShieldCheck className="w-4 h-4 text-surface-300" />
              <span className="w-1 h-1 rounded-full bg-current" />
              <span className="w-1 h-1 rounded-full bg-current" />
            </span>
            <div className="w-11 h-11 rounded-[10px] bg-surface-700 flex items-center justify-center">
              <OryonLogo variant="symbol" className="h-6 text-surface-50" />
            </div>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-surface-50 leading-snug">{pedido.cliente} quer fazer uma ação em seu nome</h2>
            <p className="mt-1 text-xs text-surface-400">Só acontece se você aprovar aqui. Vale até {hora(pedido.expiraEm)}.</p>
            <div className="mt-1">{conta}</div>
          </div>
        </div>

        {/* O que vai acontecer, escrito para gente. */}
        <section aria-labelledby="titulo-da-acao" className="rounded-[10px] bg-surface-900 p-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div aria-hidden className="w-9 h-9 rounded-[8px] bg-surface-700 text-surface-100 flex items-center justify-center flex-shrink-0">
              <Icone className="w-[18px] h-[18px]" />
            </div>
            <div className="min-w-0">
              <p id="titulo-da-acao" className="text-sm font-semibold text-surface-50">
                {pedido.titulo ?? 'A ação'}
              </p>
              <p className="mt-0.5 text-sm text-surface-300 leading-relaxed break-words">{resumoSemCitacao(pedido.acao, pedido.conteudo?.texto)}</p>
            </div>
          </div>
          {pedido.conteudo && (
            <div>
              <p className="text-xs font-medium text-surface-400 mb-1.5">{pedido.conteudo.rotulo}</p>
              <div className="rounded-[8px] bg-surface-800 px-4 py-3 text-sm text-surface-50 leading-relaxed whitespace-pre-wrap break-words max-h-80 overflow-y-auto">
                {pedido.conteudo.texto}
              </div>
            </div>
          )}
        </section>

        {pedido.previa && <DetalhesTecnicos previa={pedido.previa} />}

        {pedido.previaCortada ? (
          <Banner variant="warning">
            Esta ação é grande demais para conferir inteira aqui. Recuse e faça a mudança direto no app da Oryon.
          </Banner>
        ) : (
          <Banner variant="neutral">
            Confira se foi você quem pediu isso ao {pedido.cliente}. Se não reconhece, recuse.
          </Banner>
        )}

        {/* Revisão do épico (3ª rodada): acesso, "sempre no app" e aplicativo sem cartão pedem a senha. */}
        {pedido.precisaSenha && !pedido.previaCortada && (
          <FormField label="Confirme a sua senha para aprovar">
            <PasswordInput
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
            />
          </FormField>
        )}

        {erro && <Banner variant="danger">{erro}</Banner>}

        {/* Os botões ficam fixos no rodapé: à vista mesmo com a mensagem longa. */}
        <div className="sticky bottom-0 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 px-5 sm:px-6 py-4 bg-surface-800 border-t border-surface-700 rounded-b-[12px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-surface-400 text-center sm:text-left">Nada é feito até você aprovar.</p>
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              loading={enviando === 'recusar'}
              disabled={enviando !== null}
              onClick={() => void decidir(pedido, false)}
            >
              Recusar
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              loading={enviando === 'aprovar'}
              disabled={enviando !== null || pedido.previaCortada || !liberado || (pedido.precisaSenha === true && !senha)}
              title={!liberado && !pedido.previaCortada ? 'Leia o pedido acima antes de aprovar' : undefined}
              onClick={() => {
                if (cliqueValido()) void decidir(pedido, true)
              }}
            >
              Aprovar
            </Button>
          </div>
        </div>
      </div>
    </MolduraOAuth>
  )
}

/** Os detalhes técnicos, recolhidos; abrem e fecham com a altura animada. */
function DetalhesTecnicos({ previa }: { previa: string }) {
  const [aberto, setAberto] = useState(false)
  const id = useId()
  return (
    <div className="rounded-[10px] bg-surface-900">
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={id}
        onClick={() => setAberto((a) => !a)}
        className="w-full rounded-[10px] px-4 py-3 text-sm text-surface-200 flex items-center justify-between gap-2 hover:text-surface-50 transition-colors"
      >
        Ver todos os detalhes
        <ChevronDown
          className={`w-4 h-4 text-surface-400 transition-transform duration-300 ease-out motion-reduce:transition-none ${aberto ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      <AnimatePresence initial={false}>
        {aberto && (
          <motion.div
            id={id}
            key="detalhes"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: CURVA_SUAVE }}
            className="overflow-hidden"
          >
            <pre className="mx-4 mb-4 text-xs text-surface-200 leading-relaxed whitespace-pre-wrap break-words max-h-80 overflow-y-auto font-mono">
              {previa}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Enquanto carrega: o desenho da tela, sem conteúdo (a troca para o pedido fica suave). */
function EsqueletoDoPedido() {
  return (
    <div className="flex flex-col gap-5" role="status" aria-label="Carregando o pedido de aprovação">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-11 h-11 rounded-[10px] bg-surface-700 animate-pulse" />
          <div className="w-12 h-1 rounded-full bg-surface-700" />
          <div className="w-11 h-11 rounded-[10px] bg-surface-700 animate-pulse" />
        </div>
        <div className="h-5 w-3/5 rounded bg-surface-700 animate-pulse" />
        <div className="h-3 w-2/5 rounded bg-surface-700/70 animate-pulse" />
      </div>
      <div className="rounded-[10px] bg-surface-900 p-4 flex flex-col gap-3">
        <div className="h-4 w-1/3 rounded bg-surface-700 animate-pulse" />
        <div className="h-3 w-4/5 rounded bg-surface-700/70 animate-pulse" />
        <div className="h-24 w-full rounded-[8px] bg-surface-800 animate-pulse" />
      </div>
      <span className="sr-only">Carregando o pedido de aprovação</span>
    </div>
  )
}
