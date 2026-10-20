import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, RotateCw } from 'lucide-react'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthHeading } from '@/components/auth/AuthHeading'
import { api, SKIP_AUTH_REFRESH } from '@/services/api'

/** Espera para liberar o "Reenviar" (20/10). */
const REENVIO_SEGUNDOS = 60

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  // Reenvio (20/10): libera depois de 60 s; cada envio gera um link novo.
  const [espera, setEspera] = useState(0)
  const [reenviando, setReenviando] = useState(false)
  const [reenviado, setReenviado] = useState(false)

  useEffect(() => {
    if (espera <= 0) return
    const t = setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [espera])

  const pedir = () =>
    // `withCredentials` é redundante (a instância já traz), mas é o que dá ao
    // literal uma propriedade de AxiosRequestConfig — mesmo padrão do AuthContext.
    api.post('/auth/forgot-password', { email: email.trim() }, { withCredentials: true, ...SKIP_AUTH_REFRESH })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setError('')
    setLoading(true)
    try {
      await pedir()
      setSent(true)
      setEspera(REENVIO_SEGUNDOS)
    } catch {
      setError('Erro ao enviar o e-mail. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const reenviar = async () => {
    setError('')
    setReenviando(true)
    try {
      await pedir()
      setReenviado(true)
      setEspera(REENVIO_SEGUNDOS)
    } catch {
      setError('Não foi possível reenviar agora. Tente de novo em instantes.')
    } finally {
      setReenviando(false)
    }
  }
  const mmss = `${Math.floor(espera / 60)}:${String(espera % 60).padStart(2, '0')}`

  return (
    <AuthLayout>
      {sent ? (
        <div className="flex flex-col items-start gap-4" role="status">
          <div className="w-10 h-10 rounded-full bg-status-active-bg flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-status-active" strokeWidth={1.75} />
          </div>
          <AuthHeading
            title="E-mail enviado"
            description={
              <>
                Se uma conta existir com <strong className="text-surface-200 break-all">{email}</strong>,
                você receberá um link para redefinir sua senha. Verifique sua caixa de entrada e a pasta de spam.
              </>
            }
          />
          <div className="w-full border-t border-surface-800 pt-4">
            <p className="text-sm text-surface-400">Não chegou?</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2"
              loading={reenviando}
              disabled={espera > 0 || reenviando}
              leftIcon={<RotateCw className="w-3.5 h-3.5" strokeWidth={1.75} />}
              onClick={reenviar}
            >
              {espera > 0 ? `Reenviar em ${mmss}` : 'Reenviar e-mail'}
            </Button>
            <p className="mt-1.5 text-xs text-surface-500">
              {reenviado ? 'Enviamos de novo. Use o link do e-mail mais recente: o anterior deixou de valer.' : 'Ao reenviar, o link anterior deixa de valer.'}
            </p>
            {error && <Banner variant="danger" className="mt-3">{error}</Banner>}
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
            Voltar ao login
          </Link>
        </div>
      ) : (
        <>
          <AuthHeading
            title="Esqueceu a senha?"
            description="Digite seu e-mail e enviaremos um link para redefinir a senha."
          />

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FormField label="E-mail">
              <Input
                type="email"
                size="lg"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                error={error || undefined}
              />
            </FormField>

            {error && <Banner variant="danger">{error}</Banner>}

            <Button type="submit" variant="primary" size="lg" loading={loading} disabled={loading || !email.trim()} className="w-full">
              Enviar link
            </Button>
          </form>

          <div className="mt-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
              Voltar ao login
            </Link>
          </div>
        </>
      )}
    </AuthLayout>
  )
}
