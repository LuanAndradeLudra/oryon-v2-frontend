import type { SegmentoDaReceita } from './tipos'
import { normalizar } from './padroes'

/**
 * ORY-60 (17/11) — sugestões por segmento para os campos de texto livre. A jornada
 * serve a qualquer negócio: o texto continua LIVRE (a pessoa escreve o que quiser) e as
 * sugestões só ajudam a começar. Tocar numa sugestão põe a frase no texto; tocar de novo
 * tira. As de "Qualquer negócio" aparecem sempre; as do segmento escolhido (que começa
 * pelo segmento da empresa) aparecem junto. Os segmentos são os da Oryon (os mesmos da
 * galeria de receitas e da landing). São só textos de ajuda: não viram código no contrato.
 */

export const SEGMENTOS: { id: SegmentoDaReceita; rotulo: string }[] = [
  { id: 'geral', rotulo: 'Qualquer negócio' },
  { id: 'clinica', rotulo: 'Clínica' },
  { id: 'imobiliaria', rotulo: 'Imobiliária' },
  { id: 'loja', rotulo: 'Loja' },
  { id: 'contabilidade', rotulo: 'Contabilidade' },
  { id: 'juridico', rotulo: 'Jurídico' },
]

export type GrupoDeSugestao = 'missao_objetivo' | 'missao_orientacoes' | 'nota_agente' | 'dados_extrair'

type Frases = Partial<Record<SegmentoDaReceita, string[]>>

const SUGESTOES: Record<GrupoDeSugestao, Frases> = {
  // "Missão personalizada": o que o agente deve fazer.
  missao_objetivo: {
    geral: [
      'Pergunte se a pessoa ainda tem interesse e tire as dúvidas dela.',
      'Peça uma nota de 0 a 10 para o atendimento e agradeça.',
      'Confirme o e-mail e o melhor horário para falar com a pessoa.',
      'Explique os próximos passos e pergunte se ficou alguma dúvida.',
    ],
    clinica: [
      'Lembre o preparo e confirme que a pessoa entendeu.',
      'Ofereça marcar o retorno indicado no último atendimento.',
    ],
    imobiliaria: [
      'Pergunte se a pessoa quer marcar uma visita ao imóvel.',
      'Descubra se ela quer comprar ou alugar, o bairro e a faixa de preço.',
      'Ofereça imóveis parecidos com o que ela viu.',
    ],
    loja: [
      'Confirme o endereço de entrega do pedido.',
      'Ajude com troca ou devolução, seguindo a política da loja.',
      'Lembre os produtos que ficaram no carrinho e tire as dúvidas.',
    ],
    contabilidade: [
      'Peça os documentos do mês que ainda faltam.',
      'Lembre o vencimento da guia e pergunte se já foi paga.',
    ],
    juridico: [
      'Peça os documentos que faltam para o caso.',
      'Conte o andamento do caso, sem dar parecer.',
    ],
  },
  // Orientações a mais para qualquer missão (o que fazer e o que não fazer).
  missao_orientacoes: {
    geral: [
      'Fale de um jeito simples e curto.',
      'Chame a pessoa pelo primeiro nome.',
      'Não prometa prazos que não estejam no sistema.',
      'Se a pessoa pedir, passe para a equipe na hora.',
    ],
    clinica: ['Não dê orientação de saúde: passe para a equipe.'],
    imobiliaria: ['Não negocie o valor do imóvel: passe para o corretor.'],
    loja: ['Não ofereça frete grátis nem cupom.'],
    contabilidade: ['Não dê orientação fiscal: passe para o contador.'],
    juridico: ['Não dê parecer jurídico: passe para o advogado.'],
  },
  // "Entregar ao agente": algo a mais que ele deve saber.
  nota_agente: {
    geral: [
      'Ajude a pessoa a resolver o que pediu.',
      'Se a pessoa já tentou antes, ofereça falar com a equipe.',
      'Tente resolver ainda hoje.',
    ],
    clinica: ['Se a dúvida for sobre um resultado, passe para a equipe.'],
    imobiliaria: ['Se ela quiser visitar, ofereça os horários do corretor.'],
    loja: ['Se for sobre um pedido, peça o número do pedido.'],
    contabilidade: ['Se faltar documento, diga quais faltam.'],
    juridico: ['Dúvida sobre o caso vai para o advogado.'],
  },
  // "Extrair dados": dados que costumam valer a pena.
  dados_extrair: {
    geral: ['interesse', 'prazo', 'orçamento', 'melhor horário', 'cidade'],
    clinica: ['convênio', 'especialidade'],
    imobiliaria: ['bairro', 'faixa de preço', 'compra ou aluguel', 'quartos'],
    loja: ['número do pedido', 'produto'],
    contabilidade: ['mês de referência', 'tipo de documento'],
    juridico: ['área do caso', 'número do processo'],
  },
}

/** As frases de um grupo: as de qualquer negócio e as do segmento escolhido. */
export function sugestoesPara(grupo: GrupoDeSugestao, segmento: SegmentoDaReceita): string[] {
  const g = SUGESTOES[grupo]
  return [...(segmento !== 'geral' ? g[segmento] ?? [] : []), ...(g.geral ?? [])]
}

const linhas = (texto: string) => texto.split('\n').map((l) => l.trim()).filter(Boolean)

/** A frase já está no texto (numa linha dele, sem diferença de maiúsculas e acentos)? */
export function temFrase(texto: string, frase: string): boolean {
  const alvo = normalizar(frase)
  return linhas(texto).some((l) => normalizar(l) === alvo)
}

/** Põe a frase numa linha nova do texto, ou tira, se já estiver lá. O resto do texto fica como está. */
export function alternarFrase(texto: string, frase: string): string {
  if (temFrase(texto, frase)) {
    const alvo = normalizar(frase)
    return texto.split('\n').filter((l) => normalizar(l.trim()) !== alvo).join('\n').replace(/\n{3,}/g, '\n\n').trim()
  }
  return texto.trim() ? `${texto.trimEnd()}\n${frase}` : frase
}
