import { useCallback, useEffect, useState } from 'react'
import { api } from '@/services/api'
import { useToast } from '@/hooks/useToast'
import { getApiErrorMessage } from '@/lib/utils'
import { Switch } from '@/components/ui/Switch'
import { ErrorState } from '@/components/ui/ErrorState'
import { SectionHeader } from '../SectionHeader'
import { SettingsSection } from '../SettingsSection'

/**
 * Encerramento por inatividade (auditoria do Dashboard, 12/11/2026 — decisão D5 do João).
 *
 * Conversas pendentes ou abertas em que nem o paciente nem uma pessoa da equipe escreveu pelo
 * prazo escolhido vão para "Arquivadas" uma vez por dia, com registro na linha do tempo. Reabrem
 * sozinhas se o paciente escrever. Ligado por padrão, 7 dias. Sem isso, o estoque antigo inflava
 * a fila e os números do Dashboard (Itaipava chegou a 1.205 "esperando").
 */
interface Inatividade {
  enabled: boolean
  days: number
  pending: number
  open: number
  oldest: string | null
}

export const PRAZOS_DE_INATIVIDADE = [3, 7, 15, 30]

export function InactivitySettings() {
  const { toast } = useToast()
  const [dados, setDados] = useState<Inatividade | null>(null)
  const [erro, setErro] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get<Inatividade>('/settings/inactivity')
      setDados(data)
      setErro(false)
    } catch {
      setErro(true)
    }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  const salvar = async (mudanca: Partial<Pick<Inatividade, 'enabled' | 'days'>>) => {
    setSalvando(true)
    try {
      const { data } = await api.put<Inatividade>('/settings/inactivity', mudanca)
      setDados(data)
      toast('Encerramento por inatividade atualizado.', 'success')
    } catch (e) {
      toast(getApiErrorMessage(e, 'Não foi possível salvar.'), 'error')
    } finally {
      setSalvando(false)
    }
  }

  const header = (
    <SectionHeader
      title="Encerramento por inatividade"
      description="Arquiva sozinho as conversas paradas, para a fila e o Dashboard mostrarem só o que está em atendimento."
    />
  )
  if (erro) return <div>{header}<ErrorState onRetry={() => void carregar()} /></div>
  if (!dados) return <div aria-busy="true">{header}<div className="h-40 rounded-[10px] bg-surface-800 animate-pulse" /></div>

  const total = dados.pending + dados.open
  return (
    <div>
      {header}
      <SettingsSection
        title="Arquivar conversas paradas"
        description="Pendentes ou abertas sem mensagem do paciente nem da equipe pelo prazo abaixo vão para Arquivadas, uma vez por dia. Mensagens da IA, automáticas e de campanha não contam. Se o paciente escrever, a conversa reabre sozinha."
      >
        <label className="flex items-center gap-3 text-sm text-surface-200">
          <Switch
            checked={dados.enabled}
            onChange={(v) => void salvar({ enabled: v })}
            disabled={salvando}
            aria-label="Arquivar conversas paradas"
          />
          {dados.enabled ? 'Ligado' : 'Desligado'}
        </label>
      </SettingsSection>

      <SettingsSection
        title="Prazo sem mensagem"
        description="O mesmo prazo do Dashboard: depois dele, a conversa sai da fila de agora."
      >
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Prazo sem mensagem">
          {PRAZOS_DE_INATIVIDADE.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={dados.days === d}
              disabled={salvando}
              onClick={() => dados.days !== d && void salvar({ days: d })}
              className={
                dados.days === d
                  ? 'h-8 px-3 rounded-[6px] text-sm font-semibold bg-[var(--ink-bg)] bg-(image:--ink-grad) text-[var(--ink-fg)]'
                  : 'h-8 px-3 rounded-[6px] text-sm font-semibold border border-[var(--bd2)] text-surface-300 hover:bg-[var(--rowhover)]'
              }
            >
              {d} dias
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection
        title="O que seria arquivado agora"
        description="Cada conversa arquivada fica registrada na linha do tempo com o status anterior, e pode ser desfeita."
      >
        <p className="text-sm text-surface-200" data-testid="inatividade-previa">
          {total === 0
            ? `Nenhuma conversa parada há mais de ${dados.days} dias.`
            : `${total.toLocaleString('pt-BR')} ${total === 1 ? 'conversa' : 'conversas'} (${dados.pending.toLocaleString('pt-BR')} pendentes, ${dados.open.toLocaleString('pt-BR')} abertas) sem mensagem há mais de ${dados.days} dias${dados.oldest ? `, a mais antiga de ${new Date(dados.oldest).toLocaleDateString('pt-BR')}` : ''}.`}
        </p>
        {dados.enabled && total > 0 && (
          <p className="mt-1 text-xs text-surface-500">Serão arquivadas na próxima execução diária.</p>
        )}
      </SettingsSection>
    </div>
  )
}
