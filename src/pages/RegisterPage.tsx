import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Zap, Loader2, Building2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface FormState {
  companyName: string
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

const INITIAL: FormState = {
  companyName: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'Ao menos 8 caracteres', ok: password.length >= 8 },
    { label: 'Letra maiúscula', ok: /[A-Z]/.test(password) },
    { label: 'Letra minúscula', ok: /[a-z]/.test(password) },
    { label: 'Número', ok: /\d/.test(password) },
  ]
  const score = checks.filter((c) => c.ok).length
  const colors = ['bg-danger', 'bg-warning', 'bg-warning', 'bg-status-active', 'bg-status-active']

  if (!password) return null

  return (
    <div className="flex flex-col gap-1.5 mt-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i < score ? colors[score] : 'bg-surface-700'}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
        {checks.map((c) => (
          <span
            key={c.label}
            className={`text-[11px] ${c.ok ? 'text-status-active' : 'text-surface-500'}`}
          >
            {c.ok ? '✓' : '·'} {c.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>(INITIAL)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  const isValid =
    form.companyName.trim().length >= 2 &&
    form.firstName.trim().length >= 1 &&
    form.email.trim().length > 0 &&
    form.password.length >= 8 &&
    /[A-Z]/.test(form.password) &&
    /[a-z]/.test(form.password) &&
    /\d/.test(form.password) &&
    form.password === form.confirmPassword

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await register({
        companyName: form.companyName.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      })
      navigate('/conversations', { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setError(msg ?? 'Erro ao criar conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-surface-950 px-4 overflow-auto">
      <div className="w-full max-w-lg my-6">

        {/* Brand */}
        <div className="flex flex-col items-center mb-5">
          <img
            src="/oryon-logo.svg"
            alt="Oryon"
            className="w-14 h-14 mb-3 select-none"
            draggable={false}
          />
          <h1 className="text-lg font-bold text-surface-50">Criar conta</h1>
          <p className="text-xs text-surface-400 mt-0.5">Configure sua empresa no Oryon</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-surface-900 border border-surface-800 rounded-2xl p-5 flex flex-col gap-3 shadow-2xl"
        >
          {/* Section: company */}
          <div className="flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-brand-400" />
            <span className="text-[11px] font-semibold text-brand-400 uppercase tracking-wider">
              Empresa
            </span>
          </div>

          <Field label="Nome da empresa" required>
            <input
              type="text"
              autoFocus
              value={form.companyName}
              onChange={set('companyName')}
              placeholder="Acme Ltda."
              className={inputClass}
            />
          </Field>

          {/* Divider */}
          <div className="border-t border-surface-800 -mx-1 pt-1">
            <span className="text-[11px] font-semibold text-surface-500 uppercase tracking-wider">
              Admin da conta
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Nome" required>
              <input
                type="text"
                value={form.firstName}
                onChange={set('firstName')}
                placeholder="João"
                className={inputClass}
              />
            </Field>
            <Field label="Sobrenome">
              <input
                type="text"
                value={form.lastName}
                onChange={set('lastName')}
                placeholder="Silva"
                className={inputClass}
              />
            </Field>
            <Field label="Telefone">
              <input
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="+55 11 99999-9999"
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="E-mail" required>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={set('email')}
              placeholder="admin@empresa.com"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Senha" required>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={set('password')}
                  placeholder="••••••••"
                  className={`${inputClass} pr-10`}
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
            </Field>
            <Field label="Confirmar senha" required>
              <input
                type={showPass ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                placeholder="••••••••"
                className={`${inputClass} ${form.confirmPassword && form.confirmPassword !== form.password ? 'border-danger/50 focus:border-danger focus:ring-danger/30' : ''}`}
              />
            </Field>
          </div>

          <PasswordStrength password={form.password} />

          {form.confirmPassword && form.confirmPassword !== form.password && (
            <span className="text-xs text-danger">As senhas não coincidem</span>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !isValid}
            className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-surface-950 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar conta'}
          </button>
        </form>

        {/* Login link */}
        <p className="text-center text-xs text-surface-500 mt-4">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-surface-300 uppercase tracking-wide">
        {label}
        {required && <span className="text-brand-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2.5 text-sm text-surface-100 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-colors'
