// ─── useTestSend ───────────────────────────────────────────────────────────
// "Enviar teste para mim" da barra fixa do Composer — BE.10/SCRUM-1025,
// `POST /campaigns/test-send` (contrato em campaignsV2Api.ts, bloco [D2]).
// Manda UMA mensagem avulsa: não cria campanha, não grava recipients, não
// aparece em relatório nenhum.
//
// Por que NÃO usa `withFallback` (achado ao ler o contrato, coord/CONTRATOS.md
// §BE.10): lá o 404 é ambíguo de propósito — significa tanto "o endpoint
// ainda não existe" (BE.10 não implantada) quanto "Template não encontrado"
// / "Linha WhatsApp não encontrada". `withFallback` trata todo 404 como
// endpoint ausente, o que desligaria o botão para o resto da sessão só
// porque o usuário escolheu um template que outra pessoa apagou no meio do
// caminho. Então a distinção é feita aqui, pelo corpo da resposta: rota
// inexistente no Nest devolve a mensagem genérica "Cannot POST /..." (ou
// nenhuma mensagem), enquanto o 404 de domínio devolve a mensagem do
// contrato. Na dúvida, o hook prefere tratar como erro de domínio — mostrar
// uma mensagem a mais é melhor do que desabilitar um recurso que existe.
import { useState, useCallback } from 'react'
import { campaignComposerApi } from '@/services/campaignsV2Api'
import type { CampaignTestSendResult } from '@/types/campaignsV2'
import type { CampaignVariableMapping } from '@/types'

export interface TestSendParams {
  templateId?: string
  variableMappings: CampaignVariableMapping[]
  whatsappNumberId?: string
}

/** Mensagens por status, na linguagem do contrato (coord/CONTRATOS.md
 *  §BE.10). O backend já manda um texto pronto em cada caso; estes são o
 *  fallback para quando ele vier vazio. */
const FALLBACK_BY_STATUS: Record<number, string> = {
  404: 'Template ou linha do WhatsApp não encontrados.',
  409: 'Esse template ainda não está aprovado pela Meta — só dá para testar depois da aprovação.',
  422: 'Cadastre um telefone no seu perfil ou informe um número para receber o teste.',
  429: 'Limite de testes atingido, tente novamente em instantes.',
}

export function useTestSend({ templateId, variableMappings, whatsappNumberId }: TestSendParams) {
  const [sending, setSending] = useState(false)
  const [result, setResult]   = useState<CampaignTestSendResult | null>(null)
  const [error, setError]     = useState('')
  /** Otimista: só vira `false` quando um 404 se revela "rota inexistente".
   *  Enquanto BE.10 não for implantada, o primeiro clique desliga o botão e
   *  o rótulo explica que o recurso ainda não existe. */
  const [available, setAvailable] = useState(true)

  const ready = available && !!templateId && !!whatsappNumberId

  const send = useCallback(async (to?: string) => {
    if (!templateId || !whatsappNumberId) return null
    setSending(true); setError(''); setResult(null)
    try {
      const res = await campaignComposerApi.testSend({
        templateId,
        variableMappings,
        whatsappNumberId,
        ...(to ? { to } : {}),
      })
      setResult(res.data)
      return res.data
    } catch (err) {
      const status = statusOf(err)
      const message = messageOf(err)
      if (status === 404 && looksLikeMissingRoute(message)) {
        setAvailable(false)
        setError('')
        return null
      }
      setError(message?.trim() || (status ? FALLBACK_BY_STATUS[status] : '') || 'Não foi possível enviar o teste. Tente novamente.')
      return null
    } finally {
      setSending(false)
    }
  }, [templateId, variableMappings, whatsappNumberId])

  return { send, sending, result, error, available, ready }
}

/** Rota inexistente no Nest responde "Cannot POST /api/…" (ou nada). Um 404
 *  de domínio do BE.10 traz "Template não encontrado" / "Linha WhatsApp não
 *  encontrada". */
function looksLikeMissingRoute(message?: string): boolean {
  if (!message) return true
  return /^Cannot (POST|GET|PATCH|PUT|DELETE)\b/i.test(message.trim())
}

function statusOf(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null) return undefined
  const e = err as { status?: unknown; response?: { status?: unknown } }
  if (typeof e.status === 'number') return e.status
  if (typeof e.response?.status === 'number') return e.response.status
  return undefined
}

function messageOf(err: unknown): string | undefined {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
  return Array.isArray(msg) ? msg.join('; ') : msg
}
