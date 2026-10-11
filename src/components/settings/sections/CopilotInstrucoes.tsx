import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Lock } from 'lucide-react'
import { SectionHeader } from '../SectionHeader'
import { SettingsSection } from '../SettingsSection'
import { CABECALHO_FIXO } from '../barraDeSalvar'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/contexts/AuthContext'
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase'
import { isAdminTier } from '@/lib/roleHelpers'
import { cn } from '@/lib/utils'
import { useAvisoAoSair } from './useAvisoAoSair'

// ─── Configurações › Copilot (SCRUM-1253, revisão 11/10) ────────────────────
// A base do Copilot voltou para quem não é administrador (decisão do PO):
// as instruções do Copilot, visíveis a todos os papéis que usam o Copilot e no
// celular. Mesma fonte de dados de "Contexto da IA" (useKnowledgeBase), sem
// estado duplicado.
//
// Quem pode ALTERAR: hoje o backend só aceita a gravação da base
// (PATCH /context/knowledge-base) de administradores. Os demais papéis veem
// as instruções e o aviso de quem altera. Quando o backend abrir a gravação
// para outros papéis, basta trocar esta regra.
const podeAlterarInstrucoes = (role?: string | null) => isAdminTier(role)

export function CopilotInstrucoes() {
  const { user } = useAuth()
  const { toast } = useToast()
  const base = useKnowledgeBase(user?.tenantId)
  const admin = isAdminTier(user?.role)
  const podeAlterar = podeAlterarInstrucoes(user?.role)
  const [rascunho, setRascunho] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const pronta = base.carga === 'pronta'
  const valor = rascunho ?? base.kb.instructions
  const sujo = rascunho !== null && rascunho !== base.kb.instructions
  useAvisoAoSair(sujo)

  const salvar = async () => {
    if (!sujo || rascunho === null || !pronta) return
    setSalvando(true)
    try {
      const r = await base.setInstructions(rascunho)
      if (r.ok) {
        setRascunho(null)
        toast('Instruções salvas. O Copilot já usa as novas instruções.', 'success')
      } else {
        toast(r.erro, 'error')
      }
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="w-full">
      <SectionHeader
        title="Copilot"
        description="Como o Copilot responde a você e à equipe. Vale para todas as pessoas da empresa."
        className={CABECALHO_FIXO}
        action={podeAlterar ? (
          <div className="flex items-center gap-3">
            <span className={cn('hidden items-center gap-1.5 text-xs sm:inline-flex', sujo ? 'text-status-pending' : 'text-surface-500')}>
              <span className={cn('h-1.5 w-1.5 rounded-full', sujo ? 'bg-status-pending' : 'bg-surface-500')} aria-hidden />
              {sujo ? 'Alterações não salvas' : 'Salvo'}
            </span>
            <Button onClick={() => void salvar()} loading={salvando} disabled={!pronta || !sujo}>Salvar</Button>
          </div>
        ) : (
          // PO 11/10: só administradores alteram; os demais veem de cara que é leitura.
          <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] border border-surface-700 bg-[var(--sf2)] text-xs font-medium text-surface-300">
            <Lock className="h-3.5 w-3.5" aria-hidden />
            Somente leitura
          </span>
        )}
      />

      <SettingsSection
        title="Instruções para o Copilot"
        description="Tom, formato e o que priorizar nas respostas. Os agentes que atendem clientes seguem a configuração de cada agente."
      >
        {base.carga === 'carregando' ? (
          <p role="status" className="text-xs text-surface-400">Carregando as instruções…</p>
        ) : base.carga === 'erro' ? (
          <div role="alert" className="flex items-center gap-3 rounded-[10px] border border-danger/30 bg-danger/5 px-4 py-3 text-xs text-danger">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden />
            <span className="flex-1">{base.erroCarga ?? 'Não foi possível carregar as instruções do Copilot.'}</span>
            <button type="button" onClick={base.recarregar} className="font-semibold underline underline-offset-2 hover:opacity-80">Tentar de novo</button>
          </div>
        ) : podeAlterar ? (
          <div className="flex flex-col gap-2">
            <Textarea
              value={valor}
              onChange={(e) => setRascunho(e.target.value)}
              rows={6}
              placeholder="Ex.: responda de forma objetiva, em tópicos; quando falar de vendas, traga os números da semana."
              aria-label="Instruções para o Copilot"
            />
            {/* Celular: o cabeçalho esconde o estado; o botão também fica aqui. */}
            <div className="flex items-center justify-end gap-2 sm:hidden">
              {sujo && <span className="text-xs text-status-pending">Não salvo</span>}
              <Button size="sm" onClick={() => void salvar()} loading={salvando} disabled={!sujo}>Salvar</Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="flex items-start gap-2 rounded-[10px] border border-surface-700 bg-[var(--sf2)] px-3 py-2.5 text-xs text-surface-300">
              <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-surface-400" aria-hidden />
              <span>Só administradores podem alterar estas instruções, porque elas valem para toda a equipe. Se algo precisar mudar, fale com um administrador.</span>
            </p>
            {base.kb.instructions.trim() ? (
              <p className="whitespace-pre-wrap rounded-[10px] border border-surface-700 px-3 py-2.5 text-sm text-surface-200" aria-label="Instruções para o Copilot (somente leitura)">{base.kb.instructions}</p>
            ) : (
              <p className="text-sm text-surface-400">Nenhuma instrução definida — o Copilot responde no padrão.</p>
            )}
          </div>
        )}
      </SettingsSection>

      {admin && (
        <SettingsSection
          title="Mais contexto"
          description="Dados da empresa, arquivos e itens que só o Copilot consulta."
        >
          <p className="text-sm text-surface-300">
            O resto do que o Copilot sabe fica em{' '}
            <Link to="/settings/company-brain" className="font-semibold text-accent-dark hover:underline">Contexto da IA</Link>.
          </p>
        </SettingsSection>
      )}
    </div>
  )
}
