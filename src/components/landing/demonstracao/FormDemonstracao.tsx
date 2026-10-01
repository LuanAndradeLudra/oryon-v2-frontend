import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { AlertCircle, Lock } from 'lucide-react'
import { BotaoLanding } from '../ui/BotaoLanding'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { apiBaseUrl } from '@/config/env'
import { cn } from '@/lib/utils'
import { formDemo } from '../landingCopy'
import { Cabecalho, Capitulo, Revelar } from '../plataforma/SecoesVenda'

/**
 * O PEDIDO DE DEMONSTRAÇÃO (30/09) — a conversão da landing enquanto o
 * WhatsApp comercial não tem número (decisão do PO).
 *
 * Envia para `POST /public/demo-requests` (rota pública do backend, sem
 * login). Nada de sucesso falso: se o envio falha, a pessoa vê o erro e pode
 * tentar de novo. O campo `site` é uma armadilha para robôs (fica escondido;
 * gente de verdade não preenche).
 */

export interface PedidoDemonstracao {
  nome: string
  empresa: string
  whatsapp: string
  email: string
  segmento: string
  equipe: string
  mensagem: string
  site: string
  origem: string
}

const VAZIO: PedidoDemonstracao = { nome: '', empresa: '', whatsapp: '', email: '', segmento: '', equipe: '', mensagem: '', site: '', origem: '' }

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

type Erros = Partial<Record<keyof PedidoDemonstracao, string>>

export function validarPedido(p: PedidoDemonstracao): Erros {
  const e: Erros = {}
  for (const campo of ['nome', 'empresa', 'whatsapp', 'email', 'segmento', 'equipe'] as const) {
    if (!p[campo].trim()) e[campo] = formDemo.obrigatorio
  }
  if (!e.email && !EMAIL_OK.test(p.email.trim())) e.email = formDemo.emailInvalido
  // DDD + número: pelo menos 10 dígitos (fixo) — celular tem 11.
  if (!e.whatsapp && p.whatsapp.replace(/\D/g, '').length < 10) e.whatsapp = formDemo.whatsappInvalido
  return e
}

export async function enviarPedido(p: PedidoDemonstracao): Promise<void> {
  const r = await fetch(`${apiBaseUrl()}/public/demo-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...p, whatsapp: p.whatsapp.replace(/\D/g, '') }),
  })
  if (!r.ok) throw new Error(`demo-requests ${r.status}`)
}

/**
 * Uma escolha em pílulas (rádios nativos, visualmente escondidos): área de
 * atuação e tamanho da equipe deixam de ser <select> — um clique em vez de
 * abrir uma lista, e todas as opções à vista (redesenho, 30/09).
 */
function Escolha({ nome, rotulo, opcoes, valor, erro, onEscolher }: {
  nome: string
  rotulo: string
  opcoes: readonly string[]
  valor: string
  erro?: string
  onEscolher: (v: string) => void
}) {
  const erroId = useId()
  return (
    <fieldset aria-describedby={erro ? erroId : undefined} className="min-w-0">
      <legend className="mb-2.5 text-[13px] font-medium text-surface-200">
        {rotulo}<span aria-hidden className="ml-0.5 text-[var(--landing-destaque)]">*</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((o) => (
          <label key={o} className="relative">
            <input
              type="radio"
              name={nome}
              value={o}
              checked={valor === o}
              onChange={() => onEscolher(o)}
              aria-invalid={erro ? true : undefined}
              required
              className="peer sr-only"
            />
            <span
              className={cn(
                'flex h-10 cursor-pointer select-none items-center justify-center rounded-full border px-4 text-[13.5px] font-medium transition-[background-color,border-color,color] duration-150',
                'border-white/[.09] bg-surface-950 text-surface-300 hover:border-white/[.18] hover:text-surface-100',
                'peer-checked:border-[var(--landing-destaque)] peer-checked:bg-brand-500/[.14] peer-checked:text-surface-50',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--landing-destaque)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--landing-cartao)]',
                erro && 'border-danger/60',
              )}
            >
              {o}
            </span>
          </label>
        ))}
      </div>
      {erro && (
        <p id={erroId} role="alert" className="mt-2 flex items-center gap-1.5 text-[12px] text-danger">
          <AlertCircle className="h-3 w-3 flex-none" strokeWidth={2.2} aria-hidden />
          {erro}
        </p>
      )}
    </fieldset>
  )
}

/** Um bloco do pedido: título curto e os campos dele. */
function Parte({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="grid gap-5">
      <p className="text-[15px] font-semibold tracking-[-0.01em] text-surface-50">{titulo}</p>
      {children}
    </div>
  )
}

export function FormDemonstracao({ origem }: { origem: string }) {
  const semMovimento = useReducedMotion()
  const [dados, setDados] = useState<PedidoDemonstracao>({ ...VAZIO, origem })
  const [erros, setErros] = useState<Erros>({})
  const [estado, setEstado] = useState<'editando' | 'enviando' | 'enviado' | 'falhou'>('editando')
  const avisoId = useId()

  const mudar = (campo: keyof PedidoDemonstracao) => (v: string) => {
    setDados((d) => ({ ...d, [campo]: v }))
    if (erros[campo]) setErros((e) => ({ ...e, [campo]: undefined }))
  }

  const enviar = async (ev: FormEvent) => {
    ev.preventDefault()
    const e = validarPedido(dados)
    setErros(e)
    if (Object.keys(e).length > 0) {
      // Leva o foco ao primeiro campo com erro — depois de a tela marcar os
      // campos (antes, a busca rodava antes do render e não achava nenhum).
      const form = ev.currentTarget as HTMLFormElement
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    setEstado('enviando')
    try {
      await enviarPedido(dados)
      setEstado('enviado')
    } catch {
      setEstado('falhou')
    }
  }

  if (estado === 'enviado') {
    // O sucesso é uma mensagem, não um CheckCircle — a resposta como o cliente
    // da Oryon a receberia; entra com uma mola curta (o único momento animado
    // do formulário).
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return (
      <div role="status" className="flex min-h-[320px] flex-col justify-end rounded-xl border border-white/[.08] bg-[var(--landing-cartao)] p-6 shadow-[0_24px_60px_-28px_rgba(0,0,0,.8)] sm:p-8">
        <motion.div
          className="max-w-[92%] rounded-[10px] rounded-bl-[3px] bg-bubble-out px-4 py-3 text-[15px] leading-snug text-surface-50"
          initial={semMovimento ? false : { opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          style={{ transformOrigin: 'bottom left' }}
        >
          <p className="font-semibold">{formDemo.sucessoTitulo}</p>
          <p className="mt-1 text-[14.5px] text-surface-100/90">{formDemo.sucessoTexto}</p>
          <span aria-hidden className="mt-1.5 block text-right text-[11px] tabular-nums text-brand-300">{hora} ✓✓</span>
        </motion.div>
      </div>
    )
  }

  // Redesenho (30/09): campos preenchidos e afundados no painel (fundo da
  // página dentro do cartão), raio 10, borda que acende no hover e no foco.
  // O estado de erro volta pela borda (o className do Input sobrescreve a do
  // componente, então o vermelho é reaplicado por aria-invalid).
  const CAMPO = '[&>label]:text-[13px] [&>label]:font-medium [&>label]:text-surface-200 [&>label>span[aria-hidden]]:text-[var(--landing-destaque)] gap-2'
  const ENTRADA = cn(
    'h-11 rounded-[10px] border-white/[.09] bg-surface-950 px-3.5 text-[14.5px] text-surface-50',
    'placeholder:text-surface-500 hover:border-white/[.18]',
    'focus:border-[var(--landing-destaque)] focus:ring-[3px] focus:ring-brand-500/20',
    'aria-[invalid=true]:border-danger/70',
  )

  const c = formDemo.campos
  return (
    <form
      noValidate
      onSubmit={enviar}
      aria-describedby={avisoId}
      className="rounded-xl border border-white/[.08] bg-[var(--landing-cartao)] p-5 shadow-[0_24px_60px_-28px_rgba(0,0,0,.8)] sm:p-8"
    >
      <div className="grid gap-8">
        <Parte titulo={formDemo.parteVoce}>
          <FormField label={c.nome} error={erros.nome} required className={CAMPO}>
            <Input className={ENTRADA} name="nome" value={dados.nome} onChange={(e) => mudar('nome')(e.target.value)} autoComplete="name" />
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label={c.whatsapp} error={erros.whatsapp} required className={CAMPO}>
              <Input className={ENTRADA} name="whatsapp" value={dados.whatsapp} onChange={(e) => mudar('whatsapp')(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000…" />
            </FormField>
            <FormField label={c.email} error={erros.email} required className={CAMPO}>
              <Input className={ENTRADA} name="email" type="email" spellCheck={false} value={dados.email} onChange={(e) => mudar('email')(e.target.value)} autoComplete="email" placeholder="voce@empresa.com.br…" />
            </FormField>
          </div>
        </Parte>

        <div aria-hidden className="h-px bg-white/[.06]" />

        <Parte titulo={formDemo.parteOperacao}>
          <FormField label={c.empresa} error={erros.empresa} required className={CAMPO}>
            <Input className={ENTRADA} name="empresa" value={dados.empresa} onChange={(e) => mudar('empresa')(e.target.value)} autoComplete="organization" />
          </FormField>
          <Escolha nome="segmento" rotulo={c.segmento} opcoes={formDemo.segmentos} valor={dados.segmento} erro={erros.segmento} onEscolher={mudar('segmento')} />
          <Escolha nome="equipe" rotulo={c.equipe} opcoes={formDemo.tamanhos} valor={dados.equipe} erro={erros.equipe} onEscolher={mudar('equipe')} />
          <FormField label={c.mensagem} requirement="optional" className={CAMPO}>
            <Textarea className={cn(ENTRADA, 'h-auto min-h-[96px] py-3 leading-relaxed')} name="mensagem" value={dados.mensagem} onChange={(e) => mudar('mensagem')(e.target.value)} rows={3} maxLength={1000} placeholder={formDemo.mensagemExemplo} />
          </FormField>
        </Parte>
      </div>

      {/* Armadilha para robôs: fora da tela e fora da ordem de tabulação. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>Site<input tabIndex={-1} autoComplete="off" value={dados.site} onChange={(e) => mudar('site')(e.target.value)} /></label>
      </div>

      {estado === 'falhou' && (
        <p role="alert" className="mt-6 flex items-start gap-2 rounded-[10px] border border-danger/30 bg-danger/[.08] px-3.5 py-3 text-[13.5px] text-surface-100">
          <AlertCircle className="mt-[2px] h-4 w-4 flex-none text-danger" aria-hidden />
          {formDemo.erro}
        </p>
      )}

      <BotaoLanding type="submit" tamanho="lg" seta carregando={estado === 'enviando'} className="mt-8 w-full">
        {estado === 'enviando' ? formDemo.enviando : formDemo.enviar}
      </BotaoLanding>
      <p id={avisoId} className="mt-3 text-center text-[12.5px] leading-relaxed text-surface-500 text-balance">
        <Lock className="mr-1.5 inline-block h-3 w-3 -translate-y-px" aria-hidden />
        {formDemo.privacidade}
      </p>
    </form>
  )
}

/** A seção de fecho: o convite e o formulário lado a lado. */
export function SecaoDemonstracao({ origem, comoPagina = false }: { origem: string; comoPagina?: boolean; numero?: string }) {
  return (
    <section id="demonstracao" data-section="demonstracao" className="relative scroll-mt-20 border-t border-[var(--landing-borda)] bg-surface-950 py-16 sm:py-24">
      <div className="landing-container relative grid gap-10 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] lg:items-start lg:gap-16">
        {/* O convite acompanha o formulário enquanto a pessoa preenche. */}
        <div className="lg:sticky lg:top-28">
          {comoPagina ? (
            <Revelar>
              <Capitulo rotulo={formDemo.eyebrow} />
              <h1 className="mt-6 font-display font-bold tracking-[-0.03em] leading-[1.06] text-[clamp(1.75rem,3vw,2.5rem)] text-balance text-surface-50">{formDemo.titulo}</h1>
            </Revelar>
          ) : (
            <Cabecalho rotulo={formDemo.eyebrow} titulo={formDemo.titulo} />
          )}
          <Revelar atraso={0.1}>
            <p className="mt-4 max-w-[44ch] text-[16px] leading-relaxed text-surface-400 sm:text-[18px]">{formDemo.lead}</p>
          </Revelar>
          {/* O que acontece depois: os três passos ligados por uma linha (a
              mesma linguagem da implantação). A sequência é informação, por
              isso os números ficam. */}
          <Revelar atraso={0.15}>
            <p className="mt-10 text-[15px] font-semibold text-surface-100">{formDemo.depoisTitulo}</p>
            <ol className="relative mt-5 grid gap-6">
              <span aria-hidden className="absolute bottom-3 left-[13px] top-3 w-px bg-surface-700" />
              {formDemo.depois.map((p, i) => (
                <li key={p.titulo} className="relative grid grid-cols-[28px_minmax(0,1fr)] gap-x-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-950 text-[12px] font-semibold tabular-nums text-[var(--landing-destaque)] ring-1 ring-surface-600">{i + 1}</span>
                  <div className="pt-0.5">
                    <p className="text-[15px] font-semibold text-surface-50">{p.titulo}</p>
                    <p className="mt-1 text-[14px] leading-relaxed text-surface-400">{p.texto}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Revelar>
        </div>
        <Revelar atraso={0.15}>
          <FormDemonstracao origem={origem} />
        </Revelar>
      </div>
    </section>
  )
}
