import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

// ─── Canva OAuth Callback ──────────────────────────────────────────────────────
// This page is opened as a popup by canvaService.startCanvaOAuth().
// It reads the auth code from the URL, posts it to the opener window,
// then closes itself automatically.

export function CanvaCallbackPage() {
  const [params]  = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const code  = params.get('code')
    const state = params.get('state')
    const error = params.get('error')

    if (error || !code) {
      setStatus('error')
      setMessage(error === 'access_denied'
        ? 'Acesso negado. Feche esta janela e tente novamente.'
        : 'Erro na autorização. Feche esta janela e tente novamente.')
      return
    }

    // Send code back to the opener window
    if (window.opener) {
      window.opener.postMessage({ type: 'canva_oauth_code', code, state }, window.location.origin)
      setStatus('success')
      setMessage('Canva conectado com sucesso!')
      setTimeout(() => window.close(), 1500)
    } else {
      // Opened as redirect (not popup) — shouldn't happen in normal flow
      setStatus('error')
      setMessage('Janela principal não encontrada. Feche e tente novamente.')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center px-6">

        {status === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 text-brand-400 animate-spin" />
            <p className="text-surface-300 text-sm">Conectando ao Canva...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-10 h-10 text-status-active" />
            <p className="text-surface-100 font-semibold">Canva conectado!</p>
            <p className="text-surface-400 text-sm">Fechando esta janela automaticamente...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-10 h-10 text-red-400" />
            <p className="text-surface-100 font-semibold">Algo deu errado</p>
            <p className="text-surface-400 text-sm">{message}</p>
            <button
              onClick={() => window.close()}
              className="mt-2 px-4 py-2 rounded-lg bg-surface-800 text-surface-200 text-sm hover:bg-surface-700 transition-colors"
            >
              Fechar
            </button>
          </>
        )}

      </div>
    </div>
  )
}
