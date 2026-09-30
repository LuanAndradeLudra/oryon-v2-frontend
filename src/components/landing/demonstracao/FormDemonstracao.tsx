import { useId, useState, type FormEvent } from 'react'
import { BotaoLanding } from '../ui/BotaoLanding'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
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

export function FormDemonstracao({ origem }: { origem: string }) {
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
      // Leva o foco ao primeiro campo com erro.
      const primeiro = (ev.currentTarget as HTMLFormElement).querySelector<HTMLElement>('[aria-invalid="true"]')
      requestAnimationFrame(() => primeiro?.focus())
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
    // P10 da auditoria anti-genérico (30/09): o sucesso é uma mensagem, não um
    // CheckCircle — a resposta como o cliente da Oryon a receberia.
    const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    return (
      <div role="status" className="flex flex-col items-start gap-3 border-t border-[var(--landing-borda)] pt-6">
        <div className="max-w-[92%] rounded-[10px] rounded-bl-[3px] bg-bubble-out px-4 py-3 text-[15px] leading-snug text-surface-50">
          <p className="font-semibold">{formDemo.sucessoTitulo}</p>
          <p className="mt-1 text-[14.5px] text-surface-100/90">{formDemo.sucessoTexto}</p>
          <span aria-hidden className="mt-1.5 block text-right font-mono text-[10.5px] text-brand-300">{hora} ✓✓</span>
        </div>
      </div>
    )
  }

  // Os campos sobre réguas (P10): sem caixa em volta do formulário nem dos
  // campos — rótulo em mono, linha embaixo, foco em teal.
  const CAMPO = '[&>label]:font-mono [&>label]:text-[10.5px] [&>label]:uppercase [&>label]:tracking-[.12em] [&>label]:text-surface-500'
  // A lista nativa do <select> no Windows escuro abria clara: fundo e cor explícitos.
  const OPCOES = '[&_option]:bg-[#0E1414] [&_option]:text-surface-100'
  const LINHA = '!rounded-none !border-0 !border-b !border-[var(--landing-borda)] !bg-transparent !px-0 !shadow-none focus:!border-[var(--landing-destaque)] focus:!ring-0'

  const c = formDemo.campos
  return (
    <form noValidate onSubmit={enviar} aria-describedby={avisoId} className="grid gap-x-8 gap-y-6 border-t border-[var(--landing-borda)] pt-6 sm:grid-cols-2">
      <FormField label={c.nome} error={erros.nome} required className={CAMPO}>
        <Input className={LINHA} name="nome" value={dados.nome} onChange={(e) => mudar('nome')(e.target.value)} autoComplete="name" />
      </FormField>
      <FormField label={c.empresa} error={erros.empresa} required className={CAMPO}>
        <Input className={LINHA} name="empresa" value={dados.empresa} onChange={(e) => mudar('empresa')(e.target.value)} autoComplete="organization" />
      </FormField>
      <FormField label={c.whatsapp} error={erros.whatsapp} required className={CAMPO}>
        <Input className={LINHA} name="whatsapp" value={dados.whatsapp} onChange={(e) => mudar('whatsapp')(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000…" />
      </FormField>
      <FormField label={c.email} error={erros.email} required className={CAMPO}>
        <Input className={LINHA} name="email" type="email" spellCheck={false} value={dados.email} onChange={(e) => mudar('email')(e.target.value)} autoComplete="email" />
      </FormField>
      <FormField label={c.segmento} error={erros.segmento} required className={CAMPO}>
        <Select className={cn(LINHA, OPCOES)} name="segmento" value={dados.segmento} onChange={(e) => mudar('segmento')(e.target.value)}>
          <option value="">{formDemo.selecione}</option>
          {formDemo.segmentos.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </FormField>
      <FormField label={c.equipe} error={erros.equipe} required className={CAMPO}>
        <Select className={cn(LINHA, OPCOES)} name="equipe" value={dados.equipe} onChange={(e) => mudar('equipe')(e.target.value)}>
          <option value="">{formDemo.selecione}</option>
          {formDemo.tamanhos.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </FormField>
      <FormField label={c.mensagem} requirement="optional" className={cn('sm:col-span-2', CAMPO)}>
        <Textarea className={LINHA} name="mensagem" value={dados.mensagem} onChange={(e) => mudar('mensagem')(e.target.value)} rows={3} maxLength={1000} />
      </FormField>
      {/* Armadilha para robôs: fora da tela e fora da ordem de tabulação. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>Site<input tabIndex={-1} autoComplete="off" value={dados.site} onChange={(e) => mudar('site')(e.target.value)} /></label>
      </div>
      <div className="mt-2 flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p id={avisoId} className="text-[12.5px] leading-relaxed text-surface-500">{formDemo.privacidade}</p>
        <BotaoLanding type="submit" tamanho="lg" seta carregando={estado === 'enviando'} className="flex-none">
          {estado === 'enviando' ? formDemo.enviando : formDemo.enviar}
        </BotaoLanding>
      </div>
      {estado === 'falhou' && (
        <p role="alert" className="text-[13.5px] text-danger sm:col-span-2">{formDemo.erro}</p>
      )}
    </form>
  )
}

/** A seção de fecho: o convite e o formulário lado a lado. */
export function SecaoDemonstracao({ origem, comoPagina = false, numero }: { origem: string; comoPagina?: boolean; numero?: string }) {
  return (
    // P12 da auditoria anti-genérico (30/09): sem o glow radial de fundo — na
    // landing fica só o halo do palco do Hero.
    <section id="demonstracao" data-section="demonstracao" className="relative scroll-mt-20 border-t border-[var(--landing-borda)] bg-surface-950 py-16 sm:py-20">
      <div className="landing-container relative grid gap-8 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] lg:gap-14">
        <div>
          {comoPagina ? (
            <Revelar>
              <Capitulo rotulo={formDemo.eyebrow} />
              <h1 className="mt-6 font-display font-bold tracking-[-0.03em] leading-[1.06] text-[clamp(1.75rem,3vw,2.5rem)] text-balance">
                <span className="text-surface-50">{formDemo.titulo}</span>{' '}
                <span className="text-surface-500">{formDemo.cinza}</span>
              </h1>
            </Revelar>
          ) : (
            <Cabecalho numero={numero} eyebrow={formDemo.eyebrow} titulo={formDemo.titulo} cinza={formDemo.cinza} />
          )}
          <Revelar atraso={0.1}>
            <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-surface-400 sm:text-[16.5px]">{formDemo.lead}</p>
          </Revelar>
          {/* O que acontece depois (ciclo noturno, 30/09): quem vai deixar os
              dados quer saber o próximo passo antes de enviar. */}
          <Revelar atraso={0.15}>
            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[.12em] text-surface-500">{formDemo.depoisTitulo}</p>
            <ol className="mt-3 space-y-4">
              {formDemo.depois.map((p, i) => (
                <li key={p.titulo} className="flex gap-3.5">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-surface-900 text-[12px] font-semibold tabular-nums text-[var(--landing-destaque)] ring-1 ring-surface-700">{i + 1}</span>
                  <div>
                    <p className="text-[14.5px] font-semibold text-surface-100">{p.titulo}</p>
                    <p className="mt-0.5 text-[13.5px] leading-relaxed text-surface-400">{p.texto}</p>
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
