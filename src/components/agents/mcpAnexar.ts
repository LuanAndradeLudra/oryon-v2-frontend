import type { McpAuthType } from '@/types/mcp'

/** Verificado sempre pede a credencial; manual só quando há autenticação. */
export function mcpPrecisaToken(mode: 'verified' | 'manual', authType: McpAuthType): boolean {
  return mode === 'verified' || authType !== 'none'
}

/**
 * O botão "Anexar" libera? Revisão 02/10: com "Nenhuma (endpoint público)" o
 * campo de token some, mas o botão exigia token sempre — ficava desabilitado
 * para sempre.
 */
export function podeAnexarMcp(f: {
  mode: 'verified' | 'manual'
  authType: McpAuthType
  authValue: string
  templateId: string
  name: string
  endpointUrl: string
  riskAccepted: boolean
}): boolean {
  if (mcpPrecisaToken(f.mode, f.authType) && f.authValue.trim().length === 0) return false
  return f.mode === 'verified'
    ? f.templateId.length > 0
    : f.name.trim().length > 0 && f.endpointUrl.trim().length > 0 && f.riskAccepted
}
