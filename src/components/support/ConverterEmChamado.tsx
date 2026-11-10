import { useEffect, useState } from 'react'
import { Building2, AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { showToast } from '@/hooks/useToast'
import { cn, getApiErrorMessage } from '@/lib/utils'
import { whatsappSuporteApi } from '@/services/supportApi'
import type { ChamadoDaConversaDeSuporte, ContextoDaConversaDeSuporte, EmpresaParaChamado } from '@/types/support'
import { TIPOS_DE_PEDIDO, dataCurta, type TipoDePedido } from './supportModel'
import { MAX_MENSAGENS_DO_RELATO, mensagensSugeridas } from './whatsappDeSuporte'

interface Destino {
  tenantId: string
  empresa: string
  /** A pessoa da empresa que é o contato (pelo telefone); null = "aberto pelo contato". */
  userId: string | null
  nome: string | null
  suporteLigado: boolean | null
}

/**
 * CONVERTER EM CHAMADO (SCRUM-1388) — na conversa do número de suporte da
 * Oryon. Escolhe as mensagens (vão mascaradas, como relato), a empresa do
 * contato (sugerida pelo telefone de um usuário), o tipo de pedido e revisa o
 * relato. Se a conversa já tem chamado aberto, a escolha começa em juntar a
 * ele (ou abrir outro). O contato recebe o número pela própria conversa.
 */
export function ConverterEmChamado({ conversationId, onFechar }: { conversationId: string; onFechar: () => void }) {
  const [ctx, setCtx] = useState<ContextoDaConversaDeSuporte | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  useEffect(() => {
    let vivo = true
    whatsappSuporteApi.contexto(conversationId)
      .then((c) => { if (vivo) setCtx(c) })
      .catch((e) => { if (vivo) setErro(getApiErrorMessage(e, 'Não foi possível abrir a conversa. Tente de novo.')) })
    return () => { vivo = false }
  }, [conversationId])

  // Escolhas da pessoa; enquanto não escolhe, valem as sugestões (derivadas, sem efeito).
  const [escolha, setEscolha] = useState<Set<string> | null>(null)
  const [existenteDoErro, setExistenteDoErro] = useState<ChamadoDaConversaDeSuporte | null>(null)
  const [modo, setModo] = useState<'juntar' | 'novo' | null>(null)
  const [destino, setDestino] = useState<Destino | null>(null)
  const [tipo, setTipo] = useState<TipoDePedido>('defeito')
  const [relatoDigitado, setRelatoDigitado] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const mensagens = ctx?.mensagens ?? []
  const marcadas = escolha ?? mensagensSugeridas(mensagens)
  const existente = existenteDoErro ?? ctx?.existente ?? null
  const modoAtual = modo ?? (existente ? 'juntar' : 'novo')
  const sugestoes = ctx?.sugestoes ?? []
  // Uma pessoa só com o telefone do contato: já vem escolhida. Várias: quem converte decide.
  const destinoAtual: Destino | null = destino ?? (sugestoes.length === 1
    ? { tenantId: sugestoes[0].tenantId, empresa: sugestoes[0].empresa, userId: sugestoes[0].userId, nome: sugestoes[0].nome, suporteLigado: null }
    : null)
  const relatoSugerido = mensagens.filter((m) => marcadas.has(m.id) && m.de === 'contato').map((m) => m.texto.trim()).filter(Boolean).join('\n').slice(0, 2000)
  const relato = relatoDigitado ?? relatoSugerido

  const alternar = (id: string) => {
    const nova = new Set(marcadas)
    if (nova.has(id)) nova.delete(id)
    else if (nova.size >= MAX_MENSAGENS_DO_RELATO) { showToast(`Até ${MAX_MENSAGENS_DO_RELATO} mensagens por chamado.`, 'error'); return }
    else nova.add(id)
    setEscolha(nova)
  }

  // O que falta para converter, em palavras (o botão desativado sozinho não dizia).
  const falta = !ctx ? null
    : marcadas.size === 0 ? 'Escolha ao menos uma mensagem.'
      : modoAtual === 'juntar' ? (existente ? null : 'Escolha o chamado.')
        : !destinoAtual ? 'Escolha a empresa do contato.'
          : relato.trim().length < 5 ? 'Escreva o relato.' : null
  const podeEnviar = !!ctx && !enviando && !falta

  const enviar = async () => {
    if (!podeEnviar || !ctx) return
    setEnviando(true)
    try {
      const ids = mensagens.filter((m) => marcadas.has(m.id)).map((m) => m.id)
      const r = modoAtual === 'juntar' && existente
        ? await whatsappSuporteApi.converter(conversationId, { messageIds: ids, juntarA: existente.id })
        : await whatsappSuporteApi.converter(conversationId, {
          messageIds: ids, tenantId: destinoAtual!.tenantId, abertoPorUserId: destinoAtual!.userId, tipoDePedido: tipo,
          relato: relato.trim(), abrirOutro: !!existente,
        })
      const feito = r.juntado ? `Mensagens juntadas ao ${r.chamado.numero}.` : `Chamado ${r.chamado.numero} aberto (${r.chamado.empresa}).`
      showToast(r.respostaEnviada
        ? `${feito} O contato recebeu o número.`
        : `${feito} A resposta automática não saiu: avise o contato pela conversa.`, r.respostaEnviada ? 'success' : 'warning')
      onFechar()
    } catch (err) {
      const resposta = (err as { response?: { status?: number; data?: { existente?: ChamadoDaConversaDeSuporte } } } | null)?.response
      if (resposta?.status === 409 && resposta.data?.existente) {
        // Alguém converteu esta conversa agora há pouco: a escolha passa a ser juntar (ou abrir outro).
        setExistenteDoErro(resposta.data.existente)
        setModo('juntar')
      }
      showToast(getApiErrorMessage(err, 'Não foi possível converter. Tente de novo.'), 'error')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      open
      onClose={onFechar}
      title="Converter em chamado"
      className="w-full max-w-[600px]"
      footer={(
        <div className="flex items-center justify-end gap-2">
          {falta && <span id="converter-falta" className="mr-auto text-[12px] text-surface-400">{falta}</span>}
          <Button variant="neutral" onClick={onFechar}>Cancelar</Button>
          <Button onClick={() => void enviar()} disabled={!podeEnviar} loading={enviando} aria-describedby={falta ? 'converter-falta' : undefined}>
            {modoAtual === 'juntar' && existente ? `Juntar ao ${existente.numero}` : 'Converter em chamado'}
          </Button>
        </div>
      )}
    >
      {erro ? <p className="text-sm text-danger">{erro}</p>
        : !ctx ? <p className="text-sm text-surface-400">Carregando a conversa…</p>
          : (
            <div className="flex flex-col gap-4">
              <p className="text-[13px] text-surface-300">
                Conversa com <span className="text-surface-100 font-medium">{ctx.contato.nome ?? 'contato sem nome'}</span>
                {ctx.contato.telefone && <span className="text-surface-400"> · {ctx.contato.telefone}</span>}
              </p>

              {existente && (
                <div role="group" aria-label="Chamado aberto desta conversa" className="rounded-[8px] border border-surface-700 px-3 py-2.5 flex flex-col gap-2">
                  <p className="text-[13px] text-surface-100 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-px" aria-hidden />
                    <span>Esta conversa já virou o <span className="font-mono font-semibold">{existente.numero}</span> ({existente.empresa}).</span>
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="modo" checked={modoAtual === 'juntar'} onChange={() => setModo('juntar')} />
                      Juntar as mensagens a ele
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="modo" checked={modoAtual === 'novo'} onChange={() => setModo('novo')} />
                      Abrir outro chamado
                    </label>
                  </div>
                </div>
              )}

              <fieldset className="flex flex-col gap-1.5 min-w-0">
                <legend className="text-xs font-semibold text-surface-300 mb-1">
                  Mensagens que vão como relato <span className="font-normal text-surface-400">({marcadas.size} de até {MAX_MENSAGENS_DO_RELATO})</span>
                </legend>
                <ul className="max-h-[240px] overflow-y-auto rounded-[8px] border border-surface-700 divide-y divide-surface-800">
                  {mensagens.length === 0 && <li className="px-3 py-2 text-[13px] text-surface-400">A conversa ainda não tem mensagens.</li>}
                  {mensagens.map((m) => (
                    <li key={m.id}>
                      <label className="flex items-start gap-2.5 px-3 py-2 cursor-pointer hover:bg-[var(--rowhover)]">
                        <Checkbox checked={marcadas.has(m.id)} onChange={() => alternar(m.id)} className="mt-0.5"
                          aria-label={`${m.de === 'contato' ? 'Contato' : 'Equipe'}, ${dataCurta(m.em)}: ${m.texto.slice(0, 60)}`} />
                        <span className="flex flex-col min-w-0">
                          <span className="text-[11px] text-surface-400">
                            {m.de === 'contato' ? 'Contato' : 'Equipe Oryon'} · {dataCurta(m.em)}{m.noChamado ? ' · já no chamado' : ''}
                          </span>
                          <span className="text-[13px] text-surface-100 break-words whitespace-pre-wrap">{m.texto}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-surface-400">CPF, telefone e e-mail vão mascarados, como aparecem aqui.</p>
              </fieldset>

              {modoAtual === 'novo' && (
                <>
                  <EscolhaDaEmpresa sugestoes={sugestoes} destino={destinoAtual} onEscolher={setDestino} />
                  <fieldset className="flex flex-col gap-1.5">
                    <legend className="text-xs font-semibold text-surface-300 mb-1">Do que se trata</legend>
                    {/* Rádios nativos (revisão do Portão 4): Tab entra no grupo e as setas trocam a opção. */}
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.keys(TIPOS_DE_PEDIDO) as TipoDePedido[]).map((t) => (
                        <label key={t}
                          className={cn('h-8 px-3 rounded-full border text-[13px] inline-flex items-center cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-brand-500',
                            tipo === t ? 'border-brand-500 bg-[var(--sel)] text-surface-100' : 'border-surface-700 text-surface-300 hover:bg-[var(--rowhover)]')}>
                          <input type="radio" name="tipo-de-pedido" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="sr-only" />
                          {TIPOS_DE_PEDIDO[t].nome}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-surface-300">Relato <span className="font-normal text-surface-400">(vem das mensagens do contato; revise)</span></span>
                    <Textarea value={relato} onChange={(e) => setRelatoDigitado(e.target.value)} rows={4} maxLength={5000} aria-label="Relato do chamado" />
                  </label>
                </>
              )}
            </div>
          )}
    </Modal>
  )
}

/** A empresa do contato: a pessoa sugerida pelo telefone ou outra empresa, pela busca. */
function EscolhaDaEmpresa({ sugestoes, destino, onEscolher }: {
  sugestoes: ContextoDaConversaDeSuporte['sugestoes']
  destino: Destino | null
  onEscolher: (d: Destino) => void
}) {
  const [buscando, setBuscando] = useState(sugestoes.length === 0)
  const [busca, setBusca] = useState('')
  const [resultado, setResultado] = useState<{ termo: string; lista: EmpresaParaChamado[] } | null>(null)
  useEffect(() => {
    if (!buscando) return
    const termo = busca.trim()
    let vivo = true
    const t = setTimeout(() => {
      whatsappSuporteApi.empresas(termo).then((lista) => { if (vivo) setResultado({ termo, lista }) }).catch(() => {})
    }, 250)
    return () => { vivo = false; clearTimeout(t) }
  }, [busca, buscando])

  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="text-xs font-semibold text-surface-300 mb-1">Empresa do contato</legend>
      {sugestoes.length > 0 && (
        <ul className="flex flex-col gap-1" aria-label="Pelo telefone do contato">
          {sugestoes.map((s) => {
            const escolhida = destino?.userId === s.userId
            return (
              <li key={s.userId}>
                <label className={cn('flex items-center gap-2.5 rounded-[8px] border px-3 py-2 cursor-pointer',
                  escolhida ? 'border-brand-500 bg-[var(--sel)]' : 'border-surface-700 hover:bg-[var(--rowhover)]')}>
                  <input type="radio" name="empresa" checked={escolhida}
                    onChange={() => onEscolher({ tenantId: s.tenantId, empresa: s.empresa, userId: s.userId, nome: s.nome, suporteLigado: null })} />
                  <span className="flex flex-col min-w-0">
                    <span className="text-[13px] text-surface-100 truncate">{s.nome} · {s.empresa}</span>
                    <span className="text-[11px] text-surface-400">Mesmo telefone do contato · o chamado fica aberto por esta pessoa</span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
      {!buscando ? (
        <button type="button" onClick={() => setBuscando(true)} className="self-start inline-flex items-center gap-1 text-xs font-semibold text-accent-dark hover:underline">
          <Building2 className="w-3.5 h-3.5" aria-hidden />Outra empresa…
        </button>
      ) : (
        <div className="flex flex-col gap-1.5">
          <Input size="sm" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar a empresa pelo nome" aria-label="Buscar a empresa" />
          <ul className="max-h-[160px] overflow-y-auto flex flex-col gap-0.5" aria-label="Empresas">
            {resultado?.lista.map((e) => {
              const escolhida = destino?.tenantId === e.id && destino.userId === null
              return (
                <li key={e.id}>
                  <label className={cn('flex items-center gap-2.5 rounded-[6px] px-2 py-1.5 cursor-pointer', escolhida ? 'bg-[var(--sel)]' : 'hover:bg-[var(--rowhover)]')}>
                    <input type="radio" name="empresa" checked={escolhida}
                      onChange={() => onEscolher({ tenantId: e.id, empresa: e.nome, userId: null, nome: null, suporteLigado: e.suporteLigado })} />
                    <span className="text-[13px] text-surface-100 truncate">{e.nome}</span>
                    {!e.suporteLigado && <span className="text-[11px] text-surface-400 flex-shrink-0">sem a página Suporte</span>}
                  </label>
                </li>
              )
            })}
            {resultado && resultado.lista.length === 0 && <li className="px-2 py-1.5 text-[13px] text-surface-400">Nenhuma empresa com “{resultado.termo}”.</li>}
          </ul>
        </div>
      )}
      {destino?.suporteLigado === false && (
        <p className="text-[11px] text-warning">Esta empresa não tem a página Suporte ligada: o chamado entra na fila, e a resposta ao contato vai sem link.</p>
      )}
      {destino && destino.userId === null && (
        <p className="text-[11px] text-surface-400">Sem uma pessoa da empresa: o chamado fica aberto pelo contato (WhatsApp de suporte).</p>
      )}
    </fieldset>
  )
}
