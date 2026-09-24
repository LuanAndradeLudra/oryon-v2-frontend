import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/FormField'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthHeading } from '@/components/auth/AuthHeading'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { api, SKIP_AUTH_REFRESH } from '@/services/api'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('A senha deve ter no mínimo 8 caracteres.'); return }
    if (password !== confirmPassword) { setError('As senhas não coincidem.'); return }
    if (!token) { setError('Token de redefinição inválido.'); return }

    setError('')
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password }, { withCredentials: true, ...SKIP_AUTH_REFRESH })
      setSuccess(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Token inválido ou expirado. Solicite um novo link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      {success ? (
        <div className="flex flex-col items-start gap-4" role="status">
          <div className="w-10 h-10 rounded-full bg-status-active-bg flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-status-active" strokeWidth={1.75} />
          </div>
          <AuthHeading
            title="Senha redefinida"
            description="Sua senha foi alterada com sucesso. Agora você pode fazer login."
          />
          <Link
            to="/login"
            className="inline-flex items-center justify-center w-full h-11 rounded-sm bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-fg)] text-sm font-semibold hover:brightness-90 transition"
          >
            Ir para o login
          </Link>
        </div>
      ) : (
        <>
          <AuthHeading title="Nova senha" description="Crie uma nova senha para sua conta." />

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FormField label="Nova senha">
              <PasswordInput
                size="lg"
                autoComplete="new-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                error={error || undefined}
              />
            </FormField>

            <FormField label="Confirmar senha">
              <PasswordInput
                size="lg"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                error={error || undefined}
              />
            </FormField>

            {error && <Banner variant="danger">{error}</Banner>}

            <Button type="submit" variant="primary" size="lg" loading={loading} disabled={loading || !password || !confirmPassword} className="w-full">
              Redefinir senha
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
