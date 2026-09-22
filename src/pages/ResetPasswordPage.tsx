import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { api, SKIP_AUTH_REFRESH } from '@/services/api'


export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
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
    <div className="min-h-screen w-screen flex items-center justify-center bg-surface-950 px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-8">
          <img
            src="/oryon-logo.svg"
            alt="Oryon"
            className="w-16 h-16 mb-4 select-none"
            draggable={false}
          />
          <h1 className="text-xl font-bold text-surface-50">Oryon</h1>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-status-active-bg flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-status-active" />
            </div>
            <h2 className="text-xl font-bold text-surface-50">Senha redefinida</h2>
            <p className="text-sm text-surface-400">
              Sua senha foi alterada com sucesso. Agora você pode fazer login.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full h-11 rounded-sm bg-[var(--color-btn-primary-bg)] text-[var(--color-btn-primary-fg)] text-sm font-semibold hover:brightness-90 transition mt-4"
            >
              Ir para o login
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-surface-50">Nova senha</h2>
              <p className="text-sm text-surface-400 mt-1">
                Crie uma nova senha para sua conta.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-surface-300 uppercase tracking-wide">
                  Nova senha
                </label>
                <div className="relative">
                  <Input
                    type={showPass ? 'text' : 'password'}
                    autoComplete="new-password"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-surface-300 uppercase tracking-wide">
                  Confirmar senha
                </label>
                <Input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                />
              </div>

              {error && (
                <Banner variant="danger">{error}</Banner>
              )}

              <Button type="submit" variant="primary" size="lg" loading={loading} disabled={loading || !password || !confirmPassword} className="w-full mt-1">Redefinir senha</Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar ao login
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
