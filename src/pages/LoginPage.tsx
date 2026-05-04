import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
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

  return (
    <div className="min-h-[100dvh] w-screen flex overflow-hidden bg-surface-950">

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
              <img
                src="/oryon-logo.svg"
                alt="Oryon"
                className="w-11 h-11 select-none"
                draggable={false}
              />
              <img
                src="/oryon-wordmark.png"
                alt="Oryon"
                className="h-7 w-auto select-none"
                draggable={false}
              />
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
      <div className="w-full lg:w-[480px] flex flex-col items-center justify-start lg:justify-center px-8 pt-[calc(2.5rem+env(safe-area-inset-top))] pb-[calc(3rem+env(safe-area-inset-bottom))] lg:py-12 bg-surface-950 lg:border-l lg:border-surface-800/60">

        {/* Mobile headline — logo + divisor + wordmark horizontalmente centralizados;
            headline + subheadline alinhados a esquerda. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm mb-8 lg:hidden flex flex-col items-start"
        >
          <div className="flex items-center gap-2 mb-8">
            <img
              src="/oryon-logo.svg"
              alt="Oryon"
              className="w-[52px] h-[52px] select-none"
              draggable={false}
            />
            <span className="w-0.5 h-9 bg-white rounded-full" aria-hidden />
            <img
              src="/oryon-wordmark.png"
              alt="Oryon"
              className="h-[35px] w-auto select-none"
              draggable={false}
            />
          </div>
          <h1 className="w-full text-left text-3xl font-bold text-surface-50 leading-tight tracking-tight mb-3">
            Conversas que<br />
            <RotatingWord />
          </h1>
          <p className="w-full text-left text-surface-400 text-sm leading-relaxed">
            Gerencie atendimentos, automatize follow-ups e transforme cada contato em uma oportunidade real.
          </p>
        </motion.div>

        <div className="w-full max-w-sm">
          <div className="bg-surface-900 border border-surface-800 rounded-2xl p-5 shadow-2xl">
            <div className="mb-5">
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
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors"
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
                    className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors"
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
          </div>

          {/* Register link — fora do card pra dar respiro visual */}
          <p className="text-center text-xs text-surface-500 mt-5">
            Não tem uma conta?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
