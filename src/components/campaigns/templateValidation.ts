// Client-side mirror of the backend's template validators
// (`backend/src/modules/templates/templates.service.ts`). The backend is
// still the authoritative gate — these checks just let the operator see
// the problem inline instead of waiting for a 400 round-trip.
//
// Keep this file in sync when adding rules on the backend; mismatches are
// fine (frontend can be lighter), but a frontend rule that is *stricter*
// than the backend will silently block valid templates.

import { extractVarPositions } from './constants'

export interface TemplateButtonState {
  type: string
  text: string
  url?: string
  phoneNumber?: string
  flowId?: string
}

export interface TemplateValidationInput {
  name: string
  body: string
  varExamples: string[]
  headerType: string
  headerText: string
  headerMediaUrl: string
  buttons: TemplateButtonState[]
}

export interface TemplateValidationErrors {
  name?: string
  body?: string
  vars?: string
  headerText?: string
  headerMediaUrl?: string
  // General buttons error (count, mix, duplicate text). Shown as a banner
  // at the top of the buttons step.
  buttonsGeneral?: string
  // Per-row error keyed by index — only populated when the row itself is
  // malformed (URL without https, phone not E.164).
  buttonByIndex?: Record<number, string>
}

const NAME_REGEX = /^[a-z0-9_]+$/

export function validateTemplate(input: TemplateValidationInput): TemplateValidationErrors {
  const errors: TemplateValidationErrors = {}

  // ── Name ──────────────────────────────────────────────────────────────
  // The save handler normalises name (trim + lowercase + spaces→_), so we
  // validate the post-normalisation shape. That way the operator sees the
  // error only when the resulting name would actually be rejected — typing
  // "Boas Vindas" is fine because it normalises to "boas_vindas".
  const trimmedName = input.name.trim()
  if (trimmedName) {
    const normalized = trimmedName.toLowerCase().replace(/\s+/g, '_')
    if (!NAME_REGEX.test(normalized)) {
      errors.name = 'Use apenas letras, números, espaços e underscore. Acentos, hífens e pontos não são permitidos.'
    }
  }

  // ── Header TEXT ────────────────────────────────────────────────────────
  if (input.headerType === 'TEXT' && input.headerText) {
    const placeholders = input.headerText.match(/\{\{(\d+)\}\}/g) ?? []
    if (placeholders.length > 1 || (placeholders.length === 1 && placeholders[0] !== '{{1}}')) {
      errors.headerText = 'Header TEXT aceita no máximo uma variável e ela deve ser {{1}}.'
    }
  }

  // ── Header media URL ───────────────────────────────────────────────────
  if (
    ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(input.headerType)
    && input.headerMediaUrl
    && !/^https:\/\//i.test(input.headerMediaUrl)
  ) {
    errors.headerMediaUrl = 'A URL precisa começar com https://. A Meta exige uma amostra pública e segura.'
  }

  // ── Body ──────────────────────────────────────────────────────────────
  if (input.body) {
    const positions = extractVarPositions(input.body)

    // Sequential placeholders starting at 1.
    for (let i = 0; i < positions.length; i++) {
      if (positions[i] !== i + 1) {
        const formatted = positions.map((n) => `{{${n}}}`).join(', ')
        errors.body = `Variáveis devem ser sequenciais começando em {{1}} (encontrado: ${formatted}).`
        break
      }
    }

    // Body cannot start or end with a placeholder.
    if (!errors.body && positions.length > 0) {
      const firstMatch = input.body.match(/\{\{\d+\}\}/)
      if (firstMatch?.index !== undefined) {
        const before = input.body.slice(0, firstMatch.index)
        if (!/[\p{L}\p{N}]/u.test(before)) {
          errors.body = 'O corpo não pode começar com uma variável. Escreva uma saudação antes de {{1}}.'
        }
      }
    }
    if (!errors.body && positions.length > 0) {
      const lastIdx = input.body.lastIndexOf('}}')
      const after = input.body.slice(lastIdx + 2)
      if (!/[\p{L}\p{N}]/u.test(after)) {
        errors.body = 'O corpo não pode terminar com uma variável. Escreva algo depois da última variável.'
      }
    }

    // Meta rejects bodies with too many blank lines in a row.
    if (!errors.body && /\n{5,}/.test(input.body)) {
      errors.body = 'No máximo 4 quebras de linha consecutivas. Compacte o espaçamento.'
    }
  }

  // ── Variable examples ──────────────────────────────────────────────────
  // varExamples is auto-resized by a useEffect on body, so length mismatch
  // shows up only when the body has a non-sequential placeholder set —
  // covered above. Here we just check that all visible slots are filled.
  const positions = extractVarPositions(input.body)
  if (positions.length > 0 && input.varExamples.slice(0, positions.length).some((v) => !v.trim())) {
    errors.vars = 'Preencha um valor de exemplo para cada variável.'
  }

  // ── Buttons ────────────────────────────────────────────────────────────
  if (input.buttons.length > 0) {
    if (input.buttons.length > 3) {
      errors.buttonsGeneral = `Templates HSM aceitam no máximo 3 botões — a Meta rejeita acima disso. Você tem ${input.buttons.length}.`
    } else {
      const types = new Set(input.buttons.map((b) => b.type))
      const hasQR = types.has('QUICK_REPLY')
      const hasCTA = types.has('URL') || types.has('PHONE_NUMBER')
      if (hasQR && hasCTA) {
        errors.buttonsGeneral = 'Não misture botões de Resposta Rápida com URL ou Telefone — escolha um grupo só.'
      }
    }

    if (!errors.buttonsGeneral) {
      const seen = new Set<string>()
      for (const btn of input.buttons) {
        const key = btn.text.trim().toLowerCase()
        if (key && seen.has(key)) {
          errors.buttonsGeneral = `Botões com texto duplicado não são permitidos: "${btn.text}".`
          break
        }
        seen.add(key)
      }
    }

    const byIndex: Record<number, string> = {}
    input.buttons.forEach((btn, i) => {
      if (btn.type === 'URL' && btn.url && !/^https:\/\//i.test(btn.url)) {
        byIndex[i] = 'URL precisa começar com https://.'
      }
      if (btn.type === 'PHONE_NUMBER' && btn.phoneNumber) {
        const stripped = btn.phoneNumber.replace(/[\s-]/g, '')
        if (!/^\+?\d{8,15}$/.test(stripped)) {
          byIndex[i] = 'Use formato internacional (ex.: +5511999998888).'
        }
      }
    })
    if (Object.keys(byIndex).length > 0) {
      errors.buttonByIndex = byIndex
    }
  }

  return errors
}

// Convenience helper for callers that just want a yes/no.
export function isTemplateValid(errors: TemplateValidationErrors): boolean {
  return Object.keys(errors).length === 0
}
