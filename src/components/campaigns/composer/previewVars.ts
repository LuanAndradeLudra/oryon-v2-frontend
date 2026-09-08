// ─── previewVars ───────────────────────────────────────────────────────────
// Resolve as variáveis do template contra um contato REAL, para a prévia do
// telefone (`ComposerPhonePreview`).
//
// É a diferença entre esta prévia e as duas que já existem: o
// `Step3Variaveis` e o `Step5Revisao` substituem `{{1}}` pelo RÓTULO do campo
// ("Nome do contato"), porque ali a pergunta é "de onde vem o dado". No
// Composer a pergunta é outra — "como a mensagem chega" —, e o mockup §D2 é
// explícito: o telefone renderiza o template *com dados reais do contato*.
//
// Arquivo próprio e não co-locado no componente por causa do
// `react-refresh/only-export-components`: um módulo que exporta componente e
// função perde o fast refresh.
import { CONTACT_FIELDS } from './constants'
import type { CampaignVariableMapping, Contact } from '@/types'

/** Só os campos que o mapeador oferece. Sem esta trava, um `contactField`
 *  desconhecido leria qualquer propriedade do contato — inclusive `tenantId`
 *  ou `waId` — e mostraria na mensagem um dado que o operador nunca escolheu. */
const OFFERED_FIELDS = new Set(CONTACT_FIELDS.map((f) => f.value))

function readContactField(contact: Contact, field: string | undefined): string {
  if (!field || !OFFERED_FIELDS.has(field)) return ''
  const raw = (contact as unknown as Record<string, unknown>)[field]
  return typeof raw === 'string' ? raw : ''
}

/** Mapa `{ '1': 'Marina' }` no formato que o `TemplatePreview` consome.
 *
 *  VALOR VAZIO NÃO ENTRA NO MAPA, de propósito: a chave ausente faz o
 *  `TemplatePreview` manter o `{{n}}` à mostra. É a informação que interessa
 *  ao operador — este contato não tem esse dado —, e evita inventar o
 *  fallback "cliente" que o mockup mostra: ele não existe em
 *  `CampaignVariableMapping` nem no envio, então escrevê-lo aqui prometeria
 *  na prévia um comportamento que o backend não tem. */
export function resolvePreviewVars(
  mappings: CampaignVariableMapping[],
  contact: Contact | null,
): Record<string, string> {
  const vars: Record<string, string> = {}
  mappings.forEach((m) => {
    // `literal` é o mesmo texto para todo mundo: resolve mesmo sem contato.
    const value =
      m.source === 'literal'       ? (m.literal ?? '') :
      contact === null             ? '' :
      m.source === 'contact_field' ? readContactField(contact, m.contactField)
                                   : (contact.customFields?.find((f) => f.key === m.customFieldKey)?.value ?? '')
    if (value) vars[String(m.position)] = value
  })
  return vars
}

/** "Marina Torres" → "Marina T.", como o rótulo do seletor no mockup §D2.
 *  Nome de uma palavra fica inteiro; string vazia devolve vazio (quem chama
 *  decide o que mostrar no lugar). */
export function shortName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}
