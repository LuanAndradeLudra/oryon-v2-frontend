import { useState, useEffect } from 'react'
import { FormField } from '@/components/ui/FormField'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/hooks/useToast'
import { pipelinesApi, usersApi } from '@/services/api'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminTier } from '@/lib/roleHelpers'
import { getApiErrorMessage } from '@/lib/utils'
import type { Pipeline, User } from '@/types'

interface PipelineSalesSettingsProps {
  /** Só faz sentido em `kind='sales'` — o pai (`FunnelsSettings`) já esconde
   *  esta seção inteira em funil de processo (a UI nem oferece o campo). */
  pipeline: Pipeline
  onChanged: () => void
}

const LITERAL_RULES = new Set(['creator', 'none'])

/** Dono padrão (D0-9/12) e multiplicidade (D0-1) — os dois únicos campos que
 *  só existem em funil de vendas. `defaultOwnerRule` decide quem herda o
 *  negócio quando ninguém escolhe um dono (o "Novo negócio"/A3, o read-model/
 *  B1 e a IA/B6 respeitam este default); sem regra, o negócio nasce sem dono. */
export function PipelineSalesSettings({ pipeline, onChanged }: PipelineSalesSettingsProps) {
  const { toast } = useToast()
  const { user: actor } = useAuth()
  const canManage = isAdminTier(actor?.role)

  const [users, setUsers] = useState<User[]>([])
  const [savingOwnerRule, setSavingOwnerRule] = useState(false)
  const [savingMultiple, setSavingMultiple] = useState(false)

  useEffect(() => {
    usersApi.list().then((res) => setUsers(res.data.filter((u) => u.isActive))).catch(() => {})
  }, [])

  const rule = pipeline.defaultOwnerRule ?? 'creator'
  const ruleSelectValue = LITERAL_RULES.has(rule) ? rule : rule.startsWith('user:') ? rule : 'creator'

  const handleOwnerRuleChange = async (value: string) => {
    setSavingOwnerRule(true)
    try {
      await pipelinesApi.update(pipeline.id, { defaultOwnerRule: value })
      toast('Dono padrão atualizado.', 'success')
      onChanged()
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Erro ao atualizar dono padrão.'), 'error')
    } finally {
      setSavingOwnerRule(false)
    }
  }

  const handleMultipleChange = async (checked: boolean) => {
    setSavingMultiple(true)
    try {
      await pipelinesApi.update(pipeline.id, { allowMultipleOpen: checked })
      toast(checked ? 'Multiplicidade ativada.' : 'Multiplicidade desativada.', 'success')
      onChanged()
    } catch (err: unknown) {
      toast(getApiErrorMessage(err, 'Erro ao atualizar multiplicidade.'), 'error')
    } finally {
      setSavingMultiple(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <FormField
        label="Dono padrão do negócio"
        hint="Aplicado quando o negócio nasce sem dono escolhido — 'Novo negócio', a leitura de negócios e a IA respeitam este default."
      >
        <Select
          value={ruleSelectValue}
          onChange={(e) => handleOwnerRuleChange(e.target.value)}
          disabled={!canManage || savingOwnerRule}
        >
          <option value="creator">Quem cria o negócio</option>
          <option value="none">Ninguém (fila "sem dono")</option>
          {users.map((u) => (
            <option key={u.id} value={`user:${u.id}`}>{u.firstName} {u.lastName}</option>
          ))}
        </Select>
      </FormField>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-surface-200">Permitir mais de um negócio aberto por contato</p>
          <p className="text-xs text-surface-500 mt-0.5">
            Desligado (padrão): cada contato tem no máximo 1 negócio aberto neste funil.
          </p>
          {/* O aviso "ainda não afeta a criação" saiu com a C1 (SCRUM-932,
              trava por funil no backend) e a C2 (SCRUM-933, seletor de negócio
              da conversa e "Criar outro" no conflito): ligar isto passou a
              mudar o comportamento de verdade. */}
          <p className="text-[11px] text-surface-500 mt-1">
            Ligado: o mesmo contato pode ter várias propostas abertas aqui, e a conversa passa a pedir
            a qual delas ela se refere.
          </p>
        </div>
        <Switch
          checked={!!pipeline.allowMultipleOpen}
          onChange={handleMultipleChange}
          disabled={!canManage || savingMultiple}
        />
      </div>

    </div>
  )
}
