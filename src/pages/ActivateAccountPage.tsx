import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'

export function ActivateAccountPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const { activateAccount } = useAuth()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    if (!token.trim()) {
      setError('Link inválido. Peça ao administrador um novo convite.')
      return
    }

    setError('')
    setLoading(true)
    try {
      await activateAccount(token.trim(), password)
      navigate('/home', { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response
        ?.data?.message
      const text = Array.isArray(msg) ? msg[0] : msg
      setError(text ?? 'Não foi possível ativar a conta. Verifique o link ou peça um novo convite.')
    } finally {
      setLoading(false)
    }
  }

  if (!token.trim()) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-surface-950 px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm text-center space-y-4"
        >
          <div className="flex flex-col items-center mb-2">
            <img src="/oryon-logo.svg" alt="Oryon" className="w-16 h-16 mb-4 select-none" draggable={false} />
            <h1 className="text-xl font-bold text-surface-50">Oryon</h1>
          </div>
          <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
            Link de convite incompleto ou inválido. Abra o endereço completo enviado no e-mail ou peça ao
            administrador para reenviar o convite.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Ir para o login
          </Link>
        </motion.div>
      </div>
    )
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
          <img src="/oryon-logo.svg" alt="Oryon" className="w-16 h-16 mb-4 select-none" draggable={false} />
          <h1 className="text-xl font-bold text-surface-50">Oryon</h1>
        </div>

        <div className="mb-7">
          <h2 className="text-2xl font-bold text-surface-50">Ativar sua conta</h2>
          <p className="text-sm text-surface-400 mt-1">Defina uma senha para começar a usar o Oryon.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-surface-300 uppercase tracking-wide">
              Nova senha
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                autoComplete="new-password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full bg-surface-900 border border-surface-800 rounded-lg px-3 py-2.5 pr-10 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors"
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
            <input
              type={showPass ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
              className="w-full bg-surface-900 border border-surface-800 rounded-lg px-3 py-2.5 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-surface-950 text-sm font-semibold transition-colors flex items-center justify-center gap-2 mt-1"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ativar conta'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-surface-200 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Já tenho conta — entrar
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
