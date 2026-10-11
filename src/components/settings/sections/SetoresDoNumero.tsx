import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { Dropdown } from '@/components/ui/Dropdown'
import { departmentsApi } from '@/services/api'
import { useToast } from '@/hooks/useToast'
import { cn, getApiErrorMessage } from '@/lib/utils'
import type { Department, DepartmentPermission } from '@/types'

/** Mesma regra da tela de Setores: quem tem algum módulo de conversa atende. */
const PERMISSOES_DE_CONVERSA: DepartmentPermission[] = ['read_conversations', 'reply_conversations', 'archive_conversations', 'assign_conversations']
const atende = (d: Department) => PERMISSOES_DE_CONVERSA.some((p) => d.permissions?.includes(p))

/**
 * Setores do número, escolhidos no próprio cartão (SCRUM-1253, PO 07/10) —
 * antes era preciso ir a Setores. Cada setor aponta para UM número; vários
 * setores podem usar o mesmo. Por isso:
 *  - marcar liga o setor a este número (se estava em outro, ele muda — o menu diz);
 *  - quem atende conversas não fica sem número (a tela de Setores exige): para
 *    tirar daqui, escolhe-se outro número em Setores;
 *  - setor que não atende conversas não tem o que fazer num número: aparece
 *    travado, com o caminho para ligar o atendimento em Setores.
 */
export function SetoresDoNumero({ numeroId, setores, rotuloDoNumero, onSetorMudou, onMudou }: {
  numeroId: string
  /**
   * A lista de setores vem do pai (WhatsAppNumbers), buscada UMA vez para
   * todos os cartões: antes cada cartão fazia o próprio `departmentsApi.list()`
   * e ficava velho quando outro cartão mudava um setor de número.
   * `null` = carregando.
   */
  setores: Department[] | null
  rotuloDoNumero: (id: string) => string
  /** O setor passou a apontar para este número — o pai atualiza a lista de todos. */
  onSetorMudou: (setorId: string, numeroId: string) => void
  onMudou?: () => void
}) {
  const { toast } = useToast()
  const [aberto, setAberto] = useState(false)
  const [salvando, setSalvando] = useState<string | null>(null)

  const aqui = (setores ?? []).filter((d) => d.whatsappNumberId === numeroId)

  const alternar = async (d: Department) => {
    const ligado = d.whatsappNumberId === numeroId
    if (!atende(d) || ligado) return
    setSalvando(d.id)
    try {
      await departmentsApi.update(d.id, { whatsappNumberId: numeroId })
      onSetorMudou(d.id, numeroId)
      toast(`${d.name} agora atende por este número.`, 'success')
      onMudou?.()
    } catch (err) {
      toast(getApiErrorMessage(err, 'Não foi possível mudar o setor.'), 'error')
    } finally {
      setSalvando(null)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {setores === null ? (
          <span className="text-xs text-surface-500">Carregando…</span>
        ) : aqui.length === 0 ? (
          <span className="text-sm text-surface-400">Nenhum setor</span>
        ) : aqui.map((d) => (
          <span key={d.id} className="inline-flex h-6 items-center gap-1.5 rounded-[6px] border border-surface-700 bg-surface-800 px-2 text-xs font-medium text-surface-200">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: d.color }} aria-hidden />{d.name}
          </span>
        ))}
        <Dropdown
          open={aberto}
          onClose={() => setAberto(false)}
          align="right"
          className="w-72"
          anchor={
            <button
              type="button"
              onClick={() => setAberto((v) => !v)}
              disabled={setores === null}
              className="inline-flex h-6 items-center gap-1 rounded-[6px] px-1.5 text-xs font-semibold text-accent-dark hover:bg-[var(--rowhover)] disabled:opacity-50"
              aria-haspopup="menu"
              aria-expanded={aberto}
            >
              {aqui.length ? 'Alterar' : 'Escolher setores'}<ChevronDown className="h-3 w-3" aria-hidden />
            </button>
          }
        >
          <p className="px-2 pb-1.5 pt-1 text-2xs text-surface-500">Quem atende as conversas deste número</p>
          {(setores ?? []).length === 0 && <p className="px-2 py-2 text-xs text-surface-400">Nenhum setor criado ainda.</p>}
          {(setores ?? []).map((d) => {
            const ligado = d.whatsappNumberId === numeroId
            const emOutro = !!d.whatsappNumberId && !ligado
            const travado = ligado || !atende(d)
            const nota = !atende(d)
              ? 'não atende conversas — ligue o atendimento em Setores'
              : ligado ? 'atende por este número'
              : emOutro ? `está em ${rotuloDoNumero(d.whatsappNumberId!)} — muda para este`
              : 'sem número — passa a atender por este'
            return (
              <button
                key={d.id}
                type="button"
                role="menuitemcheckbox"
                aria-checked={ligado}
                disabled={travado || salvando !== null}
                onClick={() => void alternar(d)}
                title={!atende(d) ? 'Este setor não atende conversas: ligue o atendimento dele em Setores.' : ligado ? 'Para tirar daqui, escolha outro número para o setor em Setores.' : undefined}
                className={cn('flex w-full items-start gap-2 rounded-[6px] px-2 py-1.5 text-left hover:bg-[var(--rowhover)] disabled:cursor-default', travado && 'hover:bg-transparent', !atende(d) && 'opacity-70')}
              >
                <span className={cn('mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[4px] border', ligado ? 'border-transparent bg-[var(--color-btn-primary-bg)] text-white' : 'border-[var(--bd2)]')}>
                  {salvando === d.id ? <Loader2 className="h-3 w-3 animate-spin text-surface-400" /> : ligado && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm text-surface-100">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: d.color }} aria-hidden />{d.name}
                  </span>
                  <span className={cn('block text-2xs', emOutro ? 'text-status-pending' : 'text-surface-500')}>{nota}</span>
                </span>
              </button>
            )
          })}
          <div className="mt-1 border-t border-surface-700 px-2 pt-1.5">
            <Link to="/settings/departments" className="text-xs font-semibold text-accent-dark hover:underline" onClick={() => setAberto(false)}>Criar ou editar setores</Link>
          </div>
        </Dropdown>
      </div>
    </div>
  )
}
