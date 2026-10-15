import { useSyncExternalStore } from 'react'
import { aoSairDaSessao } from '@/lib/limpezaDaSessao'
import { whatsappSuporteApi } from '@/services/supportApi'
import type { ContextoDaConversaDeSuporte } from '@/types/support'

/** O mesmo teto do backend (dto/whatsapp-suporte.dto.ts). */
export const MAX_MENSAGENS_DO_RELATO = 20

/** O pedido atual: as falas do contato depois da última fala da equipe (ou a última dele). */
export function mensagensSugeridas(mensagens: ContextoDaConversaDeSuporte['mensagens']): Set<string> {
  const ultimaDaEquipe = mensagens.map((m) => m.de).lastIndexOf('equipe')
  const depois = mensagens.slice(ultimaDaEquipe + 1).filter((m) => m.de === 'contato')
  const escolha = depois.length ? depois : mensagens.filter((m) => m.de === 'contato').slice(-1)
  return new Set(escolha.slice(-MAX_MENSAGENS_DO_RELATO).map((m) => m.id))
}

/**
 * WHATSAPP DE SUPORTE (SCRUM-1388): a pessoa opera o número de suporte da
 * Oryon? Uma pergunta por sessão (a resposta só muda com outra conta), e o
 * "Converter em chamado" só aparece no tenant de suporte. Erro = não.
 */
let ativo: boolean | null = null
let pedido: Promise<void> | null = null
const ouvintes = new Set<() => void>()

function carregar() {
  if (pedido) return
  // Dentro de uma promessa: até um erro síncrono do cliente vira "não" (o menu nunca quebra por isso).
  pedido = Promise.resolve()
    .then(() => whatsappSuporteApi.estado())
    .then((r) => { ativo = !!r.ativo })
    .catch(() => { ativo = false })
    .finally(() => { for (const f of ouvintes) f() })
}

aoSairDaSessao(() => {
  ativo = null
  pedido = null
})

function assinar(f: () => void) {
  ouvintes.add(f)
  carregar()
  return () => { ouvintes.delete(f) }
}

export function useWhatsappDeSuporte(): boolean {
  return useSyncExternalStore(assinar, () => ativo ?? false, () => false)
}
