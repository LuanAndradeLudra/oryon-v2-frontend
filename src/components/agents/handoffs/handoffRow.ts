// ─── Helpers puros da linha da caixa de transferências (A6 / SCRUM-1017) ─────
// Sem React, sem rede: é o alvo obrigatório de teste da rubrica da Onda 1.
import type { Accent } from '@/components/ui/accentColor'
import { phoneDigits } from '@/lib/phone'
import type { HandoffItem } from '@/types/agentsOps'

// ─── SLA ─────────────────────────────────────────────────────────────────────

/**
 * Cortes da faixa de cor, como razão `waitingSeconds / slaSeconds`.
 *
 * **Inferidos do mockup, não documentados em lugar nenhum** — por isso ficam
 * aqui como constantes nomeadas, e não como números soltos no meio de um `if`.
 * A derivação: contra um SLA de 10:00, o mockup pinta 12:40 e 11:05 de
 * vermelho (razão ≥ 1), 06:12 de âmbar (0,62) e 02:48 e 01:10 de verde (0,28 e
 * 0,12). Logo o menor âmbar observado é 0,62 e o maior verde é 0,28; 0,6 é o
 * corte redondo que separa os dois.
 */
export const SLA_ESTOURADO = 1
export const SLA_ATENCAO = 0.6

export type SlaEstado = 'estourado' | 'atencao' | 'ok' | 'sem-sla'

export interface Sla {
  /** `mm:ss`, ou `h:mm:ss` acima de uma hora. */
  tempo: string
  estado: SlaEstado
  /** Nome de acento — nunca hex (Carta de Padrões §7). `null` sem SLA. */
  acento: Accent | null
  /**
   * `SLA mm:ss`, só quando estourou. A cor sozinha não pode carregar o estado
   * (a11y): quem não distingue vermelho de âmbar precisa do texto.
   */
  sufixo: string | null
  /** Estado por extenso, para o `aria-label` da linha. */
  descricao: string
}

/** `142` → `02:22`; `3742` → `1:02:22`. Negativo é tratado como zero. */
export function formatarEspera(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const seg = s % 60
  const dd = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${dd(m)}:${dd(seg)}` : `${dd(m)}:${dd(seg)}`
}

/** Espera por extenso para leitor de tela: `12 min 40 s`. */
function esperaPorExtenso(segundos: number): string {
  const s = Math.max(0, Math.floor(segundos))
  const m = Math.floor(s / 60)
  const seg = s % 60
  if (m === 0) return `${seg} s`
  return seg === 0 ? `${m} min` : `${m} min ${seg} s`
}

/**
 * A célula "Esperando" — o traço mais carregado da rubrica.
 *
 * `slaSeconds <= 0` significa **sem SLA configurado**, não SLA estourado: sem
 * ele não há razão para calcular, então a linha fica sem cor de estado e sem
 * sufixo. Pintar tudo de vermelho por falta de configuração seria alarme falso,
 * e dividir por zero seria pior.
 */
export function sla(waitingSeconds: number, slaSeconds: number): Sla {
  const tempo = formatarEspera(waitingSeconds)
  const espera = esperaPorExtenso(waitingSeconds)

  if (!(slaSeconds > 0)) {
    return {
      tempo,
      estado: 'sem-sla',
      acento: null,
      sufixo: null,
      descricao: `esperando ${espera}, sem SLA definido`,
    }
  }

  const razao = Math.max(0, waitingSeconds) / slaSeconds
  const limite = formatarEspera(slaSeconds)

  if (razao >= SLA_ESTOURADO) {
    return {
      tempo,
      estado: 'estourado',
      acento: 'rose',
      sufixo: `SLA ${limite}`,
      descricao: `esperando ${espera}, acima do SLA de ${esperaPorExtenso(slaSeconds)}`,
    }
  }
  if (razao >= SLA_ATENCAO) {
    return {
      tempo,
      estado: 'atencao',
      acento: 'amber',
      sufixo: null,
      descricao: `esperando ${espera}, perto do SLA de ${esperaPorExtenso(slaSeconds)}`,
    }
  }
  return {
    tempo,
    estado: 'ok',
    acento: 'green',
    sufixo: null,
    descricao: `esperando ${espera}, dentro do SLA de ${esperaPorExtenso(slaSeconds)}`,
  }
}

// ─── Motivo (a célula `.why`) ────────────────────────────────────────────────

export interface Motivo {
  /** Nome do agente já resolvido pelo cliente, ou `null`. */
  agente: string | null
  regra: string | null
  destino: string | null
  /** `true` quando não há nada a dizer — a célula vira `—`. */
  vazio: boolean
}

/**
 * Monta o `via [S] Sofia · regra x → destino` com degradação em cascata.
 *
 * Duas realidades do contrato mandam aqui:
 *
 * - **D36**: `agent.name` vem sempre `null` do backend; quem resolve id→nome é
 *   o frontend. Por isso o nome entra por parâmetro (`nomeDoAgente`), vindo do
 *   rol que a tela já carrega — e continua podendo ser `null` se o agente foi
 *   apagado ou o agent-server está fora.
 * - **D9**: `rule.label` e `target.label` são `null` em quase todo evento real,
 *   porque não existe matcher de keywords em runtime. Isso é o comportamento
 *   correto, não um bug.
 *
 * A regra que sai daí: **nunca renderizar `via · regra — → —`**. Um travessão
 * por campo ausente vira ruído numa célula que é texto corrido; o que não se
 * sabe simplesmente não se diz, e quando não sobra nada a célula inteira é que
 * vira `—`.
 */
export function motivo(item: HandoffItem, nomeDoAgente?: string | null): Motivo {
  const agente = nomeDoAgente ?? item.agent?.name ?? null
  const regra = item.rule?.label ?? null
  const destino = item.target?.label ?? null
  return { agente, regra, destino, vazio: !agente && !regra && !destino }
}

// ─── Telefone ────────────────────────────────────────────────────────────────

/**
 * Mascara o meio do telefone preservando **DDD + 2 últimos dígitos**.
 *
 * Dois dígitos, não quatro: o `CONTRATOS.md` fecha essa questão contra o
 * exemplo do próprio JSON e contra o mockup (que mostra 4) — 4 dígitos
 * identificam o contato bem mais do que 2, e o ganho de leitura não paga esse
 * custo numa tela que lista dezenas de telefones.
 *
 * Só existe para o **modo degradado**, onde a fila vem de `GET /conversations`
 * e o telefone chega cru; com o BE.6 no ar o backend já manda `phoneMasked`.
 * As duas pontas precisam da mesma regra, senão os dois modos mostram o mesmo
 * contato de jeitos diferentes.
 *
 * Número curto ou vazio volta como veio: mascarar o que já é curto demais não
 * protege ninguém e só produz lixo na tela.
 */
export function maskPhone(raw?: string | null): string {
  const digitos = phoneDigits(raw)
  if (digitos.length < 8) return raw ?? ''

  const br = digitos.length >= 12 && digitos.startsWith('55')
  const ddd = br ? digitos.slice(2, 4) : digitos.slice(0, 2)
  const corpo = br ? digitos.slice(4) : digitos.slice(2)
  const fim = corpo.slice(-2)
  const escondidos = '*'.repeat(Math.max(0, corpo.length - 1 - fim.length))
  const prefixo = br ? '+55 ' : ''
  // O primeiro dígito do corpo fica à mostra (o `9` do celular): é o que
  // distingue celular de fixo sem entregar o número.
  return `${prefixo}${ddd} ${corpo.slice(0, 1)}${escondidos}-${fim}`
}
