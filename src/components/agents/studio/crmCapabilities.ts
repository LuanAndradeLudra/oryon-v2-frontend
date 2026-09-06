import { CRM_CAPABILITIES_CATALOG } from '@/components/agents/crmCapabilitiesCatalog'
import type { AgentCrmCapabilityConfig, CrmCapabilityId } from '@/services/agentsApi'
import type { WizardData } from './types'

/**
 * Liga/desliga uma capacidade de CRM no rascunho.
 *
 * Extraído de `steps/Step8Revisao.tsx` porque o card "Capacidades de CRM" do
 * blueprint (A3) liga as mesmas capacidades — e o detalhe que não pode
 * divergir entre os dois é a aplicação dos `defaultConstraints` do catálogo ao
 * habilitar. Eles existem para serem conservadores (o padrão de
 * `manage_conversation_status`, por exemplo, bloqueia "resolved" para o LLM não
 * encerrar conversa sozinho); um caminho que esquecesse de aplicá-los
 * habilitaria a capacidade sem limite nenhum, o que é uma falha silenciosa de
 * segurança, não um detalhe de UI.
 */
export function toggleCrmCapability(
  data: WizardData,
  id: CrmCapabilityId,
  enable: boolean,
): WizardData {
  const entry = CRM_CAPABILITIES_CATALOG.find(c => c.id === id)
  const semEla = data.crm_capabilities.capabilities.filter(c => c.id !== id)

  const capabilities: AgentCrmCapabilityConfig[] = enable
    ? [
        ...semEla,
        {
          id,
          enabled: true,
          ...(entry?.defaultConstraints ? { constraints: entry.defaultConstraints } : {}),
        },
      ]
    : semEla

  return { ...data, crm_capabilities: { capabilities } }
}

/** Se a capacidade está ligada no rascunho. */
export function isCrmCapabilityEnabled(data: WizardData, id: CrmCapabilityId): boolean {
  return data.crm_capabilities.capabilities.some(c => c.id === id && c.enabled)
}

/** Quantas capacidades estão ligadas — é o número que o chip do blueprint mostra. */
export function countEnabledCrmCapabilities(data: WizardData): number {
  return data.crm_capabilities.capabilities.filter(c => c.enabled).length
}
