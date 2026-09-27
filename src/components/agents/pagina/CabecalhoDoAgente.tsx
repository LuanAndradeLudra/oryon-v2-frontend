import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Copy, FileText, MoreHorizontal, Pencil, Sparkles, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { deleteAgent, updateAgent, type AgentConfig, type AgentConfigWithTools } from '@/services/agentsApi'
import { AgentIcon } from '@/components/agents/AgentIcons'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/Dropdown'
import { ConfirmModal, Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { useToast } from '@/hooks/useToast'
import { IndicadorDeSalvamento } from './SalvamentoDoAgente'
import { useSalvamento } from './salvamentoContexto'
import { StatusDoAgente } from './StatusDoAgente'

/**
 * Cabeçalho de identidade: quem é o agente, em que número atende e se está
 * ligado. O status muda num lugar só — o interruptor Ligado. "Voltar para
 * rascunho" e "Excluir" ficam no menu, porque são raros.
 */
export function CabecalhoDoAgente({
  agent, onAtualizar, testado, testeAberto, onAlternarTeste, movel = false,
}: {
  agent: AgentConfigWithTools
  onAtualizar: (a: AgentConfig) => void
  testado: boolean
  testeAberto: boolean
  onAlternarTeste: () => void
  /** Celular: cabeçalho da casca móvel (seta, nome, Testar, menu) + faixa de
   *  identidade com o interruptor Ligado. */
  movel?: boolean
}) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { salvar } = useSalvamento()
  const [menu, setMenu] = useState(false)
  const [confirmar, setConfirmar] = useState<null | 'rascunho' | 'excluir'>(null)
  const [ocupado, setOcupado] = useState(false)
  const [novoNome, setNovoNome] = useState<string | null>(null)
  const numero = agent.channels?.whatsapp?.number

  const mudarStatus = async (status: AgentConfig['status']) => {
    setOcupado(true)
    try {
      const atualizado = await salvar(() => updateAgent(agent.id, { status }))
      onAtualizar(atualizado)
    } catch {
      toast('Não foi possível mudar o status do agente.', 'error')
    } finally {
      setOcupado(false)
    }
  }

  const excluir = async () => {
    setOcupado(true)
    try {
      await deleteAgent(agent.id, agent.name)
      toast(`Agente "${agent.name}" excluído.`, 'success')
      navigate('/agents', { replace: true })
    } catch {
      toast('Não foi possível excluir o agente.', 'error')
      setOcupado(false)
      setConfirmar(null)
    }
  }

  const itensDoMenu = (
    <>
      {movel && (
        <DropdownItem icon={Pencil} onClick={() => { setMenu(false); setNovoNome(agent.name) }}>
          Renomear
        </DropdownItem>
      )}
      <DropdownItem icon={Copy} onClick={() => { setMenu(false); void navigator.clipboard?.writeText(agent.name).catch(() => {}) }}>
        Copiar nome
      </DropdownItem>
      {agent.status !== 'draft' && (
        <DropdownItem icon={FileText} onClick={() => { setMenu(false); setConfirmar('rascunho') }}>
          Voltar para rascunho
        </DropdownItem>
      )}
      <DropdownSeparator />
      <DropdownItem icon={Trash2} danger onClick={() => { setMenu(false); setConfirmar('excluir') }}>
        Excluir agente
      </DropdownItem>
    </>
  )

  const modais = (
    <>
        <ConfirmModal
          open={confirmar === 'rascunho'}
          onClose={() => setConfirmar(null)}
          onConfirm={() => { setConfirmar(null); void mudarStatus('draft') }}
          title="Voltar para rascunho"
          description="O agente deixa de responder conversas até ser ligado de novo. Nada da configuração se perde."
          impact={{ label: `Agente "${agent.name}"`, tone: 'warning' }}
          confirmLabel="Voltar para rascunho"
        />
        <ConfirmModal
          open={confirmar === 'excluir'}
          onClose={() => setConfirmar(null)}
          onConfirm={() => void excluir()}
          title="Excluir agente"
          description="O agente, as instruções, as regras e a base de conhecimento dele são apagados. Isso não pode ser desfeito."
          impact={{ label: `Agente "${agent.name}"`, tone: 'danger' }}
          confirmLabel="Excluir agente"
          danger
          loading={ocupado && confirmar === 'excluir'}
        />
      <Modal open={novoNome !== null} onClose={() => setNovoNome(null)} title="Renomear agente" className="max-w-sm">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            const v = (novoNome ?? '').trim()
            if (!v || v === agent.name) { setNovoNome(null); return }
            salvar(() => updateAgent(agent.id, { name: v }))
              .then((a) => { onAtualizar(a); setNovoNome(null) })
              .catch(() => toast('Não foi possível renomear o agente.', 'error'))
          }}
        >
          <FormField label="Nome">
            <Input autoFocus value={novoNome ?? ''} onChange={(e) => setNovoNome(e.target.value)} />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="neutral" onClick={() => setNovoNome(null)}>Cancelar</Button>
            <Button type="submit">Salvar</Button>
          </div>
        </form>
      </Modal>
    </>
  )

  if (movel) {
    return (
      <>
        <MobilePageHeader
          title={agent.name}
          onBack={() => navigate('/agents')}
          hideBell
          className="sticky top-0 z-20"
          rightActions={
            <>
              <Button
                size="md"
                iconOnly
                variant={!testado ? 'primary' : 'ghost'}
                aria-label="Testar o agente"
                aria-pressed={testeAberto}
                onClick={onAlternarTeste}
              >
                <Sparkles className="w-[18px] h-[18px]" />
              </Button>
              <Dropdown
                open={menu}
                onClose={() => setMenu(false)}
                align="right"
                className="w-56"
                anchor={
                  <Button size="md" variant="ghost" iconOnly aria-label="Mais ações" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                }
              >
                {itensDoMenu}
              </Dropdown>
            </>
          }
        />
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-surface-700 px-4 py-3">
          <AgentIcon iconId={agent.icon} dashed={agent.status === 'draft'} className="w-10 h-10" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusDoAgente status={agent.status} />
              {!testado && (
                <button
                  type="button"
                  onClick={onAlternarTeste}
                  className="inline-flex items-center gap-1 min-h-7 px-2 rounded-xs text-2xs font-semibold whitespace-nowrap bg-status-pending-bg text-status-pending border border-status-pending-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <Sparkles className="w-3 h-3" aria-hidden />
                  Ainda não testado · Testar agora
                </button>
              )}
            </div>
            {(agent.objective || numero) && (
              <p className="mt-1 line-clamp-2 text-xs leading-snug text-surface-400">
                {numero && <span className="tabular-nums">{numero}</span>}
                {numero && agent.objective && ' · '}
                {agent.objective}
              </p>
            )}
          </div>
          <label className="flex flex-shrink-0 flex-col items-center gap-1 text-2xs font-semibold text-surface-300">
            <Switch
              checked={agent.status === 'active'}
              disabled={ocupado}
              onChange={(ligar) => void mudarStatus(ligar ? 'active' : 'paused')}
            />
            {agent.status === 'active' ? 'Ligado' : 'Desligado'}
          </label>
        </div>
        {modais}
      </>
    )
  }

  return (
    <header className="flex items-center gap-3.5 px-6 py-4 border-b border-surface-700 flex-shrink-0">
      <AgentIcon iconId={agent.icon} dashed={agent.status === 'draft'} className="w-10 h-10" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <NomeEditavel
            valor={agent.name}
            onSalvar={async (name) => onAtualizar(await salvar(() => updateAgent(agent.id, { name })))}
          />
          <StatusDoAgente status={agent.status} />
          {numero && (
            <span className="hidden xl:inline-flex items-center h-5 px-[7px] rounded-xs border border-surface-700 bg-[var(--sf2)] text-2xs font-medium text-surface-400 tabular-nums whitespace-nowrap">
              WhatsApp · {numero}
            </span>
          )}
          {!testado && (
            <span className="inline-flex items-center h-5 px-[7px] rounded-xs text-2xs font-semibold whitespace-nowrap bg-status-pending-bg text-status-pending border border-status-pending-border">
              Ainda não testado
            </span>
          )}
        </div>
        {agent.objective && (
          <p className="mt-1 text-xs text-surface-400 truncate">{agent.objective}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <IndicadorDeSalvamento className="hidden lg:inline-flex mr-1" />
        <Button
          size="sm"
          variant={!testado && !testeAberto ? 'primary' : 'neutral'}
          onClick={onAlternarTeste}
          aria-pressed={testeAberto}
          leftIcon={<Sparkles className="w-3.5 h-3.5" />}
        >
          {testeAberto ? 'Fechar teste' : 'Testar'}
        </Button>
        <label className="inline-flex items-center gap-2 h-7 pl-2.5 pr-2 rounded-sm border border-[var(--bd2)] text-xs font-semibold text-surface-100 cursor-pointer">
          {agent.status === 'active' ? 'Ligado' : 'Desligado'}
          <Switch
            checked={agent.status === 'active'}
            disabled={ocupado}
            onChange={(ligar) => void mudarStatus(ligar ? 'active' : 'paused')}
          />
        </label>
        <Dropdown
          open={menu}
          onClose={() => setMenu(false)}
          align="right"
          className="w-56"
          anchor={
            <Button size="sm" variant="neutral" iconOnly aria-label="Mais ações" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          }
        >
          {itensDoMenu}
        </Dropdown>
      </div>

      {modais}
    </header>
  )
}

/** Nome do agente, editável no lugar (Enter salva, Esc desiste). */
function NomeEditavel({ valor, onSalvar }: { valor: string; onSalvar: (v: string) => Promise<void> }) {
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState(valor)
  const [salvando, setSalvando] = useState(false)

  const confirmar = async () => {
    const v = rascunho.trim()
    if (!v || v === valor) { setEditando(false); return }
    setSalvando(true)
    try { await onSalvar(v); setEditando(false) } catch { /* o indicador de salvamento mostra o erro */ } finally { setSalvando(false) }
  }

  if (editando) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <Input
          size="sm"
          autoFocus
          aria-label="Nome do agente"
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void confirmar(); if (e.key === 'Escape') setEditando(false) }}
          className="w-64 font-display font-bold text-sm"
        />
        <Button size="sm" iconOnly variant="primary" aria-label="Salvar nome" loading={salvando} onClick={() => void confirmar()}>
          <Check className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" iconOnly variant="ghost" aria-label="Cancelar" onClick={() => setEditando(false)}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => { setRascunho(valor); setEditando(true) }}
      className={cn(
        'group inline-flex items-center gap-1.5 min-w-0 rounded-sm text-left',
        'font-display text-lg font-bold tracking-[-0.015em] text-surface-50 leading-tight',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
      )}
      title="Renomear"
    >
      <span className="truncate">{valor}</span>
      <Pencil className="w-3.5 h-3.5 flex-shrink-0 text-surface-500 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" aria-hidden />
    </button>
  )
}
