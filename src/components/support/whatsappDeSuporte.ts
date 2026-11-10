import { useSyncExternalStore } from 'react'
import { aoSairDaSessao } from '@/lib/limpezaDaSessao'
import { whatsappSuporteApi } from '@/services/supportApi'
import type { ContextoDaConversaDeSuporte } from '@/types/support'

/** O mesmo teto do backend (dto/whatsapp-suporte.dto.ts). */
export const MAX_MENSAGENS_DO_RELATO = 20

/**
 * O pedido atual: as falas do contato depois da última fala da equipe (ou a
 * última dele) — menos as que já estão no chamado aberto desta conversa
 * (revisão do Portão 4: sem a resposta automática no meio, juntar de novo
 * duplicava o relato).
 */
export function mensagensSugeridas(mensagens: ContextoDaConversaDeSuporte['mensagens']): Set<string> {
  const ultimaDaEquipe = mensagens.map((m) => m.de).lastIndexOf('equipe')
  const doContato = (m: (typeof mensagens)[number]) => m.de === 'contato' && !m.noChamado
  const depois = mensagens.slice(ultimaDaEquipe + 1).filter(doContato)
  const escolha = depois.length ? depois : mensagens.filter(doContato).slice(-1)
  return new Set(escolha.slice(-MAX_MENSAGENS_DO_RELATO).map((m) => m.id))
}

/**
 * WHATSAPP DE SUPORTE (SCRUM-1388): a pessoa opera o número de suporte da
 * Oryon? Uma pergunta por sessão (a resposta só muda com outra conta). O
 * "Converter em chamado" só aparece no tenant de suporte e nas conversas da
 * linha dele (revisão do Portão 4). Erro = não, e a próxima tela pergunta de novo.
 */
let estado: { ativo: boolean; linha: string | null } | null = null
let pedido: Promise<void> | null = null
const ouvintes = new Set<() => void>()

function carregar() {
  if (pedido) return
  // Dentro de uma promessa: até um erro síncrono do cliente vira "não" (o menu nunca quebra por isso).
  pedido = Promise.resolve()
    .then(() => whatsappSuporteApi.estado())
    .then((r) => { estado = { ativo: !!r.ativo, linha: r.linha ?? null } })
    .catch(() => {
      estado = null
      pedido = null // erro passageiro não esconde a ação até sair da conta
    })
    .finally(() => { for (const f of ouvintes) f() })
}

aoSairDaSessao(() => {
  estado = null
  pedido = null
})

function assinar(f: () => void) {
  ouvintes.add(f)
  carregar()
  return () => { ouvintes.delete(f) }
}

/** A conversa (pela linha) é do número de suporte que a pessoa opera? */
export function useWhatsappDeSuporte(whatsappNumberId: string | null | undefined): boolean {
  const e = useSyncExternalStore(assinar, () => estado, () => null)
  return !!e?.ativo && (!e.linha || e.linha === whatsappNumberId)
}
