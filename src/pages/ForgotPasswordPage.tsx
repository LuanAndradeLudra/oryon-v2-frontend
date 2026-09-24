import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthHeading } from '@/components/auth/AuthHeading'
import { api, SKIP_AUTH_REFRESH } from '@/services/api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setError('')
    setLoading(true)
    try {
      // `withCredentials` é redundante (a instância já traz), mas é o que dá ao
      // literal uma propriedade de AxiosRequestConfig — mesmo padrão do AuthContext.
      await api.post('/auth/forgot-password', { email: email.trim() }, { withCredentials: true, ...SKIP_AUTH_REFRESH })
      setSent(true)
    } catch {
      setError('Erro ao enviar o e-mail. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

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
                você receberá um link para redefinir sua senha. Verifique sua caixa de entrada.
              </>
            }
          />
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
