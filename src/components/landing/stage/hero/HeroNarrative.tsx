import { AnimatePresence, motion } from 'framer-motion'
import { Bot, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { HeroState } from './heroStory'

/**
 * A CAMADA EDITORIAL do palco.
 *
 * A versão anterior deixava a explicação numa nota de 13px abaixo da
 * demonstração — o visitante via a interface mudar e não sabia dizer o que
 * tinha ganhado com isso. Aqui a frase é parte da composição: entra ANTES da
 * ação que descreve, fica durante a leitura e sai quando o resultado já se
 * explica.
 *
 * Não é legenda de slide: não tem número, não tem régua, não muda a cada
 * estado. Cinco frases cobrem os cinco momentos em que a demonstração entrega
 * valor; nos estados intermediários a frase corrente permanece.
 *
 * Cada uma é uma promessa que a tela ao lado cumpre no mesmo instante, e todas
 * foram conferidas contra a auditoria de capacidades do agente — o que a IA
 * não pode fazer não é prometido aqui.
 */

export interface HeroNarrative {
  eyebrow: string
  title: string
  description: string
  actor: 'ia' | 'humano'
}

const NARRATIVAS: Partial<Record<HeroState, HeroNarrative>> = {
  inicio: {
    eyebrow: 'Atendimento no WhatsApp',
    title: 'Cada conversa chega a um agente que já conhece o cliente',
    description: 'O histórico anterior continua ali, e o atendimento não recomeça do zero.',
    actor: 'ia',
  },
  resposta: {
    eyebrow: 'Agente IA',
    title: 'A IA entende o pedido e responde na hora',
    description: 'A resposta usa o conhecimento do negócio para orientar o cliente, com preço e condição.',
    actor: 'ia',
  },
  situacao: {
    eyebrow: 'Contexto',
    title: 'Cada conversa vira contexto para o CRM',
    description: 'A situação do contato e as etiquetas são atualizadas enquanto o atendimento acontece.',
    actor: 'ia',
  },
  avanco: {
    eyebrow: 'Funil de vendas',
    title: 'A oportunidade avança junto com o atendimento',
    description: 'O mesmo negócio passa de Qualificação para Proposta, e os totais da etapa se refazem.',
    actor: 'ia',
  },
  pedido: {
    eyebrow: 'Passagem para a equipe',
    title: 'A pessoa assume no momento certo',
    description: 'A IA chama uma atendente, pausa quando ela entra, e o histórico chega junto.',
    actor: 'humano',
  },
  ganho: {
    eyebrow: 'Desfecho',
    title: 'A equipe termina o que a IA começou',
    description: 'Quem fecha a venda é sempre uma pessoa — e o resultado fica registrado no Funil.',
    actor: 'humano',
  },
}

/** A frase corrente: a última definida até aqui. */
const ORDEM: HeroState[] = [
  'inicio', 'demanda', 'resposta', 'confirma', 'situacao',
  'etiqueta', 'avanco', 'pedido', 'assumido', 'humano', 'ganho',
]

function narrativaDe(at: HeroState): HeroNarrative {
  for (let i = ORDEM.indexOf(at); i >= 0; i--) {
    const n = NARRATIVAS[ORDEM[i]]
    if (n) return n
  }
  return NARRATIVAS.inicio as HeroNarrative
}

export function HeroNarrativeOverlay({ at, className }: { at: HeroState; className?: string }) {
  const n = narrativaDe(at)
  const Icone = n.actor === 'ia' ? Bot : UserRound

  return (
    <div className={cn('relative', className)}>
      {/* Crossfade de verdade, sem `mode="wait"`: com ele o texto que sai
          tinha de terminar antes de o próximo entrar, e sobrava um intervalo
          com a área EM BRANCO — pego numa captura, entre dois títulos. Agora
          os dois coexistem por 450ms, o que sai em camada absoluta para não
          empurrar nada. */}
      <AnimatePresence initial={false}>
        <motion.div
          key={n.title}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, position: 'absolute', top: 0, left: 0 }}
          transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
          className="max-w-[62ch]"
        >
          <p className={cn(
            'inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.12em]',
            // A cor separa quem agiu: o teal da marca é a IA; o verde de
            // handoff é a pessoa. É o mesmo par que o cabeçalho do chat usa.
            n.actor === 'ia' ? 'text-brand-400' : 'text-status-success-400',
          )}>
            <Icone className="w-3.5 h-3.5" />
            {n.eyebrow}
          </p>
          <h2 className="mt-1.5 font-display font-bold text-surface-50 text-[19px] sm:text-[22px] leading-[1.15] text-balance">
            {n.title}
          </h2>
          <p className="mt-1.5 text-[13px] sm:text-sm leading-snug text-surface-400">
            {n.description}
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
