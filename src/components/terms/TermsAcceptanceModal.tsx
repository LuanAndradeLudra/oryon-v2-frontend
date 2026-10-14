import { useCallback, useEffect, useState } from 'react'
import { FileText, Loader2, X } from 'lucide-react'

import { termsApi, DOCUMENT_LABEL, type TermsVersionInfo } from '@/services/termsApi'

/**
 * Pedido de aceite dos termos (SCRUM-777 / H3).
 *
 * ── Por que é dispensável ───────────────────────────────────────────────────
 *
 * O cartão da SCRUM-777 é explícito: *"Contrato vigente **não** é suspenso por
 * falta de re-aceite — a operação decide o que fazer."* Um modal que trava o
 * painel seria exatamente uma suspensão, decidida pelo código em vez da
 * operação — e aplicada a um cliente que está pagando em dia.
 *
 * Então ele pede, registra e sai do caminho. Volta no próximo acesso enquanto
 * houver pendência, porque `GET /terms/pending` continua devolvendo.
 *
 * O portão duro que o corpo da história menciona ("cliente não acessa sem
 * aceitar") é do fluxo de ATIVAÇÃO de conta nova — que é o console de
 * provisionamento, SCRUM-656, e não existe. Confundir os dois transformaria
 * uma regra de entrada numa punição para quem já é cliente.
 */
export function TermsAcceptanceModal() {
  const [pendentes, setPendentes] = useState<TermsVersionInfo[]>([])
  const [dispensado, setDispensado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    termsApi
      .pending()
      .then((p) => { if (vivo) setPendentes(p) })
      // Silencioso de propósito: termos indisponíveis não podem quebrar a
      // aplicação inteira. Sem pendência conhecida, o painel segue normal.
      .catch(() => { if (vivo) setPendentes([]) })
    return () => { vivo = false }
  }, [])

  const aceitar = useCallback(async () => {
    setEnviando(true)
    setErro(null)
    try {
      // Um por vez, na ordem: cada versão é um registro próprio.
      for (const versao of pendentes) {
        await termsApi.accept(versao.id)
      }
      setPendentes([])
    } catch {
      setErro('Não foi possível registrar o aceite. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }, [pendentes])

  if (dispensado || pendentes.length === 0) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="termos-titulo"
    >
      <div className="w-full max-w-md bg-surface-900 border border-surface-700 rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-start gap-3 px-5 pt-5">
          <div className="mt-0.5 w-9 h-9 rounded-xl bg-brand-600/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4 text-brand-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="termos-titulo" className="text-sm font-semibold text-surface-100">
              {pendentes.length > 1 ? 'Documentos atualizados' : 'Documento atualizado'}
            </h2>
            <p className="mt-1 text-xs text-surface-400">
              Revise e confirme para continuar usando a plataforma.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDispensado(true)}
            aria-label="Fechar"
            className="p-1 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-800 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ul className="mt-4 px-5 flex flex-col gap-2">
          {pendentes.map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-surface-800/60 border border-surface-700/60"
            >
              <div className="min-w-0">
                <p className="text-xs font-medium text-surface-200 truncate">
                  {DOCUMENT_LABEL[v.document] ?? v.document}
                </p>
                <p className="text-[11px] text-surface-500">versão {v.version}</p>
              </div>
              {v.contentUrl && (
                <a
                  href={v.contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-brand-400 hover:text-brand-300 underline underline-offset-2 flex-shrink-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500 rounded-sm"
                >
                  Ler
                </a>
              )}
            </li>
          ))}
        </ul>

        {erro && <p className="mt-3 px-5 text-[11px] text-danger">{erro}</p>}

        <div className="mt-5 px-5 pb-5 flex items-center gap-2">
          <button
            type="button"
            onClick={aceitar}
            disabled={enviando}
            className="flex-1 h-9 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white text-xs font-medium flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-400"
          >
            {enviando && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Li e concordo
          </button>
          <button
            type="button"
            onClick={() => setDispensado(true)}
            className="h-9 px-3 rounded-xl text-xs text-surface-400 hover:text-surface-200 hover:bg-surface-800 focus:outline-none focus-visible:ring-1 focus-visible:ring-brand-500"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  )
}
