import { SECTORS, TONES, LANGUAGES } from '../steps/constants'
import type { WizardData } from '../types'

/**
 * A linha de resumo que cada etapa concluída mostra no acordeão do Studio
 * ("Sofia · E-commerce", "3 pode · 2 não pode"). É o que permite fechar a
 * etapa sem perder de vista o que foi decidido nela.
 *
 * Puro de propósito: é a regra de "o que resume esta etapa", e é o que dá
 * para travar em teste sem montar componente.
 */

const SEP = ' · '

function rotuloDoSetor(value: string): string {
  return SECTORS.find(s => s.value === value)?.label ?? value
}

function rotuloDoTom(value: string): string {
  return TONES.find(t => t.value === value)?.label ?? value
}

function rotuloDoIdioma(value: string): string {
  return LANGUAGES.find(l => l.value === value)?.label ?? value
}

function juntar(...partes: Array<string | null | undefined>): string {
  return partes.filter((p): p is string => !!p && p.trim().length > 0).join(SEP)
}

function plural(n: number, singular: string, pluralForma = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralForma}`
}

/**
 * Resumo de UMA etapa (1-based, igual ao `step` do `useStudioDraft`).
 * String vazia = etapa ainda sem nada que valha resumir; quem chama decide se
 * mostra um texto de espera no lugar.
 */
export function stepSummary(step: number, data: WizardData): string {
  switch (step) {
    case 1:
      return juntar(data.name.trim(), rotuloDoSetor(data.sector))

    case 2:
      // `language` já vem 'pt-BR' no DEFAULT_DATA, então sozinho ele faria a
      // etapa parecer preenchida antes de a pessoa escolher qualquer coisa.
      // O tom é a decisão real desta etapa; sem ele, não há o que resumir.
      if (!data.tone.trim()) return ''
      return juntar(rotuloDoTom(data.tone), rotuloDoIdioma(data.language))

    case 3: {
      const pode = data.can_do.length
      const naoPode = data.cannot_do.length
      if (pode === 0 && naoPode === 0) return ''
      return `${pode} pode${SEP}${naoPode} não pode`
    }

    case 4:
      return juntar(
        data.company_name.trim(),
        data.faqs.length > 0 ? plural(data.faqs.length, 'FAQ') : null,
      )

    case 5: {
      const ativas = data.handoff_rules.filter(r => r.enabled).length
      return ativas > 0 ? plural(ativas, 'regra') : ''
    }

    case 6: {
      const n = data.knowledge_docs.length
      return n > 0 ? plural(n, 'fonte') : 'nada ainda'
    }

    case 7:
      return data.generated_prompt.trim().length > 0
        ? 'prompt gerado'
        : 'a IA monta o cérebro'

    case 8:
      return 'publicar ou testar'

    default:
      return ''
  }
}
