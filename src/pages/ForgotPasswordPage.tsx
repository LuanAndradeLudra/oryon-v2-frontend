import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Zap, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

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
      await axios.post(`${API}/auth/forgot-password`, { email: email.trim() })
      setSent(true)
    } catch {
      setError('Erro ao enviar o e-mail. Tente novamente.')
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
          <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center mb-4 shadow-lg shadow-brand-600/30">
            <Zap className="w-6 h-6 text-surface-950" fill="currentColor" />
          </div>
          <h1 className="text-xl font-bold text-surface-50">Oryon</h1>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-status-active-bg flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6 text-status-active" />
            </div>
            <h2 className="text-xl font-bold text-surface-50">E-mail enviado</h2>
            <p className="text-sm text-surface-400 leading-relaxed">
              Se uma conta existir com <strong className="text-surface-200">{email}</strong>,
              você receberá um link para redefinir sua senha. Verifique sua caixa de entrada.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-brand-400 hover:text-brand-300 transition-colors mt-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao login
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-surface-50">Esqueceu a senha?</h2>
              <p className="text-sm text-surface-400 mt-1">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-surface-300 uppercase tracking-wide">
                  E-mail
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-surface-900 border border-surface-800 rounded-lg px-3 py-2.5 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors"
                />
              </div>

              {error && (
                <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-surface-950 text-sm font-semibold transition-colors flex items-center justify-center gap-2 mt-1"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar link de redefinição'}
              </button>
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
