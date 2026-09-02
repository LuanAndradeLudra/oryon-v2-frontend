// ─── Variáveis de template no envio pelo chat (SCRUM-807) ─────────────────────
// O modal "Revisar template" coleta um valor por placeholder do corpo antes de
// enviar. Estas funções são puras para o comportamento ser testável sem montar
// o MessageInput inteiro.
//
// Dois dialetos de placeholder existem e um template usa um OU outro:
//   • posicional `{{1}}`, `{{2}}` — o normal;
//   • nomeado `{{nome}}` — templates aprovados com `parameter_name`. A API da
//     Meta continua recebendo parâmetros POSICIONAIS (o N-ésimo nome distinto é
//     a variável N), que é a mesma convenção do backend
//     (templates/template-message.util.ts → substitute).
// As chaves dos valores são sempre "1", "2", … — o formato que o
// <TemplatePreview variables> já entende para o preview ao vivo.

import type { WhatsAppTemplate } from '@/types'

export interface TemplateVariableSlot {
  /** "1", "2", … — chave em `values` e posição do parâmetro enviado à Meta. */
  key: string
  /** Texto do placeholder como aparece no corpo: `{{1}}` ou `{{nome}}`. */
  placeholder: string
  /** Rótulo amigável (bodyVariables[i]); cai para o nome do placeholder. */
  label: string
}

const POSITIONAL = /\{\{(\d+)\}\}/g
const NAMED = /\{\{\s*([a-zA-Z_]\w*)\s*\}\}/g

/**
 * Placeholders distintos do corpo, na ordem posicional. Posicionais vêm como
 * "1","2",… (ordenados numericamente, deduplicados — `{{1}}` repetido é UMA
 * variável); nomeados vêm como o próprio nome, na ordem de primeira aparição.
 */
export function templatePlaceholders(body: string): string[] {
  const positional = [...new Set(Array.from(body.matchAll(POSITIONAL), (m) => m[1]))]
  if (positional.length > 0) return positional.sort((a, b) => Number(a) - Number(b))
  return [...new Set(Array.from(body.matchAll(NAMED), (m) => m[1]))]
}

/**
 * Um slot por placeholder do CORPO. Só o corpo conta: `bodyVariables` é apenas
 * a descrição amigável — se o corpo não tem `{{n}}`, não há o que preencher e
 * o backend rejeitaria qualquer variável extra (contagem tem que bater).
 */
export function templateVariableSlots(tpl: Pick<WhatsAppTemplate, 'body' | 'bodyVariables'>): TemplateVariableSlot[] {
  const found = templatePlaceholders(tpl.body ?? '')
  const names = tpl.bodyVariables ?? []
  return found.map((raw, i) => {
    const isNamed = !/^\d+$/.test(raw)
    return {
      key: String(i + 1),
      placeholder: `{{${raw}}}`,
      label: names[i]?.trim() || (isNamed ? raw : 'sem descrição'),
    }
  })
}

/** true quando TODOS os slots têm valor não vazio (espaços não contam). */
export function variablesComplete(slots: TemplateVariableSlot[], values: Record<string, string>): boolean {
  return slots.every((s) => (values[s.key] ?? '').trim().length > 0)
}

/** Lista posicional para o backend (`variables: string[]`), já aparada. */
export function variablesToArray(slots: TemplateVariableSlot[], values: Record<string, string>): string[] {
  return slots.map((s) => (values[s.key] ?? '').trim())
}
