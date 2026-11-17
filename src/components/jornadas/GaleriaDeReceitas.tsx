import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, FilePlus2, Sparkles, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/hooks/useToast'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import { cn } from '@/lib/utils'
import { passoDoCatalogo } from '@/services/jornadas/catalogo'
import type { ApoioDoEditor, CanalDaJornada, Catalogo, LimitesDoPlano, ObjetivoDaReceita, PropostaDaIa, Receita, SegmentoDaReceita, TipoDePorta } from '@/services/jornadas/tipos'
import { canaisDoDesenho, ROTULO_DO_CANAL } from '@/services/jornadas/canais'
import { CATALOGO_EXEMPLO } from '@/services/jornadas/catalogo'
import { IconeDoCatalogo, Selo } from './comum'
import { useCarregar } from './apoio'
import { IconeDoPasso } from './editor/IconeDoPasso'
import { TIPO_DA_PORTA } from './editor/categorias'
import { numerarPassos } from './editor/numeracao'
import { resumoDaPorta } from './editor/resumo'

/**
 * A galeria: receitas nomeadas pelo RESULTADO ("Menos visitas perdidas"),
 * separadas pelos segmentos da Oryon (os mesmos da landing) e as que servem a
 * qualquer negócio. Usar uma receita cria um rascunho com o desenho pronto.
 * No produto, a galeria pode abrir já filtrada pelo segmento da empresa.
 *
 * P1 do benchmark (16/11): "Em branco" vem primeiro e começa pela PORTA
 * (trigger-first, como HubSpot, Customer.io e respond.io), e cada receita abre
 * uma prévia com o desenho em lista, as portas, a meta e o checklist do que é
 * preciso ter (linha, modelo aprovado, sistema conectado), como o Intercom.
 *
 * P2 (16/11): filtros por objetivo (confirmar, recuperar, atender…) e por canal
 * (WhatsApp, equipe, agente, sistema, CRM, IA), além do segmento. E "Criar com
 * IA" (Copiloto v2): descreve, a IA monta, a prévia aparece ANTES de criar, e
 * a jornada nasce como rascunho desligado.
 */

/** A ordem dos segmentos na galeria; `geral` fica por último. */
const SEGMENTOS: { id: SegmentoDaReceita; rotulo: string }[] = [
  { id: 'clinica', rotulo: 'Clínica' },
  { id: 'imobiliaria', rotulo: 'Imobiliária' },
  { id: 'loja', rotulo: 'Loja' },
  { id: 'contabilidade', rotulo: 'Contabilidade' },
  { id: 'juridico', rotulo: 'Jurídico' },
  { id: 'geral', rotulo: 'Qualquer negócio' },
]
const ROTULO_DO_SEGMENTO = Object.fromEntries(SEGMENTOS.map((s) => [s.id, s.rotulo])) as Record<SegmentoDaReceita, string>
const ORDEM_DO_SEGMENTO = Object.fromEntries(SEGMENTOS.map((s, i) => [s.id, i])) as Record<SegmentoDaReceita, number>

type Filtro = SegmentoDaReceita | 'todas'

const OBJETIVOS: { id: ObjetivoDaReceita; rotulo: string }[] = [
  { id: 'confirmar', rotulo: 'Confirmar e lembrar' },
  { id: 'recuperar', rotulo: 'Recuperar e reativar' },
  { id: 'atender', rotulo: 'Atender rápido' },
  { id: 'ouvir', rotulo: 'Ouvir o cliente' },
  { id: 'cobrar', rotulo: 'Cobrar pendências' },
  { id: 'avisar', rotulo: 'Avisar a equipe' },
]

export function GaleriaDeReceitas({ compacta = false }: { compacta?: boolean }) {
  const { dados: receitas } = useCarregar(() => jornadasApi.receitas(), [])
  const [escolhida, setEscolhida] = useState<Receita | 'zero' | null>(null)
  const [comIa, setComIa] = useState(false)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [objetivo, setObjetivo] = useState<ObjetivoDaReceita | ''>('')
  const [canal, setCanal] = useState<CanalDaJornada | ''>('')

  const ordenadas = useMemo(() => [...(receitas ?? [])].sort((a, b) => ORDEM_DO_SEGMENTO[a.segment] - ORDEM_DO_SEGMENTO[b.segment]), [receitas])
  // O catálogo de exemplo basta para saber os canais (é o mesmo tipo de passo do motor).
  const canaisDe = useMemo(() => new Map((receitas ?? []).map((r) => [r.id, canaisDoDesenho(r.version, CATALOGO_EXEMPLO)])), [receitas])
  const visiveis = ordenadas.filter((r) => (filtro === 'todas' || r.segment === filtro) && (!objetivo || r.goal === objetivo) && (!canal || canaisDe.get(r.id)?.includes(canal)))
  const opcoes = [
    { value: 'todas' as Filtro, label: 'Todas', count: ordenadas.length },
    ...SEGMENTOS.map((s) => ({ value: s.id as Filtro, label: s.rotulo, count: ordenadas.filter((r) => r.segment === s.id).length })).filter((o) => o.count > 0),
  ]

  const cartao = 'jornadas-aparecer group flex h-full flex-col text-left rounded-[12px] border px-5 py-5 cursor-pointer transition-[background-color,border-color,translate,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(0,0,0,0.22)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500'
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 max-w-[620px] text-[14px] leading-relaxed text-surface-400">Cada receita já vem montada e com os textos prontos. Escolha uma, ajuste o que é da sua empresa (linha, modelo, setor) e teste antes de publicar.</p>
        {receitas && <div className="max-w-full overflow-x-auto"><SegmentedControl label="Filtrar receitas por segmento" value={filtro} onChange={setFiltro} options={opcoes} /></div>}
      </div>
      {receitas && (
        <div className="flex flex-wrap items-center gap-2">
          <Select size="sm" className="w-auto" value={objetivo} onChange={(e) => setObjetivo(e.target.value as ObjetivoDaReceita | '')} aria-label="Filtrar por objetivo">
            <option value="">Qualquer objetivo</option>
            {OBJETIVOS.map((o) => <option key={o.id} value={o.id}>{o.rotulo}</option>)}
          </Select>
          <Select size="sm" className="w-auto" value={canal} onChange={(e) => setCanal(e.target.value as CanalDaJornada | '')} aria-label="Filtrar por canal">
            <option value="">Qualquer canal</option>
            {(Object.keys(ROTULO_DO_CANAL) as CanalDaJornada[]).map((c) => <option key={c} value={c}>{ROTULO_DO_CANAL[c]}</option>)}
          </Select>
          {(objetivo || canal) && <Button variant="ghost" size="sm" leftIcon={<X className="h-3.5 w-3.5" />} onClick={() => { setObjetivo(''); setCanal('') }}>Limpar</Button>}
          <span className="ml-auto text-[12px] text-surface-500">{visiveis.length} receita{visiveis.length === 1 ? '' : 's'}</span>
        </div>
      )}
      <div className={compacta ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'}>
        {!compacta && receitas && (
          <button type="button" onClick={() => setEscolhida('zero')}  className={`${cartao} border-dashed border-surface-600 bg-transparent hover:bg-[var(--rowhover)]`}>
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-[10px] border border-dashed border-surface-600 text-surface-300">
              <FilePlus2 className="w-5 h-5" aria-hidden />
            </span>
            <p className="mt-4 text-[16px] font-semibold text-surface-50 leading-5">Em branco</p>
            <p className="mt-2 text-[14px] text-surface-400 leading-relaxed">Comece pela porta: o que faz alguém entrar na jornada. Depois, monte o caminho no canvas.</p>
            <div className="mt-auto pt-4 flex justify-end text-[12px]">
              <span className="inline-flex items-center gap-1 font-semibold text-surface-300 group-hover:text-brand-500 transition-colors">Escolher a porta<ArrowRight className="w-3.5 h-3.5 transition-[translate] duration-200 group-hover:translate-x-0.5" aria-hidden /></span>
            </div>
          </button>
        )}
        {!compacta && receitas && (
          <button type="button" onClick={() => setComIa(true)} className={`${cartao} border-surface-700 bg-surface-800 hover:bg-[var(--rowhover)] hover:border-[var(--bd2)]`}>
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-[10px] jt-violeta">
              <Sparkles className="w-5 h-5" aria-hidden />
            </span>
            <p className="mt-4 text-[16px] font-semibold text-surface-50 leading-5">Criar com IA</p>
            <p className="mt-2 text-[14px] text-surface-400 leading-relaxed">Conte o que a jornada deve fazer, com suas palavras. A IA monta o desenho e mostra antes de criar.</p>
            <div className="mt-auto pt-4 flex justify-end text-[12px]">
              <span className="inline-flex items-center gap-1 font-semibold text-surface-300 group-hover:text-brand-500 transition-colors">Descrever<ArrowRight className="w-3.5 h-3.5 transition-[translate] duration-200 group-hover:translate-x-0.5" aria-hidden /></span>
            </div>
          </button>
        )}
        {visiveis.map((r, i) => (
          <button key={r.id} type="button" onClick={() => setEscolhida(r)} style={{ animationDelay: `${Math.min(i, 9) * 40}ms` }} className={`${cartao} border-surface-700 bg-surface-800 hover:bg-[var(--rowhover)] hover:border-[var(--bd2)]`}>
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-[10px] bg-surface-700 text-surface-100">
                <IconeDoCatalogo nome={r.icon} className="w-5 h-5" />
              </span>
              <span className="flex flex-wrap justify-end gap-1">
                <Selo tom={r.segment === 'geral' ? 'cinza' : 'azul'}>{ROTULO_DO_SEGMENTO[r.segment]}</Selo>
                {r.usesAi ? <Selo tom="violeta"><Sparkles className="w-3 h-3" aria-hidden />Usa IA</Selo> : <Selo tom="cinza">Sem IA</Selo>}
              </span>
            </div>
            <p className="mt-4 text-[16px] font-semibold text-surface-50 leading-5">{r.name}</p>
            <p className="mt-1 text-[14px] font-medium text-brand-500">{r.outcome}</p>
            <p className="mt-2 text-[14px] text-surface-400 leading-relaxed">{r.description}</p>
            <div className="mt-auto pt-4 flex items-center justify-between text-[12px]">
              <span className="text-surface-500">{Object.keys(r.version.graph.nodes).length} passos</span>
              <span className="inline-flex items-center gap-1 font-semibold text-surface-300 group-hover:text-brand-500 transition-colors">Usar esta receita<ArrowRight className="w-3.5 h-3.5 transition-[translate] duration-200 group-hover:translate-x-0.5" aria-hidden /></span>
            </div>
          </button>
        ))}
      </div>
      <CriarJornada escolha={escolhida} onClose={() => setEscolhida(null)} />
      <CriarComIa open={comIa} onClose={() => setComIa(false)} />
    </div>
  )
}

const PORTAS_DO_COMECO: { tipo: TipoDePorta; titulo: string; sub: string }[] = [
  { tipo: 'event', titulo: 'Quando algo acontecer', sub: 'Agendamento marcado ou cancelado, etiqueta posta, negócio ganho, primeira mensagem…' },
  { tipo: 'schedule_list', titulo: 'Agenda do sistema, todo dia', sub: 'Num horário, pega a lista do sistema do cliente (ex.: a agenda de amanhã).' },
  { tipo: 'segment', titulo: 'Um segmento, de tempos em tempos', sub: 'Quem está num grupo salvo, por dia, semana ou mês.' },
  { tipo: 'webhook', titulo: 'Outro sistema avisa', sub: 'Um formulário do site ou outro sistema manda um aviso (webhook).' },
  { tipo: 'manual', titulo: 'Manual ou pela API', sub: 'Você inscreve as pessoas pela tela ou pela API.' },
]

/** O que a receita precisa para funcionar, conferido com o que a empresa já tem. */
function checklistDaReceita(r: Receita, apoio: ApoioDoEditor, limites: LimitesDoPlano | null): { ok: boolean; texto: string; ajuda?: string }[] {
  const tipos = new Set(Object.values(r.version.graph.nodes).map((n) => n.type))
  const usaModelo = tipos.has('send_template') || tipos.has('send_and_wait')
  const usaSistema = tipos.has('connector_call') || r.version.entry.doors.some((d) => d.type === 'schedule_list')
  const usaSetor = tipos.has('notify_team') || tipos.has('handoff_human')
  const itens: { ok: boolean; texto: string; ajuda?: string }[] = [
    { ok: apoio.whatsappNumbers.length > 0, texto: 'Uma linha de WhatsApp conectada', ajuda: 'Conecte em Configurações → WhatsApp.' },
  ]
  if (usaModelo) {
    const aprovados = apoio.templates.filter((t) => t.status === 'APPROVED').length
    itens.push({ ok: aprovados > 0, texto: aprovados ? `Um modelo aprovado pela Meta (você tem ${aprovados})` : 'Um modelo aprovado pela Meta', ajuda: 'Crie em Disparos → Modelos. A aprovação leva de minutos a um dia.' })
  }
  if (usaSistema) itens.push({ ok: !!apoio.connector, texto: apoio.connector ? `O sistema do cliente conectado (${apoio.connector.name})` : 'O sistema do cliente conectado', ajuda: 'Conecte em Integrações. Sem ele, a agenda e a confirmação no sistema não funcionam.' })
  if (usaSetor) itens.push({ ok: apoio.departments.length > 0, texto: 'Um setor para receber os avisos', ajuda: 'Crie em Configurações → Equipe.' })
  if (r.usesAi && limites) itens.push({ ok: limites.aiCreditsThisMonth.used < limites.aiCreditsThisMonth.max, texto: `Créditos de IA no plano (${limites.aiCreditsThisMonth.max - limites.aiCreditsThisMonth.used} livres no mês)`, ajuda: 'Os passos de IA param de usar IA quando acabam os créditos.' })
  return itens
}

/** A prévia da receita: o desenho em lista, as portas, a meta e o que é preciso ter. */
function PreviaDaReceita({ receita }: { receita: Receita }) {
  const { dados: apoio } = useCarregar(() => jornadasApi.apoio(), [])
  const { dados: catalogo } = useCarregar(() => jornadasApi.catalogo(), [])
  const { dados: limites } = useCarregar(() => jornadasApi.limites(), [])
  const numeros = numerarPassos(receita.version.graph)
  const passos = Object.entries(receita.version.graph.nodes).sort(([a], [b]) => (numeros.get(a) ?? 99) - (numeros.get(b) ?? 99))
  const checklist = apoio ? checklistDaReceita(receita, apoio, limites) : []
  const metas = [...receita.version.goals.goals.map((g) => g.label), ...Object.values(receita.version.graph.nodes).filter((n) => n.type === 'goal').map((n) => String(n.params.label ?? 'Meta atingida'))]
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[10px] bg-surface-800 px-3 py-2.5">
          <p className="text-[12px] text-surface-400">Como as pessoas entram</p>
          {catalogo && receita.version.entry.doors.map((d) => { const r = resumoDaPorta(d, catalogo as Catalogo); return <p key={d.id} className="mt-0.5 text-[14px] text-surface-100">{r.titulo}<span className="text-surface-400"> · {r.detalhe}</span></p> })}
        </div>
        <div className="rounded-[10px] bg-surface-800 px-3 py-2.5">
          <p className="text-[12px] text-surface-400">Meta</p>
          <p className="mt-0.5 text-[14px] text-surface-100">{metas[0] ?? 'Sem meta'}{metas.length > 1 ? <span className="text-surface-400"> +{metas.length - 1}</span> : null}</p>
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[12px] font-semibold text-surface-300">O desenho ({passos.length} passos)</p>
        <ol className="max-h-[200px] space-y-1 overflow-y-auto rounded-[10px] bg-surface-800 p-2">
          {passos.map(([id, no]) => {
            const passo = catalogo ? passoDoCatalogo(catalogo, no.type) : undefined
            return (
              <li key={id} className="flex items-center gap-2.5 rounded-[8px] px-1.5 py-1">
                <IconeDoPasso tipo={no.type} grupo={passo?.group} tamanho="p" />
                <span className="w-5 shrink-0 text-right text-[12px] tabular-nums text-surface-500">{numeros.get(id) ?? ''}</span>
                <span className="min-w-0 truncate text-[14px] text-surface-100">{no.label || passo?.label || no.type}</span>
              </li>
            )
          })}
        </ol>
      </div>
      <div>
        <p className="mb-1.5 text-[12px] font-semibold text-surface-300">O que você precisa ter</p>
        {!apoio ? <p className="text-[12px] text-surface-400">Conferindo…</p> : (
          <ul className="space-y-1.5">
            {checklist.map((c) => (
              <li key={c.texto} className="flex items-start gap-2.5">
                <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full', c.ok ? 'jt-verde' : 'jt-ambar')} aria-label={c.ok ? 'tem' : 'falta'}>
                  {c.ok ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] text-surface-100">{c.texto}</span>
                  {!c.ok && c.ajuda && <span className="block text-[12px] text-surface-400">{c.ajuda}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        {apoio && checklist.some((c) => !c.ok) && <p className="mt-2 text-[12px] text-surface-400">Dá para criar o rascunho assim mesmo e ajeitar o que falta antes de publicar.</p>}
      </div>
    </div>
  )
}

const EXEMPLOS_DA_IA = [
  'Um dia antes do agendamento, confirmar pelo WhatsApp; quem não responder, avisar a equipe.',
  'Quando um orçamento ficar 2 dias sem resposta, mandar um lembrete e passar para o agente.',
  'Depois do atendimento, pedir uma avaliação; nota ruim avisa a gestão.',
]

/** A proposta da IA no formato da prévia das receitas (o mesmo desenho em lista e o mesmo checklist). */
const comoReceita = (p: PropostaDaIa): Receita => ({
  id: 'ia', name: p.name, outcome: '', description: p.description, segment: 'geral', icon: 'Sparkles',
  usesAi: Object.values(p.version.graph.nodes).some((n) => n.type.startsWith('ai_')), version: p.version,
})

/** "Criar com IA": descreve → a IA propõe → a prévia → cria o rascunho (desligado). */
function CriarComIa({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [descricao, setDescricao] = useState('')
  const [proposta, setProposta] = useState<PropostaDaIa | null>(null)
  const [pensando, setPensando] = useState(false)
  const [criando, setCriando] = useState(false)
  const fechar = () => { setProposta(null); setDescricao(''); onClose() }
  const propor = async () => {
    setPensando(true)
    try { setProposta(await jornadasApi.proporComIa({ descricao })) }
    catch (e) { toast(e instanceof Error ? e.message : 'A IA não conseguiu montar agora. Tente de novo.', 'error') }
    finally { setPensando(false) }
  }
  const criar = async () => {
    if (!proposta) return
    setCriando(true)
    try {
      const j = await jornadasApi.criarDaProposta(proposta)
      fechar()
      navigate(`/jornadas/${j.id}`)
    } catch (e) { toast(e instanceof Error ? e.message : 'Não foi possível criar.', 'error') }
    finally { setCriando(false) }
  }
  return (
    <Modal open={open} onClose={fechar} title={proposta ? proposta.name : 'Criar com IA'} className="max-w-[620px]"
      footer={
        <div className="flex justify-end gap-2">
          {proposta ? (
            <>
              <Button variant="ghost" onClick={() => setProposta(null)}>Mudar o pedido</Button>
              <Button onClick={criar} loading={criando}>Criar o rascunho</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={fechar}>Cancelar</Button>
              <Button leftIcon={<Sparkles className="w-4 h-4" />} onClick={propor} loading={pensando} disabled={descricao.trim().length < 8}>Montar o desenho</Button>
            </>
          )}
        </div>
      }>
      {proposta ? (
        <div className="space-y-4 text-sm text-surface-200">
          <div className="rounded-[10px] bg-surface-800 px-3 py-2.5">
            <p className="mb-1 inline-flex items-center gap-1.5 text-[12px] font-semibold jt-texto-violeta"><Sparkles className="h-3.5 w-3.5" aria-hidden />Como a IA montou</p>
            <ul className="space-y-1">{proposta.explanation.map((t) => <li key={t} className="text-[14px] leading-snug text-surface-100">{t}</li>)}</ul>
          </div>
          <PreviaDaReceita receita={comoReceita(proposta)} />
          <p className="text-xs text-surface-400">Nasce como rascunho desligado: nada roda até você testar e publicar. Tudo no desenho dá para mudar.</p>
        </div>
      ) : (
        <div className="space-y-3 text-sm text-surface-200">
          <p className="text-surface-300">Descreva com suas palavras: quem entra, o que recebe, o que acontece se responder ou não. A IA monta o desenho e mostra antes de criar qualquer coisa.</p>
          <Textarea rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: um dia antes do agendamento, confirmar; quem não responder até as 18h, avisar a equipe." autoFocus aria-label="O que a jornada deve fazer" />
          <div className="space-y-1.5">
            <p className="text-[12px] text-surface-400">Ou comece por um exemplo:</p>
            <div className="flex flex-wrap gap-1.5">
              {EXEMPLOS_DA_IA.map((t) => (
                <button key={t} type="button" onClick={() => setDescricao(t)} className="rounded-[8px] bg-surface-800 px-2.5 py-1.5 text-left text-[12px] leading-snug text-surface-200 hover:bg-[var(--rowhover)] cursor-pointer">{t}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

function CriarJornada({ escolha, onClose }: { escolha: Receita | 'zero' | null; onClose: () => void }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [nome, setNome] = useState('')
  const [criando, setCriando] = useState(false)
  const [porta, setPorta] = useState<TipoDePorta>('event')
  const receita = escolha && escolha !== 'zero' ? escolha : null
  const nomeFinal = nome.trim() || receita?.name || 'Nova jornada'

  const criar = async () => {
    setCriando(true)
    try {
      const j = await jornadasApi.criar({ name: nomeFinal, recipeId: receita?.id ?? null, door: receita ? undefined : porta })
      onClose()
      setNome('')
      navigate(`/jornadas/${j.id}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível criar.', 'error')
    } finally {
      setCriando(false)
    }
  }

  return (
    <Modal
      open={escolha !== null}
      onClose={onClose}
      title={receita ? receita.name : 'Em branco: por onde as pessoas entram?'}
      className="max-w-[620px]"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={criar} loading={criando}>{receita ? 'Usar esta receita' : 'Criar e montar o caminho'}</Button>
        </div>
      }
    >
      <div className="space-y-3 text-sm text-surface-200">
        {receita && <p className="text-surface-300">{receita.description}</p>}
        {receita && <PreviaDaReceita receita={receita} />}
        {!receita && (
          <div className="grid gap-2" role="radiogroup" aria-label="Por onde as pessoas entram">
            {PORTAS_DO_COMECO.map((p) => (
              <button key={p.tipo} type="button" role="radio" aria-checked={porta === p.tipo} onClick={() => setPorta(p.tipo)}
                className={cn('flex items-start gap-3 rounded-[10px] border px-3 py-2.5 text-left transition-colors cursor-pointer', porta === p.tipo ? 'border-brand-500 bg-[var(--color-accent-soft)]' : 'border-surface-700 bg-surface-800 hover:bg-[var(--rowhover)]')}>
                <IconeDoPasso tipo={TIPO_DA_PORTA[p.tipo] ?? 'porta_manual'} tamanho="p" />
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold text-surface-50">{p.titulo}</span>
                  <span className="block text-[12px] leading-snug text-surface-400">{p.sub}</span>
                </span>
              </button>
            ))}
          </div>
        )}
        <label className="block">
          <span className="block text-xs text-surface-400 mb-1">Nome da jornada</span>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder={receita?.name ?? 'Nova jornada'} autoFocus />
        </label>
        <p className="text-xs text-surface-400">Nasce como rascunho: nada roda até você publicar. Dá para testar e deixar em sombra antes.</p>
      </div>
    </Modal>
  )
}
