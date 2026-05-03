import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Eye, EyeOff, Zap, Loader2, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { LoginBeams } from '@/components/ui/LoginBeams'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const ROTATING_WORDS = ['convertem.', 'encantam.', 'fidelizam.', 'crescem.']

function RotatingWord() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % ROTATING_WORDS.length)
    }, 2400)
    return () => clearInterval(timer)
  }, [])

  return (
    <span className="relative inline-block overflow-hidden h-[1.2em] align-bottom">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={index}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block text-brand-400"
        >
          {ROTATING_WORDS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // The hero panel only shows at lg+. Skipping the mount in smaller viewports
  // avoids running the canvas RAF animation on phones/tablets where it would
  // be invisible anyway.
  const isLargeScreen = useMediaQuery('(min-width: 1024px)')
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/conversations'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const doLogin = async (e: string, p: string) => {
    if (!e.trim() || !p) return
    setError('')
    setLoading(true)
    try {
      await login(e.trim(), p)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setError(msg ?? 'E-mail ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: FormEvent) => { e.preventDefault(); void doLogin(email, password) }

  const loginAs = (e: string, p: string) => { setEmail(e); setPassword(p); setError(''); void doLogin(e, p) }

  return (
    <div className="min-h-screen w-screen flex overflow-hidden bg-surface-950">

      {/* ── Left panel — hero + beams (lg+ only, skipped at mount in smaller) ── */}
      {isLargeScreen && (
      <div className="flex flex-1 relative flex-col items-start justify-end pb-16 pl-16 overflow-hidden">
        <LoginBeams />

        {/* Headline */}
        <div className="relative z-10 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/40">
                <Zap className="w-4 h-4 text-surface-950" fill="currentColor" />
              </div>
              <span className="text-surface-100 font-semibold text-lg tracking-tight">Oryon</span>
            </div>

            <h1 className="text-5xl font-bold text-surface-50 leading-tight tracking-tight mb-4">
              Conversas que<br />
              <RotatingWord />
            </h1>
            <p className="text-surface-400 text-lg leading-relaxed max-w-sm">
              Gerencie atendimentos, automatize follow-ups e transforme cada contato em uma oportunidade real.
            </p>
          </motion.div>
        </div>
      </div>
      )}

      {/* ── Right panel — login form ── */}
      <div className="w-full lg:w-[480px] flex flex-col items-center justify-center px-8 py-12 bg-surface-950 lg:border-l lg:border-surface-800/60">

        {/* Mobile brand */}
        <div className="flex flex-col items-center mb-8 lg:hidden">
          <div className="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center mb-4 shadow-lg shadow-brand-600/30">
            <Zap className="w-6 h-6 text-surface-950" fill="currentColor" />
          </div>
          <h1 className="text-xl font-bold text-surface-50">Oryon</h1>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-7">
            <h2 className="text-2xl font-bold text-surface-50">Entrar</h2>
            <p className="text-sm text-surface-400 mt-1">Acesse sua conta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
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

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-surface-300 uppercase tracking-wide">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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

            {/* Forgot password */}
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
                Esqueceu a senha?
              </Link>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-surface-950 text-sm font-semibold transition-colors flex items-center justify-center gap-2 mt-1"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar'}
            </button>
          </form>

          {/* Register link */}
          <p className="text-center text-xs text-surface-500 mt-5">
            Não tem uma conta?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Criar conta
            </Link>
          </p>

          {/* Dev-only demo accounts — hidden in production builds */}
          {import.meta.env.DEV && (
          <div className="mt-6 space-y-2">
            <p className="text-[10px] text-surface-600 text-center">Clique em uma conta para preencher automaticamente</p>

            {/* Demo accounts */}
            <div className="bg-surface-900/60 border border-surface-800 rounded-xl px-4 py-3 text-xs text-surface-500 space-y-1">
              <p className="font-semibold text-surface-400 mb-1.5">Conta demo — já configurada</p>
              {[
                { label: 'Admin', email: 'admin@oryon.ai', password: 'Admin@123' },
                { label: 'Agente', email: 'ana@oryon.ai', password: 'Ana@12345' },
                { label: 'Pendente', email: 'julia.santos@oryon.ai', password: 'Tmp@Julia1' },
              ].map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => loginAs(acc.email, acc.password)}
                  className="w-full text-left hover:text-surface-300 transition-colors py-0.5"
                >
                  <span className="text-surface-300">{acc.label}:</span> {acc.email} · <span className="font-mono">{acc.password}</span>
                </button>
              ))}
            </div>

            {/* New account */}
            <button
              type="button"
              onClick={() => loginAs('admin@minhaempresa.com', 'Nova@1234')}
              className="w-full text-left bg-brand-950/40 border border-brand-800/40 hover:border-brand-600/40 rounded-xl px-4 py-3 text-xs text-surface-500 space-y-1 transition-colors"
            >
              <p className="font-semibold text-brand-400 mb-1.5 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Conta nova — fluxo completo de setup</p>
              <p><span className="text-surface-300">E-mail:</span> admin@minhaempresa.com</p>
              <p><span className="text-surface-300">Senha temp:</span> <span className="font-mono">Nova@1234</span></p>
              <p className="text-surface-600 mt-1">→ Define senha → CRM zerado → onboarding com IA → configura tudo do zero</p>
            </button>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}
