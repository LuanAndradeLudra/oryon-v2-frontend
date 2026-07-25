import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Zap, Loader2, Check, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Banner } from '@/components/ui/Banner'

interface Requirement {
  label: string
  test: (p: string) => boolean
}

const REQUIREMENTS: Requirement[] = [
  { label: 'Mínimo 8 caracteres',         test: (p) => p.length >= 8 },
  { label: 'Uma letra maiúscula',          test: (p) => /[A-Z]/.test(p) },
  { label: 'Uma letra minúscula',          test: (p) => /[a-z]/.test(p) },
  { label: 'Um número',                   test: (p) => /[0-9]/.test(p) },
  { label: 'Um caractere especial (@#$!)', test: (p) => /[^A-Za-z0-9]/.test(p) },
]

function strength(password: string): number {
  return REQUIREMENTS.filter((r) => r.test(password)).length
}

const STRENGTH_COLORS = ['', 'bg-danger', 'bg-away', 'bg-away', 'bg-online', 'bg-online']
const STRENGTH_LABELS = ['', 'Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte']

export function SetPasswordPage() {
  const { user, completePasswordChange, logout } = useAuth()
  const navigate = useNavigate()

  const [currentPw, setCurrentPw]       = useState('')
  const [password, setPassword]         = useState('')
  const [confirm, setConfirm]           = useState('')
  const [showCurrent, setShowCurrent]   = useState(false)
  const [showPass, setShowPass]         = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')

  const score = strength(password)
  const allMet = score === REQUIREMENTS.length
  const matches = password === confirm && confirm.length > 0
  const canSubmit = allMet && matches && currentPw.length > 0 && !loading

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setError('')
    setLoading(true)
    try {
      await completePasswordChange(password, currentPw)
      navigate('/conversations', { replace: true })
    } catch {
      setError('Não foi possível salvar a senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-surface-950 px-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/oryon-logo.svg"
            alt="Oryon"
            className="w-16 h-16 mb-4 select-none"
            draggable={false}
          />
          <h1 className="text-xl font-bold text-surface-50">Bem-vindo, {user?.firstName}!</h1>
          <p className="text-sm text-surface-400 mt-1 text-center">
            Configure sua senha definitiva para continuar
          </p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-surface-900 border border-surface-800 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl"
        >
          {/* Current password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-surface-300 uppercase tracking-wide">
              Senha atual
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                autoFocus
                autoComplete="current-password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 pr-10 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-surface-300 uppercase tracking-wide">
              Nova senha
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                autoComplete="new-password"
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

            {/* Strength bar */}
            {password.length > 0 && (
              <div className="space-y-1.5 mt-0.5">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-200 ${i < score ? STRENGTH_COLORS[score] : 'bg-surface-700'}`}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-surface-400">{STRENGTH_LABELS[score]}</p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-surface-300 uppercase tracking-wide">
              Confirmar senha
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className={`w-full bg-surface-800 border rounded-lg px-3 py-2.5 pr-10 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 transition-colors ${
                  confirm.length > 0
                    ? matches
                      ? 'border-online focus:ring-online/30 focus:border-online'
                      : 'border-danger focus:ring-danger/30 focus:border-danger'
                    : 'border-surface-700 focus:ring-brand-500/50 focus:border-brand-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300 transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirm.length > 0 && !matches && (
              <p className="text-[11px] text-danger">As senhas não coincidem</p>
            )}
          </div>

          {/* Requirements checklist */}
          <div className="bg-surface-800/60 rounded-xl px-4 py-3 flex flex-col gap-1.5">
            {REQUIREMENTS.map((r) => {
              const ok = r.test(password)
              return (
                <div key={r.label} className="flex items-center gap-2">
                  {ok
                    ? <Check className="w-3.5 h-3.5 text-online flex-shrink-0" />
                    : <X className="w-3.5 h-3.5 text-surface-600 flex-shrink-0" />
                  }
                  <span className={`text-xs transition-colors ${ok ? 'text-online' : 'text-surface-500'}`}>
                    {r.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Error */}
          {error && (
            <Banner variant="danger">{error}</Banner>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-surface-950 text-sm font-semibold transition-colors flex items-center justify-center gap-2 mt-1"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : 'Salvar senha e acessar'
            }
          </button>
        </form>

        {/* Logout link */}
        <p className="text-center text-xs text-surface-600 mt-4">
          Não é você?{' '}
          <button
            onClick={() => { logout(); }}
            className="text-surface-400 hover:text-surface-200 underline transition-colors"
          >
            Sair
          </button>
        </p>
      </div>
    </div>
  )
}
