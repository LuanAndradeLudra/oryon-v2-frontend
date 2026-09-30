import { useEffect, useState } from 'react'
import { Check, Loader2, Pencil, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { studyBusiness, type AgentSpec, type SpecFinding, type StudySource } from '@/services/agentsApi'
import { saveHubAndWait, type CompanyHubData } from '@/services/companyContextService'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { OBJETIVOS, PADRAO_POR_OBJETIVO, cobertura } from './especificacao'
import { useErroDoCampo } from './campoComErro'

type Mudar = (fn: (s: AgentSpec) => AgentSpec) => void

/** O que o assistente já carregou da conta: cadastro, catálogo e profissionais. */
export interface FontesDaConta {
  hub: CompanyHubData | null
  catalogo: { count: number; names: string[] } | null
  profissionais: number | null
}

function Opcao({ ativa, onClick, titulo, descricao }: { ativa: boolean; onClick: () => void; titulo: string; descricao?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativa}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
        ativa ? 'border-brand-500 bg-accent-soft' : 'border-surface-700 hover:border-surface-600',
      )}
    >
      <span className={cn('mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border', ativa ? 'border-brand-500 bg-brand-500 text-white' : 'border-surface-600')}>
        {ativa && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-surface-100">{titulo}</span>
        {descricao && <span className="mt-0.5 block text-xs text-surface-400">{descricao}</span>}
      </span>
    </button>
  )
}

const ESTADO: Record<StudySource['state'], { rotulo: string; cor: string }> = {
  ok: { rotulo: 'Lido', cor: 'bg-accent-soft text-accent-dark' },
  partial: { rotulo: 'Parcial', cor: 'bg-[var(--status-pending-soft,rgba(245,194,92,.15))] text-status-pending' },
  empty: { rotulo: 'Vazio', cor: 'bg-surface-700 text-surface-300' },
  na: { rotulo: 'Não informado', cor: 'bg-surface-700 text-surface-400' },
}

function Chip({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-2xs font-semibold', className)}>{children}</span>
}

/** "@perfil" ou link do Instagram vão para `instagram`; o resto é site. */
function ehInstagram(link: string): boolean {
  return /^@|instagram\.com/i.test(link.trim())
}

// ── 1. Estudar o negócio ─────────────────────────────────────────────────────

export function EtapaEstudar({
  spec, mudar, fontes, onEstudado,
}: {
  spec: AgentSpec
  mudar: Mudar
  fontes: FontesDaConta
  onEstudado: (fontesLidas: StudySource[], erroResumo: string | null) => void
}) {
  const { user } = useAuth()
  const hub = fontes.hub
  const cadastroCompleto = !!(hub?.companyName.trim() && hub?.description.trim())
  const pendente = spec.context.pendingCompany
  const [editando, setEditando] = useState(!cadastroCompleto)
  const [nome, setNome] = useState(pendente?.name ?? hub?.companyName ?? '')
  const [cidade, setCidade] = useState(pendente?.city ?? '')
  const [frase, setFrase] = useState(pendente?.description ?? hub?.description ?? '')
  const [link, setLink] = useState(pendente?.link ?? (hub?.website || (hub?.instagram ? hub.instagram : '')))
  const [estudando, setEstudando] = useState(false)
  const erroSegmento = useErroDoCampo('segmento')
  const erroEstudar = useErroDoCampo('estudar')
  const [erro, setErro] = useState<string | null>(null)
  // O Contexto da IA chega depois da primeira renderização: enquanto o dono
  // não mexeu nos campos, o cartão acompanha o que foi carregado.
  const [tocado, setTocado] = useState(!!pendente)
  useEffect(() => {
    if (tocado || !hub) return
    setEditando(!(hub.companyName.trim() && hub.description.trim()))
    setNome(hub.companyName)
    setFrase(hub.description)
    setLink(hub.website || hub.instagram || '')
  }, [hub, tocado])
  const campo = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => { setTocado(true); set(e.target.value) }

  const escolherObjetivo = (goal: AgentSpec['identity']['goal']) => mudar((s) => {
    const padrao = PADRAO_POR_OBJETIVO[goal]
    return {
      ...s,
      identity: { ...s.identity, goal },
      // Sugestão do objetivo só entra onde o dono ainda não mexeu.
      capabilities: s.capabilities.length ? s.capabilities : padrao.capacidades.map((id) => ({ id })),
      handoff: { ...s.handoff, situations: padrao.situacoes },
    }
  })

  const estudar = async () => {
    if (!spec.identity.segment?.trim()) { setErro('Conte o tipo de negócio.'); return }
    if (editando && (!nome.trim() || !frase.trim())) { setErro('Preencha o nome da empresa e o que ela faz.'); return }
    setEstudando(true)
    setErro(null)
    try {
      // 1. A empresa digitada aqui vai para o Contexto da IA: vale para todos
      //    os agentes. Sem permissão, fica neste agente como pendência.
      let pendingCompany: AgentSpec['context']['pendingCompany'] = null
      if (editando) {
        const descricao = cidade.trim() && !frase.toLowerCase().includes(cidade.trim().toLowerCase())
          ? `${frase.trim()} Em ${cidade.trim()}.`
          : frase.trim()
        // O PATCH grava o Hub inteiro: só em cima do Hub LIDO. Sem leitura
        // (falhou ou ainda não chegou), gravar partiria de um vazio e apagaria
        // produtos, redes e arquivos de marca de todos os agentes — a empresa
        // fica neste agente, como quando falta permissão.
        const r = hub
          ? await saveHubAndWait(user?.tenantId, {
            ...hub,
            companyName: nome.trim(),
            description: descricao,
            industry: hub.industry || spec.identity.segment?.trim() || '',
            ...(link.trim() ? (ehInstagram(link) ? { instagram: link.trim() } : { website: link.trim() }) : {}),
          })
          : 'error'
        if (r !== 'ok') pendingCompany = { name: nome.trim(), city: cidade.trim(), description: frase.trim(), link: link.trim() }
      }
      // 2. Estudo: cadastro + site/Instagram + catálogo + profissionais.
      const links = [...new Set([
        link.trim(),
        ...(editando ? [] : [hub?.website ?? '', hub?.instagram ?? '']),
      ].map((l) => l.trim()).filter(Boolean))].slice(0, 2)
      const r = await studyBusiness({
        spec,
        company: {
          name: editando ? nome.trim() : hub?.companyName,
          city: cidade.trim() || undefined,
          industry: hub?.industry || undefined,
          description: editando ? frase.trim() : hub?.description,
          productsServices: hub?.productsServices || undefined,
        },
        catalog: fontes.catalogo ?? { count: 0, names: [] },
        practitioners: { count: fontes.profissionais ?? 0 },
        links,
      })
      mudar((s) => ({
        ...s,
        context: {
          ...s.context,
          studied: true,
          pendingCompany,
          // Só o que está escrito numa fonte já vem conferido; o resto o dono confirma.
          findings: r.findings.map((f) => ({ ...f, confirmed: f.confidence === 'confirmado' })),
        },
      }))
      onEstudado(r.sources, r.summaryError)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu para estudar agora.')
    } finally {
      setEstudando(false)
    }
  }

  const pular = () => {
    mudar((s) => ({ ...s, context: { ...s.context, studied: true, findings: [] } }))
    onEstudado([], null)
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-surface-400">
        Antes de perguntar, o Oryon lê o que a empresa já tem. Você só confirma ou corrige o resumo na próxima etapa.
      </p>
      <div data-campo="segmento">
        <FormField label="Tipo de negócio" hint='Ex.: "clínica odontológica", "loja de roupas", "escritório de contabilidade".' error={erroSegmento}>
          <Input value={spec.identity.segment ?? ''} onChange={(e) => mudar((s) => ({ ...s, identity: { ...s.identity, segment: e.target.value } }))} />
        </FormField>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-surface-200">O principal que o agente vai fazer</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {OBJETIVOS.map((o) => (
            <Opcao key={o.id} ativa={spec.identity.goal === o.id} onClick={() => escolherObjetivo(o.id)} titulo={o.rotulo} descricao={o.descricao} />
          ))}
        </div>
      </div>

      <section className="rounded-lg border border-surface-700 p-4" aria-labelledby="empresa-titulo">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="empresa-titulo" className="text-sm font-semibold text-surface-100">
              {cadastroCompleto && !editando ? 'Do Contexto da IA' : 'Conte rapidinho sobre a empresa'}
            </h3>
            {!cadastroCompleto && (
              <p className="mt-0.5 text-xs text-surface-400">
                {hub && (hub.companyName || hub.description) ? 'O cadastro está incompleto.' : 'Ainda não há nada no Contexto da IA.'} São 4 respostas; com o site ou Instagram, o Oryon lê o resto.
              </p>
            )}
          </div>
          {cadastroCompleto && !editando && (
            <Button variant="ghost" size="sm" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => { setTocado(true); setEditando(true) }}>Corrigir</Button>
          )}
        </div>
        {cadastroCompleto && !editando ? (
          <div className="mt-3 space-y-1 text-sm">
            <p className="font-medium text-surface-100">{hub!.companyName}</p>
            <p className="line-clamp-3 text-surface-300">{hub!.description}</p>
            {(hub!.website || hub!.instagram) && (
              <p className="text-xs text-surface-400">{[hub!.website, hub!.instagram].filter(Boolean).join(' · ')}</p>
            )}
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FormField label="Nome da empresa"><Input value={nome} onChange={campo(setNome)} /></FormField>
            <FormField label="Cidade ou região"><Input value={cidade} onChange={campo(setCidade)} placeholder="Ex.: Teresópolis, RJ" /></FormField>
            <div className="sm:col-span-2">
              <FormField label="O que a empresa faz, numa frase">
                <Input value={frase} onChange={campo(setFrase)} placeholder="Ex.: clínica odontológica familiar, com implantes e ortodontia" />
              </FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField label="Site ou Instagram (opcional)" hint="Com o link, o Oryon sugere descrição, serviços e jeito de falar para você confirmar.">
                <Input value={link} onChange={campo(setLink)} placeholder="Ex.: minhaempresa.com.br ou @minhaempresa" />
              </FormField>
            </div>
            <p className="text-xs text-surface-400 sm:col-span-2">
              Salvo no Contexto da IA: vale para todos os agentes. Sem permissão de administrador, fica guardado neste agente
              e aparece uma pendência para um administrador confirmar.
            </p>
          </div>
        )}
      </section>

      <section aria-label="Outras fontes" className="rounded-lg border border-surface-700 p-4">
        <p className="text-sm font-semibold text-surface-100">O que mais dá para ler</p>
        <ul className="mt-2 divide-y divide-surface-700 text-sm">
          <li className="flex items-center justify-between gap-3 py-2">
            <span><span className="text-surface-100">Catálogo</span> <span className="text-xs text-surface-400">serviços e preços, usados na hora da conversa</span></span>
            {fontes.catalogo === null ? <Chip className={ESTADO.na.cor}>Carregando</Chip>
              : fontes.catalogo.count > 0 ? <Chip className={ESTADO.ok.cor}>{fontes.catalogo.count} itens</Chip>
              : <Chip className={ESTADO.empty.cor}>Vazio</Chip>}
          </li>
          <li className="flex items-center justify-between gap-3 py-2">
            <span><span className="text-surface-100">Profissionais</span> <span className="text-xs text-surface-400">quem atende</span></span>
            {fontes.profissionais === null ? <Chip className={ESTADO.na.cor}>Carregando</Chip>
              : fontes.profissionais > 0 ? <Chip className={ESTADO.ok.cor}>{fontes.profissionais} cadastrados</Chip>
              : <Chip className={ESTADO.empty.cor}>Nenhum</Chip>}
          </li>
        </ul>
        <p className="mt-2 text-xs text-surface-400">Vazio não bloqueia: o que as fontes não trouxerem, a gente pergunta.</p>
      </section>

      {erro && <Banner variant="danger">{erro}</Banner>}
      <div data-campo="estudar" className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void estudar()} disabled={estudando} leftIcon={estudando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}>
          {estudando ? 'Estudando o negócio…' : spec.context.studied ? 'Estudar de novo' : 'Estudar meu negócio'}
        </Button>
        {!spec.context.studied && (
          <Button variant="ghost" onClick={pular} disabled={estudando}>Pular e responder tudo</Button>
        )}
        {erroEstudar && <p role="alert" className="w-full text-xs text-danger">{erroEstudar}</p>}
      </div>
    </div>
  )
}

// ── 2. O que já sei ──────────────────────────────────────────────────────────

const CERTEZA: Record<SpecFinding['confidence'], { rotulo: string; cor: string }> = {
  confirmado: { rotulo: 'Das fontes', cor: 'bg-accent-soft text-accent-dark' },
  sugestao: { rotulo: 'Sugestão', cor: 'bg-[var(--status-pending-soft,rgba(245,194,92,.15))] text-status-pending' },
  segmento: { rotulo: 'Típico do segmento', cor: 'bg-surface-700 text-surface-300' },
}

function Achado({ f, onMudar }: { f: SpecFinding; onMudar: (p: Partial<SpecFinding>) => void }) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(f.text)
  const c = CERTEZA[f.confidence]
  return (
    <li className={cn('rounded-lg border p-4', f.confirmed ? 'border-surface-700' : 'border-dashed border-surface-600')}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-2xs font-bold uppercase tracking-[.1em] text-surface-400">{f.title}</p>
        <Chip className={c.cor}>{c.rotulo}</Chip>
      </div>
      {editando ? (
        <div className="mt-2 space-y-2">
          <Textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} aria-label={`Corrigir: ${f.title}`} />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { onMudar({ text: texto.trim() || f.text, confirmed: true, source: 'corrigido por você' }); setEditando(false) }}>Salvar</Button>
            <Button size="sm" variant="ghost" onClick={() => { setTexto(f.text); setEditando(false) }}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-surface-100">{f.text}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-surface-700 pt-2">
        <span className="text-xs text-surface-400">Fonte: {f.source || '—'}</span>
        {!editando && (
          <span className="flex gap-1">
            <Button
              size="sm"
              variant={f.confirmed ? 'primary' : 'neutral'}
              aria-pressed={f.confirmed}
              leftIcon={<Check className="h-3.5 w-3.5" />}
              onClick={() => onMudar({ confirmed: !f.confirmed })}
            >
              {f.confirmed ? 'Confirmado' : 'Está certo'}
            </Button>
            <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditando(true)}>Corrigir</Button>
          </span>
        )}
      </div>
    </li>
  )
}

export function EtapaOQueJaSei({
  spec, mudar, fontes, fontesLidas, erroResumo,
}: {
  spec: AgentSpec
  mudar: Mudar
  fontes: FontesDaConta
  /** Estado de cada fonte no último estudo (ausente se a tela foi recarregada). */
  fontesLidas: StudySource[] | null
  erroResumo: string | null
}) {
  const ctx = spec.context
  const temCatalogo = (fontes.catalogo?.count ?? 0) > 0
  const temProfissionais = (fontes.profissionais ?? 0) > 0
  const pct = cobertura(spec, { catalogo: temCatalogo, profissionais: temProfissionais })
  const mudarAchado = (id: string, p: Partial<SpecFinding>) => mudar((s) => ({
    ...s, context: { ...s.context, findings: s.context.findings.map((f) => (f.id === id ? { ...f, ...p } : f)) },
  }))
  const politica = (p: Partial<Pick<AgentSpec['context'], 'pricePolicy' | 'namePolicy'>>) => mudar((s) => ({ ...s, context: { ...s.context, ...p } }))

  return (
    <div className="space-y-6">
      <p className="text-sm text-surface-400">
        Confira. O que estiver certo, confirme; o que estiver errado, corrija. É isso que vai deixar o agente com a cara da empresa.
      </p>

      <section aria-label="Quanto o agente conhece" className="rounded-lg border border-surface-700 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-surface-100">O quanto o agente conhece a empresa</p>
          <p className={cn('text-2xl font-extrabold tabular-nums', pct >= 70 ? 'text-accent-dark' : 'text-status-pending')}>{pct}%</p>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-surface-700" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Conhecimento da empresa">
          <div className={cn('h-1.5 rounded-full', pct >= 70 ? 'bg-brand-500' : 'bg-status-pending')} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs text-surface-400">Sobe a cada item confirmado. O que faltar, a IA diz o que precisou supor na próxima etapa.</p>
      </section>

      {ctx.pendingCompany && (
        <Banner variant="warning">
          A empresa ficou guardada só neste agente: não deu para salvar no Contexto da IA (falta permissão de
          administrador ou o cadastro não respondeu), e nada foi alterado lá. Complete em Configurações → Contexto da IA.
        </Banner>
      )}
      {erroResumo && <Banner variant="warning">{erroResumo}</Banner>}

      {fontesLidas && fontesLidas.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Fontes lidas">
          {fontesLidas.map((f) => (
            <li key={f.id} title={f.detail} className="flex items-center gap-1.5 rounded-full border border-surface-700 py-1 pl-3 pr-1 text-xs text-surface-200">
              {f.label}<Chip className={ESTADO[f.state].cor}>{ESTADO[f.state].rotulo}</Chip>
            </li>
          ))}
        </ul>
      )}

      {ctx.findings.length === 0 ? (
        <p className="rounded-lg border border-dashed border-surface-600 p-4 text-sm text-surface-400">
          Nada para conferir ainda. Tudo bem: na próxima etapa a IA escreve com o que houver e diz o que precisou supor, para você responder.
        </p>
      ) : (
        <ul className="space-y-3">
          {ctx.findings.map((f) => <Achado key={f.id} f={f} onMudar={(p) => mudarAchado(f.id, p)} />)}
        </ul>
      )}

      <section aria-label="Preços" className="rounded-lg border border-surface-700 p-4">
        <p className="text-sm font-semibold text-surface-100">Preços</p>
        {temCatalogo ? (
          <p className="mt-1 text-sm text-surface-300">Vêm do catálogo ({fontes.catalogo!.count} itens), na hora da conversa. Mudou lá, o agente já sabe.</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-surface-300">O catálogo está vazio. O agente pode informar preços?</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Opcao ativa={ctx.pricePolicy === 'catalog'} onClick={() => politica({ pricePolicy: 'catalog' })} titulo="Vou cadastrar no catálogo" descricao="Depois de publicar, em Catálogo. Até lá, ele não informa valores." />
              <Opcao ativa={ctx.pricePolicy === 'evaluation'} onClick={() => politica({ pricePolicy: 'evaluation' })} titulo="Preço só na avaliação" descricao="Ele explica que o valor é definido na avaliação ou no orçamento." />
            </div>
          </>
        )}
      </section>

      <section aria-label="Quem atende" className="rounded-lg border border-surface-700 p-4">
        <p className="text-sm font-semibold text-surface-100">Quem atende</p>
        {temProfissionais ? (
          <p className="mt-1 text-sm text-surface-300">{fontes.profissionais} profissionais cadastrados. O agente só cita quem está no cadastro.</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-surface-300">Nenhum profissional cadastrado. O agente pode citar nomes?</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Opcao ativa={ctx.namePolicy === 'cite'} onClick={() => politica({ namePolicy: 'cite' })} titulo="Vou cadastrar os profissionais" descricao="Depois de publicar, em Profissionais." />
              <Opcao ativa={ctx.namePolicy === 'no_names'} onClick={() => politica({ namePolicy: 'no_names' })} titulo="Não citar nomes" descricao="Ele fala da equipe sem nomear ninguém." />
            </div>
          </>
        )}
      </section>
    </div>
  )
}
