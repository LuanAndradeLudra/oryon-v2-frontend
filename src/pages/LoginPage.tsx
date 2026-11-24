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
import { motivoDoLoginOAuth, tomarDestinoOAuth, verDestinoOAuth } from '@/lib/destinoOAuth'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // ORY-96: a volta guarda também a query (ex.: /oauth/authorize?pedido=…), não só o caminho.
  const origem = (location.state as { from?: { pathname: string; search?: string } })?.from
  const from = origem?.pathname ? `${origem.pathname}${origem.search ?? ''}` : '/conversations'
  // ORY-94 (decisão do João, 23/11): o login que vem de uma conexão de aplicativo de IA diz isso na
  // tela e manda o id do pedido — a senha digitada aqui vale no consentimento desse pedido.
  const [motivoOAuth] = useState(() => motivoDoLoginOAuth(origem?.pathname ? from : verDestinoOAuth()))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const doLogin = async (e: string, p: string) => {
    if (!e.trim() || !p) return
    setError('')
    setLoading(true)
    try {
      if (motivoOAuth?.tipo === 'conectar' && motivoOAuth.pedido)
        await login(e.trim(), p, { oauthPedido: motivoOAuth.pedido })
      else await login(e.trim(), p)
      // Revisão ORY-94: sem o destino do router (redirecionamento "duro" com a sessão
      // vencida), volta para a tela do OAuth guardada na aba, se houver.
      // Todo login concluído consome o destino guardado (com o state, ele é descartado).
      const guardado = tomarDestinoOAuth()
      navigate(origem?.pathname ? from : (guardado ?? from), { replace: true })
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
      <AuthHeading
        title="Entrar"
        description={
          motivoOAuth?.tipo === 'conectar'
            ? 'Para conectar um aplicativo de IA à sua conta Oryon'
            : motivoOAuth?.tipo === 'aprovar'
              ? 'Para ver e aprovar uma ação pedida por um aplicativo de IA'
              : 'Acesse sua conta'
        }
      />
      {motivoOAuth && (
        <div className="mb-5">
          <Banner variant="info">
            {motivoOAuth.tipo === 'conectar'
              ? 'Depois de entrar, você vê qual aplicativo está pedindo acesso e escolhe o que ele pode fazer. Nada é liberado sem você clicar em Permitir.'
              : 'Depois de entrar, você vê a ação inteira e decide se aprova, com a sua senha.'}
          </Banner>
        </div>
      )}

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
