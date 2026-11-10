import { describe, it, expect, beforeEach } from 'vitest'
import { contradicoes, ferramentasNovas, marcarFerramentasVistas } from './ferramentasNoTexto'

const AGENDA = [
  { name: 'buscar_horarios', description: 'Consulta os horários livres na agenda.' },
  { name: 'agendar_consulta', description: 'Marca a consulta no sistema da clínica.' },
]

const TEXTO = [
  '## Quem você é',
  'Você é a Bia, da recepção. Não consigo agendar pelo chat, então peça os dados.',
  '',
  '## Como conduzir a conversa',
  '1. Se for urgência, oriente o paciente a aguardar a confirmação do horário pela equipe.',
  '2. Quem confirma a consulta é a equipe.',
  '3. Não posso informar preços.',
  '',
  '## Regras deste negócio',
  '- O paciente pode remarcar ou cancelar pelo WhatsApp? Não, só com a equipe',
].join('\n')

describe('contradicoes', () => {
  it('aponta os trechos de limitação sobre agenda quando há ferramenta de agenda', () => {
    const c = contradicoes(TEXTO, AGENDA)
    expect(c.map((x) => x.trecho)).toEqual([
      'Não consigo agendar pelo chat, então peça os dados.',
      'Se for urgência, oriente o paciente a aguardar a confirmação do horário pela equipe.',
      'Quem confirma a consulta é a equipe.',
    ])
    expect(c[0].ferramentas).toEqual(['buscar_horarios', 'agendar_consulta'])
  })

  it('não mexe nas "Regras deste negócio" (decisão do dono) nem em assunto sem ferramenta', () => {
    const c = contradicoes(TEXTO, AGENDA)
    expect(c.some((x) => x.trecho.includes('remarcar'))).toBe(false)
    expect(c.some((x) => x.trecho.includes('preços'))).toBe(false)
  })

  // Serra Med, 23/10: a regra da resposta ao lembrete cita a fala do paciente entre aspas.
  it('a fala do paciente entre aspas não é limitação do agente', () => {
    const texto = [
      '## Resposta ao lembrete',
      '- "Não vou", "não posso" (ou a opção de remarcar ou cancelar): pergunte se prefere remarcar ou cancelar.',
      '- Se o paciente disser “não posso ir amanhã”, ofereça remarcar a consulta.',
      '- Quando ele escrever ‘não consigo ir’, pergunte se quer remarcar.',
    ].join('\n')
    expect(contradicoes(texto, AGENDA)).toEqual([])
  })

  it('a frase que o texto manda o AGENTE dizer continua apontada', () => {
    const c = contradicoes('Responda: "Não consigo agendar pelo chat, a equipe confirma o horário."', AGENDA)
    expect(c.map((x) => x.trecho)).toEqual(['Responda: "Não consigo agendar pelo chat, a equipe confirma o horário."'])
  })

  it('a limitação fora das aspas continua apontada, mesmo com aspas na frase', () => {
    const c = contradicoes('Não consigo agendar pelo chat quando o paciente diz "urgente".', AGENDA)
    expect(c).toHaveLength(1)
  })

  it('sem ferramenta própria (só base e transferência), nada a apontar', () => {
    expect(contradicoes(TEXTO, [{ name: 'search_knowledge_base', description: 'Busca na base.' }, { name: 'transferir_para_humano' }])).toEqual([])
    expect(contradicoes(TEXTO, [{ name: 'emitir_boleto', description: 'Gera boleto de pagamento.' }])).toEqual([])
  })
})

describe('ferramentasNovas', () => {
  beforeEach(() => localStorage.clear())

  it('primeira visita não chama nada de novo; depois, só o que apareceu', () => {
    expect(ferramentasNovas('a1', ['search_knowledge_base', 'buscar_horarios'])).toEqual({ novas: [], primeiraVez: true })
    marcarFerramentasVistas('a1', ['search_knowledge_base', 'buscar_horarios'])
    expect(ferramentasNovas('a1', ['search_knowledge_base', 'buscar_horarios'])).toEqual({ novas: [], primeiraVez: false })
    expect(ferramentasNovas('a1', ['buscar_horarios', 'agendar_consulta', 'transferir_para_humano'])).toEqual({ novas: ['agendar_consulta'], primeiraVez: false })
  })
})
