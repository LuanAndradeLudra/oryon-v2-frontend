import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { getApiErrorMessage } from '@/lib/utils'
import { aoSairDaSessao } from '@/lib/limpezaDaSessao'
import { showToast } from '@/hooks/useToast'
import { supportApi } from '@/services/supportApi'
import type { Message } from '@/types'
import type { ChamadoDaEmpresa, ResumoDoChamado } from '@/types/support'
import {
  ALCANCES, TIPOS_DE_PEDIDO,
  type Alcance, type Categoria, type ContatoViu, type ContextoTecnico, type Contornou, type DesdeQuando, type EntradaDoChamado,
  type ImpedeAgora, type JaCorrigiram, type ModeloDoFormulario, type OrigemDoProblema, type QuemMais, type TipoDePedido,
} from './supportModel'
import { resumoDasMarcadas } from './origemDaMensagem'
import type { ConversaAfetada } from './ConversasAfetadas'
import { capturarContextoTecnico } from './contextoTecnico'
import { atividadeRecente } from '@/lib/atividadeRecente'
import type { SobreOChamado } from './marcacaoDoChamado'

export const MIN_RELATO = 10
/** Mesmo teto do backend (anexos por chamado). */
export const MAX_ANEXOS = 10
/** Espelho de `LIMITE_DO_ANEXO` e `MIMES_DO_ANEXO` (backend, support-anexos.service.ts): avisa antes de subir; quem decide é o backend, pelos bytes. */
export const LIMITE_DO_ANEXO = 10 * 1024 * 1024
export const TIPOS_DO_ANEXO = [
  'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'video/mp4', 'video/webm', 'video/quicktime', 'text/plain', 'text/csv',
]
/** O Windows manda CSV como planilha do Excel; o backend aceita pelo nome. */
function tipoAceito(f: File): boolean {
  return TIPOS_DO_ANEXO.includes(f.type) || (f.type === 'application/vnd.ms-excel' && /\.csv$/i.test(f.name))
}

/**
 * O modelo tem os campos da EMPRESA, que a gestão muda quando quer (revisão do
 * Portão 2): mostra na hora o último que veio e busca de novo a cada abertura.
 * Sai no logout.
 */
let ultimoModelo: ModeloDoFormulario | null = null
aoSairDaSessao(() => { ultimoModelo = null })
function useModelo(open: boolean) {
  const [modelo, setModelo] = useState<ModeloDoFormulario | null>(ultimoModelo)
  useEffect(() => {
    if (!open) return
    let vivo = true
    supportApi.modelo()
      .then((m) => { ultimoModelo = m; if (vivo) setModelo(m) })
      .catch(() => { /* fica o último modelo; sem nenhum, o formulário segue com o neutro */ })
    return () => { vivo = false }
  }, [open])
  return modelo
}

/**
 * RASCUNHO do relato POR conversa (revisão do Portão 2): trocar de conversa com
 * o painel aberto não perde o que foi escrito — ao reabrir o chamado naquela
 * conversa, volta. Só o que a pessoa escreveu ou escolheu (e os anexos já
 * enviados); a marcação das mensagens recomeça. Sai ao enviar, ao descartar e no logout.
 */
interface RascunhoDoRelato {
  origemEscolhida: OrigemDoProblema | null
  relato: string
  esperado: string
  alcance: Alcance
  desde: DesdeQuando | null
  dadosDeTerceiros: boolean
  assuntoEscolhido: { origem: OrigemDoProblema; id: string } | null
  campos: Record<string, string>
  anexos: AnexoDoFormulario[]
  afetadas: ConversaAfetada[]
  contatoViu: ContatoViu | null
  jaCorrigiram: JaCorrigiram | null
}
const rascunhosDoRelato = new Map<string, RascunhoDoRelato>()
aoSairDaSessao(() => rascunhosDoRelato.clear())

export const TITULO: Record<OrigemDoProblema, string> = {
  ia: 'Reportar resposta da IA',
  automacao: 'Reportar automação',
  regra: 'Reportar resposta automática',
  equipe: 'Reportar problema na mensagem',
  contato: 'Reportar problema na mensagem',
  conversa: 'Reportar problema na conversa',
  plataforma: 'Falar com o suporte',
}
/** Categoria quando quem reporta não escolhe assunto. */
const CATEGORIA_PADRAO: Record<OrigemDoProblema, Categoria> = {
  ia: 'wrong_info', automacao: 'wrong_action', regra: 'wrong_action', equipe: 'delivery', contato: 'delivery', conversa: 'no_response', plataforma: 'platform',
}

export interface PropsDoFormulario {
  /** Monte o formulário a cada abertura (o estado nasce vazio); `open` só liga as buscas. */
  open: boolean
  onClose: () => void
  /** `null`: chamado sem conversa (página Suporte, menu do usuário). */
  conversationId: string | null
  contatoNome: string | null
  /** Vazio com conversa = problema na conversa como um todo. */
  mensagens: readonly Message[]
  /** Todas as mensagens carregadas da conversa (fatos da conversa inteira). */
  todasAsMensagens?: readonly Message[]
  onCriado: (c: ChamadoDaEmpresa, novo: boolean) => void
  /** Sem conversa: área do produto em que a pessoa estava (pré-preenche "Onde aconteceu?"). */
  telaInicial?: string | null
  /** Só no painel: escolha explícita entre mensagens marcadas e a conversa inteira. */
  sobre?: SobreOChamado
  onSobre?: (v: SobreOChamado) => void
  /** Por onde o chamado sem conversa entrou (página Suporte ou menu do usuário). */
  entrada?: EntradaDoChamado
  /** Leva ao chamado (página Suporte): vira a ação "Ver chamado" do aviso de criado. */
  verChamado?: (id: string) => void
}

/** Campos que cada tipo de pedido (sem conversa) pergunta. */
export const CAMPOS_DO_TIPO: Record<TipoDePedido, { onde: boolean; desde: boolean; fatos: boolean; terceiros: boolean; complemento: 'antes' | 'depois' | null }> = {
  defeito: { onde: true, desde: true, fatos: true, terceiros: true, complemento: 'antes' },
  lentidao: { onde: true, desde: true, fatos: true, terceiros: false, complemento: null },
  duvida: { onde: true, desde: false, fatos: false, terceiros: false, complemento: null },
  sugestao: { onde: false, desde: false, fatos: false, terceiros: false, complemento: 'depois' },
  cobranca: { onde: false, desde: false, fatos: false, terceiros: false, complemento: null },
}

/** Anexo no formulário: sobe na hora (provisório por 24 h no backend); o id vai na criação. */
export interface AnexoDoFormulario {
  chave: string
  nome: string
  estado: 'enviando' | 'pronto' | 'erro'
  id?: string
  erro?: string
}

const SEM_PARECIDOS: ResumoDoChamado[] = []

/** Nome legível para o print colado (o navegador chama todo print de "image.png"). */
function nomeDoArquivo(f: File, i: number): string {
  return f.name && f.name !== 'image.png' ? f.name : `print-${new Date().toLocaleTimeString('pt-BR').replace(/:/g, '')}-${i + 1}.png`
}

/**
 * ESTADO E REGRAS do formulário de chamado (painel ao lado do chat no
 * computador, tela cheia no celular, modal sem conversa).
 *
 * O formulário MONTA A CADA ABERTURA (o painel só existe aberto; o modal da
 * SCRUM-1382 também deve ser montado só quando abre): o estado nasce vazio,
 * sem efeito para zerar. As mensagens podem mudar com ele aberto (a marcação
 * continua no chat): o relato e as respostas ficam; a origem e o assunto são
 * DERIVADOS — vale a escolha da pessoa enquanto ela continuar possível.
 */
export function useFormularioDoChamado({ open, onClose, conversationId, mensagens, onCriado, telaInicial = null, sobre, entrada, verChamado }: PropsDoFormulario) {
  const { pathname, search } = useLocation()
  const modelo = useModelo(open)
  const resumo = useMemo(() => resumoDasMarcadas(mensagens), [mensagens])
  // Contato junto de IA/automação/regra/equipe é contexto, não o assunto.
  const candidatas = useMemo<OrigemDoProblema[]>(() => {
    if (!conversationId) return ['plataforma']
    if (!mensagens.length) return ['conversa']
    const semContato = resumo.presentes.filter((o) => o !== 'contato')
    return semContato.length ? semContato : resumo.presentes
  }, [resumo, conversationId, mensagens.length])

  // O rascunho desta conversa, se a pessoa saiu dela no meio do relato.
  const [inicial] = useState(() => (conversationId ? rascunhosDoRelato.get(conversationId) ?? null : null))
  const [origemEscolhida, setOrigem] = useState<OrigemDoProblema | null>(inicial?.origemEscolhida ?? null)
  const origem = origemEscolhida && candidatas.includes(origemEscolhida) ? origemEscolhida : candidatas[0]
  const [relato, setRelato] = useState(inicial?.relato ?? '')
  const [esperado, setEsperado] = useState(inicial?.esperado ?? '')
  const [alcance, setAlcance] = useState<Alcance>(inicial?.alcance ?? 'esta_conversa')
  const [desde, setDesde] = useState<DesdeQuando | null>(inicial?.desde ?? null)
  const [onde, setOnde] = useState<string>(telaInicial ?? '')
  const [dadosDeTerceiros, setDadosDeTerceiros] = useState(inicial?.dadosDeTerceiros ?? false)
  // O assunto vale para a origem em que foi escolhido: trocar a origem o descarta.
  const [assuntoEscolhido, setAssuntoEscolhido] = useState<{ origem: OrigemDoProblema; id: string } | null>(inicial?.assuntoEscolhido ?? null)
  const assuntoId = assuntoEscolhido?.origem === origem ? assuntoEscolhido.id : null
  const setAssuntoId = (id: string | null) => setAssuntoEscolhido(id ? { origem, id } : null)
  const [campos, setCampos] = useState<Record<string, string>>(inicial?.campos ?? {})
  // Anexos do rascunho com outra chave: não colidem com os que subirem agora.
  const [anexos, setAnexos] = useState<AnexoDoFormulario[]>(() => inicial?.anexos.map((a, i) => ({ ...a, chave: `r${i}` })) ?? [])
  const [afetadas, setAfetadas] = useState<ConversaAfetada[]>(inicial?.afetadas ?? [])
  const [juntarEm, setJuntarEm] = useState<ResumoDoChamado | null>(null)
  /** "É outro problema": some o aviso, e o backend não agrupa nem conta este relato. */
  const [ehOutro, setEhOutro] = useState(false)
  const [verContexto, setVerContexto] = useState(false)
  // Sem conversa: tipo do pedido (1ª pergunta), complemento e contexto técnico.
  const [tipo, setTipo] = useState<TipoDePedido | null>(null)
  // Fatos do impacto (nunca a gravidade): sem conversa e com conversa.
  const [contornou, setContornou] = useState<Contornou | null>(null)
  const [quemMais, setQuemMais] = useState<QuemMais | null>(null)
  const [impede, setImpede] = useState<ImpedeAgora[]>([])
  const [contatoViu, setContatoViu] = useState<ContatoViu | null>(inicial?.contatoViu ?? null)
  const [jaCorrigiram, setJaCorrigiram] = useState<JaCorrigiram | null>(inicial?.jaCorrigiram ?? null)
  const [complemento, setComplemento] = useState('')
  // O contexto técnico é o do momento em que o formulário abre (endereço sem `?…`).
  const [contexto] = useState<ContextoTecnico | null>(() => (conversationId ? null : capturarContextoTecnico(`${pathname}${search}`, telaInicial)))
  // SCRUM-1390: as falhas e os erros dos últimos 15 min, como estavam ao abrir (o que a pessoa vê é o que vai).
  const [recentes] = useState(() => (conversationId ? null : atividadeRecente()))
  const [incluirRecentes, setIncluirRecentes] = useState(true)
  const temRecentes = !!recentes && (recentes.falhas.length > 0 || recentes.erros.length > 0)
  const [enviando, setEnviando] = useState(false)
  const contadorDeAnexos = useRef(0)

  // Algo que se perderia ao fechar: o painel pede confirmação, e a conversa guarda o rascunho.
  const temConteudo = !!(relato.trim() || esperado.trim() || complemento.trim() || anexos.length || afetadas.length
    || contatoViu || jaCorrigiram || Object.values(campos).some((v) => v.trim()))
  // Enviado ou descartado: o rascunho não volta.
  const encerrado = useRef(false)
  useEffect(() => {
    if (!conversationId || encerrado.current) return
    if (!temConteudo) { rascunhosDoRelato.delete(conversationId); return }
    rascunhosDoRelato.set(conversationId, {
      origemEscolhida, relato, esperado, alcance, desde, dadosDeTerceiros, assuntoEscolhido, campos,
      anexos: anexos.filter((a) => a.estado === 'pronto'), afetadas, contatoViu, jaCorrigiram,
    })
  }, [conversationId, temConteudo, origemEscolhida, relato, esperado, alcance, desde, dadosDeTerceiros, assuntoEscolhido, campos, anexos, afetadas, contatoViu, jaCorrigiram])
  const descartar = () => {
    encerrado.current = true
    if (conversationId) rascunhosDoRelato.delete(conversationId)
  }

  const nomeDaOrigem = (origem === 'automacao' || origem === 'regra') ? [...(resumo.porOrigem.get(origem)?.nomes ?? [])][0] ?? null : null

  // Aviso de repetido: o backend decide o que é o MESMO problema (SCRUM-1379).
  // A resposta guarda a CONSULTA que a trouxe: mudou a origem, o tipo ou a
  // tela, o aviso antigo some na hora e o novo chega pela resposta.
  const semConversa = origem === 'plataforma'
  const consultaDosParecidos = useMemo(() => {
    if (!open || (semConversa && (!tipo || !onde))) return null
    return semConversa ? { tipoDePedido: tipo, ondeAconteceu: onde } : { conversationId, origemDoProblema: origem, origemNome: nomeDaOrigem }
  }, [open, semConversa, tipo, onde, conversationId, origem, nomeDaOrigem])
  const [respostaDosParecidos, setRespostaDosParecidos] = useState<{ consulta: object; lista: ResumoDoChamado[] } | null>(null)
  useEffect(() => {
    if (!consultaDosParecidos) return
    let vivo = true
    const t = setTimeout(() => {
      supportApi.parecidos(consultaDosParecidos)
        .then((lista) => { if (vivo) setRespostaDosParecidos({ consulta: consultaDosParecidos, lista }) })
        .catch(() => { /* sem aviso: abrir continua possível */ })
    }, 200)
    return () => { vivo = false; clearTimeout(t) }
  }, [consultaDosParecidos])
  const parecidos = respostaDosParecidos && respostaDosParecidos.consulta === consultaDosParecidos ? respostaDosParecidos.lista : SEM_PARECIDOS

  const assuntos = modelo?.assuntos[origem] ?? []
  const perguntaEsperado = modelo?.esperado[origem] ?? null
  const perguntaDesde = semConversa || alcance !== 'esta_conversa'
  const perguntaAfetadas = !semConversa && alcance !== 'esta_conversa'
  const duplicado = !ehOutro && !juntarEm && parecidos[0]
    ? {
      c: parecidos[0],
      motivo: parecidos[0].conversationId && parecidos[0].conversationId === conversationId ? 'nesta conversa'
        : nomeDaOrigem ? `sobre “${nomeDaOrigem}”` : onde ? `em ${onde}` : 'sobre o mesmo problema',
    }
    : null
  // "Adicionar" leva as mensagens DESTA conversa: só junta num chamado da mesma
  // conversa (o backend recusa mensagem de outra). De outra conversa, "Ver".
  const podeJuntar = !!duplicado && (duplicado.c.conversationId ?? null) === (conversationId ?? null)
  const camposFaltando = (modelo?.camposDaEmpresa ?? []).some((c) => c.obrigatorio && !campos[c.id]?.trim())
  // Painel em "Mensagens" sem nenhuma marcada: falta escolher no chat.
  const aguardandoMarcacao = sobre === 'mensagens' && !!conversationId && mensagens.length === 0
  const camposDoTipo = semConversa && tipo ? CAMPOS_DO_TIPO[tipo] : null
  const anexosEnviando = anexos.some((a) => a.estado === 'enviando')
  // Obrigatórios são FATOS: sem conversa, o tipo e (defeito/lentidão) se contornou e com quem acontece;
  // com conversa, se o contato viu e (se viu) se já corrigiram.
  const perguntaCorrigiram = !!contatoViu && contatoViu !== 'nao_viu'
  const pronto = !aguardandoMarcacao && !anexosEnviando && (juntarEm ? relato.trim().length >= MIN_RELATO
    : semConversa ? !!tipo && relato.trim().length >= MIN_RELATO && (!camposDoTipo?.fatos || (!!contornou && !!quemMais)) && !camposFaltando
    : relato.trim().length >= MIN_RELATO && !!contatoViu && (!perguntaCorrigiram || !!jaCorrigiram) && !camposFaltando)

  /** Sobe cada arquivo na hora: o tipo é conferido pelos bytes no backend, e o erro aparece no próprio anexo. */
  const anexar = (arquivos: File[]) => {
    const vagas = MAX_ANEXOS - anexos.length
    if (vagas <= 0) { showToast(`Até ${MAX_ANEXOS} anexos por chamado.`, 'error'); return }
    for (const [i, arquivo] of arquivos.slice(0, vagas).entries()) {
      const chave = `a${++contadorDeAnexos.current}`
      const nome = nomeDoArquivo(arquivo, i)
      const recusa = !tipoAceito(arquivo) ? 'Tipo de arquivo não aceito (imagem, PDF, vídeo, TXT ou CSV).'
        : arquivo.size > LIMITE_DO_ANEXO ? 'Maior que 10 MB.' : null
      if (recusa) { setAnexos((l) => [...l, { chave, nome, estado: 'erro', erro: recusa }]); continue }
      setAnexos((l) => [...l, { chave, nome, estado: 'enviando' }])
      supportApi.enviarAnexo(arquivo)
        .then((r) => setAnexos((l) => l.map((a) => (a.chave === chave ? { ...a, estado: 'pronto', id: r.id, nome: r.nome } : a))))
        .catch((err) => setAnexos((l) => l.map((a) => (a.chave === chave ? { ...a, estado: 'erro', erro: getApiErrorMessage(err, 'Não foi possível enviar o arquivo.') } : a))))
    }
    if (arquivos.length > vagas) showToast(`Até ${MAX_ANEXOS} anexos por chamado: ${arquivos.length - vagas} ficaram de fora.`, 'error')
  }
  const removerAnexo = (chave: string) => setAnexos((l) => l.filter((a) => a.chave !== chave))
  const colar = (e: ClipboardEvent) => {
    const arquivos = [...e.clipboardData.files]
    if (arquivos.length) { e.preventDefault(); anexar(arquivos) }
  }
  const soltar = (e: DragEvent) => {
    if (!e.dataTransfer.files.length) return
    e.preventDefault(); anexar([...e.dataTransfer.files])
  }

  const acaoVerChamado = (id: string) => (verChamado ? { label: 'Ver chamado', onClick: () => verChamado(id) } : undefined)

  const enviar = async () => {
    if (!pronto) return
    setEnviando(true)
    try {
      if (juntarEm) {
        const c = await supportApi.adicionar(juntarEm.id, { messageIds: mensagens.map((m) => m.id), descricao: relato.trim() })
        descartar()
        onCriado(c, false)
        onClose()
        showToast(`Adicionado ao ${c.numero}. A equipe Oryon já foi avisada.`, 'success', acaoVerChamado(c.id), 6000)
        return
      }
      const assunto = assuntos.find((a) => a.id === assuntoId)
      const c = await supportApi.criar({
        origemDoProblema: origem, origemNome: nomeDaOrigem,
        categoria: semConversa && tipo ? TIPOS_DE_PEDIDO[tipo].categoria : assunto?.categoria ?? CATEGORIA_PADRAO[origem],
        assuntoId: semConversa ? null : assunto?.id ?? null,
        // O impacto, o backend deriva dos fatos; o alcance vai como a pessoa informou.
        alcance: semConversa ? undefined : alcance,
        desdeQuando: semConversa ? (camposDoTipo?.desde ? desde : null) : perguntaDesde ? desde : null,
        ondeAconteceu: semConversa && camposDoTipo?.onde ? (onde || null) : null,
        dadosDeTerceiros: semConversa ? !!camposDoTipo?.terceiros && dadosDeTerceiros : dadosDeTerceiros,
        conversationId, messageIds: mensagens.map((m) => m.id), descricao: relato.trim(),
        oQueSeriaCerto: perguntaEsperado && esperado.trim() ? esperado.trim() : undefined, camposExtras: campos,
        anexos: anexos.filter((a) => a.estado === 'pronto' && a.id).map((a) => a.id as string),
        conversasAfetadas: perguntaAfetadas ? afetadas : [],
        ehOutro: ehOutro || undefined,
        ...(semConversa ? {
          tipoDePedido: tipo,
          fatos: camposDoTipo?.fatos ? { contornou, quemMais, impede } : null,
          complemento: camposDoTipo?.complemento && complemento.trim() ? complemento.trim() : null,
          contextoTecnico: contexto && temRecentes && incluirRecentes ? { ...contexto, recentes: recentes! } : contexto,
          entrada: entrada ?? 'pagina_suporte',
        } : { entrada: 'conversa' as const, fatos: { contatoViu, jaCorrigiram: perguntaCorrigiram ? jaCorrigiram : null } }),
      })
      descartar()
      onCriado(c, true)
      onClose()
      showToast(`Chamado ${c.numero} aberto. A equipe Oryon responde por aqui.`, 'success', acaoVerChamado(c.id), 8000)
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Não foi possível enviar. Tente de novo.'), 'error')
    } finally {
      setEnviando(false)
    }
  }

  return {
    modelo, resumo, candidatas, nomeDaOrigem, semConversa, assuntos, perguntaEsperado, perguntaDesde, perguntaAfetadas, duplicado, pronto,
    aguardandoMarcacao, anexosEnviando, podeJuntar, temConteudo, descartar, rascunhoRecuperado: !!inicial,
    titulo: juntarEm ? `Adicionar ao ${juntarEm.numero}` : aguardandoMarcacao ? 'Reportar mensagens' : TITULO[origem],
    rotuloAlcance: (a: Alcance) => (semConversa ? ALCANCES[a].plataforma : ALCANCES[a].conversa),
    origem, setOrigem, relato, setRelato, esperado, setEsperado, alcance, setAlcance, desde, setDesde,
    onde, setOnde, dadosDeTerceiros, setDadosDeTerceiros, assuntoId, setAssuntoId, campos, setCampos, anexos, removerAnexo,
    afetadas, setAfetadas, juntarEm, setJuntarEm, ehOutro, setEhOutro, verContexto, setVerContexto, enviando,
    tipo, setTipo, complemento, setComplemento, contexto, camposDoTipo,
    recentes: temRecentes ? recentes : null, incluirRecentes, setIncluirRecentes,
    contornou, setContornou, quemMais, setQuemMais, impede, setImpede, contatoViu, setContatoViu, jaCorrigiram, setJaCorrigiram, perguntaCorrigiram,
    anexar, colar, soltar, enviar,
  }
}

export type FormularioDoChamado = ReturnType<typeof useFormularioDoChamado>
