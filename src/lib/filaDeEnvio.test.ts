// SCRUM-1161 (PO 15/10): fila de envio do operador por conversa — um POST por
// vez, na ordem; uma falha segura as seguintes até tentar de novo/descartar.
import { describe, it, expect, vi, beforeAll } from 'vitest'
import { criarFilaDeEnvio, SEM_CONFIRMACAO } from './filaDeEnvio'
import type { Message, SendMessageDto } from '@/types'

beforeAll(() => {
  if (!URL.createObjectURL) URL.createObjectURL = () => 'blob:teste'
  if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {}
})

type Pendente = { dto: SendMessageDto; resolve: (m: Partial<Message>) => void; reject: (e: unknown) => void }

function montar() {
  const envios: Pendente[] = []
  const enviar = vi.fn((_c: string, dto: SendMessageDto) => new Promise<{ data: Message }>((res, rej) => {
    envios.push({ dto, resolve: (m) => res({ data: m as Message }), reject: rej })
  }))
  const fila = criarFilaDeEnvio(enviar)
  const eventos: string[] = []
  fila.assinar((e) => eventos.push(e.tipo === 'mudou' ? `mudou:${e.mensagem.body ?? e.mensagem.type}:${fila.estado(e.mensagem.id)}` : e.tipo))
  return { fila, envios, enviar, eventos }
}

const tick = () => new Promise((r) => setTimeout(r, 0))
const pdf = new File(['x'], 'exame.pdf', { type: 'application/pdf' })

describe('filaDeEnvio', () => {
  it('documento e depois texto: o texto só sai quando o documento termina', async () => {
    const { fila, envios } = montar()
    fila.enfileirar('c1', { file: pdf, body: 'Segue o resultado' })
    fila.enfileirar('c1', { body: 'Qualquer dúvida, me chame' })
    await tick()
    expect(envios.map((e) => e.dto.body)).toEqual(['Segue o resultado'])

    envios[0].resolve({ id: 'real-1', type: 'document' })
    await tick()
    expect(envios.map((e) => e.dto.body)).toEqual(['Segue o resultado', 'Qualquer dúvida, me chame'])
  })

  it('conversas diferentes não esperam uma pela outra', async () => {
    const { fila, envios } = montar()
    fila.enfileirar('c1', { body: 'a' })
    fila.enfileirar('c2', { body: 'b' })
    await tick()
    expect(envios.map((e) => e.dto.body)).toEqual(['a', 'b'])
  })

  it('falha: a seguinte fica retida; tentar de novo reenvia e libera a fila', async () => {
    const { fila, envios } = montar()
    const doc = fila.enfileirar('c1', { file: pdf, body: 'Segue' })
    const texto = fila.enfileirar('c1', { body: 'Dúvidas?' })
    await tick()
    envios[0].reject({ response: { data: { failedMessage: { errorTitle: 'Arquivo recusado pela Meta' } } } })
    await tick()

    expect(fila.estado(doc.id)).toBe('falhou')
    expect(fila.estado(texto.id)).toBe('retida')
    expect(fila.pendentes('c1')[0]).toMatchObject({ status: 'failed', errorTitle: 'Arquivo recusado pela Meta' })
    expect(envios).toHaveLength(1)

    fila.tentarDeNovo(doc.id)
    await tick()
    expect(envios).toHaveLength(2)
    expect(envios[1].dto.file).toBe(pdf) // o mesmo arquivo
    expect(fila.estado(texto.id)).toBe('na_fila')

    envios[1].resolve({ id: 'real-doc' })
    await tick()
    expect(envios[2].dto.body).toBe('Dúvidas?')
  })

  it('descartar a que falhou: some da fila e a seguinte é enviada', async () => {
    const { fila, envios, eventos } = montar()
    const doc = fila.enfileirar('c1', { file: pdf })
    fila.enfileirar('c1', { body: 'Dúvidas?' })
    await tick()
    envios[0].reject(new Error('rede'))
    await tick()

    fila.descartar(doc.id)
    await tick()
    expect(eventos).toContain('removido')
    expect(fila.estado(doc.id)).toBeUndefined()
    expect(envios.map((e) => e.dto.body)).toEqual([undefined, 'Dúvidas?'])
  })

  it('mensagem nova enviada depois de uma falha também espera', async () => {
    const { fila, envios } = montar()
    fila.enfileirar('c1', { body: '1' })
    await tick()
    envios[0].reject(new Error('x'))
    await tick()
    const nova = fila.enfileirar('c1', { body: '2' })
    await tick()
    expect(fila.estado(nova.id)).toBe('retida')
    expect(envios).toHaveLength(1)
  })

  it('aoFalhar é chamado com o erro (toast da página)', async () => {
    const { fila, envios } = montar()
    const aoFalhar = vi.fn()
    fila.enfileirar('c1', { body: 'oi' }, aoFalhar)
    await tick()
    const erro = new Error('403')
    envios[0].reject(erro)
    await tick()
    expect(aoFalhar).toHaveBeenCalledWith(erro)
  })

  it('confirmado: tira da fila e avisa com a mensagem real', async () => {
    const { fila, envios, eventos } = montar()
    const m = fila.enfileirar('c1', { body: 'oi' })
    expect(fila.temPendentes()).toBe(true)
    await tick()
    envios[0].resolve({ id: 'real' })
    await tick()
    expect(fila.estado(m.id)).toBeUndefined()
    expect(fila.pendentes('c1')).toEqual([])
    expect(fila.temPendentes()).toBe(false)
    expect(eventos.at(-1)).toBe('confirmado')
  })

  // Revisão 15/10: sem resposta do servidor (tempo limite, rede) o envio pode
  // ter saído — o motivo avisa antes de um Tentar de novo duplicar.
  it('falha sem resposta do servidor: motivo pede para conferir antes de reenviar', async () => {
    const { fila, envios } = montar()
    fila.enfileirar('c1', { body: 'oi' })
    await tick()
    envios[0].reject({ code: 'ECONNABORTED' })
    await tick()
    expect(fila.pendentes('c1')[0].errorTitle).toBe(SEM_CONFIRMACAO)
  })

  it('falha com resposta (ex.: 403): sem o aviso de "sem confirmação"', async () => {
    const { fila, envios } = montar()
    fila.enfileirar('c1', { body: 'oi' })
    await tick()
    envios[0].reject({ response: { status: 403, data: {} } })
    await tick()
    expect(fila.pendentes('c1')[0].errorTitle).toBeUndefined()
  })

  it('cancelar uma retida: some sem ser enviada, e a que falhou continua lá', async () => {
    const { fila, envios } = montar()
    const doc = fila.enfileirar('c1', { file: pdf })
    const texto = fila.enfileirar('c1', { body: 'Segue acima' })
    await tick()
    envios[0].reject(new Error('x'))
    await tick()
    fila.descartar(texto.id)
    await tick()
    expect(fila.estado(texto.id)).toBeUndefined()
    expect(fila.estado(doc.id)).toBe('falhou')
    expect(envios).toHaveLength(1)
  })

  it('aviso ao sair: só com mensagem em trânsito, não por uma falha já vista', async () => {
    const { fila, envios } = montar()
    fila.enfileirar('c1', { body: 'oi' })
    expect(fila.emTransito()).toBe(true)
    await tick()
    envios[0].reject(new Error('x'))
    await tick()
    expect(fila.emTransito()).toBe(false)
    expect(fila.temPendentes()).toBe(true)
  })

  it('limpar (logout): esvazia a fila e avisa as telas', async () => {
    const { fila, eventos } = montar()
    fila.enfileirar('c1', { body: 'oi' })
    fila.limpar()
    expect(fila.temPendentes()).toBe(false)
    expect(eventos.at(-1)).toBe('removido')
  })
})
