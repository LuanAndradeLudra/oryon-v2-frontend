import { useId, useState, type FormEvent } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { BotaoLanding } from '../ui/BotaoLanding'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { apiBaseUrl } from '@/config/env'
import { formDemo } from '../landingCopy'
import { Cabecalho, Revelar } from '../plataforma/SecoesVenda'

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
    return (
      <div role="status" className="flex flex-col items-start gap-3 rounded-2xl bg-[var(--landing-cartao)] p-6 ring-1 ring-[var(--landing-borda)] sm:p-8">
        <CheckCircle2 className="h-7 w-7 text-[var(--landing-destaque)]" aria-hidden />
        <p className="font-display text-[20px] font-semibold text-surface-50">{formDemo.sucessoTitulo}</p>
        <p className="max-w-[46ch] text-[15px] leading-relaxed text-surface-400">{formDemo.sucessoTexto}</p>
      </div>
    )
  }

  const c = formDemo.campos
  return (
    <form noValidate onSubmit={enviar} aria-describedby={avisoId} className="grid gap-4 rounded-2xl bg-[var(--landing-cartao)] p-5 ring-1 ring-[var(--landing-borda)] sm:grid-cols-2 sm:p-7">
      <FormField label={c.nome} error={erros.nome} required>
        <Input value={dados.nome} onChange={(e) => mudar('nome')(e.target.value)} autoComplete="name" />
      </FormField>
      <FormField label={c.empresa} error={erros.empresa} required>
        <Input value={dados.empresa} onChange={(e) => mudar('empresa')(e.target.value)} autoComplete="organization" />
      </FormField>
      <FormField label={c.whatsapp} error={erros.whatsapp} required>
        <Input value={dados.whatsapp} onChange={(e) => mudar('whatsapp')(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000" />
      </FormField>
      <FormField label={c.email} error={erros.email} required>
        <Input type="email" value={dados.email} onChange={(e) => mudar('email')(e.target.value)} autoComplete="email" />
      </FormField>
      <FormField label={c.segmento} error={erros.segmento} required>
        <Select value={dados.segmento} onChange={(e) => mudar('segmento')(e.target.value)}>
          <option value="">{formDemo.selecione}</option>
          {formDemo.segmentos.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </FormField>
      <FormField label={c.equipe} error={erros.equipe} required>
        <Select value={dados.equipe} onChange={(e) => mudar('equipe')(e.target.value)}>
          <option value="">{formDemo.selecione}</option>
          {formDemo.tamanhos.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </FormField>
      <FormField label={c.mensagem} requirement="optional" className="sm:col-span-2">
        <Textarea value={dados.mensagem} onChange={(e) => mudar('mensagem')(e.target.value)} rows={3} maxLength={1000} />
      </FormField>
      {/* Armadilha para robôs: fora da tela e fora da ordem de tabulação. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>Site<input tabIndex={-1} autoComplete="off" value={dados.site} onChange={(e) => mudar('site')(e.target.value)} /></label>
      </div>
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
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
export function SecaoDemonstracao({ origem, comoPagina = false }: { origem: string; comoPagina?: boolean }) {
  return (
    <section id="demonstracao" data-section="demonstracao" className="relative scroll-mt-20 overflow-hidden border-t border-[var(--landing-borda)] bg-surface-950 py-16 sm:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{ background: 'radial-gradient(60% 70% at 20% 100%, color-mix(in srgb, var(--color-brand-500) 18%, transparent) 0%, transparent 70%)' }}
      />
      <div className="landing-container relative grid gap-8 lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)] lg:gap-14">
        <div>
          {comoPagina ? (
            <Revelar>
              <p className="inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold landing-selo">{formDemo.eyebrow}</p>
              <h1 className="mt-4 font-display font-bold tracking-[-0.03em] leading-[1.06] text-[clamp(1.75rem,3vw,2.5rem)] text-balance">
                <span className="text-surface-50">{formDemo.titulo}</span>{' '}
                <span className="text-surface-500">{formDemo.cinza}</span>
              </h1>
            </Revelar>
          ) : (
            <Cabecalho eyebrow={formDemo.eyebrow} titulo={formDemo.titulo} cinza={formDemo.cinza} />
          )}
          <Revelar atraso={0.1}>
            <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-surface-400">{formDemo.lead}</p>
          </Revelar>
        </div>
        <Revelar atraso={0.15}>
          <FormDemonstracao origem={origem} />
        </Revelar>
      </div>
    </section>
  )
}
