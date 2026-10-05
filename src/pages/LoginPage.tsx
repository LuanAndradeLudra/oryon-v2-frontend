import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Banner } from '@/components/ui/Banner'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthHeading } from '@/components/auth/AuthHeading'
import { PasswordInput } from '@/components/auth/PasswordInput'
import { SsoSlot } from '@/components/auth/SsoSlot'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/conversations'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      const resposta = (err as { response?: { status?: number; data?: { message?: string } } })?.response
      // Sem resposta do servidor (rede, bloqueio do navegador, backend fora do
      // ar) não é credencial errada — dizer isso mandava o usuário trocar a
      // senha à toa (achado de 30/09).
      if (!resposta) setError('Não foi possível conectar ao servidor. Verifique sua conexão e tente de novo.')
      else if (resposta.status === 429) setError('Muitas tentativas. Aguarde um minuto e tente de novo.')
      else if (resposta.status && resposta.status >= 500) setError('O servidor não respondeu agora. Tente de novo em instantes.')
      else setError(resposta.data?.message ?? 'E-mail ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: FormEvent) => { e.preventDefault(); void doLogin(email, password) }

  return (
    <AuthLayout>
      <AuthHeading title="Entrar" description="Acesse sua conta" />

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

        <FormField label="Senha">
          <PasswordInput
            size="lg"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            error={error || undefined}
          />
        </FormField>

        <div className="flex justify-end -mt-1">
          <Link to="/forgot-password" className="text-xs text-brand-400 hover:text-brand-300 transition-colors">
            Esqueceu a senha?
          </Link>
        </div>

        {/* Banner danger já é role="alert" (lido pelo leitor de tela); os dois
            campos ficam marcados como inválidos (borda + aria-invalid). */}
        {error && <Banner variant="danger">{error}</Banner>}

        <Button type="submit" variant="primary" size="lg" loading={loading} disabled={loading || !email || !password} className="w-full">
          Entrar
        </Button>
      </form>

      {/* Reservado (hoje vazio): divisor "ou" + provedores quando houver OAuth. */}
      <SsoSlot />
    </AuthLayout>
  )
}
