import { useCallback, useState, type ReactNode } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChartColumn, Siren, Users, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dropdown } from '@/components/ui/Dropdown'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { UserMenu } from '@/components/layout/TopBar'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useModoFoco } from '@/contexts/modoFoco'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import type { AlertaDaJornada, Jornada, TratamentoDoAlerta, VersaoDaJornada, VersaoPublicada } from '@/services/jornadas/tipos'
import { cn } from '@/lib/utils'
import { SeloDoStatus } from '@/components/jornadas/comum'
import { numero, quandoFoi, ROTULO_DO_STATUS, useCarregar } from '@/components/jornadas/apoio'
import { EditorDeJornada } from '@/components/jornadas/editor/EditorDeJornada'
import { PessoasDaJornada } from '@/components/jornadas/PessoasDaJornada'
import { ResultadosDaJornada } from '@/components/jornadas/ResultadosDaJornada'
import '@/components/jornadas/jornadas.css'

/**
 * ORY-60 — uma jornada, em "modo foco": no computador, o menu lateral e a barra
 * do app somem e fica UMA barra só (voltar, nome, status, abas e as ações do
 * editor). O canvas ganha a tela inteira. No celular nada muda (só leitura).
 * Na ponta direita fica o avatar com o MESMO menu da barra do app (perfil,
 * suporte, configurações, tema, sair): pedido do João em 16/11, para não
 * precisar sair do desenho para trocar o tema ou abrir as configurações.
 */

type Aba = 'desenho' | 'pessoas' | 'resultados'

/** A barra de cima: as mesmas colunas no carregando e na jornada aberta (nada pula). */
// Duas colunas (16/11): à esquerda a jornada (voltar, nome, selo); à direita as
// partes (Desenho, Pessoas, Resultados), as ações e o menu da conta. A coluna da
// direita toma o que precisa e o nome da jornada é que encurta.
const BARRA = 'shrink-0 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 xl:gap-4 h-14 px-3 border-b border-surface-700 bg-[var(--jt-moldura)]'
const SUAVE = [0.2, 0.8, 0.2, 1] as const

/**
 * Entrada e saída do editor. Ao abrir, a tela cresce levemente enquanto o menu
 * e a barra do app deslizam para fora (AppShell); ao voltar, ela recua e some
 * antes de o menu voltar. A mesma moldura fica do carregando à jornada aberta,
 * então a animação acontece uma vez só.
 */
function Moldura({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className="flex flex-col h-full w-full bg-surface-950 min-h-0"
        initial={{ opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1, transition: { duration: 0.34, ease: SUAVE } }}
        exit={{ opacity: 0, scale: 0.985, transition: { duration: 0.16, ease: 'easeIn' } }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  )
}

export function JornadaPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const largo = useMediaQuery('(min-width: 1280px)')
  useModoFoco(!isMobile)
  // Vindo da lista ou da Saúde (P2, 16/11): ?aba=pessoas&erros=1, ?alertas=1, ?config=1 abrem direto no problema.
  const [busca] = useSearchParams()
  const [aba, setAba] = useState<Aba>(() => (busca.get('aba') === 'pessoas' || busca.get('aba') === 'resultados' ? (busca.get('aba') as Aba) : 'desenho'))
  const [configAberta, setConfigAberta] = useState(() => busca.get('config') === '1')
  const [alertasDeInicio] = useState(() => busca.get('alertas') === '1')
  const [slotAcoes, setSlotAcoes] = useState<HTMLDivElement | null>(null)
  const [slotEstado, setSlotEstado] = useState<HTMLSpanElement | null>(null)
  const { dados, erro, recarregar, setDados } = useCarregar(async () => {
    const [jornada, catalogo, apoio, resultados] = await Promise.all([jornadasApi.ver(id), jornadasApi.catalogo(), jornadasApi.apoio(), jornadasApi.resultados(id)])
    return { jornada, catalogo, apoio, resultados }
  }, [id])

  // Depois de salvar ou publicar: o editor segue com o estado dele (só lê o
  // rascunho ao montar); o resto da página passa a ver o rascunho salvo.
  const aoMudar = useCallback((j: Jornada) => {
    setDados((d) => (d ? { ...d, jornada: j } : d))
  }, [setDados])

  // O caminho de uma pessoa aceso no desenho (Pessoas → "Ver no desenho") e
  // Pessoas aberto direto no registro de erros (Resultados → "Falharam N").
  const [caminhoVisto, setCaminhoVisto] = useState<{ titulo: string; nodeIds: string[] } | null>(null)
  const [inicioPessoas, setInicioPessoas] = useState<{ aba: 'pessoas' | 'registro'; soErros?: boolean; passo?: string } | null>(() => (busca.get('erros') === '1' ? { aba: 'registro', soErros: true } : null))

  // Uma versão publicada aberta no desenho, só leitura (P1, 16/11, "View" da HubSpot).
  const [versaoVista, setVersaoVista] = useState<{ info: VersaoPublicada; desenho: VersaoDaJornada } | null>(null)
  const verVersao = useCallback(async (info: VersaoPublicada) => {
    try {
      setVersaoVista({ info, desenho: await jornadasApi.versao(id, info.version) })
      setAba('desenho')
    } catch { /* a versão some da lista se não existir */ }
  }, [id])

  const voltar = () => navigate('/jornadas')

  // O avatar com o menu do app (as ações do editor ficam antes, separadas por uma divisória).
  const menuDoUsuario = <span className="flex shrink-0 items-center pl-0.5"><UserMenu /></span>
  const botaoVoltar = largo
    ? <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={voltar} title="Voltar para a lista de jornadas">Jornadas</Button>
    : <Button variant="ghost" size="sm" iconOnly onClick={voltar} aria-label="Voltar para as jornadas" title="Voltar para a lista de jornadas"><ArrowLeft className="w-4 h-4" /></Button>

  // No modo foco o menu do app some: a tela de erro precisa do próprio "voltar".
  if (erro) return (
    <Moldura>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <ErrorState title="Não foi possível abrir a jornada" onRetry={recarregar} />
        <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />} onClick={voltar}>Voltar para as jornadas</Button>
      </div>
    </Moldura>
  )
  // Carregando: a barra já no lugar (com o "voltar" funcionando) e o fundo do canvas.
  if (!dados) return (
    <Moldura>
      {isMobile ? <MobilePageHeader title="Jornada" onBack={voltar} /> : (
        <header className={BARRA} aria-busy="true">
          <div className="flex items-center gap-2 min-w-0">
            {botaoVoltar}
            <span className="h-5 w-px bg-surface-700 shrink-0" aria-hidden />
            <span className="h-4 w-48 rounded-[5px] bg-surface-800 animate-pulse" aria-hidden />
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="h-8 w-[150px] rounded-[8px] bg-surface-800 animate-pulse" aria-hidden />
            {menuDoUsuario}
          </div>
        </header>
      )}
      <div className="jornadas-fundo-do-canvas flex flex-1 items-center justify-center gap-2 text-sm text-surface-400">
        <Spinner className="w-4 h-4" /> Abrindo a jornada…
      </div>
    </Moldura>
  )

  const { jornada, catalogo, apoio, resultados } = dados
  // As abas no computador (escolha do João em 16/11, opção C): a ativa mostra
  // ícone e nome; as outras, só o ícone, com o nome no balão e para o leitor de
  // tela. Ocupa ~150 px em vez de ~300 e deixa o nome da jornada aparecer.
  // No celular as abas ficam numa linha própria, então seguem com o nome.
  const ABAS = [
    { value: 'desenho' as const, nome: 'Desenho', icone: Workflow },
    { value: 'pessoas' as const, nome: 'Pessoas', icone: Users },
    { value: 'resultados' as const, nome: 'Resultados', icone: ChartColumn },
  ]
  const abas = (
    <SegmentedControl
      label="Partes da jornada"
      size={isMobile ? 'sm' : '32'}
      value={aba}
      onChange={setAba}
      options={ABAS.map(({ value, nome, icone }) => isMobile
        ? { value, label: nome }
        : value === aba
          ? { value, label: nome, icon: icone }
          : { value, label: <span className="sr-only">{nome}</span>, icon: icone, title: nome })}
    />
  )
  const versaoNoAr = jornada.publishedVersion
    ? `v${jornada.publishedVersion} no ar · ${numero(jornada.enrolledNow)} pessoas dentro agora`
    : 'Ainda não publicada'

  return (
    <Moldura>
      {isMobile ? (
        <>
          <MobilePageHeader title={jornada.name} onBack={voltar} />
          <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-2.5 border-b border-surface-700 bg-[var(--jt-moldura)]">
            <SeloDaJornada jornada={jornada} versaoNoAr={versaoNoAr} onMudou={aoMudar} abertoDeInicio={alertasDeInicio} />
            {abas}
          </div>
          {aba === 'desenho' && <div ref={setSlotAcoes} className="shrink-0 flex items-center justify-end gap-2 px-4 py-2 border-b border-surface-700 bg-[var(--jt-moldura)] empty:hidden" />}
        </>
      ) : (
        <header className={BARRA}>
          <div className="flex items-center gap-2 min-w-0">
            {botaoVoltar}
            <span className="h-5 w-px bg-surface-700 shrink-0" aria-hidden />
            <button
              type="button"
              onClick={() => { setAba('desenho'); setConfigAberta(true) }}
              title={`${jornada.name}\nClique para editar o nome e as configurações`}
              className="jornadas-aparecer min-w-0 truncate rounded-[6px] px-1.5 py-1 text-[16px] font-semibold text-surface-50 hover:bg-[var(--rowhover)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {jornada.name}
            </button>
            <span className="jornadas-aparecer shrink-0" style={{ animationDelay: '40ms' }}><SeloDaJornada jornada={jornada} versaoNoAr={versaoNoAr} onMudou={aoMudar} abertoDeInicio={alertasDeInicio} /></span>
            {/* Só aparece quando pede atenção: salvando (ícone) ou "Não salvou". */}
            <span ref={setSlotEstado} className="shrink-0 inline-flex empty:hidden" />
          </div>
          {/* À direita (16/11): as partes da jornada ao lado das ações, como um grupo só de "o que fazer aqui". */}
          <div className="flex items-center justify-end gap-2 min-w-0">
            <div className="jornadas-aparecer shrink-0" style={{ animationDelay: '60ms' }}>{abas}</div>
            <span className="h-5 w-px shrink-0 bg-surface-700" aria-hidden />
            <div ref={setSlotAcoes} className="peer jornadas-aparecer flex items-center justify-end gap-2 min-w-0 empty:hidden" style={{ animationDelay: '90ms' }} />
            {/* Sem ações (abas Pessoas e Resultados), a divisória some. */}
            <span className="h-5 w-px shrink-0 bg-surface-700 peer-empty:hidden" aria-hidden />
            {menuDoUsuario}
          </div>
        </header>
      )}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait" initial={false}>
        <motion.div key={aba} className="h-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
        {aba === 'desenho' && (
          <EditorDeJornada
            key={versaoVista ? `${jornada.id}:v${versaoVista.info.version}` : jornada.id}
            jornada={versaoVista ? { ...jornada, draft: versaoVista.desenho } : jornada}
            versaoAntiga={versaoVista ? { info: versaoVista.info, onSair: () => setVersaoVista(null) } : null}
            onVerVersao={verVersao}
            caminhoExterno={caminhoVisto && !versaoVista ? { ...caminhoVisto, onFechar: () => setCaminhoVisto(null) } : null}
            catalogo={catalogo}
            apoio={apoio}
            resultados={resultados}
            somenteLeitura={isMobile}
            onJornadaMudou={aoMudar}
            slotAcoes={slotAcoes}
            slotEstado={slotEstado}
            configAberta={configAberta}
            onConfigAberta={setConfigAberta}
            onAbrirPessoas={(passo) => { setInicioPessoas({ aba: 'pessoas', passo }); setAba('pessoas') }}
          />
        )}
        {aba === 'pessoas' && (
          <div className="h-full overflow-y-auto">
            <PessoasDaJornada
              key={inicioPessoas ? `${inicioPessoas.aba}:${inicioPessoas.soErros}:${inicioPessoas.passo ?? ''}` : 'pessoas'}
              jornada={jornada}
              catalogo={catalogo}
              inicio={inicioPessoas ?? undefined}
              onVerCaminho={(titulo, nodeIds) => { setVersaoVista(null); setCaminhoVisto({ titulo, nodeIds }); setAba('desenho') }}
            />
          </div>
        )}
        {aba === 'resultados' && (
          <div className="h-full overflow-y-auto">
            <ResultadosDaJornada jornada={jornada} catalogo={catalogo} resultados={resultados} onVerErros={() => { setInicioPessoas({ aba: 'registro', soErros: true }); setAba('pessoas') }}
              onVerCaminho={(titulo, nodeIds) => { setVersaoVista(null); setCaminhoVisto({ titulo, nodeIds }); setAba('desenho') }} />
          </div>
        )}
        </motion.div>
        </AnimatePresence>
      </div>
    </Moldura>
  )
}

/**
 * O status da jornada e os alertas abertos (§2.12: presa, disjuntor, erro fora
 * do normal) num selo só (16/11, pedido do João para enxugar o cabeçalho). Com
 * alerta, o selo ganha um número vermelho no canto; o clique abre o detalhe:
 * versão no ar, pessoas dentro agora e cada alerta.
 */
function SeloDaJornada({ jornada, versaoNoAr, onMudou, abertoDeInicio }: { jornada: Jornada; versaoNoAr: string; onMudou: (j: Jornada) => void; abertoDeInicio?: boolean }) {
  const [aberto, setAberto] = useState(!!abertoDeInicio && (jornada.alerts ?? []).length > 0)
  const [tratando, setTratando] = useState<string | null>(null)
  // Adiados não contam no número; aparecem no balão, apagados.
  const agora = Date.now()
  const adiado = (a: AlertaDaJornada) => !!a.snoozedUntil && Date.parse(a.snoozedUntil) > agora
  const todos = jornada.alerts ?? []
  const alertas = todos.filter((a) => !adiado(a))
  const tratar = async (kind: string, acao: TratamentoDoAlerta) => {
    setTratando(kind + acao)
    try { onMudou(await jornadasApi.tratarAlerta(jornada.id, kind, acao)) } finally { setTratando(null) }
  }
  const textoDosAlertas = alertas.length ? `${alertas.length} alerta${alertas.length > 1 ? 's' : ''}` : ''
  return (
    <Dropdown
      open={aberto}
      onClose={() => setAberto(false)}
      className="w-[380px] p-3"
      anchor={
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          aria-expanded={aberto}
          aria-label={[ROTULO_DO_STATUS[jornada.status], versaoNoAr, textoDosAlertas].filter(Boolean).join('. ')}
          title={[versaoNoAr, alertas.map((x) => ROTULO_DO_ALERTA[x.kind]).join(' · ')].filter(Boolean).join('\n')}
          className="relative inline-flex rounded-[6px] cursor-pointer transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <SeloDoStatus status={jornada.status} />
          {alertas.length > 0 && (
            <span aria-hidden className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-surface-900">
              {alertas.length}
            </span>
          )}
        </button>
      }
    >
      <div role="status" className="space-y-2">
        <div className="px-0.5 pb-0.5">
          <p className="text-[14px] font-semibold text-surface-50">{ROTULO_DO_STATUS[jornada.status]}</p>
          <p className="text-[12px] text-surface-400">{versaoNoAr}</p>
        </div>
        {todos.map((a) => (
          <div key={a.kind + a.since} className={cn('rounded-[10px] px-3 py-2.5', adiado(a) ? 'bg-surface-800 text-surface-300' : 'jt-vermelho')}>
            <div className="flex items-start gap-2.5">
              <Siren className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="text-[14px] font-semibold">{ROTULO_DO_ALERTA[a.kind]}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed">{a.message}</p>
                <p className="mt-1 text-[12px] opacity-80">{adiado(a) ? `Adiado até ${new Date(a.snoozedUntil!).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}` : quandoFoi(a.since)}</p>
              </div>
            </div>
            {/* Tratar o alerta (P1, 16/11, como o "Automation issues" da HubSpot). */}
            <div className="mt-2 flex flex-wrap gap-1.5 pl-6">
              <Button size="sm" variant="secondary" loading={tratando === a.kind + 'resolved'} onClick={() => tratar(a.kind, 'resolved')}>Resolvido</Button>
              {!adiado(a) && <Button size="sm" variant="ghost" loading={tratando === a.kind + 'snooze_24h'} onClick={() => tratar(a.kind, 'snooze_24h')}>Adiar 24 h</Button>}
              <Button size="sm" variant="ghost" loading={tratando === a.kind + 'ignore'} onClick={() => tratar(a.kind, 'ignore')} title="Este tipo de alerta não aparece mais nesta jornada">Ignorar este tipo</Button>
            </div>
          </div>
        ))}
        {todos.length > 0 && (
          <p className="px-0.5 text-[12px] text-surface-400">
            {jornada.alertRecipients?.userIds.length ? `Avisados por ${jornada.alertRecipients.channels.map((c) => (c === 'email' ? 'e-mail' : 'WhatsApp')).join(' e ')}: ${jornada.alertRecipients.userIds.length} pessoa${jornada.alertRecipients.userIds.length > 1 ? 's' : ''}.` : 'Ninguém é avisado fora do app. Escolha quem em Configurações da jornada.'}
          </p>
        )}
      </div>
    </Dropdown>
  )
}

const ROTULO_DO_ALERTA: Record<AlertaDaJornada['kind'], string> = {
  stuck_enrollments: 'Inscrições presas',
  circuit_open: 'Sistema do cliente fora',
  error_rate: 'Erros acima do normal',
  bus_delay: 'Eventos atrasados',
  ai_cap_reached: 'Teto de IA do mês atingido',
}
