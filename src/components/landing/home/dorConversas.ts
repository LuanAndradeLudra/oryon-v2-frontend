/**
 * As CONVERSAS da seção "dor e virada" — dados fictícios, como `simulacoes.ts`.
 *
 * Ficam fora de `landingCopy.ts` de propósito: a copy da landing não pode ter
 * número (regra P14, testada), e uma conversa de exemplo tem hora, valor e
 * contagem. Aqui é cena, não afirmação sobre o produto: o mesmo estatuto das
 * simulações por área ("Simulação com dados fictícios").
 *
 * `quem` segue o código de cor do produto: 'ia' = teal, 'pessoa' = âmbar.
 */
export type DorConversa = {
  /** Quando a mensagem chegou (carimbo, em mono). */
  quando: string
  /** A mensagem do cliente. */
  cliente: string
  /** O que aconteceu com ela sem a Oryon — vai riscado. */
  semResposta: string
  /** A resposta como fica com a Oryon. */
  resposta: string
  hora: string
  quem: 'ia' | 'pessoa'
  assinatura: string
}

export const DOR_CONVERSAS: Record<'horario' | 'repeticao' | 'organizacao', DorConversa> = {
  horario: {
    quando: 'Sábado · 22:47',
    cliente: 'Boa noite! Vocês têm horário na segunda de manhã?',
    semResposta: 'sem resposta até segunda, 09:12',
    resposta: 'Boa noite, Carla! Tenho 8h30 e 10h na segunda. Qual prefere?',
    hora: '22:47',
    quem: 'ia',
    assinatura: 'Agente IA',
  },
  repeticao: {
    quando: 'Terça, 11:03 · a 14ª vez hoje',
    cliente: 'Qual o valor da consulta? Aceitam cartão?',
    semResposta: 'respondida à mão, pela 14ª vez',
    resposta: 'R$ 220 no particular. Aceitamos cartão em até 3x e Pix. Quer que eu veja um horário?',
    hora: '11:03',
    quem: 'ia',
    assinatura: 'Agente IA',
  },
  organizacao: {
    quando: 'Quinta · 16:40',
    cliente: 'Oi, alguém ia me retornar sobre o orçamento…',
    semResposta: 'interessado há 6 dias · sem responsável',
    resposta: 'Oi, Paulo! Aqui é a Ana. Vi seu orçamento, te ligo em 5 minutos.',
    hora: '16:41',
    quem: 'pessoa',
    assinatura: 'Ana assumiu',
  },
}
