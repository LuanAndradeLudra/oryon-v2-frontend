import { useId, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { ArrowDown, ArrowRight, ArrowUp, CalendarDays, Check, CircleAlert, Clock, Code2, CornerDownRight, MessageSquareText, PencilLine, Plus, Reply, Route, Search, Tag, Trash2, UsersRound, X, Zap } from 'lucide-react'
import { Checkbox } from '@/components/ui/Checkbox'
import { CODIGO_LIVRE, codigoDoRotulo, normalizar } from '@/services/jornadas/padroes'
import { FormFieldContext } from '@/components/ui/formField.context'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Switch } from '@/components/ui/Switch'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { ApoioDoEditor, CampoDoPasso, Catalogo, Condicao, GrupoDeCondicoes, SegmentoDaReceita } from '@/services/jornadas/tipos'
import { alternarFrase, SEGMENTOS, sugestoesPara, temFrase, type GrupoDeSugestao } from '@/services/jornadas/sugestoes'
import { resolverTexto } from '@/services/jornadas/simulador'
import { Selo } from '../comum'
import { OPERADORES, valorEmTexto } from './condicoes'
import { COR_DO_GRUPO, corDaSaida, tomDaCor, type TomDaJornada } from './categorias'
import { deTextoAmigavel, GRUPOS_DE_VARIAVEL, lerExpressao, listaDeVariaveis, montarExpressao, nomeLegivelDoModelo, paraTextoAmigavel, rotuloDaVariavel, trocarVariavel, type Variavel } from './variaveis'
import { DADOS_SEMPRE_PREENCHIDOS } from '@/services/jornadas/regrasDoWhatsApp'

/**
 * Os campos do painel lateral, gerados pelo catálogo. Cada `CampoDoPasso.type`
 * tem um controle próprio, para cada tipo de configuração ter cara de si:
 * a linha vira cartão, a mensagem vira o balão do WhatsApp, o tempo vira
 * atalhos, os caminhos viram cartões com o próximo passo, a equipe vira fichas.
 * Passo novo no backend = formulário novo na tela, sem código.
 */

/** O que o painel sabe em volta do campo (o resto do desenho). */
export interface ContextoDoCampo {
  /** As saídas do passo, na ordem (a cor de cada caminho vem da posição). */
  saidas: { key: string; label: string }[]
  /** Para onde vai cada saída: o próximo passo, se já estiver ligado. */
  destino: (saida: string) => { id: string; nome: string } | null
  irPara: (id: string) => void
  /** Os botões do modelo enviado antes deste passo ("Aguardar resposta"). */
  botoesDoModelo: string[]
  /** Variáveis que outros passos do desenho produzem (o que a IA extraiu, o resumo). */
  variaveisDoDesenho?: string[]
  /** Os passos de mensagem do desenho (para "Ramificar pelo status da mensagem"). */
  passosDeMensagem?: { id: string; nome: string; detalhe: string }[]
  /** Caminho vazio: abrir a lista de passos para ele ou terminar a jornada ali (P2, 17/11). */
  escolherProximo?: (saida: string) => void
  terminarAqui?: (saida: string) => void
  /**
   * O que o caminho até aqui sugere para cada parâmetro (17/11): o aviso, a nota, o
   * motivo, a meta. Quando o valor é outro, o campo mostra "Pelo caminho…  Usar".
   */
  sugestao?: Record<string, unknown>
  /** O que o agente recebe sozinho no "Entregar ao agente" (o bloco da jornada). */
  paraOAgente?: string[]
  /** O assunto da jornada ("agendamento de {{…}} às {{…}}"), para a prévia do aviso. */
  assunto?: string | null
  /** Há um "Resumir a conversa" (para os próximos passos) no desenho: o aviso pode levar o resumo. */
  temResumo?: boolean
}

interface PropsDoCampo {
  campo: CampoDoPasso
  valor: unknown
  onChange: (v: unknown) => void
  catalogo: Catalogo
  apoio: ApoioDoEditor
  params: Record<string, unknown>
  somenteLeitura?: boolean
  /** Erro do campo (ex.: obrigatório vazio): borda vermelha e a frase embaixo. */
  erro?: string
  /** O tipo do passo (para a prévia certa da mensagem). */
  tipoDoPasso?: string
  contexto?: ContextoDoCampo
  /** Numa seção com um campo só, a pergunta da seção já é o rótulo. */
  semRotulo?: boolean
  /** A cor da seção (a escolha feita aparece nela). */
  cor?: TomDaJornada
  /** Muda vários parâmetros de uma vez (o código e o rótulo, uma pergunta pronta inteira). */
  onMudarParams?: (parcial: Record<string, unknown>) => void
}

/** Campos de um controle só: recebem a borda de erro pelo contexto do DS. */
const DE_UM_CONTROLE = new Set(['text', 'longtext', 'number', 'select', 'time_of_day'])

export function Rotulo({ texto, obrigatorio, ajuda }: { texto: string; obrigatorio?: boolean; ajuda?: string }) {
  return (
    <span className="block mb-1.5">
      <span className="text-[12px] font-medium text-surface-300">{texto}{obrigatorio && <span className="text-[var(--color-danger)]"> *</span>}</span>
      {ajuda && <span className="block mt-0.5 text-[12px] leading-snug text-surface-400">{ajuda}</span>}
    </span>
  )
}

export function CampoDoPassoEditor(props: PropsDoCampo) {
  const { campo, valor, onChange, apoio, catalogo, somenteLeitura, erro, contexto, tipoDoPasso, semRotulo, cor, params, onMudarParams } = props
  const idDoCampo = useId()
  const idDoErro = `${idDoCampo}-erro`
  const dis = somenteLeitura
  const mudarVarios = (parcial: Record<string, unknown>) => (onMudarParams ? onMudarParams(parcial) : Object.entries(parcial).forEach(([k, v]) => k === campo.key && onChange(v)))
  const corDaSecao = cor ?? COR_DO_GRUPO.conversa
  const grupoDeSugestao: GrupoDeSugestao | null = tipoDoPasso === 'ai_mission' && campo.key === 'objective' ? 'missao_objetivo'
    : tipoDoPasso === 'ai_mission' && campo.key === 'limits' ? 'missao_orientacoes'
    : tipoDoPasso === 'handoff_agent' && campo.key === 'note' ? 'nota_agente' : null

  // Liga/desliga: uma linha de ajuste (rótulo à esquerda, chave à direita).
  if (campo.type === 'boolean') {
    return (
      <div className="flex items-start justify-between gap-3 rounded-[10px] bg-[var(--jt-poco)] px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-surface-100">{campo.label}</p>
          {campo.help && <p className="mt-0.5 text-[12px] leading-snug text-surface-400">{campo.help}</p>}
        </div>
        <Switch checked={!!valor} disabled={dis} onChange={onChange} aria-label={campo.label} />
      </div>
    )
  }

  let controle: ReactNode
  switch (campo.type) {
    case 'text':
      controle = <Input size="sm" value={String(valor ?? '')} placeholder={campo.placeholder} disabled={dis} aria-label={campo.label} className={campo.key === 'url' ? 'font-mono text-[12px]' : undefined} onChange={(e) => onChange(e.target.value)} />
      // "Classificar resposta": começar de um modelo pronto (a pergunta e as respostas juntas, 17/11).
      if (tipoDoPasso === 'ai_classify' && campo.key === 'question') {
        const categorias = Array.isArray(params.categories) ? (params.categories as { key: string }[]) : []
        const ligadas = categorias.some((c) => contexto?.destino(c.key))
        controle = (
          <div className="space-y-2">
            {!dis && !ligadas && (
              <div>
                <ProntosPorSegmento titulo="Comece de um modelo pronto (preenche a pergunta e as respostas), ou escreva a sua:" itens={MODELOS_DE_CLASSIFICACAO}
                  valor={MODELOS_DE_CLASSIFICACAO.find((m) => m.question === valor)?.id ?? ''} segmentoInicial={apoio.segment} cor={corDaSecao}
                  onEscolher={(m) => mudarVarios({ question: m.question, categories: m.categories.map((c) => ({ ...c })) })} />
              </div>
            )}
            {controle}
          </div>
        )
      }
      break
    case 'longtext':
      controle = <TextoComVariaveis valor={String(valor ?? '')} onChange={onChange} placeholder={campo.placeholder} catalogo={catalogo} extras={contexto?.variaveisDoDesenho} disabled={dis} previa={tipoDoPasso && ['internal_note', 'handoff_human'].includes(tipoDoPasso) ? 'equipe' : null} rotulo={campo.label} />
      if (tipoDoPasso === 'ask_question' && campo.key === 'question') {
        const pronta = PERGUNTAS_PRONTAS.find((q) => q.question === valor)
        controle = (
          <div className="space-y-2">
            {!dis && (!String(valor ?? '').trim() || pronta) && (
              <div>
                <ProntosPorSegmento titulo="Perguntas prontas (já vêm com o tipo de resposta e onde guardar), ou escreva a sua:" itens={PERGUNTAS_PRONTAS}
                  valor={pronta?.id ?? ''} segmentoInicial={apoio.segment} cor={corDaSecao}
                  onEscolher={(q) => mudarVarios(paramsDaPerguntaPronta(q, apoio, params))} />
              </div>
            )}
            {controle}
          </div>
        )
      }
      if (tipoDoPasso === 'set_field' && campo.key === 'value') {
        const doCampo = apoio.customFields.find((f) => f.id === params.fieldId)
        if (doCampo?.options?.length) controle = <ValorComOpcoes opcoes={doCampo.options} valor={String(valor ?? '')} onChange={onChange} disabled={dis} cor={corDaSecao} texto={controle} />
      }
      if (tipoDoPasso === 'handoff_agent' && campo.key === 'note' && contexto?.paraOAgente?.length) {
        controle = (
          <div className="space-y-3">
            <div className="rounded-[10px] bg-[var(--jt-poco)] px-3 py-2.5">
              <p className="text-[12px] font-semibold text-surface-300">O agente já recebe, sem você escrever:</p>
              <ul className="mt-1.5 space-y-1">
                <li className="text-[12px] leading-snug text-surface-300">O nome desta jornada.</li>
                {contexto.paraOAgente.map((linha) => <li key={linha} className="text-[12px] leading-snug text-surface-300">{paraTextoAmigavel(linha)}</li>)}
              </ul>
            </div>
            {/* O rótulo e o campo num bloco só: o espaço do `space-y` não come a margem do rótulo. */}
            <div>
              {semRotulo && <Rotulo texto="Algo a mais que o agente deve saber (opcional)" />}
              {controle}
            </div>
          </div>
        )
      }
      // Texto livre com sugestões por segmento (17/11): escreve do seu jeito ou toca numa frase pronta.
      if (grupoDeSugestao && !dis) controle = (
        <div className="space-y-2.5">
          {controle}
          <SugestoesDeTexto grupo={grupoDeSugestao} valor={String(valor ?? '')} onChange={onChange} segmentoInicial={apoio.segment} />
        </div>
      )
      break
    case 'number':
      controle = <Input size="sm" type="number" className="w-28" aria-label={campo.label} value={valor === undefined || valor === null ? '' : String(valor)} disabled={dis} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
      break
    case 'select': {
      const escolhida = (campo.options ?? []).find((o) => o.value === String(valor ?? campo.default ?? ''))
      controle = (campo.options ?? []).some((o) => o.hint) && (campo.options ?? []).length > 4
        ? (
          <div className="space-y-1.5">
            <Pilulas ariaLabel={campo.label} opcoes={(campo.options ?? []).map((o) => ({ value: o.value, label: o.label }))} valor={String(valor ?? campo.default ?? '')} onChange={onChange} disabled={dis} cor={cor ?? COR_DO_GRUPO.conversa} />
            {escolhida?.hint && <p className="text-[12px] leading-snug text-surface-400">{escolhida.hint}</p>}
          </div>
        )
        : (campo.options ?? []).some((o) => o.hint)
        ? <CartoesDeEscolha ariaLabel={campo.label} valor={String(valor ?? campo.default ?? '')} onChange={onChange} disabled={dis} cor={cor ?? COR_DO_GRUPO.conversa} itens={(campo.options ?? []).map((o) => ({ id: o.value, titulo: o.label, sub: o.hint }))} />
        : (campo.options ?? []).length <= 4
        ? <Pilulas ariaLabel={campo.label} opcoes={(campo.options ?? []).map((o) => ({ value: o.value, label: o.label }))} valor={String(valor ?? '')} onChange={onChange} disabled={dis} cor={cor ?? COR_DO_GRUPO.conversa} />
        : (
          <Select size="sm" value={String(valor ?? '')} disabled={dis} aria-label={campo.label} onChange={(e) => onChange(e.target.value)}>
            {(campo.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        )
      // Missão: o tipo vem com o que o agente faz, em passos (o resumo da instrução testada, 17/11).
      if (tipoDoPasso === 'ai_mission' && campo.key === 'missionType') {
        const tipo = catalogo.missionTypes[String(valor ?? '')]
        controle = (
          <div className="space-y-3">
            {controle}
            {tipo && (
              <div className="rounded-[10px] bg-[var(--jt-poco)] px-3 py-2.5">
                <p className="text-[12px] font-semibold text-surface-300">O que o agente faz</p>
                <ol className="mt-1.5 space-y-1">
                  {tipo.steps.map((p, i) => (
                    <li key={p} className="flex gap-2 text-[12px] leading-snug text-surface-300"><span className="tabular-nums text-surface-500">{i + 1}.</span>{p}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )
      }
      break
    }
    case 'multiselect': {
      const marcadas = Array.isArray(valor) ? valor.map(String) : Array.isArray(campo.default) ? (campo.default as unknown[]).map(String) : []
      const opcoes = (campo.options ?? []).filter((o) => !(tipoDoPasso === 'notify_team' && o.value === 'ai_summary' && !contexto?.temResumo && !marcadas.includes('ai_summary')))
      controle = (
        <div className="space-y-3">
          <CaixasDeMarcar ariaLabel={campo.label} opcoes={opcoes} valor={marcadas} onChange={onChange} disabled={dis}
            fixas={tipoDoPasso === 'notify_team' ? ['O link para abrir a conversa'] : undefined} />
          {tipoDoPasso === 'notify_team' && <PreviaDoAviso params={params} catalogo={catalogo} assunto={contexto?.assunto ?? null} />}
        </div>
      )
      break
    }
    case 'standard_choice':
      controle = <EscolhaDaLista campo={campo} params={params} catalogo={catalogo} onMudar={mudarVarios} disabled={dis} cor={corDaSecao} />
      break
    case 'preset_text':
      controle = <TextoComSugestoes opcoes={campo.options ?? []} valor={String(valor ?? '')} onChange={onChange} disabled={dis} cor={corDaSecao} ariaLabel={campo.label} />
      break
    case 'mission_options':
      controle = <OpcoesDaMissao params={params} valor={valor} onChange={onChange} catalogo={catalogo} apoio={apoio} disabled={dis} cor={corDaSecao} />
      break
    case 'mission_restrictions': {
      const tipo = catalogo.missionTypes[String(params.missionType ?? '')]
      const opcoes = (params.missionOptions ?? {}) as Record<string, unknown>
      // Quem liberou desconto nas escolhas não vê "Não oferecer desconto" (as duas juntas se contradizem).
      const validas = (tipo?.restrictions ?? []).filter((c) => !(c === 'no_discount' && String(opcoes.offer ?? '').startsWith('discount')))
      controle = (
        <CaixasDeMarcar ariaLabel={campo.label} disabled={dis}
          opcoes={catalogo.missionRestrictions.filter((r) => validas.includes(r.code)).map((r) => ({ value: r.code, label: r.label }))}
          valor={Array.isArray(valor) ? valor.map(String).filter((c) => validas.includes(c)) : []} onChange={onChange} />
      )
      break
    }
    case 'deal_stage':
      controle = apoio.dealStages.length
        ? <TrilhaDeEtapas etapas={apoio.dealStages} valor={String(valor ?? '')} disabled={dis} onChange={(v) => mudarVarios({ [campo.key]: v, stageName: apoio.dealStages.find((e) => e.id === v)?.name ?? '' })} />
        : <p className="rounded-[10px] border border-dashed border-surface-700 px-3 py-2.5 text-[12px] text-surface-400">Nenhum funil de negócios. Crie em Negócios → Funis.</p>
      break
    case 'whatsapp_number':
      controle = (
        <CartoesDeEscolha
          ariaLabel={campo.label}
          valor={String(valor ?? '')}
          onChange={onChange}
          disabled={dis}
          cor={COR_DO_GRUPO.mensagem}
          recolhivel
          itens={apoio.whatsappNumbers.map((l) => ({
            id: l.id,
            titulo: l.name,
            sub: l.phoneMasked,
            lead: <Iniciais nome={l.name} cor={COR_DO_GRUPO.mensagem} />,
          }))}
        />
      )
      break
    case 'template': {
      const escolhido = apoio.templates.find((t) => t.id === valor)
      controle = (
        <>
        <CartoesDeEscolha
          ariaLabel={campo.label}
          valor={String(valor ?? '')}
          onChange={onChange}
          disabled={dis}
          cor={COR_DO_GRUPO.mensagem}
          recolhivel
          compacto
          itens={apoio.templates.map((t) => ({
            id: t.id,
            titulo: nomeLegivelDoModelo(t.name),
            sub: t.body.replace(/\{\{\d+\}\}/g, '…'),
            selos: (
              <>
                <Selo tom={t.category === 'MARKETING' ? 'violeta' : 'cinza'}>{t.category === 'MARKETING' ? 'Marketing' : 'Utilidade'}</Selo>
                {t.status !== 'APPROVED' && <Selo tom="ambar">Aguardando a Meta</Selo>}
              </>
            ),
          }))}
        />
        {escolhido && escolhido.status !== 'APPROVED' && (
          <p className="jornadas-aparecer mt-2 flex items-start gap-2 rounded-[8px] jt-ambar px-3 py-2 text-[12px] leading-snug">
            <CircleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
            {escolhido.status === 'REJECTED' ? 'A Meta recusou este modelo. Escolha outro para poder publicar.' : 'Este modelo ainda está com a Meta. A jornada só pode ser publicada depois da aprovação.'}
          </p>
        )}
        </>
      )
      break
    }
    case 'template_variables':
      controle = <MensagemDoModelo {...props} />
      break
    case 'tag':
      controle = <Pilulas ariaLabel={campo.label} opcoes={apoio.tags.map((t) => ({ value: t.id, label: t.name, icone: <Tag className="w-3.5 h-3.5" aria-hidden /> }))} valor={String(valor ?? '')} onChange={(v) => onChange(v || null)} disabled={dis} cor={COR_DO_GRUPO.crm} />
      break
    case 'stage':
      controle = <TrilhaDeEtapas etapas={apoio.stages} valor={String(valor ?? '')} onChange={onChange} disabled={dis} />
      break
    case 'user':
      controle = <Pilulas ariaLabel={campo.label} opcoes={apoio.users.map((u) => ({ value: u.id, label: u.name, icone: <Iniciais nome={u.name} cor={COR_DO_GRUPO.conversa} pequeno /> }))} valor={String(valor ?? '')} onChange={(v) => onChange(v || null)} disabled={dis} cor={COR_DO_GRUPO.conversa} />
      break
    case 'department':
      controle = <Pilulas ariaLabel={campo.label} opcoes={apoio.departments.map((d) => ({ value: d.id, label: d.name, icone: <UsersRound className="w-3.5 h-3.5" aria-hidden /> }))} valor={String(valor ?? '')} onChange={(v) => onChange(v || null)} disabled={dis} cor={COR_DO_GRUPO.conversa} />
      break
    case 'connector_operation':
      controle = (
        <CartoesDeEscolha
          ariaLabel={campo.label}
          valor={String(valor ?? '')}
          onChange={onChange}
          disabled={dis}
          cor={COR_DO_GRUPO.integracao}
          recolhivel
          itens={catalogo.connectorOperations.filter((o) => o.kind === 'action').map((o) => ({
            id: o.key,
            titulo: o.label,
            sub: o.connector,
            selos: o.writes ? <Selo tom="ambar">Grava no sistema</Selo> : <Selo tom="cinza">Só lê</Selo>,
          }))}
        />
      )
      break
    case 'duration':
      controle = <Duracao valor={valor} onChange={onChange} disabled={dis} />
      break
    case 'time_of_day':
      controle = <Horario valor={String(valor ?? '09:00')} onChange={onChange} disabled={dis} />
      break
    case 'events':
      controle = <RespostasEsperadas valor={valor} onChange={onChange} catalogo={catalogo} disabled={dis} contexto={contexto} />
      break
    case 'conditions':
      controle = <RamosPorCondicao valor={valor} onChange={onChange} catalogo={catalogo} apoio={apoio} disabled={dis} contexto={contexto} />
      break
    case 'list':
      controle = campo.key === 'categories'
        ? <CategoriasComCaminho valor={valor} onChange={onChange} disabled={dis} contexto={contexto} />
        : tipoDoPasso === 'ask_question' && campo.key === 'options'
          ? <OpcoesDaPergunta valor={valor} onChange={onChange} disabled={dis} placeholder={campo.placeholder} />
          : tipoDoPasso === 'webhook_out' && campo.key === 'fields'
            ? <ListaDeDados valor={valor} onChange={onChange} disabled={dis} catalogo={catalogo} extras={contexto?.variaveisDoDesenho} />
            : <ListaDeFichas valor={valor} onChange={onChange} disabled={dis} placeholder={campo.placeholder} />
      // "Extrair dados": os campos do cadastro a um toque, no lugar de escrever o nome (17/11).
      if (tipoDoPasso === 'ai_extract' && campo.key === 'fields' && !dis) {
        const atuais = Array.isArray(valor) ? valor.map((v) => normalizar(String(v))) : []
        const faltam = apoio.customFields.filter((f) => !atuais.includes(normalizar(f.name)))
        if (faltam.length) controle = (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[12px] text-surface-400">Do cadastro:</span>
              {faltam.map((f) => (
                <button key={f.id} type="button" onClick={() => onChange([...(Array.isArray(valor) ? valor : []), f.name.toLowerCase()])}
                  className="inline-flex items-center gap-1 h-7 px-2.5 rounded-[7px] bg-[var(--jt-opcao)] ring-1 ring-inset ring-[var(--jt-borda-opcao)] text-[12px] font-medium text-surface-200 hover:bg-[var(--rowhover)] cursor-pointer">
                  <Plus className="w-3 h-3" aria-hidden />{f.name}
                </button>
              ))}
            </div>
            {controle}
          </div>
        )
      }
      // Dados que costumam valer a pena, por segmento (17/11); escrever outro nome continua valendo.
      if (tipoDoPasso === 'ai_extract' && campo.key === 'fields' && !dis) {
        const atuais = Array.isArray(valor) ? valor.map(String) : []
        controle = (
          <div className="space-y-2.5">
            {controle}
            <SugestoesDeLista grupo="dados_extrair" valor={atuais} onChange={onChange} segmentoInicial={apoio.segment} excluir={apoio.customFields.map((f) => f.name)} />
          </div>
        )
      }
      break
    case 'custom_field':
      controle = apoio.customFields.length
        ? <Pilulas ariaLabel={campo.label} opcoes={apoio.customFields.map((f) => ({ value: f.id, label: f.name, icone: f.type === 'date' ? <CalendarDays className="w-3.5 h-3.5" aria-hidden /> : <PencilLine className="w-3.5 h-3.5" aria-hidden /> }))} valor={String(valor ?? '')} onChange={(v) => onChange(v || null)} disabled={dis} cor={COR_DO_GRUPO.crm} />
        : <p className="rounded-[10px] border border-dashed border-surface-700 px-3 py-2.5 text-[12px] text-surface-400">Nenhum campo personalizado. Crie em Contatos → Campos.</p>
      break
    case 'event':
      controle = <EscolhaDeEvento valor={String(valor ?? '')} onChange={onChange} catalogo={catalogo} disabled={dis} rotulo={campo.label}
        permitidos={tipoDoPasso === 'ai_mission' && campo.key === 'successEvent' ? EVENTOS_DE_CONCLUSAO : undefined} />
      break
    case 'date_variable':
      controle = <EscolhaDeData valor={String(valor ?? '')} onChange={onChange} catalogo={catalogo} extras={contexto?.variaveisDoDesenho} disabled={dis} />
      break
    case 'offset_days':
      controle = <AntesOuDepois valor={Number(valor ?? -1)} onChange={onChange} disabled={dis} />
      break
    case 'message_step':
      controle = contexto?.passosDeMensagem?.length
        ? <CartoesDeEscolha ariaLabel={campo.label} valor={String(valor ?? '')} onChange={onChange} disabled={dis} cor={COR_DO_GRUPO.mensagem} compacto
            itens={contexto.passosDeMensagem.map((m) => ({ id: m.id, titulo: m.nome, sub: m.detalhe }))} />
        : <p className="rounded-[10px] border border-dashed border-surface-700 px-3 py-2.5 text-[12px] text-surface-400">Ainda não há mensagem antes deste passo. Ponha um “Enviar modelo” ou “Enviar texto” antes dele.</p>
      break
    default:
      controle = <p className="text-xs text-surface-500">Campo "{campo.type}" sem controle.</p>
  }

  // A sugestão do caminho (17/11): o que o caminho até aqui indica, quando o valor é outro.
  const chaveDaSugestao = campo.type === 'standard_choice' ? campo.codeKey : campo.key
  const sugerido = chaveDaSugestao ? contexto?.sugestao?.[chaveDaSugestao] : undefined
  const atual = campo.type === 'standard_choice' && campo.codeKey
    ? (params[campo.codeKey] ?? (campo.list ? codigoDoRotulo(catalogo[campo.list], params[campo.key]) : undefined))
    : valor
  const textoSugerido = sugerido === undefined || sugerido === '' ? '' : campo.type === 'standard_choice'
    ? String(contexto?.sugestao?.[campo.key] ?? '')
    : campo.type === 'select' ? (campo.options?.find((o) => o.value === sugerido)?.label ?? String(sugerido)) : paraTextoAmigavel(String(sugerido))
  const mostrarSugestao = !dis && !!textoSugerido && String(sugerido) !== String(atual ?? '')
  const usarSugestao = () => (campo.type === 'standard_choice' && campo.codeKey
    ? mudarVarios({ [campo.codeKey]: sugerido, [campo.key]: contexto?.sugestao?.[campo.key] })
    : onChange(sugerido))

  return (
    <div className="block">
      {!semRotulo && <Rotulo texto={campo.label} obrigatorio={campo.required} ajuda={campo.help} />}
      {semRotulo && campo.help && <p className="-mt-1 mb-2 text-[12px] leading-snug text-surface-400">{campo.help}</p>}
      {erro && DE_UM_CONTROLE.has(campo.type)
        ? <FormFieldContext.Provider value={{ id: idDoCampo, describedBy: idDoErro, invalid: true, required: campo.required }}>{controle}</FormFieldContext.Provider>
        : controle}
      {erro && (
        <span id={idDoErro} className="jornadas-aparecer mt-1.5 flex items-center gap-1.5 text-[12px] text-[var(--color-danger)]">
          <CircleAlert className="w-3.5 h-3.5 shrink-0" aria-hidden />{erro}
        </span>
      )}
      {mostrarSugestao && <SugestaoDoCaminho texto={textoSugerido} onUsar={usarSugestao} />}
    </div>
  )
}

// ── sugestões por segmento (17/11) ───────────────────────────────────────────

/**
 * O segmento escolhido vale para todas as sugestões da sessão: não volta ao da empresa ao
 * trocar de campo ou quando o campo deixa de estar vazio (o campo é montado de novo).
 */
let segmentoDaSessao: SegmentoDaReceita | null = null
const ouvintesDoSegmento = new Set<() => void>()
const assinarSegmento = (aviso: () => void) => { ouvintesDoSegmento.add(aviso); return () => { ouvintesDoSegmento.delete(aviso) } }
function useSegmento(inicial?: SegmentoDaReceita): [SegmentoDaReceita, (s: SegmentoDaReceita) => void] {
  // Um só para o painel inteiro: trocar num campo troca nos outros sugestões abertos.
  const escolhido = useSyncExternalStore(assinarSegmento, () => segmentoDaSessao)
  return [escolhido ?? inicial ?? 'geral', (novo) => { segmentoDaSessao = novo; ouvintesDoSegmento.forEach((f) => f()) }]
}

/** Para qual segmento mostrar as sugestões (começa pelo da empresa; "qualquer negócio" aparece sempre). */
function EscolhaDeSegmento({ valor, onChange }: { valor: SegmentoDaReceita; onChange: (v: SegmentoDaReceita) => void }) {
  return (
    <label className="inline-flex shrink-0 items-center gap-1.5 text-[12px] text-surface-400">
      Para
      <select value={valor} onChange={(e) => onChange(e.target.value as SegmentoDaReceita)} aria-label="Sugestões para o segmento"
        className="h-7 rounded-[7px] bg-[var(--jt-opcao)] px-2 text-[12px] font-medium text-surface-200 ring-1 ring-inset ring-[var(--jt-borda-opcao)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
        {SEGMENTOS.map((s) => <option key={s.id} value={s.id}>{s.rotulo}</option>)}
      </select>
    </label>
  )
}

/** Ficha de sugestão: com o "+" põe; com o check, já está e tira. */
function FichaDeSugestao({ texto, ligada, onClick }: { texto: string; ligada: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={ligada} onClick={onClick}
      className={cn('inline-flex max-w-full items-start gap-1.5 rounded-[8px] px-2.5 py-1.5 text-left text-[12px] leading-snug transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        ligada ? 'jt-azul font-medium' : 'bg-[var(--jt-opcao)] ring-1 ring-inset ring-[var(--jt-borda-opcao)] text-surface-200 hover:bg-[var(--rowhover)]')}>
      {ligada ? <Check className="mt-px w-3.5 h-3.5 shrink-0" aria-hidden /> : <Plus className="mt-px w-3.5 h-3.5 shrink-0" aria-hidden />}
      <span className="min-w-0">{texto}</span>
    </button>
  )
}

/** As frases prontas de um texto livre: tocar põe a frase numa linha nova; tocar de novo tira. */
function SugestoesDeTexto({ grupo, valor, onChange, segmentoInicial }: {
  grupo: GrupoDeSugestao
  valor: string
  onChange: (v: unknown) => void
  segmentoInicial?: SegmentoDaReceita
}) {
  const [segmento, setSegmento] = useSegmento(segmentoInicial)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] text-surface-400">Sugestões (toque para pôr ou tirar)</p>
        <EscolhaDeSegmento valor={segmento} onChange={setSegmento} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sugestoesPara(grupo, segmento).map((f) => <FichaDeSugestao key={f} texto={f} ligada={temFrase(valor, f)} onClick={() => onChange(alternarFrase(valor, f))} />)}
      </div>
    </div>
  )
}

/** As sugestões de uma lista de nomes (ex.: os dados que a IA procura). */
function SugestoesDeLista({ grupo, valor, onChange, segmentoInicial, excluir = [] }: {
  grupo: GrupoDeSugestao
  valor: string[]
  onChange: (v: unknown) => void
  segmentoInicial?: SegmentoDaReceita
  /** Nomes que já aparecem em outro lugar (ex.: os campos do cadastro). */
  excluir?: string[]
}) {
  const [segmento, setSegmento] = useSegmento(segmentoInicial)
  const tem = (f: string) => valor.some((v) => normalizar(v) === normalizar(f))
  const fora = new Set(excluir.map(normalizar))
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] text-surface-400">Sugestões (toque para pôr ou tirar)</p>
        <EscolhaDeSegmento valor={segmento} onChange={setSegmento} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sugestoesPara(grupo, segmento).filter((f) => !fora.has(normalizar(f))).map((f) => (
          <FichaDeSugestao key={f} texto={f} ligada={tem(f)} onClick={() => onChange(tem(f) ? valor.filter((v) => normalizar(v) !== normalizar(f)) : [...valor, f])} />
        ))}
      </div>
    </div>
  )
}

/** Itens prontos (perguntas, modelos) por segmento: os do segmento escolhido e os de qualquer negócio. */
function ProntosPorSegmento<T extends { id: string; rotulo: string; segmento: SegmentoDaReceita }>({ titulo, itens, valor, onEscolher, segmentoInicial, cor }: {
  titulo: string
  itens: T[]
  valor: string
  onEscolher: (item: T) => void
  segmentoInicial?: SegmentoDaReceita
  cor: TomDaJornada
}) {
  const [segmento, setSegmento] = useSegmento(segmentoInicial)
  const visiveis = [...itens.filter((i) => segmento !== 'geral' && i.segmento === segmento), ...itens.filter((i) => i.segmento === 'geral')]
  return (
    <div>
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <p className="text-[12px] leading-snug text-surface-400">{titulo}</p>
        <EscolhaDeSegmento valor={segmento} onChange={setSegmento} />
      </div>
      <Pilulas ariaLabel={titulo} cor={cor} valor={valor} opcoes={visiveis.map((i) => ({ value: i.id, label: i.rotulo }))}
        onChange={(id) => { const i = itens.find((x) => x.id === id); if (i) onEscolher(i) }} />
    </div>
  )
}

/** "Pelo caminho que chega aqui: …  Usar" (17/11). */
function SugestaoDoCaminho({ texto, onUsar }: { texto: string; onUsar: () => void }) {
  return (
    <p className="jornadas-aparecer mt-2 flex items-start gap-2 rounded-[8px] bg-[var(--jt-poco)] px-3 py-2 text-[12px] leading-snug text-surface-300">
      <Route className="mt-0.5 h-3.5 w-3.5 shrink-0 text-surface-400" aria-hidden />
      <span className="min-w-0 flex-1">Pelo caminho que chega aqui: <span className="text-surface-100">{texto}</span></span>
      <button type="button" onClick={onUsar} className="shrink-0 font-semibold jt-texto-azul hover:underline cursor-pointer">Usar</button>
    </p>
  )
}

// ── escolhas no lugar do texto livre (17/11) ─────────────────────────────────

/** Caixas de marcar (várias escolhas): o que vai junto do aviso, as restrições da missão… */
export function CaixasDeMarcar({ opcoes, valor, onChange, disabled, ariaLabel, fixas }: {
  opcoes: { value: string; label: string }[]
  valor: string[]
  onChange: (v: string[]) => void
  disabled?: boolean
  ariaLabel: string
  /** Itens que vão sempre (marcados e travados). */
  fixas?: string[]
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="space-y-0.5">
      {fixas?.map((f) => (
        <label key={f} className="flex items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-[14px] text-surface-400">
          <Checkbox checked disabled readOnly />{f}<span className="text-[12px] text-surface-500">sempre vai</span>
        </label>
      ))}
      {opcoes.map((o) => {
        const ligada = valor.includes(o.value)
        return (
          <label key={o.value} className={cn('flex items-center gap-2.5 rounded-[8px] px-2 py-1.5 text-[14px] transition-colors', disabled ? 'cursor-default' : 'cursor-pointer hover:bg-[var(--rowhover)]', ligada ? 'text-surface-100' : 'text-surface-300')}>
            <Checkbox checked={ligada} disabled={disabled} onChange={() => onChange(ligada ? valor.filter((v) => v !== o.value) : [...valor, o.value])} />
            {o.label}
          </label>
        )
      })}
    </div>
  )
}

/** Uma escolha da lista padronizada do catálogo, com "Outro" para um nome livre. */
function EscolhaDaLista({ campo, params, catalogo, onMudar, disabled, cor }: {
  campo: CampoDoPasso
  params: Record<string, unknown>
  catalogo: Catalogo
  onMudar: (parcial: Record<string, unknown>) => void
  disabled?: boolean
  cor: TomDaJornada
}) {
  const lista = campo.list ? catalogo[campo.list] : []
  const chave = campo.codeKey ?? 'code'
  const rotulo = String(params[campo.key] ?? '')
  const codigo = String(params[chave] ?? codigoDoRotulo(lista, rotulo))
  const livre = codigo === CODIGO_LIVRE
  return (
    <div className="space-y-2">
      <Pilulas ariaLabel={campo.label} cor={cor} disabled={disabled} valor={codigo}
        opcoes={[...lista.map((i) => ({ value: i.code, label: i.label })), { value: CODIGO_LIVRE, label: 'Outro', icone: <PencilLine className="w-3.5 h-3.5" aria-hidden /> }]}
        onChange={(v) => onMudar(v === CODIGO_LIVRE
          ? { [chave]: CODIGO_LIVRE, [campo.key]: livre ? rotulo : '' }
          : { [chave]: v, [campo.key]: lista.find((i) => i.code === v)?.label ?? '' })} />
      {livre && (
        <div className="jornadas-aparecer space-y-1">
          <Input size="sm" value={rotulo} placeholder="Escreva o nome" disabled={disabled} aria-label={`${campo.label} (outro)`} onChange={(e) => onMudar({ [chave]: CODIGO_LIVRE, [campo.key]: e.target.value })} />
          <p className="text-[12px] leading-snug text-surface-500">Um nome fora da lista aparece só nesta jornada: não entra na comparação com as outras.</p>
        </div>
      )}
    </div>
  )
}

/** Texto com sugestões prontas (o valor é o próprio texto) e "Outro" para escrever. */
function TextoComSugestoes({ opcoes, valor, onChange, disabled, cor, ariaLabel }: {
  opcoes: { value: string; label: string }[]
  valor: string
  onChange: (v: unknown) => void
  disabled?: boolean
  cor: TomDaJornada
  ariaLabel: string
}) {
  const pronta = opcoes.some((o) => o.value === valor)
  const [outro, setOutro] = useState(!!valor && !pronta)
  return (
    <div className="space-y-2">
      <Pilulas ariaLabel={ariaLabel} cor={cor} disabled={disabled} valor={outro ? CODIGO_LIVRE : valor}
        opcoes={[...opcoes, { value: CODIGO_LIVRE, label: 'Outro', icone: <PencilLine className="w-3.5 h-3.5" aria-hidden /> }]}
        onChange={(v) => { if (v === CODIGO_LIVRE) { setOutro(true); onChange('') } else { setOutro(false); onChange(v) } }} />
      {outro && <Input size="sm" value={valor} placeholder="Para que serve, em poucas palavras" disabled={disabled} aria-label={`${ariaLabel} (outro)`} onChange={(e) => onChange(e.target.value)} />}
    </div>
  )
}

/** As escolhas do tipo de missão: uma opção, várias ou uma etapa do funil. */
function OpcoesDaMissao({ params, valor, onChange, catalogo, apoio, disabled, cor }: {
  params: Record<string, unknown>
  valor: unknown
  onChange: (v: unknown) => void
  catalogo: Catalogo
  apoio: ApoioDoEditor
  disabled?: boolean
  cor: TomDaJornada
}) {
  const tipo = catalogo.missionTypes[String(params.missionType ?? '')]
  const v = (valor && typeof valor === 'object' && !Array.isArray(valor) ? valor : {}) as Record<string, unknown>
  if (!tipo?.options.length) return <p className="text-[12px] text-surface-400">Este tipo de missão não tem escolhas.</p>
  return (
    <div className="space-y-3">
      {tipo.options.map((o) => (
        <div key={o.key}>
          <p className="mb-1.5 text-[12px] text-surface-400">{o.label}</p>
          {o.kind === 'one' && (
            <Pilulas ariaLabel={o.label} cor={cor} disabled={disabled} valor={String(v[o.key] ?? o.default)} opcoes={o.options ?? []} onChange={(x) => onChange({ ...v, [o.key]: x })} />
          )}
          {o.kind === 'many' && (
            <CaixasDeMarcar ariaLabel={o.label} disabled={disabled} opcoes={o.options ?? []}
              valor={Array.isArray(v[o.key]) ? (v[o.key] as unknown[]).map(String) : Array.isArray(o.default) ? o.default : []}
              onChange={(x) => onChange({ ...v, [o.key]: x })} />
          )}
          {o.kind === 'deal_stage' && (apoio.dealStages.length
            ? <TrilhaDeEtapas etapas={apoio.dealStages} valor={String(v[o.key] ?? '')} disabled={disabled} onChange={(x) => onChange({ ...v, [o.key]: x })} />
            : <p className="rounded-[10px] border border-dashed border-surface-700 px-3 py-2.5 text-[12px] text-surface-400">Nenhum funil de negócios. Crie em Negócios → Funis.</p>)}
        </div>
      ))}
    </div>
  )
}

/** O valor de um campo do cadastro que tem opções: as opções a um toque, ou outro valor (com dados). */
function ValorComOpcoes({ opcoes, valor, onChange, disabled, cor, texto }: {
  opcoes: string[]
  valor: string
  onChange: (v: unknown) => void
  disabled?: boolean
  cor: TomDaJornada
  texto: ReactNode
}) {
  const [outro, setOutro] = useState(!!valor && !opcoes.includes(valor))
  return (
    <div className="space-y-2">
      <Pilulas ariaLabel="Valor" cor={cor} disabled={disabled} valor={outro ? CODIGO_LIVRE : valor}
        opcoes={[...opcoes.map((o) => ({ value: o, label: o })), { value: CODIGO_LIVRE, label: 'Outro valor ou um dado', icone: <PencilLine className="w-3.5 h-3.5" aria-hidden /> }]}
        onChange={(v) => { if (v === CODIGO_LIVRE) { setOutro(true); if (opcoes.includes(valor)) onChange('') } else { setOutro(false); onChange(v) } }} />
      {outro && texto}
    </div>
  )
}

/** Como a equipe vê o aviso: o texto, o que fazer e o que vai junto (17/11). */
function PreviaDoAviso({ params, catalogo, assunto }: { params: Record<string, unknown>; catalogo: Catalogo; assunto: string | null }) {
  const texto = resolverTexto(String(params.message ?? ''))
  if (!texto.trim()) return null
  const acao = catalogo.teamActions.find((a) => a.code === params.action)
  const inclui = Array.isArray(params.include) ? params.include.map(String) : []
  const doAssunto = assunto ? resolverTexto(assunto) : ''
  const resposta = resolverTexto('{{contexto.resposta}}') || 'Pode ser na sexta?'
  const resumo = resolverTexto('{{contexto.resumo}}') || 'Quer remarcar, mas só pode à tarde.'
  return (
    <div>
      <p className="mb-1 text-[12px] font-semibold text-surface-500">Como a equipe vê{params.groupDaily ? ' (na lista do dia, cada pessoa vira um item assim)' : ''}</p>
      <div className="rounded-[10px] bg-[var(--jt-poco)] px-3 py-2 text-[14px] leading-relaxed text-surface-200 space-y-1">
        <p>{texto}</p>
        {acao && acao.code !== 'fyi' && <p className="text-[12px] font-semibold text-surface-100">O que fazer: {acao.label}</p>}
        {inclui.includes('subject') && doAssunto && <p className="text-[12px] text-surface-300">{doAssunto.charAt(0).toUpperCase() + doAssunto.slice(1)}</p>}
        {inclui.includes('last_reply') && <p className="text-[12px] text-surface-300">Última resposta: “{resposta}”</p>}
        {inclui.includes('ai_summary') && <p className="text-[12px] text-surface-300">Resumo da IA: {resumo}</p>}
        <p className="text-[12px] font-semibold jt-texto-azul">Abrir a conversa</p>
      </div>
    </div>
  )
}

// ── modelos prontos (17/11) ──────────────────────────────────────────────────

/** "Classificar resposta": a pergunta e as respostas de uma vez, para os casos de sempre. */
const MODELOS_DE_CLASSIFICACAO: { id: string; rotulo: string; segmento: SegmentoDaReceita; question: string; categories: { key: string; label: string }[] }[] = [
  { id: 'confirmar', rotulo: 'Confirmar, cancelar ou remarcar', segmento: 'geral', question: 'A pessoa quer confirmar, cancelar ou remarcar?', categories: [{ key: 'confirmar', label: 'Quer confirmar' }, { key: 'cancelar', label: 'Quer cancelar' }, { key: 'remarcar', label: 'Quer remarcar' }] },
  { id: 'interesse', rotulo: 'Tem interesse?', segmento: 'geral', question: 'A pessoa tem interesse em seguir?', categories: [{ key: 'tem_interesse', label: 'Tem interesse' }, { key: 'sem_interesse', label: 'Não tem interesse' }, { key: 'duvida', label: 'Tem uma dúvida' }] },
  { id: 'satisfacao', rotulo: 'Satisfeita ou não', segmento: 'geral', question: 'A pessoa ficou satisfeita com o atendimento?', categories: [{ key: 'satisfeita', label: 'Satisfeita' }, { key: 'insatisfeita', label: 'Insatisfeita' }] },
  { id: 'assunto', rotulo: 'Assunto da mensagem', segmento: 'geral', question: 'Sobre o que é a mensagem da pessoa?', categories: [{ key: 'agendamento', label: 'Agendamento' }, { key: 'financeiro', label: 'Financeiro' }, { key: 'duvida', label: 'Dúvida' }, { key: 'reclamacao', label: 'Reclamação' }] },
  { id: 'retorno', rotulo: 'Quer marcar o retorno?', segmento: 'clinica', question: 'A pessoa quer marcar o retorno?', categories: [{ key: 'quer_marcar', label: 'Quer marcar' }, { key: 'depois', label: 'Vai marcar depois' }, { key: 'nao_precisa', label: 'Não precisa' }] },
  { id: 'compra_aluguel', rotulo: 'Comprar ou alugar', segmento: 'imobiliaria', question: 'A pessoa quer comprar ou alugar?', categories: [{ key: 'comprar', label: 'Quer comprar' }, { key: 'alugar', label: 'Quer alugar' }, { key: 'ainda_nao_sabe', label: 'Ainda não sabe' }] },
  { id: 'pedido', rotulo: 'Assunto do pedido', segmento: 'loja', question: 'Sobre o que é a mensagem do pedido?', categories: [{ key: 'entrega', label: 'Entrega' }, { key: 'troca', label: 'Troca ou devolução' }, { key: 'pagamento', label: 'Pagamento' }] },
  { id: 'documento', rotulo: 'Que documento chegou', segmento: 'contabilidade', question: 'Que documento a pessoa mandou?', categories: [{ key: 'nota', label: 'Nota fiscal' }, { key: 'extrato', label: 'Extrato' }, { key: 'guia', label: 'Comprovante de guia' }] },
  { id: 'area', rotulo: 'Área do caso', segmento: 'juridico', question: 'De que área do direito é o caso que a pessoa contou?', categories: [{ key: 'trabalhista', label: 'Trabalhista' }, { key: 'familia', label: 'Família' }, { key: 'civel', label: 'Cível' }] },
]

/** "Perguntar e guardar a resposta": as perguntas de sempre, com o tipo de resposta e o campo. */
interface PerguntaPronta { id: string; rotulo: string; segmento: SegmentoDaReceita; question: string; answerType: string; options?: string[]; campo: RegExp }
const PERGUNTAS_PRONTAS: PerguntaPronta[] = [
  { id: 'email', rotulo: 'E-mail', segmento: 'geral', question: 'Qual é o seu e-mail?', answerType: 'email', campo: /mail/ },
  { id: 'horario', rotulo: 'Melhor horário', segmento: 'geral', question: 'Qual é o melhor horário para falarmos com você?', answerType: 'option', options: ['Manhã', 'Tarde', 'Noite'], campo: /hor/ },
  { id: 'como_conheceu', rotulo: 'Como conheceu a gente', segmento: 'geral', question: 'Como você conheceu a gente?', answerType: 'option', options: ['Instagram', 'Google', 'Indicação', 'Outro'], campo: /origem|conheceu/ },
  { id: 'nascimento', rotulo: 'Data de nascimento', segmento: 'geral', question: 'Qual é a sua data de nascimento? (ex.: 15/03/1980)', answerType: 'date', campo: /nasc/ },
  { id: 'nota', rotulo: 'Nota de 0 a 10', segmento: 'geral', question: 'De 0 a 10, quanto você indicaria a gente para um amigo ou parente?', answerType: 'rating', campo: /nota|nps|avalia/ },
  { id: 'convenio', rotulo: 'Convênio', segmento: 'clinica', question: 'Qual é o seu convênio? Se for particular, é só responder “particular”.', answerType: 'text', campo: /conv/ },
  { id: 'compra_aluguel', rotulo: 'Comprar ou alugar', segmento: 'imobiliaria', question: 'Você procura um imóvel para comprar ou para alugar?', answerType: 'option', options: ['Comprar', 'Alugar'], campo: /interesse/ },
  { id: 'bairro', rotulo: 'Bairro de interesse', segmento: 'imobiliaria', question: 'Em que bairro você gostaria de morar?', answerType: 'text', campo: /bairro/ },
  { id: 'pedido', rotulo: 'Número do pedido', segmento: 'loja', question: 'Qual é o número do seu pedido?', answerType: 'text', campo: /pedido/ },
  { id: 'regime', rotulo: 'Regime da empresa', segmento: 'contabilidade', question: 'Qual é o regime da sua empresa?', answerType: 'option', options: ['MEI', 'Simples Nacional', 'Lucro Presumido', 'Não sei'], campo: /regime/ },
  { id: 'area', rotulo: 'Área do caso', segmento: 'juridico', question: 'Seu caso é de qual área?', answerType: 'option', options: ['Trabalhista', 'Família', 'Cível', 'Não sei'], campo: /area/ },
]

function paramsDaPerguntaPronta(q: PerguntaPronta, apoio: ApoioDoEditor, params: Record<string, unknown>): Record<string, unknown> {
  const campo = apoio.customFields.find((f) => q.campo.test(normalizar(f.name)))
  // Um campo com opções (ex.: os convênios aceitos) vira botões ou lista: a resposta sai certa.
  const opcoesDoCampo = campo?.options && campo.options.length <= 10 ? campo.options : null
  return {
    question: q.question,
    answerType: opcoesDoCampo ? 'option' : q.answerType,
    ...(opcoesDoCampo ? { options: [...opcoesDoCampo] } : q.options ? { options: [...q.options] } : {}),
    saveTo: campo?.id ?? params.saveTo ?? null,
  }
}

// ── peças de escolha ─────────────────────────────────────────────────────────

const iniciaisDe = (nome: string) => nome.replace(/\(.*?\)/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('')

function Iniciais({ nome, cor, pequeno }: { nome: string; cor: TomDaJornada; pequeno?: boolean }) {
  return (
    <span className={cn('jt-iniciais inline-flex items-center justify-center rounded-full font-semibold shrink-0', pequeno ? 'w-5 h-5 text-[12px] tracking-tighter' : 'w-8 h-8 text-[12px]')} style={tomDaCor(cor)} aria-hidden>
      {iniciaisDe(nome)}
    </span>
  )
}

/** Escolha entre poucas opções: fichas lado a lado, a escolhida na cor da seção. */
export function Pilulas({ opcoes, valor, onChange, disabled, cor, ariaLabel }: {
  opcoes: { value: string; label: string; icone?: ReactNode }[]
  valor: string
  onChange: (v: string) => void
  disabled?: boolean
  cor: TomDaJornada
  ariaLabel: string
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {opcoes.map((o) => {
        const ligada = o.value === valor
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={ligada}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            style={ligada ? tomDaCor(cor) : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 h-8 px-3 rounded-[8px] text-[14px] transition-[background-color,color,transform] duration-150 active:scale-[0.97] cursor-pointer disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              ligada ? 'font-semibold' : 'bg-[var(--jt-opcao)] ring-1 ring-inset ring-[var(--jt-borda-opcao)] text-surface-300 hover:bg-[var(--rowhover)] hover:text-surface-100',
            )}
          >
            {o.icone}{o.label}
            {ligada && <Check className="w-3.5 h-3.5" aria-hidden />}
          </button>
        )
      })}
    </div>
  )
}

/** Escolha com mais contexto: cartões com título, detalhe e selos. */
export function CartoesDeEscolha({ itens, valor, onChange, disabled, cor, ariaLabel, compacto, recolhivel }: {
  itens: { id: string; titulo: string; sub?: string; lead?: ReactNode; selos?: ReactNode }[]
  valor: string
  onChange: (v: string) => void
  disabled?: boolean
  cor: TomDaJornada
  ariaLabel: string
  compacto?: boolean
  /** Com algo escolhido, mostra só o escolhido e um "Trocar" (listas longas). */
  recolhivel?: boolean
}) {
  const [aberto, setAberto] = useState(false)
  const escolhido = itens.find((it) => it.id === valor)
  const recolhido = recolhivel && !!escolhido && !aberto
  const visiveis = recolhido ? [escolhido] : itens
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="space-y-1.5">
      {visiveis.map((it) => {
        const ligado = it.id === valor
        return (
          <button
            key={it.id}
            type="button"
            role="radio"
            aria-checked={ligado}
            disabled={disabled}
            onClick={() => { if (recolhido) { setAberto(true); return } onChange(it.id); setAberto(false) }}
            title={recolhido ? 'Trocar' : undefined}
            className={cn(
              'w-full flex items-center gap-2.5 rounded-[10px] px-3 text-left transition-[background-color,box-shadow] duration-150 cursor-pointer disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              compacto ? 'py-2' : 'py-2.5',
              ligado && !recolhido ? 'jt-escolhido' : 'bg-[var(--jt-opcao)] ring-1 ring-inset ring-[var(--jt-borda-opcao)] hover:bg-[var(--rowhover)]',
            )}
            style={ligado && !recolhido ? tomDaCor(cor) : undefined}
          >
            {it.lead}
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 min-w-0">
                <span className={cn('truncate text-[14px]', ligado && !recolhido ? 'font-semibold' : ligado ? 'font-semibold text-surface-50' : 'font-medium text-surface-200')}>{it.titulo}</span>
                {it.selos && <span className="flex shrink-0 gap-1">{it.selos}</span>}
              </span>
              {it.sub && <span className={cn('block text-[12px] leading-snug', compacto || recolhido ? 'truncate' : 'line-clamp-2', ligado && !recolhido ? '' : 'text-surface-400')}>{it.sub}</span>}
            </span>
            {recolhido ? (
              <span className="shrink-0 text-[12px] font-medium jt-texto-azul">Trocar</span>
            ) : (
              <span
                className={cn('inline-flex items-center justify-center w-5 h-5 rounded-full shrink-0 transition-colors', ligado ? '' : 'bg-surface-700')}
                style={ligado ? { backgroundColor: `var(--jt-${cor}-sobre)`, color: `var(--jt-${cor}-fundo)` } : undefined}
                aria-hidden
              >
                {ligado && <Check className="w-3 h-3" />}
              </span>
            )}
          </button>
        )
      })}
      {recolhivel && aberto && escolhido && (
        <button type="button" onClick={() => setAberto(false)} className="text-[12px] text-surface-400 hover:text-surface-200 cursor-pointer">Manter “{escolhido.titulo}”</button>
      )}
    </div>
  )
}

/** As etapas do funil como uma trilha: dá para ver para onde o contato vai. */
function TrilhaDeEtapas({ etapas, valor, onChange, disabled }: { etapas: { id: string; name: string }[]; valor: string; onChange: (v: unknown) => void; disabled?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Etapa" className="flex flex-wrap items-center gap-1">
      {etapas.map((e, i) => {
        const ligada = e.id === valor
        return (
          <span key={e.id} className="inline-flex items-center gap-1">
            {i > 0 && <ArrowRight className="w-3 h-3 text-surface-600" aria-hidden />}
            <button
              type="button"
              role="radio"
              aria-checked={ligada}
              disabled={disabled}
              onClick={() => onChange(e.id)}
              style={ligada ? tomDaCor(COR_DO_GRUPO.crm) : undefined}
              className={cn('h-8 px-3 rounded-[8px] text-[14px] transition-colors cursor-pointer disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500', ligada ? 'font-semibold' : 'bg-[var(--jt-opcao)] ring-1 ring-inset ring-[var(--jt-borda-opcao)] text-surface-300 hover:text-surface-100')}
            >
              {e.name}
            </button>
          </span>
        )
      })}
    </div>
  )
}

// ── tempo ────────────────────────────────────────────────────────────────────

type ValorDeDuracao = { amount?: number; unit?: string }
const ATALHOS_DE_TEMPO: { amount: number; unit: string; label: string }[] = [
  { amount: 15, unit: 'minutes', label: '15 min' },
  { amount: 1, unit: 'hours', label: '1 h' },
  { amount: 12, unit: 'hours', label: '12 h' },
  { amount: 24, unit: 'hours', label: '24 h' },
  { amount: 2, unit: 'days', label: '2 dias' },
  { amount: 7, unit: 'days', label: '7 dias' },
]

function Duracao({ valor, onChange, disabled }: { valor: unknown; onChange: (v: unknown) => void; disabled?: boolean }) {
  const d = (valor as ValorDeDuracao | undefined) ?? { amount: 1, unit: 'hours' }
  const atalho = ATALHOS_DE_TEMPO.find((a) => a.amount === d.amount && a.unit === d.unit)
  const [outro, setOutro] = useState(!atalho)
  const cor = COR_DO_GRUPO.controle
  return (
    <div className="space-y-2">
      <div role="radiogroup" aria-label="Quanto tempo" className="flex flex-wrap gap-1.5">
        {ATALHOS_DE_TEMPO.map((a) => {
          const ligado = !outro && atalho === a
          return (
            <button key={a.label} type="button" role="radio" aria-checked={ligado} disabled={disabled}
              onClick={() => { setOutro(false); onChange({ amount: a.amount, unit: a.unit }) }}
              style={ligado ? tomDaCor(cor) : undefined}
              className={cn('h-8 min-w-12 px-3 rounded-[8px] text-[14px] tabular-nums transition-[background-color,color,transform] duration-150 active:scale-[0.97] cursor-pointer disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500', ligado ? 'font-semibold' : 'bg-[var(--jt-opcao)] ring-1 ring-inset ring-[var(--jt-borda-opcao)] text-surface-300 hover:text-surface-100')}>
              {a.label}
            </button>
          )
        })}
        <button type="button" role="radio" aria-checked={outro} disabled={disabled} onClick={() => setOutro(true)}
          style={outro ? tomDaCor(cor) : undefined}
          className={cn('h-8 px-3 rounded-[8px] text-[14px] transition-colors cursor-pointer disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500', outro ? 'font-semibold' : 'bg-[var(--jt-opcao)] ring-1 ring-inset ring-[var(--jt-borda-opcao)] text-surface-300 hover:text-surface-100')}>
          Outro…
        </button>
      </div>
      {outro && (
        <div className="jornadas-aparecer flex items-center gap-2">
          <Input size="sm" type="number" min={1} className="w-24" aria-label="Quantidade" value={d.amount ?? ''} disabled={disabled} onChange={(e) => onChange({ ...d, amount: e.target.value === '' ? 0 : Number(e.target.value) })} />
          <Select size="sm" value={d.unit ?? 'hours'} disabled={disabled} aria-label="Unidade" onChange={(e) => onChange({ ...d, unit: e.target.value })}>
            <option value="minutes">minutos</option>
            <option value="hours">horas</option>
            <option value="days">dias</option>
          </Select>
        </div>
      )}
    </div>
  )
}

const HORARIOS = ['08:00', '09:00', '11:00', '14:00', '18:00']

function Horario({ valor, onChange, disabled }: { valor: string; onChange: (v: unknown) => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {HORARIOS.map((h) => {
        const ligado = h === valor
        return (
          <button key={h} type="button" aria-pressed={ligado} disabled={disabled} onClick={() => onChange(h)}
            style={ligado ? tomDaCor(COR_DO_GRUPO.controle) : undefined}
            className={cn('h-8 px-2.5 rounded-[8px] text-[14px] tabular-nums transition-colors cursor-pointer disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500', ligado ? 'font-semibold' : 'bg-[var(--jt-opcao)] ring-1 ring-inset ring-[var(--jt-borda-opcao)] text-surface-300 hover:text-surface-100')}>
            {h}
          </button>
        )
      })}
      <span className="relative">
        <Clock className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" aria-hidden />
        <Input size="sm" type="time" className="w-[112px] pl-8" aria-label="Outro horário" value={valor} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      </span>
    </div>
  )
}

// ── eventos e datas ──────────────────────────────────────────────────────────

const ROTULO_DO_PRODUTOR: Record<string, string> = { plataforma: 'Na plataforma', agente: 'Do agente de IA', externo: 'De outro sistema' }

/** O que pode contar como "missão concluída": o que o sistema registra como resultado, não a conversa em si (P1, 17/11). */
const EVENTOS_DE_CONCLUSAO = [
  'agent.mission_finished',
  'appointment_scheduled', 'appointment_confirmed', 'appointment_rescheduled',
  'deal.created', 'deal.stage_changed', 'deal.won',
  'contact.stage_changed', 'contact.tag_added', 'contact.field_changed',
  'template.button_replied', 'flow.replied', 'conversation.resolved', 'external.event',
]

/** Um evento do catálogo, agrupado por quem o produz. */
function EscolhaDeEvento({ valor, onChange, catalogo, disabled, rotulo, permitidos }: { valor: string; onChange: (v: unknown) => void; catalogo: Catalogo; disabled?: boolean; rotulo: string; permitidos?: string[] }) {
  const eventos = permitidos ? catalogo.events.filter((e) => permitidos.includes(e.key) || e.key === valor) : catalogo.events
  const produtores = [...new Set(eventos.map((e) => e.producer))]
  return (
    <Select size="sm" value={valor} disabled={disabled} aria-label={rotulo} onChange={(e) => onChange(e.target.value)}>
      {!valor && <option value="">Escolha o evento</option>}
      {produtores.map((p) => (
        <optgroup key={p} label={ROTULO_DO_PRODUTOR[p] ?? p}>
          {eventos.filter((e) => e.producer === p).map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
        </optgroup>
      ))}
    </Select>
  )
}

/** A data de referência de uma espera: só os dados que são data, com o exemplo do valor. */
function EscolhaDeData({ valor, onChange, catalogo, extras, disabled }: { valor: string; onChange: (v: unknown) => void; catalogo: Catalogo; extras?: string[]; disabled?: boolean }) {
  const datas = useMemo(() => listaDeVariaveis(catalogo, extras).filter((v) => /(^|\.)(data|vencimento)$/.test(v.chave)), [catalogo, extras])
  return (
    <CartoesDeEscolha
      ariaLabel="Data de referência"
      valor={valor}
      onChange={onChange}
      disabled={disabled}
      cor={COR_DO_GRUPO.controle}
      compacto
      recolhivel
      itens={datas.map((v) => ({ id: v.chave, titulo: v.rotulo, sub: v.exemplo ? `Ex.: ${v.exemplo} · ${v.grupo}` : v.grupo, lead: <CalendarDays className="w-4 h-4 shrink-0" aria-hidden /> }))}
    />
  )
}

/** "1 dia antes" / "2 dias depois": o número de dias e o lado, guardado com sinal (−1 = um dia antes). */
function AntesOuDepois({ valor, onChange, disabled }: { valor: number; onChange: (v: unknown) => void; disabled?: boolean }) {
  const dias = Math.abs(valor)
  const lado = valor > 0 ? 'depois' : valor < 0 ? 'antes' : 'no_dia'
  const montar = (d: number, l: string) => onChange(l === 'no_dia' ? 0 : l === 'antes' ? -Math.max(1, d) : Math.max(1, d))
  return (
    <div className="flex flex-wrap items-center gap-2">
      {lado !== 'no_dia' && (
        <span className="inline-flex items-center gap-1.5">
          <Input size="sm" type="number" min={1} className="w-[72px]" aria-label="Quantos dias" value={dias || 1} disabled={disabled} onChange={(e) => montar(Number(e.target.value) || 1, lado)} />
          <span className="text-[14px] text-surface-300">dia{dias === 1 ? '' : 's'}</span>
        </span>
      )}
      <Pilulas ariaLabel="Antes ou depois da data" cor={COR_DO_GRUPO.controle} disabled={disabled} valor={lado} onChange={(l) => montar(dias || 1, l)}
        opcoes={[{ value: 'antes', label: 'antes' }, { value: 'no_dia', label: 'no próprio dia' }, { value: 'depois', label: 'depois' }]} />
    </div>
  )
}

// ── mensagem ─────────────────────────────────────────────────────────────────

/** O balão da mensagem, como no WhatsApp (o lado da empresa). */
export function Balao({ children, botoes }: { children: ReactNode; botoes?: string[] }) {
  return (
    <div className="rounded-[12px] bg-surface-950 p-2.5">
      <div className="max-w-[94%] rounded-[12px] rounded-tl-[4px] px-3 py-2 text-[14px] leading-[1.65] text-surface-100" style={{ backgroundColor: 'var(--jt-verde-fundo)' }}>
        {children}
      </div>
      {botoes && botoes.length > 0 && (
        <div className="mt-1 grid max-w-[94%] gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(botoes.length, 3)}, minmax(0, 1fr))` }}>
          {botoes.map((b) => (
            <span key={b} className="inline-flex items-center justify-center gap-1 rounded-[8px] bg-surface-800 px-2 py-1.5 text-[12px] font-medium jt-texto-azul truncate">
              <Reply className="w-3 h-3 shrink-0" aria-hidden />{b}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/** Lista de variáveis para escolher, com busca, grupo e exemplo do valor. */
function EscolhaDeVariavel({ variaveis, onEscolher, atual }: { variaveis: Variavel[]; onEscolher: (chave: string) => void; atual?: string }) {
  const [busca, setBusca] = useState('')
  const termo = busca.trim().toLowerCase()
  const visiveis = variaveis.filter((v) => !termo || v.rotulo.toLowerCase().includes(termo) || v.chave.includes(termo))
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-500" aria-hidden />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar: nome, data, profissional…" aria-label="Buscar dado"
          className="w-full h-8 rounded-[7px] border border-surface-700 bg-[var(--sf2)] pl-8 pr-2.5 text-[14px] text-surface-100 placeholder:text-surface-500 focus:outline-none focus:border-brand-500" />
      </div>
      <div className="max-h-[220px] overflow-y-auto space-y-2 pr-0.5">
        {GRUPOS_DE_VARIAVEL.map((g) => {
          const doGrupo = visiveis.filter((v) => v.grupo === g)
          if (!doGrupo.length) return null
          return (
            <div key={g}>
              <p className="px-1 pb-1 text-[12px] font-semibold text-surface-500">{g}</p>
              <div className="flex flex-wrap gap-1">
                {doGrupo.map((v) => (
                  <button key={v.chave} type="button" onClick={() => onEscolher(v.chave)} title={`{{${v.chave}}}`}
                    className={cn('inline-flex items-center gap-1.5 rounded-[7px] px-2 py-1 text-[12px] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500', v.chave === atual ? 'font-semibold' : 'bg-[var(--jt-opcao)] ring-1 ring-inset ring-[var(--jt-borda-opcao)] text-surface-200 hover:bg-[var(--rowhover)]')}
                    style={v.chave === atual ? tomDaCor(COR_DO_GRUPO.conversa) : undefined}>
                    {v.rotulo}
                    {v.exemplo && <span className="text-[12px] text-surface-500">{v.exemplo}</span>}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
        {!visiveis.length && <p className="px-1 text-[12px] text-surface-400">Nenhum dado com "{busca}".</p>}
      </div>
    </div>
  )
}

/** Uma variável dentro do texto: a etiqueta com o nome do dado (ou "escolher"). */
function EtiquetaDeVariavel({ chave, ativa, vazia, onClick, disabled, fixo, semReserva }: { chave: string; ativa: boolean; vazia: boolean; onClick: () => void; disabled?: boolean; fixo?: string; semReserva?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={cn('mx-0.5 inline-flex items-center rounded-[5px] px-1.5 align-baseline text-[12px] font-semibold leading-[1.55] transition-[box-shadow,background-color] cursor-pointer disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        vazia ? 'jt-vermelho' : '',
        ativa && 'ring-2 ring-brand-500')}
      style={vazia ? undefined : fixo ? tomDaCor('cinza') : tomDaCor(COR_DO_GRUPO.conversa)}
      title={fixo ? 'Texto fixo' : semReserva ? 'Falta o texto para quando este dado vier vazio' : undefined}
    >
      {vazia ? 'escolher' : fixo ? `“${fixo}”` : rotuloDaVariavel(chave)}
      {semReserva && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--jt-ambar-no)]" aria-label="sem texto para quando vier vazio" />}
    </button>
  )
}

function MensagemDoModelo({ valor, onChange, apoio, params, somenteLeitura, catalogo, contexto }: PropsDoCampo) {
  const modelo = apoio.templates.find((t) => t.id === params.templateId)
  const extras = contexto?.variaveisDoDesenho
  const variaveis = useMemo(() => listaDeVariaveis(catalogo, extras), [catalogo, extras])
  const [aberta, setAberta] = useState<number | null>(null)
  const [codigo, setCodigo] = useState(false)
  if (!modelo) {
    return <p className="rounded-[10px] border border-dashed border-surface-700 px-3 py-3 text-[12px] text-surface-400">Escolha o modelo acima para ver a mensagem e preencher os dados dela.</p>
  }
  const lista = Array.isArray(valor) ? (valor as string[]) : []
  const editar = (i: number, v: string) => {
    const nova = [...lista]
    while (nova.length < modelo.variableCount) nova.push('')
    nova[i] = v
    onChange(nova)
  }
  // O corpo do modelo com cada {{n}} trocado pela etiqueta do dado.
  const partes = modelo.body.split(/(\{\{\d+\}\})/g)
  const expr = aberta !== null ? lerExpressao(lista[aberta] ?? '') : null
  return (
    <div className="space-y-2">
      <Balao botoes={modelo.buttons}>
        {partes.map((p, i) => {
          const m = p.match(/^\{\{(\d+)\}\}$/)
          if (!m) return <span key={i}>{p}</span>
          const n = Number(m[1]) - 1
          const bruto = lista[n] ?? ''
          const e = lerExpressao(bruto)
          // Sem {{ }}: é um texto fixo (P2, 16/11).
          const fixo = !e.chave && bruto.trim() ? bruto : undefined
          return <EtiquetaDeVariavel key={i} chave={e.chave} fixo={fixo} vazia={!e.chave && !fixo} semReserva={!!e.chave && !e.padrao && !DADOS_SEMPRE_PREENCHIDOS.has(e.chave)} ativa={aberta === n} disabled={somenteLeitura} onClick={() => setAberta(aberta === n ? null : n)} />
        })}
      </Balao>
      {aberta === null ? (
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-[12px] text-surface-400"><CornerDownRight className="w-3.5 h-3.5" aria-hidden />Toque numa etiqueta azul para escolher de onde vem o dado.</p>
          {lista.some((v) => { const x = lerExpressao(v ?? ''); return !!x.chave && !x.padrao && !DADOS_SEMPRE_PREENCHIDOS.has(x.chave) }) && (
            <p className="flex items-start gap-1.5 text-[12px] leading-snug text-surface-300">
              <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--jt-ambar-no)]" aria-hidden />
              As etiquetas com ponto laranja precisam do texto para quando o dado vier vazio: a Meta recusa a mensagem com um dado vazio.
            </p>
          )}
        </div>
      ) : (
        <div className="jornadas-aparecer rounded-[10px] bg-surface-950 p-2.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[14px] font-semibold text-surface-100">Qual dado entra aqui?</p>
            <button type="button" onClick={() => setAberta(null)} aria-label="Fechar" className="inline-flex items-center justify-center w-6 h-6 rounded-[6px] text-surface-400 hover:text-surface-100 hover:bg-[var(--rowhover)] cursor-pointer"><X className="w-3.5 h-3.5" /></button>
          </div>
          <EscolhaDeVariavel variaveis={variaveis} atual={expr?.chave} onEscolher={(chave) => editar(aberta, montarExpressao(trocarVariavel(expr ?? { chave: '', padrao: '', filtro: '' }, chave)))} />
          <label className="block">
            <span className="block mb-1 text-[12px] text-surface-400">Ou um texto fixo, igual para todos</span>
            <Input size="sm" value={expr && !expr.chave ? (lista[aberta] ?? '') : ''} placeholder="Ex.: nossa equipe" disabled={somenteLeitura} onChange={(e) => editar(aberta, e.target.value.replace(/[{}]/g, ''))} />
          </label>
          <label className="block">
            <span className="block mb-1 text-[12px] text-surface-400">
              {expr?.chave && !DADOS_SEMPRE_PREENCHIDOS.has(expr.chave)
                ? <>Se vier vazio, escrever <strong className="font-semibold text-surface-200">(obrigatório: a Meta recusa dado vazio)</strong></>
                : 'Se o dado estiver vazio, escrever'}
            </span>
            <Input size="sm" value={expr?.padrao ?? ''} placeholder="cliente" disabled={somenteLeitura || !expr?.chave}
              className={expr?.chave && !expr.padrao && !DADOS_SEMPRE_PREENCHIDOS.has(expr.chave) ? 'border-[var(--color-danger)]' : undefined}
              onChange={(e) => expr && editar(aberta, montarExpressao({ ...expr, padrao: e.target.value }))} />
          </label>
          <button type="button" onClick={() => setCodigo((c) => !c)} className="inline-flex items-center gap-1 text-[12px] text-surface-400 hover:text-surface-200 cursor-pointer">
            <Code2 className="w-3.5 h-3.5" aria-hidden />{codigo ? 'Esconder o código' : 'Ver como código'}
          </button>
          {codigo && <Input size="sm" className="font-mono text-[12px]" value={lista[aberta] ?? ''} disabled={somenteLeitura} aria-label="Variável em código" onChange={(e) => editar(aberta, e.target.value)} />}
        </div>
      )}
    </div>
  )
}

/** Texto livre com dados: as variáveis entram por fichas com nome, e a prévia mostra como fica. */
function TextoComVariaveis({ valor, onChange, placeholder, catalogo, extras, disabled, previa, rotulo }: {
  valor: string
  onChange: (v: unknown) => void
  placeholder?: string
  catalogo: Catalogo
  extras?: string[]
  disabled?: boolean
  previa: 'whatsapp' | 'equipe' | null
  rotulo: string
}) {
  const variaveis = useMemo(() => listaDeVariaveis(catalogo, extras), [catalogo, extras])
  const [escolhendo, setEscolhendo] = useState(false)
  const [codigo, setCodigo] = useState(false)
  const inserir = (chave: string) => onChange(`${valor}${valor && !valor.endsWith(' ') ? ' ' : ''}{{${chave}}}`)
  const resolvido = resolverTexto(valor)
  // O texto aparece com os dados por nome ([Nome do contato]); o código fica no modo avançado.
  const amigavel = paraTextoAmigavel(valor)
  return (
    <div className="space-y-2">
      <div className="relative">
        {codigo
          ? <Textarea size="sm" rows={4} className={cn('font-mono text-[12px]', !disabled && 'pb-10')} value={valor} placeholder={placeholder} disabled={disabled} aria-label={`${rotulo} (código)`} onChange={(e) => onChange(e.target.value)} />
          : <Textarea size="sm" rows={4} className={cn(!disabled && 'pb-10')} value={amigavel} placeholder={placeholder ? paraTextoAmigavel(placeholder) : undefined} disabled={disabled} aria-label={rotulo} onChange={(e) => onChange(deTextoAmigavel(e.target.value, valor, variaveis))} />}
        {!disabled && (
          <div className="absolute left-2 right-2 bottom-2 flex items-center gap-1">
            <button type="button" onClick={() => setEscolhendo((e) => !e)} aria-expanded={escolhendo} title="Pôr um dado do contato, do agendamento ou da conversa no texto"
              className={cn('inline-flex items-center gap-1 h-7 px-2 rounded-[7px] text-[12px] font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500', escolhendo ? 'jt-azul' : 'bg-[var(--jt-opcao)] ring-1 ring-inset ring-[var(--jt-borda-opcao)] text-surface-200 hover:bg-[var(--rowhover)] hover:text-surface-50')}>
              <Plus className="w-3.5 h-3.5" aria-hidden />Dado
            </button>
            <button type="button" onClick={() => setCodigo((c) => !c)} className="ml-auto inline-flex items-center gap-1 h-7 px-2 rounded-[7px] text-[12px] text-surface-400 hover:text-surface-100 hover:bg-[var(--rowhover)] cursor-pointer" title={codigo ? 'Voltar ao texto com os dados por nome' : 'Ver os dados como {{código}} (para quem já conhece)'}>
              <Code2 className="w-3.5 h-3.5" aria-hidden />{codigo ? 'Texto normal' : 'Avançado'}
            </button>
          </div>
        )}
      </div>
      {escolhendo && <div className="jornadas-aparecer rounded-[10px] bg-surface-950 p-2.5"><EscolhaDeVariavel variaveis={variaveis} onEscolher={(c) => { inserir(c); setEscolhendo(false) }} /></div>}
      {previa && valor.trim() && (
        previa === 'whatsapp'
          ? <div><p className="mb-1 text-[12px] font-semibold text-surface-500">Como a pessoa recebe</p><Balao>{resolvido}</Balao></div>
          : (
            <div>
              <p className="mb-1 text-[12px] font-semibold text-surface-500">Como a equipe vê</p>
              <div className="rounded-[10px] bg-[var(--jt-poco)] px-3 py-2 text-[14px] leading-relaxed text-surface-200">{resolvido}</div>
            </div>
          )
      )}
    </div>
  )
}

// ── caminhos ─────────────────────────────────────────────────────────────────

const slug = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24) || `r_${Math.random().toString(36).slice(2, 6)}`

/** O rodapé de um caminho: para qual passo ele segue (clique leva até lá). */
function SegueParaO({ saida, contexto }: { saida: string; contexto?: ContextoDoCampo }) {
  const alvo = contexto?.destino(saida)
  if (!contexto) return null
  return alvo ? (
    <button type="button" onClick={() => contexto.irPara(alvo.id)} className="group inline-flex items-center gap-1 max-w-full text-[12px] text-surface-300 hover:text-surface-50 cursor-pointer" title="Ir até o passo">
      <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
      <span className="truncate">{alvo.nome}</span>
    </button>
  ) : contexto.escolherProximo || contexto.terminarAqui ? (
    <span className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[12px] text-surface-400">
      <ArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden /><span className="mr-1">Ainda não vai a lugar nenhum:</span>
      {contexto.escolherProximo && <button type="button" onClick={() => contexto.escolherProximo!(saida)} className="inline-flex items-center gap-1 h-6 px-2 rounded-[6px] font-semibold text-surface-100 bg-[var(--jt-opcao)] ring-1 ring-inset ring-[var(--jt-borda-opcao)] hover:bg-[var(--rowhover)] cursor-pointer"><Plus className="w-3 h-3" aria-hidden />Escolher o próximo passo</button>}
      {contexto.terminarAqui && <button type="button" onClick={() => contexto.terminarAqui!(saida)} className="inline-flex items-center gap-1 h-6 px-2 rounded-[6px] text-surface-300 hover:text-surface-50 hover:bg-[var(--rowhover)] cursor-pointer">Terminar aqui</button>}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[12px] text-surface-500"><ArrowRight className="w-3.5 h-3.5" aria-hidden />Ainda sem próximo passo</span>
  )
}

/** A casca de um caminho: bolinha na cor da saída (a mesma do cartão), título editável e o destino. */
function CartaoDeCaminho({ cor, titulo, onTitulo, onTirar, disabled, saida, contexto, children, neutro }: {
  cor: string
  titulo: string
  onTitulo?: (v: string) => void
  onTirar?: () => void
  disabled?: boolean
  saida: string
  contexto?: ContextoDoCampo
  children?: ReactNode
  neutro?: boolean
}) {
  return (
    <div className={cn('jornadas-aparecer rounded-[10px] p-2.5 space-y-2', neutro ? 'border border-dashed border-surface-700' : 'bg-[var(--jt-poco)]')}>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cor }} aria-hidden />
        {onTitulo ? (
          <input value={titulo} onChange={(e) => onTitulo(e.target.value)} disabled={disabled} aria-label="Nome do caminho"
            className="min-w-0 flex-1 rounded-[6px] bg-transparent px-1 py-0.5 text-[14px] font-semibold text-surface-100 hover:bg-[var(--rowhover)] focus:bg-surface-900 focus:outline-none focus:ring-1 focus:ring-brand-500" />
        ) : (
          <span className="min-w-0 flex-1 px-1 text-[14px] font-medium text-surface-300">{titulo}</span>
        )}
        {onTirar && !disabled && <button type="button" onClick={onTirar} aria-label="Tirar este caminho" className="inline-flex items-center justify-center w-6 h-6 rounded-[6px] text-surface-500 hover:text-[var(--color-danger)] hover:bg-[var(--rowhover)] cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>}
      </div>
      {children}
      <div className="pl-[18px]"><SegueParaO saida={saida} contexto={contexto} /></div>
    </div>
  )
}

type Resposta = { key: string; label: string; event: string; match?: string }

/**
 * O que a pessoa pode FAZER para seguir por um caminho do "Esperar um acontecimento" (P2, 17/11):
 * em frase, com a explicação embaixo, no lugar do "Responde com: Botão / Mensagem / Formulário".
 */
const TIPOS_DE_RESPOSTA = [
  { value: 'template.button_replied', label: 'toca num botão da mensagem', ajuda: 'Escolha quais botões levam por este caminho. Cada botão só pode estar em um caminho.', rotulo: 'Tocou num botão' },
  { value: 'message.received', label: 'escreve uma mensagem', ajuda: 'Vale qualquer mensagem: texto, áudio, foto. Se a mensagem acima tem botões, é o caminho de quem escreve em vez de tocar num botão.', rotulo: 'Escreveu outra coisa' },
  { value: 'flow.replied', label: 'responde um formulário do WhatsApp', ajuda: 'Só para mensagens que levam um formulário (WhatsApp Flow), enviado antes deste passo.', rotulo: 'Respondeu o formulário' },
  { value: 'outro', label: 'faz algo que o sistema registra', ajuda: 'Ex.: confirmou pelo telefone e a equipe registrou no sistema. Não precisa responder no WhatsApp.', rotulo: 'Aconteceu no sistema' },
] as const
const EVENTOS_DE_CONVERSA = ['template.button_replied', 'message.received', 'flow.replied']

function RespostasEsperadas({ valor, onChange, catalogo, disabled, contexto }: { valor: unknown; onChange: (v: unknown) => void; catalogo: Catalogo; disabled?: boolean; contexto?: ContextoDoCampo }) {
  const lista = (Array.isArray(valor) ? valor : []) as Resposta[]
  const mudar = (i: number, parcial: Partial<Resposta>) => onChange(lista.map((x, j) => (j === i ? { ...x, ...parcial } : x)))
  const posicao = (key: string) => Math.max(0, contexto?.saidas.findIndex((s) => s.key === key) ?? 0)
  const outrosEventos = catalogo.events.filter((e) => !EVENTOS_DE_CONVERSA.includes(e.key) && e.producer !== 'agente')
  const botoesDoCaminho = (r: Resposta) => (r.event === 'template.button_replied' ? (r.match ?? '').split('|').map((x) => x.trim()).filter(Boolean) : [])
  // Em que caminho cada botão já está (com o mesmo botão em dois caminhos, só o primeiro vale).
  const donoDoBotao = new Map<string, number>()
  lista.forEach((r, i) => { for (const b of botoesDoCaminho(r)) if (!donoDoBotao.has(b)) donoDoBotao.set(b, i) })
  const botoesDoModelo = contexto?.botoesDoModelo ?? []
  const faltam = botoesDoModelo.filter((b) => !donoDoBotao.has(b))
  const temEscrita = lista.some((r) => r.event === 'message.received')
  // O nome acompanha a escolha enquanto a pessoa não der um nome próprio.
  const nomeAutomatico = (r: Resposta) => {
    if (r.event === 'template.button_replied') { const b = botoesDoCaminho(r); return b.length ? b.join(' ou ') : 'Tocou num botão' }
    if (r.event === 'message.received') return botoesDoModelo.length ? 'Escreveu outra coisa' : 'Escreveu uma mensagem'
    if (r.event === 'flow.replied') return 'Respondeu o formulário'
    return catalogo.events.find((e) => e.key === r.event)?.label ?? 'Aconteceu no sistema'
  }
  const automatico = (r: Resposta) => /^(Resposta|Respondeu) ?\d*$/.test(r.label) || r.label === nomeAutomatico(r) || r.label === 'Escreveu uma mensagem' || TIPOS_DE_RESPOSTA.some((t) => t.rotulo === r.label)
  const trocar = (i: number, parcial: Partial<Resposta>) => {
    const r = lista[i]
    const novo = { ...r, ...parcial }
    mudar(i, automatico(r) ? { ...parcial, label: nomeAutomatico(novo) } : parcial)
  }
  const novasChaves = (bases: string[]) => {
    const usadas = new Set(lista.map((r) => r.key))
    return bases.map((b) => { let k = slug(b); let n = 2; while (usadas.has(k)) k = `${slug(b)}_${n++}`; usadas.add(k); return k })
  }
  const adicionar = (novos: Omit<Resposta, 'key'>[]) => {
    const chaves = novasChaves(novos.map((r) => r.label))
    onChange([...lista, ...novos.map((r, j) => ({ ...r, key: chaves[j] }))])
  }
  return (
    <div className="space-y-2">
      <p className="text-[12px] leading-snug text-surface-400">
        Cada caminho é algo que a pessoa pode fazer. Ela segue pelo caminho da <strong className="font-semibold text-surface-200">primeira</strong> coisa que fizer; se não fizer nada no prazo, segue por “Ninguém respondeu”.
      </p>
      {lista.map((r, i) => {
        const tipo = TIPOS_DE_RESPOSTA.some((t) => t.value === r.event) ? r.event : 'outro'
        const info = TIPOS_DE_RESPOSTA.find((t) => t.value === tipo)!
        const escolhidos = botoesDoCaminho(r)
        const botoes = [...new Set([...botoesDoModelo, ...escolhidos])]
        return (
          <CartaoDeCaminho key={r.key} cor={corDaSaida(r.key, posicao(r.key))} titulo={r.label} onTitulo={(v) => mudar(i, { label: v })} onTirar={() => onChange(lista.filter((_, j) => j !== i))} disabled={disabled} saida={r.key} contexto={contexto}>
            <div className="pl-[18px] space-y-2">
              <label className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="shrink-0 text-[12px] text-surface-300">Quando a pessoa</span>
                <Select size="sm" className="min-w-0 flex-1" value={tipo} disabled={disabled} aria-label="O que a pessoa faz"
                  onChange={(e) => { const v = e.target.value; trocar(i, v === 'outro' ? { event: outrosEventos[0]?.key ?? r.event, match: undefined } : { event: v, match: v === 'template.button_replied' ? '' : undefined }) }}>
                  {TIPOS_DE_RESPOSTA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
              </label>
              <p className="text-[12px] leading-snug text-surface-400">{info.ajuda}</p>
              {tipo === 'template.button_replied' && (
                botoes.length > 0 ? (
                  <div className="flex min-w-0 flex-wrap gap-1" role="group" aria-label="Quais botões">
                    {botoes.map((b) => {
                      const ligado = escolhidos.includes(b)
                      const dono = donoDoBotao.get(b)
                      const emOutro = !ligado && dono !== undefined && dono !== i
                      const sumiu = botoesDoModelo.length > 0 && !botoesDoModelo.includes(b)
                      return (
                        <button key={b} type="button" aria-pressed={ligado} disabled={disabled || emOutro}
                          title={emOutro ? `Já está no caminho “${lista[dono!].label}”` : sumiu ? 'Este botão não existe mais no modelo' : undefined}
                          onClick={() => trocar(i, { match: (ligado ? escolhidos.filter((x) => x !== b) : [...escolhidos, b]).join('|') })}
                          className={cn('inline-flex items-center gap-1 h-7 px-2.5 rounded-[7px] text-[12px] transition-colors cursor-pointer disabled:cursor-default',
                            ligado ? 'font-semibold' : 'bg-[var(--jt-opcao)] ring-1 ring-inset ring-[var(--jt-borda-opcao)] text-surface-400 hover:text-surface-200',
                            emOutro && 'opacity-60', sumiu && 'line-through')}
                          style={ligado ? tomDaCor(COR_DO_GRUPO.mensagem) : undefined}>
                          <Reply className="w-3 h-3" aria-hidden />{b}{emOutro && <span className="font-normal"> · em outro caminho</span>}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <Input size="sm" value={r.match ?? ''} placeholder="Texto do botão (ex.: Confirmar)" disabled={disabled} aria-label="Texto do botão" onChange={(e) => trocar(i, { match: e.target.value })} />
                )
              )}
              {tipo === 'outro' && (
                <Select size="sm" value={r.event} disabled={disabled} aria-label="O que o sistema registra" onChange={(e) => trocar(i, { event: e.target.value })}>
                  {[...outrosEventos, ...catalogo.events.filter((e) => e.key === r.event && !outrosEventos.includes(e))].map((ev) => <option key={ev.key} value={ev.key}>{ev.label}</option>)}
                </Select>
              )}
            </div>
          </CartaoDeCaminho>
        )
      })}
      <CartaoDeCaminho neutro cor={corDaSaida('sem_resposta', 0)} titulo="Ninguém respondeu no prazo" saida="sem_resposta" contexto={contexto} />
      {!disabled && (
        <div className="space-y-1.5 pt-1">
          {faltam.length > 0 && (
            <Button variant="secondary" size="sm" leftIcon={<Reply className="w-3.5 h-3.5" />}
              onClick={() => adicionar(faltam.map((b) => ({ label: b, event: 'template.button_replied', match: b })))}>
              {faltam.length === 1 ? `Criar o caminho do botão “${faltam[0]}”` : `Criar um caminho para cada botão que falta (${faltam.length})`}
            </Button>
          )}
          <p className="text-[12px] text-surface-400">Outro caminho para quem…</p>
          <div className="flex flex-wrap items-center gap-1">
            <Button variant="ghost" size="sm" leftIcon={<Reply className="w-3.5 h-3.5" />} onClick={() => adicionar([{ label: 'Tocou num botão', event: 'template.button_replied', match: '' }])}>toca num botão</Button>
            {!temEscrita && <Button variant="ghost" size="sm" leftIcon={<MessageSquareText className="w-3.5 h-3.5" />} onClick={() => adicionar([{ label: botoesDoModelo.length ? 'Escreveu outra coisa' : 'Escreveu uma mensagem', event: 'message.received' }])}>escreve</Button>}
            <Button variant="ghost" size="sm" leftIcon={<Zap className="w-3.5 h-3.5" />} onClick={() => adicionar([{ label: outrosEventos[0]?.label ?? 'Aconteceu no sistema', event: outrosEventos[0]?.key ?? 'appointment_confirmed' }])}>faz algo no sistema</Button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * O nome do caminho a partir da condição ("Etiquetas do contato é VIP"), para o desenho mostrar o critério
 * em vez de "Caminho 1" (P1, 17/11: a reclamação nº 1 da HubSpot é o critério escondido).
 */
function nomeDoCaminho(g: GrupoDeCondicoes, catalogo: Catalogo): string | null {
  if (!g.conditions.length) return null
  const partes: string[] = []
  for (const c of g.conditions) {
    const campo = catalogo.conditionFields.find((f) => f.key === c.field)?.label ?? c.field
    const op = OPERADORES.find((o) => o.value === c.op)
    if (op?.semValor) { partes.push(`${campo} ${op.label}`); continue }
    const v = c.value === true ? 'sim' : c.value === false ? 'não' : Array.isArray(c.value) ? c.value.join(', ') : String(c.value ?? '').trim()
    if (!v) return null
    partes.push(`${campo} ${op?.label ?? c.op} ${v}`)
  }
  const t = partes.join(g.mode === 'all' ? ' e ' : ' ou ')
  return t.length > 48 ? `${t.slice(0, 47).trimEnd()}…` : t
}

function RamosPorCondicao({ valor, onChange, catalogo, apoio, disabled, contexto }: { valor: unknown; onChange: (v: unknown) => void; catalogo: Catalogo; apoio?: ApoioDoEditor; disabled?: boolean; contexto?: ContextoDoCampo }) {
  const lista = (Array.isArray(valor) ? valor : []) as { key: string; label: string; group: GrupoDeCondicoes }[]
  const mudar = (i: number, parcial: Partial<(typeof lista)[number]>) => onChange(lista.map((x, j) => (j === i ? { ...x, ...parcial } : x)))
  // O nome acompanha a condição enquanto a pessoa não der um nome próprio.
  const automatico = (r: (typeof lista)[number]) => /^(Caminho|Ramo) \d+$/.test(r.label) || r.label === nomeDoCaminho(r.group, catalogo)
  const mudarGrupo = (i: number, g: GrupoDeCondicoes) => {
    const nome = automatico(lista[i]) ? nomeDoCaminho(g, catalogo) : null
    mudar(i, nome ? { group: g, label: nome } : { group: g })
  }
  const mover = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= lista.length) return
    const nova = [...lista]
    ;[nova[i], nova[j]] = [nova[j], nova[i]]
    onChange(nova)
  }
  return (
    <div className="space-y-2">
      <p className="text-[12px] leading-snug text-surface-400">
        {lista.length > 1
          ? <>Quem atende às condições de um caminho vai por ele. A jornada confere de cima para baixo e usa o <strong className="font-semibold text-surface-200">primeiro</strong> que bater (use as setas para mudar a ordem). Quem não atende a nenhum vai por “Outros casos”.</>
          : <>Quem atende às condições abaixo vai por este caminho. Quem não atende vai por “Outros casos”. Precisa de mais caminhos? Use “Outro caminho”.</>}
      </p>
      {lista.map((r, i) => (
        <CartaoDeCaminho key={r.key} cor={corDaSaida(r.key, i)} titulo={r.label} onTitulo={(v) => mudar(i, { label: v })} onTirar={() => onChange(lista.filter((_, j) => j !== i))} disabled={disabled} saida={r.key} contexto={contexto}>
          <div className="pl-[18px] space-y-1.5">
            <EditorDeCondicoes grupo={r.group} onChange={(g) => mudarGrupo(i, g)} catalogo={catalogo} apoio={apoio} disabled={disabled} />
            {!disabled && lista.length > 1 && (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" disabled={i === 0} leftIcon={<ArrowUp className="w-3.5 h-3.5" />} onClick={() => mover(i, -1)} aria-label={`Subir o caminho ${r.label}`}>Subir</Button>
                <Button variant="ghost" size="sm" disabled={i === lista.length - 1} leftIcon={<ArrowDown className="w-3.5 h-3.5" />} onClick={() => mover(i, 1)} aria-label={`Descer o caminho ${r.label}`}>Descer</Button>
              </div>
            )}
          </div>
        </CartaoDeCaminho>
      ))}
      <CartaoDeCaminho neutro cor={corDaSaida('senao', 0)} titulo="Outros casos (nenhum caminho acima)" saida="senao" contexto={contexto} />
      {!disabled && (
        <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => onChange([...lista, { key: slug(`ramo ${lista.length + 1}`), label: `Caminho ${lista.length + 1}`, group: { mode: 'all', conditions: [{ field: catalogo.conditionFields[0].key, op: 'eq', value: '' }] } }])}>
          Outro caminho
        </Button>
      )}
    </div>
  )
}

/** As categorias da IA: cada uma é um caminho, com o "incerto" no fim. */
function CategoriasComCaminho({ valor, onChange, disabled, contexto }: { valor: unknown; onChange: (v: unknown) => void; disabled?: boolean; contexto?: ContextoDoCampo }) {
  const lista = (Array.isArray(valor) ? valor : []).map((x) => (typeof x === 'string' ? { key: slug(x), label: x } : (x as { key: string; label: string })))
  return (
    <div className="space-y-2">
      <p className="text-[12px] leading-snug text-surface-400">A IA escolhe uma destas respostas para cada pessoa, e cada uma vira um caminho. Escreva como a pessoa diria (ex.: “Quer remarcar”). Toque no nome para mudar.</p>
      {lista.map((it, i) => (
        <CartaoDeCaminho key={`${it.key}-${i}`} cor={corDaSaida(it.key, i)} titulo={it.label} disabled={disabled} saida={it.key} contexto={contexto}
          onTitulo={(v) => onChange(lista.map((x, j) => (j === i ? { key: x.key || slug(v), label: v } : x)))}
          onTirar={() => onChange(lista.filter((_, j) => j !== i))} />
      ))}
      <CartaoDeCaminho neutro cor={corDaSaida('incerto', 0)} titulo="Sem certeza (a IA não soube escolher)" saida="incerto" contexto={contexto} />
      {!disabled && <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => onChange([...lista, { key: slug(`resposta ${lista.length + 1}`), label: `Resposta ${lista.length + 1}` }])}>Outra resposta possível</Button>}
    </div>
  )
}

/**
 * As opções de uma pergunta, com os limites do WhatsApp (P1, 17/11): até 3 viram botões (20 letras
 * cada); de 4 a 10, uma lista (24 letras cada); mais que 10, o WhatsApp não aceita.
 */
const LIMITES_DAS_OPCOES = { botoes: 3, letrasDoBotao: 20, lista: 10, letrasDaLista: 24 }
function OpcoesDaPergunta({ valor, onChange, disabled, placeholder }: { valor: unknown; onChange: (v: unknown) => void; disabled?: boolean; placeholder?: string }) {
  const lista = (Array.isArray(valor) ? valor : []).map((x) => (typeof x === 'string' ? x : (x as { label: string }).label))
  const [novo, setNovo] = useState('')
  const comoBotoes = lista.length <= LIMITES_DAS_OPCOES.botoes
  const limite = comoBotoes ? LIMITES_DAS_OPCOES.letrasDoBotao : LIMITES_DAS_OPCOES.letrasDaLista
  const cheia = lista.length >= LIMITES_DAS_OPCOES.lista
  const adicionar = () => { const v = novo.trim(); if (v && !lista.includes(v) && !cheia) onChange([...lista, v]); setNovo('') }
  return (
    <div className="space-y-1.5">
      <p className="text-[12px] leading-snug text-surface-400">
        {comoBotoes
          ? `Vão como botões: até ${LIMITES_DAS_OPCOES.botoes}, com até ${LIMITES_DAS_OPCOES.letrasDoBotao} letras cada.`
          : `Com mais de ${LIMITES_DAS_OPCOES.botoes}, vão como lista: até ${LIMITES_DAS_OPCOES.lista}, com até ${LIMITES_DAS_OPCOES.letrasDaLista} letras cada.`}
      </p>
      <div className="flex flex-wrap gap-1">
        {lista.map((v) => {
          const passou = v.length > limite
          return (
            <span key={v} className={cn('inline-flex items-center gap-1 rounded-[6px] pl-2 pr-1 py-0.5 text-[12px]', passou ? 'jt-vermelho' : 'bg-[var(--jt-poco)] text-surface-200')} title={passou ? `Passou de ${limite} letras: o WhatsApp corta ou recusa` : undefined}>
              {v}<span className="tabular-nums opacity-70">{v.length}/{limite}</span>
              {!disabled && <button type="button" aria-label={`Tirar ${v}`} onClick={() => onChange(lista.filter((x) => x !== v))} className="inline-flex items-center justify-center w-4 h-4 rounded-[4px] opacity-70 hover:opacity-100 cursor-pointer"><X className="w-3 h-3" /></button>}
            </span>
          )
        })}
        {!lista.length && <span className="text-[12px] text-surface-500">Nenhuma opção ainda.</span>}
      </div>
      {!disabled && !cheia && (
        <div className="flex gap-1.5">
          <Input size="sm" value={novo} placeholder={placeholder} aria-label="Nova opção" maxLength={LIMITES_DAS_OPCOES.letrasDaLista}
            onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionar() } }} />
          <Button variant="secondary" size="sm" onClick={adicionar}>Adicionar</Button>
        </div>
      )}
      {cheia && <p className="text-[12px] text-surface-400">Chegou ao máximo de {LIMITES_DAS_OPCOES.lista} opções do WhatsApp.</p>}
    </div>
  )
}

/** Os caminhos de um passo que ramifica: o que leva a pessoa por cada um e o próximo passo (P1, 17/11). */
export function CaminhosDoPasso({ caminhos, contexto }: { caminhos: { key: string; titulo: string; explicacao: string; posicao: number; neutro?: boolean }[]; contexto?: ContextoDoCampo }) {
  return (
    <div className="space-y-2">
      {caminhos.map((c) => (
        <CartaoDeCaminho key={c.key} cor={corDaSaida(c.key, c.posicao)} titulo={c.titulo} saida={c.key} contexto={contexto} neutro={c.neutro}>
          <p className="pl-[18px] text-[12px] leading-snug text-surface-400">{c.explicacao}</p>
        </CartaoDeCaminho>
      ))}
    </div>
  )
}

/** Lista curta de valores (ex.: campos do webhook) como fichas. */
/** Dados escolhidos numa lista, pelo nome (o webhook de saída), sem digitar código (17/11). */
function ListaDeDados({ valor, onChange, disabled, catalogo, extras }: { valor: unknown; onChange: (v: unknown) => void; disabled?: boolean; catalogo: Catalogo; extras?: string[] }) {
  const lista = (Array.isArray(valor) ? valor : []).map(String)
  const [escolhendo, setEscolhendo] = useState(false)
  const variaveis = useMemo(() => listaDeVariaveis(catalogo, extras), [catalogo, extras])
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {lista.map((v) => (
          <span key={v} title={v} className="inline-flex items-center gap-1 rounded-[6px] bg-[var(--jt-poco)] pl-2 pr-1 py-0.5 text-[12px] text-surface-200">
            {rotuloDaVariavel(v)}
            {!disabled && <button type="button" aria-label={`Tirar ${rotuloDaVariavel(v)}`} onClick={() => onChange(lista.filter((x) => x !== v))} className="inline-flex items-center justify-center w-4 h-4 rounded-[4px] text-surface-500 hover:text-surface-100 cursor-pointer"><X className="w-3 h-3" /></button>}
          </span>
        ))}
        {!lista.length && <span className="text-[12px] text-surface-500">Nenhum dado ainda.</span>}
      </div>
      {!disabled && (
        <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} aria-expanded={escolhendo} onClick={() => setEscolhendo((e) => !e)}>Dado</Button>
      )}
      {escolhendo && (
        <div className="jornadas-aparecer rounded-[10px] bg-surface-950 p-2.5">
          <EscolhaDeVariavel variaveis={variaveis.filter((v) => !lista.includes(v.chave))} onEscolher={(c) => { onChange([...lista, c]); setEscolhendo(false) }} />
        </div>
      )}
    </div>
  )
}

function ListaDeFichas({ valor, onChange, disabled, placeholder }: { valor: unknown; onChange: (v: unknown) => void; disabled?: boolean; placeholder?: string }) {
  const lista = (Array.isArray(valor) ? valor : []).map((x) => (typeof x === 'string' ? x : (x as { label: string }).label))
  const [novo, setNovo] = useState('')
  const adicionar = () => { const v = novo.trim(); if (v && !lista.includes(v)) onChange([...lista, v]); setNovo('') }
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {lista.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-[6px] bg-[var(--jt-poco)] pl-2 pr-1 py-0.5 font-mono text-[12px] text-surface-200">
            {v}
            {!disabled && <button type="button" aria-label={`Tirar ${v}`} onClick={() => onChange(lista.filter((x) => x !== v))} className="inline-flex items-center justify-center w-4 h-4 rounded-[4px] text-surface-500 hover:text-surface-100 cursor-pointer"><X className="w-3 h-3" /></button>}
          </span>
        ))}
        {!lista.length && <span className="text-[12px] text-surface-500">Nada ainda.</span>}
      </div>
      {!disabled && (
        <div className="flex gap-1.5">
          <Input size="sm" className="font-mono text-[12px]" value={novo} placeholder={placeholder} aria-label="Novo item" onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionar() } }} />
          <Button variant="secondary" size="sm" onClick={adicionar}>Adicionar</Button>
        </div>
      )}
    </div>
  )
}

// ── condições (E/OU, sem código) ─────────────────────────────────────────────

/** Valores que vêm de uma lista (etiquetas, etapas, quem tem a vez): escolher em vez de digitar (P1, 17/11). */
function opcoesDoValor(campo: string, apoio?: ApoioDoEditor): { value: string; label: string }[] | null {
  if (campo === 'contato.etiquetas' || campo === 'evento.etiqueta') return apoio ? apoio.tags.map((t) => ({ value: t.name, label: t.name })) : null
  if (campo === 'contato.etapa' || campo === 'evento.etapa') return apoio ? apoio.stages.map((e) => ({ value: e.name, label: e.name })) : null
  if (campo === 'conversa.posse') return [{ value: 'jornada', label: 'A jornada' }, { value: 'agente', label: 'O agente de IA' }, { value: 'humano', label: 'Uma pessoa da equipe' }]
  return null
}

export function EditorDeCondicoes({ grupo, onChange, catalogo, apoio, disabled, naEntrada }: { grupo: GrupoDeCondicoes; onChange: (g: GrupoDeCondicoes) => void; catalogo: Catalogo; apoio?: ApoioDoEditor; disabled?: boolean; naEntrada?: boolean }) {
  // Na Entrada ainda não houve passo: "resultado do passo anterior" e "tentativa" não fazem sentido.
  const campos = catalogo.conditionFields.filter((f) => !naEntrada || !f.key.startsWith('contexto.') || grupo.conditions.some((c) => c.field === f.key))
  const mudar = (i: number, parcial: Partial<Condicao>) => onChange({ ...grupo, conditions: grupo.conditions.map((c, j) => (j === i ? { ...c, ...parcial } : c)) })
  return (
    <div className="space-y-1.5">
      {grupo.conditions.length > 1 && (
        <Select size="sm" value={grupo.mode} disabled={disabled} onChange={(e) => onChange({ ...grupo, mode: e.target.value as GrupoDeCondicoes['mode'] })} aria-label="Como juntar as condições">
          <option value="all">Todas as condições (E)</option>
          <option value="any">Qualquer condição (OU)</option>
        </Select>
      )}
      {grupo.conditions.map((c, i) => {
        const campo = catalogo.conditionFields.find((f) => f.key === c.field)
        const op = OPERADORES.find((o) => o.value === c.op)
        return (
          <div key={i} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-1.5 items-start">
            <Select size="sm" value={c.field} disabled={disabled} onChange={(e) => mudar(i, { field: e.target.value })} aria-label="Campo">
              {campos.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </Select>
            <div className="flex gap-1.5">
              <Select size="sm" value={c.op} disabled={disabled} onChange={(e) => mudar(i, { op: e.target.value as Condicao['op'] })} aria-label="Comparação">
                {OPERADORES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
              {!disabled && <Button variant="ghost" size="sm" iconOnly aria-label="Tirar condição" onClick={() => onChange({ ...grupo, conditions: grupo.conditions.filter((_, j) => j !== i) })}><Trash2 className="w-3.5 h-3.5" /></Button>}
            </div>
            {!op?.semValor && (
              campo?.type === 'boolean' ? (
                <Select size="sm" className="col-span-2" value={c.value === true ? 'true' : c.value === false ? 'false' : ''} disabled={disabled} onChange={(e) => mudar(i, { value: e.target.value === 'true' })} aria-label="Valor">
                  <option value="">Escolha…</option>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </Select>
              ) : opcoesDoValor(c.field, apoio) && c.op !== 'in' ? (
                <Select size="sm" className="col-span-2" value={valorEmTexto(c.value)} disabled={disabled} onChange={(e) => mudar(i, { value: e.target.value })} aria-label="Valor">
                  <option value="">Escolha…</option>
                  {opcoesDoValor(c.field, apoio)!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  {valorEmTexto(c.value) && !opcoesDoValor(c.field, apoio)!.some((o) => o.value === valorEmTexto(c.value)) && <option value={valorEmTexto(c.value)}>{valorEmTexto(c.value)} (não existe mais)</option>}
                </Select>
              ) : (
                <Input size="sm" className="col-span-2" value={valorEmTexto(c.value)} disabled={disabled} placeholder={c.op === 'in' ? 'Separe por vírgula' : 'Valor'}
                  onChange={(e) => mudar(i, { value: c.op === 'in' ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : campo?.type === 'number' ? Number(e.target.value) : e.target.value })} />
              )
            )}
          </div>
        )
      })}
      {!disabled && (
        <Button variant="secondary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => onChange({ ...grupo, conditions: [...grupo.conditions, { field: catalogo.conditionFields[0].key, op: 'eq', value: '' }] })}>
          Condição
        </Button>
      )}
    </div>
  )
}
