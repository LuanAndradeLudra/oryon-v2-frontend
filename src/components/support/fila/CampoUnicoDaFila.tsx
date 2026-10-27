import { useEffect, useRef, useState, type RefObject } from 'react'
import { FileText, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Dropdown, DropdownItem } from '@/components/ui/Dropdown'
import { showToast } from '@/hooks/useToast'
import { aoSairDaSessao } from '@/lib/limpezaDaSessao'
import { cn, getApiErrorMessage } from '@/lib/utils'
import { adminSupportApi } from '@/services/supportApi'
import type { ChamadoDaEquipe } from '@/types/support'
import { EscolhaEmLinha } from '../ReportTicketPanel'
import type { StatusChamado } from '../supportModel'
import { CATEGORIAS, type Categoria } from '../supportModel'
import { CAUSAS, MODELOS_DE_RESPOSTA, STATUS_AO_RESPONDER, STATUS_NA_FILA, ehConflito, type CausaRaiz } from './modeloDaFila'

export type ModoDoCampo = 'responder' | 'perguntar' | 'nota'
export interface CampoDaFilaRef { focar: (m: ModoDoCampo) => void }

interface Rascunho {
  responder: string; depende: string; perguntar: string; nota: string; deixarComo: StatusChamado | null
  /** Resolvendo (revisão de UX de 27/10): a causa e a categoria confirmada. */
  causa: CausaRaiz | null; categoria: Categoria | null
}
const VAZIO: Rascunho = { responder: '', depende: '', perguntar: '', nota: '', deixarComo: null, causa: null, categoria: null }
/** Rascunho POR chamado e por modo, na sessão: trocar de chamado não leva nem perde o texto. Sai no logout. */
const rascunhos = new Map<string, Rascunho>()
aoSairDaSessao(() => rascunhos.clear())

const MODOS: Array<[ModoDoCampo, string]> = [['responder', 'Responder à empresa'], ['perguntar', 'Perguntar'], ['nota', 'Nota interna']]

/**
 * CAMPO ÚNICO no pé do chamado: responder à empresa (com o status em que o
 * chamado fica — o único caminho para Resolvido), perguntar (a vez passa a ser
 * da empresa) ou nota interna (só a equipe vê; borda tracejada). Ocorrência
 * interna não tem empresa: só nota.
 */
export function CampoUnicoDaFila({ c, onAtualizar, onRecarregar, campoRef }: {
  c: ChamadoDaEquipe
  onAtualizar: (c: ChamadoDaEquipe) => void
  onRecarregar: () => void
  campoRef: RefObject<CampoDaFilaRef | null>
}) {
  const semEmpresa = c.kind === 'oco' || !c.visivelParaEmpresa
  const encerrado = c.status === 'closed'
  const [modo, setModo] = useState<ModoDoCampo>(semEmpresa ? 'nota' : 'responder')
  const [rascunho, setRascunho] = useState<Rascunho>(() => rascunhos.get(c.id) ?? VAZIO)
  const mudar = (parcial: Partial<Rascunho>) => setRascunho((r) => {
    const novo = { ...r, ...parcial }
    rascunhos.set(c.id, novo)
    return novo
  })
  /** Depois do envio, limpa só se o campo ainda é o texto enviado: o que foi escrito durante a requisição fica (revisão do Portão 3). */
  const limparEnviado = (campo: 'responder' | 'perguntar' | 'nota', enviado: string, extra: Partial<Rascunho> = {}) =>
    setRascunho((r) => {
      if (r[campo].trim() !== enviado) return r
      const novo = { ...r, [campo]: '', ...extra }
      rascunhos.set(c.id, novo)
      return novo
    })
  const [enviando, setEnviando] = useState(false)
  const enviandoAgora = useRef(false)
  const texto = useRef<HTMLTextAreaElement>(null)
  const [verModelos, setVerModelos] = useState(false)
  // Revisão de UX de 27/10: o campo fica RECOLHIDO (uma linha) até alguém ir escrever — aberto, ele
  // tomava 1/4 da altura e espremia a leitura da evidência. Com rascunho, já abre aberto.
  const [ativo, setAtivo] = useState(false)
  const temRascunho = !!(rascunho.responder.trim() || rascunho.perguntar.trim() || rascunho.nota.trim())
  const expandido = ativo || temRascunho
  const abrir = (m: ModoDoCampo) => { setModo(semEmpresa ? 'nota' : m); setAtivo(true); requestAnimationFrame(() => texto.current?.focus()) }

  useEffect(() => {
    campoRef.current = { focar: (m) => { setModo(semEmpresa ? 'nota' : m); setAtivo(true); requestAnimationFrame(() => texto.current?.focus()) } }
    return () => { campoRef.current = null }
  }, [campoRef, semEmpresa])

  // Responder sem escolher: o chamado fica como está (ou em análise). Resolver um chamado aberto é escolha explícita.
  const deixarComo: StatusChamado = rascunho.deixarComo ?? (STATUS_AO_RESPONDER.includes(c.status) ? c.status : 'investigating')
  const valor = modo === 'responder' ? rascunho.responder : modo === 'perguntar' ? rascunho.perguntar : rascunho.nota
  const escrever = (t: string) => mudar(modo === 'responder' ? { responder: t } : modo === 'perguntar' ? { perguntar: t } : { nota: t })
  const perguntaAberta = modo === 'perguntar' && !!c.perguntaPendente
  const bloqueado = encerrado && modo !== 'nota'
  const minimo = modo === 'responder' ? 10 : modo === 'perguntar' ? 5 : 1
  // Resolver pede a causa (a Qualidade depende dela); num problema vinculado, vale a do problema.
  const resolvendo = modo === 'responder' && deixarComo === 'resolved'
  const causa = rascunho.causa ?? c.causaRaiz ?? null
  const faltaCausa = resolvendo && !causa && !c.problemaId
  const categoria = rascunho.categoria ?? c.categoria
  const pronto = valor.trim().length >= minimo && !perguntaAberta && !bloqueado && !faltaCausa

  const enviar = async () => {
    if (!pronto || enviandoAgora.current) return
    enviandoAgora.current = true
    setEnviando(true)
    const corpo = valor.trim()
    try {
      if (modo === 'responder') {
        onAtualizar(await adminSupportApi.responder(c.id, {
          resumo: corpo, dependeDaClinica: rascunho.depende.trim() || null, deixarComo, version: c.version,
          ...(resolvendo && causa && causa !== c.causaRaiz ? { causaRaiz: causa } : {}),
          ...(resolvendo && categoria !== c.categoria ? { categoria } : {}),
        }))
        limparEnviado('responder', corpo, { depende: '', deixarComo: null, causa: null, categoria: null })
        setAtivo(false)
        showToast(deixarComo === 'resolved' ? 'Resposta enviada. A empresa vai confirmar se resolveu.' : `Resposta enviada. Chamado: ${STATUS_NA_FILA[deixarComo]}.`, 'success')
      } else if (modo === 'perguntar') {
        onAtualizar(await adminSupportApi.perguntar(c.id, corpo, c.version))
        limparEnviado('perguntar', corpo)
        setAtivo(false)
        showToast('Pergunta enviada. O chamado aguarda a empresa.', 'success')
      } else {
        onAtualizar(await adminSupportApi.anotar(c.id, corpo))
        limparEnviado('nota', corpo)
        setAtivo(false)
        showToast('Nota interna registrada.', 'success')
      }
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Não foi possível enviar. Tente de novo.'), 'error')
      if (ehConflito(err)) onRecarregar()
    } finally {
      enviandoAgora.current = false
      setEnviando(false)
    }
  }

  const modos = semEmpresa ? MODOS.filter(([k]) => k === 'nota') : MODOS
  if (!expandido) {
    // Recolhido: os modos e uma linha que abre o campo (R também abre, pela página).
    return (
      <div className="border-t border-surface-800 px-4 md:px-6 py-2 flex-shrink-0">
        <div className="max-w-[820px] mx-auto flex items-center gap-1 flex-wrap">
          {modos.map(([k, r]) => (
            <button key={k} type="button" onClick={() => abrir(k)}
              className="h-8 px-2.5 rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap text-surface-300 hover:bg-[var(--rowhover)] hover:text-surface-100">
              {k === 'nota' && <Lock className="w-3 h-3" aria-hidden />}{r}
            </button>
          ))}
          <button type="button" onClick={() => abrir(semEmpresa ? 'nota' : 'responder')}
            className="flex-1 min-w-[160px] h-8 px-3 rounded-[6px] border border-[var(--bd2)] text-left text-xs text-surface-400 hover:text-surface-200 hover:bg-[var(--rowhover)]">
            {encerrado ? 'Chamado encerrado · nota interna' : 'Escrever…'} <kbd className="ml-1 font-mono text-[11px] text-surface-500">R</kbd>
          </button>
        </div>
      </div>
    )
  }
  return (
    <div className={cn('border-t px-4 md:px-6 py-3 flex-shrink-0', modo === 'nota' ? 'border-dashed border-surface-500' : 'border-surface-800')}>
      <div className="max-w-[820px] mx-auto flex flex-col gap-2">
        <div className="flex items-center gap-1 flex-wrap" role="tablist" aria-label="Tipo de mensagem">
          {modos.map(([k, r]) => (
            <button key={k} type="button" role="tab" aria-selected={modo === k} onClick={() => setModo(k)}
              className={cn('h-7 px-2 sm:px-2.5 rounded-[6px] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors',
                modo === k ? 'bg-[var(--sel)] text-surface-100' : 'text-surface-400 hover:bg-[var(--rowhover)] hover:text-surface-200')}>
              {k === 'nota' && <Lock className="w-3 h-3" aria-hidden />}{r}
            </button>
          ))}
          {modo === 'responder' && !bloqueado && (
            <Dropdown open={verModelos} onClose={() => setVerModelos(false)} align="right" className="w-[260px] max-w-[calc(100vw-24px)]" wrapperClassName="ml-auto"
              anchor={(
                <Button size="sm" variant="ghost" leftIcon={<FileText className="w-3.5 h-3.5" />} onClick={() => setVerModelos((v) => !v)} aria-haspopup="menu" aria-expanded={verModelos}>
                  Modelos
                </Button>
              )}>
              {MODELOS_DE_RESPOSTA.map((m) => (
                <DropdownItem key={m.id} onClick={() => { mudar({ responder: m.texto, deixarComo: m.deixarComo }); setVerModelos(false); requestAnimationFrame(() => texto.current?.focus()) }}>
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span>{m.titulo}</span>
                    <span className="text-[11px] text-surface-400">Deixa como: {STATUS_NA_FILA[m.deixarComo]}</span>
                  </span>
                </DropdownItem>
              ))}
            </Dropdown>
          )}
          {modo === 'nota' && <span className="ml-auto text-[11px] text-surface-400">só a equipe Oryon vê</span>}
        </div>

        {bloqueado ? (
          <p className="text-xs text-surface-400 py-2">Chamado encerrado: só a empresa reabre. A nota interna continua disponível.</p>
        ) : perguntaAberta ? (
          <p className="text-xs text-surface-400 py-2">Já existe uma pergunta esperando a empresa: “{c.perguntaPendente}”. A resposta dela aparece na Atividade.</p>
        ) : (
          <Textarea ref={texto} rows={modo === 'responder' ? 3 : 2} maxLength={modo === 'perguntar' ? 2000 : 5000} value={valor} onChange={(e) => escrever(e.target.value)}
            // Esc no campo vazio recolhe de novo.
            onKeyUp={(e) => { if (e.key === 'Escape' && !valor.trim()) setAtivo(false) }}
            aria-label={modo === 'responder' ? 'Resposta à empresa' : modo === 'perguntar' ? 'Pergunta para a empresa' : 'Nota interna'}
            placeholder={modo === 'responder' ? 'O que aconteceu, o que a Oryon fez e o que vem a seguir.' : modo === 'perguntar' ? 'Ex.: isso aconteceu com outros contatos depois das 10h?' : 'Hipótese, o que já foi verificado, próximo passo…'}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void enviar() } }} />
        )}
        {modo === 'responder' && !bloqueado && (
          <Input size="sm" value={rascunho.depende} onChange={(e) => mudar({ depende: e.target.value })} maxLength={1000}
            placeholder="O que depende da empresa (opcional)" aria-label="O que depende da empresa" />
        )}
        <div className="flex flex-wrap items-center gap-2">
          {modo === 'responder' && !bloqueado && (
            <span className="flex flex-shrink-0 items-center gap-1 text-xs text-surface-400">
              Deixar como
              <span className="max-w-[300px]"><EscolhaEmLinha rotulo="Status depois da resposta" valor={deixarComo} onChange={(v) => v && mudar({ deixarComo: v })}
                opcoes={STATUS_AO_RESPONDER.map((s) => [s, s === 'resolved' ? 'Resolvido · pede confirmação' : STATUS_NA_FILA[s]])} /></span>
            </span>
          )}
          {/* Resolvendo: a causa (obrigatória, salvo problema vinculado) e a categoria confirmada, no mesmo clique. */}
          {resolvendo && !bloqueado && (
            <>
              <span className="flex flex-shrink-0 items-center gap-1 text-xs text-surface-400">
                Causa{!c.problemaId && <span className="text-danger" aria-hidden>*</span>}
                <span className="max-w-[260px]"><EscolhaEmLinha<CausaRaiz> rotulo="Causa do problema" valor={causa} vazio={c.problemaId ? 'A do problema' : 'Escolher'}
                  onChange={(v) => mudar({ causa: v })} opcoes={(Object.keys(CAUSAS) as CausaRaiz[]).map((k) => [k, CAUSAS[k]])} /></span>
              </span>
              <span className="flex flex-shrink-0 items-center gap-1 text-xs text-surface-400">
                Categoria
                <span className="max-w-[260px]"><EscolhaEmLinha<Categoria> rotulo="Categoria ao resolver" valor={categoria}
                  onChange={(v) => v && mudar({ categoria: v })} opcoes={(Object.keys(CATEGORIAS) as Categoria[]).map((k) => [k, CATEGORIAS[k]])} /></span>
              </span>
            </>
          )}
          <span className="text-[11px] text-surface-400 mr-auto">
            {bloqueado || perguntaAberta ? null : faltaCausa
              ? 'Para resolver, escolha a causa: ela alimenta a Qualidade'
              : modo === 'responder'
              ? 'A empresa vê na página Suporte e é avisada no produto, por e-mail e WhatsApp'
              : modo === 'perguntar'
                ? 'A empresa é avisada no produto, por e-mail e WhatsApp; os prazos param até ela responder'
                : 'Ctrl+Enter registra · não avisa a empresa'}
          </span>
          {!bloqueado && !perguntaAberta && (
            <Button size="sm" variant={modo === 'nota' ? 'neutral' : 'primary'} disabled={!pronto} loading={enviando} onClick={() => void enviar()}>
              {modo === 'responder' ? 'Enviar para a empresa' : modo === 'perguntar' ? 'Enviar pergunta' : 'Registrar nota'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
