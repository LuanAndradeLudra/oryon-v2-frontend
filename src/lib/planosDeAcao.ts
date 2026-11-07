// Retomadas (06/11): os textos e as contas dos planos de ação no app da unidade (sem tela, testáveis).
import type { Desfecho, DesfechoDaEquipe, EventoDoHistorico, ItemDoPlano, ProgressoDoPlano, SituacaoDoPlano, TipoDoCaso, UltimoPasso } from '@/services/followUpsApi'

export const MOTIVO: Record<TipoDoCaso, string> = {
  sem_vaga: 'Pediu horário e não havia vaga',
  interessado: 'Pediu horário e não marcou',
  cancelou: 'Cancelou e não remarcou',
}
export const MOTIVO_CURTO: Record<TipoDoCaso, string> = { sem_vaga: 'Sem vaga', interessado: 'Interessado', cancelou: 'Cancelou' }

export const ROTULO_DO_DESFECHO: Record<Desfecho, string> = {
  agendou: 'Marcou',
  agendou_outra_unidade: 'Marcou em outra unidade',
  agendou_por_telefone: 'Marcou por telefone',
  contato_sem_agendamento: 'Falou, sem marcar',
  sem_resposta: 'Sem resposta',
  nao_quer: 'Não quer',
  numero_invalido: 'Número inválido',
  nao_trabalhado: 'Não trabalhado',
}

/** Os desfechos que a equipe marca, na ordem do botão (o mais comum primeiro), com o que cada um quer dizer. */
export const DESFECHOS_DA_EQUIPE: Array<{ id: DesfechoDaEquipe; rotulo: string; fecha: boolean; explica: string }> = [
  { id: 'agendou_por_telefone', rotulo: 'Marcou por telefone', fecha: true, explica: 'A pessoa marcou a consulta com você, por ligação ou no balcão. O contato sai da lista como recuperado.' },
  { id: 'contato_sem_agendamento', rotulo: 'Falou, sem marcar', fecha: false, explica: 'Vocês conversaram, mas ela ainda não marcou. O contato continua na lista para tentar de novo.' },
  { id: 'sem_resposta', rotulo: 'Sem resposta', fecha: true, explica: 'Você tentou falar e a pessoa não respondeu. O contato sai da lista.' },
  { id: 'nao_quer', rotulo: 'Não quer', fecha: true, explica: 'A pessoa disse que não quer marcar. Ela só volta a aparecer se escrever de novo.' },
  { id: 'numero_invalido', rotulo: 'Número inválido', fecha: true, explica: 'O número não existe ou é de outra pessoa. O contato sai da lista.' },
]

/** O que cada coluna e cada botão do plano faz (para quem usa o app pela primeira vez). */
export const AJUDA = {
  contato: 'A pessoa a retomar. Embaixo do nome aparece o último passo que a equipe já deu com ela.',
  motivo: 'Por que a pessoa entrou no plano: pediu horário e não havia vaga, pediu e não marcou, ou cancelou e não remarcou. Embaixo, a especialidade.',
  quando: 'Quando a pessoa pediu horário (ou cancelou) pela última vez. Quanto mais recente, maior a chance de marcar.',
  resultado: 'Depois de falar com a pessoa, escolha o que aconteceu. Se ela marcar pelo WhatsApp ou pela agenda, aparece “Marcou” sozinho.',
  acoes: 'Abra a conversa para ler o que a pessoa pediu, envie um modelo de mensagem ou use o menu ⋯ para etiqueta, funil e o perfil do contato.',
  selecao: 'Marque a caixinha dos contatos para agir em vários de uma vez. Sem nenhum marcado, as ações valem para todos os que ainda estão em aberto.',
  tag: 'Põe uma etiqueta nos contatos. Serve para achar essas pessoas depois em Contatos.',
  pipeline: 'Cria um negócio no funil para cada contato, na etapa que você escolher. Quem já tem negócio aberto nesse funil não é duplicado.',
  campaign_draft: 'Prepara um disparo com estes contatos, em rascunho. Nada é enviado agora: você revisa o modelo e envia em Disparos.',
  modelo: 'Envia uma mensagem pronta e aprovada pelo WhatsApp. É o único jeito de escrever para quem não manda mensagem há mais de 24 h.',
  semConversa: 'Ainda não há conversa com esta pessoa. Envie um modelo para começar.',
  concluir: 'Encerra o plano. Quem ainda estiver sem resultado fica como “Não trabalhado”, e o gestor vê o resultado no painel.',
} as const

/** O que cada situação do plano quer dizer (o selo da lista). */
export const EXPLICA_A_SITUACAO: Record<SituacaoDoPlano | 'atrasado', string> = {
  enviado: 'Plano novo: ninguém da equipe mexeu nele ainda.',
  em_andamento: 'A equipe já começou a retomar os contatos.',
  concluido: 'A equipe concluiu o plano.',
  vencido: 'O prazo passou. Ainda dá para marcar resultados por alguns dias.',
  cancelado: 'O gestor da rede cancelou este plano.',
  atrasado: 'O prazo passou e ainda há contatos sem resultado.',
}

export const ROTULO_DA_SITUACAO: Record<SituacaoDoPlano, string> = {
  enviado: 'Novo',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  vencido: 'Vencido',
  cancelado: 'Cancelado',
}

/** "sexta, 13h", "amanhã, 12h", "hoje, 18h", "07/11, 9h". */
export function prazo(iso: string, agora = new Date()): string {
  const d = new Date(iso)
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })
  const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(d).replace(':00', 'h').replace(':', 'h') // "18h", "20h45": a hora sempre no mesmo formato
  const d0 = dia.format(d)
  if (d0 === dia.format(agora)) return `hoje, ${hora}`
  if (d0 === dia.format(new Date(agora.getTime() + 86_400_000))) return `amanhã, ${hora}`
  if (d > agora && d.getTime() - agora.getTime() < 6 * 86_400_000) {
    const semana = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long' }).format(d).replace('-feira', '')
    return `${semana}, ${hora}`
  }
  return `${d0.slice(8, 10)}/${d0.slice(5, 7)}, ${hora}`
}

/** "há 3 dias" — quando foi o último sinal da pessoa. */
export function haQuanto(iso: string | null, agora = new Date()): string {
  if (!iso) return '—'
  const h = Math.max(0, Math.floor((agora.getTime() - new Date(iso).getTime()) / 3_600_000))
  if (h < 1) return 'agora há pouco'
  if (h < 48) return `há ${h} h`
  return `há ${Math.floor(h / 24)} dias`
}

/**
 * "6 casos · 3 marcaram · 2 em aberto". No detalhe do plano, `paraRetomar` conta como a lista
 * (quem ainda pede trabalho, inclusive "Falou, sem marcar"): "6 casos · 3 marcaram · 2 para retomar".
 */
export function fraseDoProgresso(p: ProgressoDoPlano, paraRetomar?: number): string {
  const marcaram = p.booked + p.bookedReported
  const caso = (n: number) => `${n} ${n === 1 ? 'caso' : 'casos'}`
  const resta = paraRetomar !== undefined
    ? (paraRetomar ? `${paraRetomar} para retomar` : 'nenhum para retomar')
    : (p.open ? `${p.open} em aberto` : 'todos com resultado')
  return [caso(p.total), marcaram ? `${marcaram} ${marcaram === 1 ? 'marcou' : 'marcaram'}` : null, resta].filter(Boolean).join(' · ')
}

/** O item ainda pede trabalho da equipe? (sem desfecho, caso aberto, neste plano) */
export const pedeTrabalho = (i: Pick<ItemDoPlano, 'outcome' | 'caseStatus' | 'movedToOtherPlan' | 'contactDeleted'>) =>
  (!i.outcome || i.outcome === 'contato_sem_agendamento') && i.caseStatus === 'aberto' && !i.movedToOtherPlan && !i.contactDeleted

/** A frase do resultado de uma ação em lote. */
export function fraseDaAcao(kind: 'tag' | 'pipeline' | 'campaign_draft', done: number, skipped: number, details?: Record<string, number>): string {
  if (kind === 'tag') return `Etiqueta posta em ${done} ${done === 1 ? 'contato' : 'contatos'}.`
  if (kind === 'pipeline') {
    const ja = details?.alreadyOpen ?? 0
    return `${done} ${done === 1 ? 'negócio criado' : 'negócios criados'} no funil${ja ? ` · ${ja} já ${ja === 1 ? 'tinha' : 'tinham'} negócio aberto` : ''}.`
  }
  return `Disparo criado em rascunho com ${done} ${done === 1 ? 'contato' : 'contatos'}${skipped ? ` (${skipped} pediram para não receber)` : ''}. Revise o modelo e envie em Disparos.`
}

export function motivoDoErro(codigo: string | null): string {
  switch (codigo) {
    case 'case_moved': return 'Este caso está agora em outro plano.'
    case 'version_conflict': return 'O caso mudou enquanto você marcava. A lista foi atualizada.'
    case 'plan_not_editable': return 'Este plano já terminou.'
    case 'action_unavailable': return 'Esta ação não está disponível para este plano agora.'
    default: return 'Não deu para salvar agora. Tente de novo em instantes.'
  }
}

// ── o histórico ──────────────────────────────────────────────────────────────

const aspas = (t: string) => `“${t}”`
const juntar = (partes: string[]) => (partes.length <= 1 ? partes.join('') : `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`)
const nContatos = (n: number) => `${n} ${n === 1 ? 'contato' : 'contatos'}`
const rotuloDo = (d: unknown) => (typeof d === 'string' && d in ROTULO_DO_DESFECHO ? ROTULO_DO_DESFECHO[d as Desfecho] : 'outro resultado')

/** "06/11 às 21h40" (no fuso da clínica). */
export function quandoExato(iso: string): string {
  const d = new Date(iso)
  const dia = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' }).format(d)
  const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(d).replace(':00', 'h').replace(':', 'h')
  return `${dia} às ${hora}`
}

/** O dia do passo, para agrupar: "Hoje", "Ontem" ou "04/11". */
export function diaDoPasso(iso: string, agora = new Date()): string {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })
  const d = f.format(new Date(iso))
  if (d === f.format(agora)) return 'Hoje'
  if (d === f.format(new Date(agora.getTime() - 86_400_000))) return 'Ontem'
  return `${d.slice(8, 10)}/${d.slice(5, 7)}`
}

/** O passo do histórico numa frase, como a equipe fala. */
export function fraseDoHistorico(e: EventoDoHistorico): string {
  const quem = e.actor.type === 'manager' ? 'O gestor da rede' : e.actor.type === 'system' ? 'O sistema' : e.actor.name ?? 'Alguém da equipe'
  const nome = e.contact ? (e.contact.deleted ? '(contato excluído)' : e.contact.name || 'Sem nome') : null
  const d = e.detail ?? {}
  const alvo = nome ?? nContatos(e.itemCount)
  switch (e.kind) {
    case 'received': return 'O gestor da rede mandou este plano para a unidade.'
    case 'outcome': return `${quem} marcou ${alvo} como ${aspas(rotuloDo(d.outcome))}${d.previous ? ` (antes: ${aspas(rotuloDo(d.previous))})` : ''}.`
    case 'auto_booked': return `${alvo} marcou consulta${d.outcome === 'agendou_outra_unidade' ? ' em outra unidade da rede' : ''}. A agenda confirmou sozinha.`
    case 'template': return `${quem} enviou o modelo ${aspas(String(d.template ?? 'de mensagem'))} para ${alvo}.`
    case 'tag': {
      const tags = Array.isArray(d.tags) ? (d.tags as string[]) : []
      return `${quem} pôs ${tags.length > 1 ? 'as etiquetas' : 'a etiqueta'} ${tags.length ? juntar(tags.map(aspas)) : ''} em ${alvo}.`.replace('  ', ' ')
    }
    case 'pipeline': {
      const ja = Number(d.alreadyOpen ?? 0)
      const onde = `${d.pipeline ? ` ${aspas(String(d.pipeline))}` : ''}${d.stage ? `, etapa ${aspas(String(d.stage))}` : ''}`
      return `${quem} pôs ${alvo} no funil${onde}.${ja ? ` ${ja} já ${ja === 1 ? 'tinha' : 'tinham'} negócio aberto.` : ''}`
    }
    case 'campaign_draft': return `${quem} criou o disparo em rascunho${d.campaign ? ` ${aspas(String(d.campaign))}` : ''} com ${nContatos(e.itemCount)}.`
    case 'conclude': {
      const n = Number(d.notWorked ?? 0)
      return `${quem} concluiu o plano.${n ? ` ${nContatos(n)} sem resultado ${n === 1 ? 'ficou' : 'ficaram'} como “Não trabalhado”.` : ''}`
    }
    case 'edit': {
      const campos = Array.isArray(d.fields) ? (d.fields as string[]) : []
      const partes = campos.map((c) => (c === 'dueAt' && typeof d.dueAt === 'string' ? `o prazo para ${quandoExato(d.dueAt)}` : c === 'orientation' ? 'a orientação' : c === 'title' ? 'o título' : null)).filter((x): x is string => !!x)
      return `O gestor da rede mudou ${partes.length ? juntar(partes) : 'o plano'}.`
    }
    case 'extend': return `O gestor da rede prorrogou o prazo${typeof d.dueAt === 'string' ? ` para ${quandoExato(d.dueAt)}` : ''}.`
    case 'cancel': return 'O gestor da rede cancelou o plano.'
    case 'expire': return 'O prazo do plano venceu.'
  }
}

/** O último passo com o contato, curto, para a linha: "Modelo enviado · há 2 h · Ana". */
export function fraseDoUltimoPasso(u: UltimoPasso, agora = new Date()): string {
  const d = u.detail ?? {}
  const oQue =
    u.kind === 'outcome' ? `Marcado ${aspas(rotuloDo(d.outcome))}`
      : u.kind === 'template' ? 'Modelo enviado'
        : u.kind === 'tag' ? 'Etiqueta posta'
          : u.kind === 'pipeline' ? 'Posto no funil'
            : u.kind === 'campaign_draft' ? 'No disparo em rascunho'
              : 'Atualizado'
  return [oQue, haQuanto(u.at, agora), u.actorName].filter(Boolean).join(' · ')
}

/** A ação que o gestor sugeriu, em português (07/11). */
export function fraseDaSugestao(a: { kind: 'template' | 'tag' | 'pipeline'; label: string }): string {
  return a.kind === 'template' ? `enviar o modelo “${a.label}”` : a.kind === 'tag' ? `pôr a etiqueta “${a.label}”` : `levar ao funil “${a.label}”`
}

/** A meta do plano: quantos devem marcar e quantos já marcaram. */
export function fraseDaMetaDoPlano(meta: number | null | undefined, p: { booked: number; bookedReported: number }): string | null {
  if (!meta) return null
  const ja = p.booked + p.bookedReported
  return ja >= meta ? `Meta batida: ${ja} de ${meta} marcaram` : `Meta do gestor: ${meta} ${meta === 1 ? 'marcar' : 'marcarem'} · ${ja} até agora · faltam ${meta - ja}`
}
