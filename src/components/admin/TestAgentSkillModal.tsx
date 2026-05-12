// ─── Test Agent Skill (Oryon staff) ────────────────────────────────────────
// Opens the SkillTemplateTester inside a modal, seeded with the agent_skill's
// saved config. Operator can tweak config/inputs and fire a real test against
// the n8n webhook — without leaving the agent context.
//
// Note: the test endpoint (POST /skill-templates/:id/test) operates at the
// template level, not the attached instance. We don't send agent/tenant
// context to n8n on test fires today; that would need a new endpoint
// (POST /configs/:agentId/skills/:skillId/test) — deferred to a later phase.

import { useMemo } from 'react'
import { Modal } from '@/components/ui/Modal'
import { SkillTemplateTester } from './SkillTemplateTester'
import type { AgentSkillWithTemplate, SkillTemplate } from '@/types/skills'

interface Props {
  open: boolean
  onClose: () => void
  skill: AgentSkillWithTemplate
}

export function TestAgentSkillModal({ open, onClose, skill }: Props) {
  // Re-shape AgentSkillWithTemplate into a SkillTemplate for the tester.
  // Only the fields the tester actually reads are required; we leave the
  // template-only metadata (version, prompt_fragment, etc.) at sane defaults
  // because the tester ignores them.
  const template = useMemo<SkillTemplate>(() => ({
    id: skill.template_id,
    slug: skill.template_slug,
    name: skill.template_name,
    description: skill.template_description,
    category: skill.template_category,
    llm_name: skill.template_llm_name,
    llm_description: skill.template_llm_description,
    input_schema: skill.template_input_schema,
    config_schema: skill.template_config_schema,
    webhook_path: skill.template_webhook_path,
    http_method: skill.template_http_method,
    timeout_ms: skill.template_timeout_ms,
    mutates: skill.template_mutates,
    tenant_id: null,
    version: 1,
    enabled: skill.template_enabled,
    prompt_fragment: null,
    created_at: skill.created_at,
    updated_at: skill.updated_at,
  }), [skill])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Testar — ${skill.template_name}`}
      className="max-w-3xl"
    >
      <p className="text-[11px] text-surface-500 mb-4">
        Config pré-preenchido com os valores salvos deste agente. Você pode ajustar antes de disparar —
        nada do que você mudar aqui é salvo no agente.
      </p>
      <SkillTemplateTester
        template={template}
        initialConfig={skill.config}
      />
    </Modal>
  )
}
