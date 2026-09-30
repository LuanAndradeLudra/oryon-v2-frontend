import { useEffect, useState } from 'react'
import { ListChecks, Pencil, RefreshCw, Sparkles } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from '@/contexts/AuthContext'
import { hubHasContent, injectHubIntoPrompt, isAgentStale, loadHub } from '@/services/companyContextService'
import { getAgentRuntimeFlags, updateAgent, type AgentConfig, type AgentConfigWithTools } from '@/services/agentsApi'
import { AssistenteDeAgente } from '@/components/agents/assistente/AssistenteDeAgente'
import { renderPromptSections } from '@/components/agents/PromptArtifact'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { useToast } from '@/hooks/useToast'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useRascunhoPendente, useSalvamento } from '../salvamentoContexto'
import { CabecalhoDaSecao } from './Estrutura'
import { OQueOAgenteRecebe } from './OQueOAgenteRecebe'
import { AvisoDeFerramentas } from './AvisoDeFerramentas'
import { useTamanhoDeToque } from '../useToque'

const CHAVE = 'instrucoes'

/**
 * Instruções — o texto que a IA lê a cada resposta. Fica em RASCUNHO até a
 * pessoa salvar: auto-save no meio da digitação publicaria frases pela metade
 * para quem está sendo atendido. O rascunho sobrevive à troca de seção.
 */
export function SecaoInstrucoes({ agent, onAtualizar }: { agent: AgentConfigWithTools; onAtualizar: (a: AgentConfig) => void }) {
  const tam = useTamanhoDeToque()
  const movel = useIsMobile()
  const { user } = useAuth()
  const { toast } = useToast()
  const { salvar, lerTexto, guardarTexto } = useSalvamento()
  const guardado = lerTexto(CHAVE)
  const [rascunho, setRascunhoLocal] = useState(guardado ?? agent.system_prompt)
  const [editando, setEditando] = useState(guardado !== undefined)
  const [salvando, setSalvando] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const sujo = rascunho !== agent.system_prompt
  useRascunhoPendente('Instruções', sujo)

  // O texto mudou por fora (ex.: nova versão publicada pela revisão) e ninguém
  // está editando: o rascunho acompanha. Sem isto ele guardava o texto antigo,
  // acusava "alterações não salvas" e Salvar desfazia a publicação.
  useEffect(() => {
    if (!editando) {
      setRascunhoLocal(agent.system_prompt)
      guardarTexto(CHAVE, undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.system_prompt])

  const hub = user?.tenantId ? loadHub(user.tenantId) : null
  // Onda 4 (D8) — agente feito pela especificação recebe a empresa como fonte
  // na montagem; copiar o Hub para o texto duplicaria. Sem "sincronizar".
  const daEspecificacao = typeof (agent.wizard_config as { specVersion?: unknown } | null)?.specVersion === 'number'
  const temHub = hub && !daEspecificacao ? hubHasContent(hub) : false
  const desatualizado = hub && !daEspecificacao ? isAgentStale(agent.updated_at, hub) : false

  // Onda 4 — revisar com o assistente novo (FF_AGENT_SPEC_WIZARD ou ?assistente=novo).
  const [assistenteDisponivel, setAssistenteDisponivel] = useState(
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('assistente') === 'novo',
  )
  const [revisando, setRevisando] = useState(false)
  useEffect(() => {
    let vivo = true
    getAgentRuntimeFlags().then((f) => { if (vivo && f.specWizard) setAssistenteDisponivel(true) }).catch(() => {})
    return () => { vivo = false }
  }, [])

  const setRascunho = (v: string) => {
    setRascunhoLocal(v)
    guardarTexto(CHAVE, v === agent.system_prompt ? undefined : v)
  }

  const descartar = () => {
    setRascunho(agent.system_prompt)
    setEditando(false)
  }

  const gravar = async () => {
    setSalvando(true)
    try {
      const atualizado = await salvar(() => updateAgent(agent.id, { system_prompt: rascunho }))
      guardarTexto(CHAVE, undefined)
      onAtualizar(atualizado)
      setEditando(false)
      toast('Instruções salvas. As próximas respostas já seguem a versão nova.', 'success')
    } catch {
      toast('Não foi possível salvar as instruções.', 'error')
    } finally {
      setSalvando(false)
    }
  }

  const sincronizar = async () => {
    if (!hub || !temHub) return
    setSincronizando(true)
    try {
      const novo = injectHubIntoPrompt(agent.system_prompt, hub)
      const atualizado = await salvar(() => updateAgent(agent.id, { system_prompt: novo }))
      guardarTexto(CHAVE, undefined)
      setRascunhoLocal(novo)
      onAtualizar(atualizado)
    } catch {
      toast('Não foi possível sincronizar com o Contexto da IA.', 'error')
    } finally {
      setSincronizando(false)
    }
  }

  const linhas = (editando ? rascunho : agent.system_prompt).split('\n')

  return (
    <div>
      <CabecalhoDaSecao
        id="instrucoes"
        acoes={editando ? (movel ? undefined : (
          <>
            <Button variant="ghost" size={tam} onClick={descartar} disabled={salvando}>
              {sujo ? 'Descartar alterações' : 'Cancelar'}
            </Button>
            <Button size={tam} onClick={() => void gravar()} disabled={!sujo} loading={salvando}>
              Salvar instruções
            </Button>
          </>
        )) : (
          <Button variant="neutral" size={tam} leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditando(true)}>
            Editar
          </Button>
        )}
      />

      {desatualizado && (
        <Banner
          variant="warning"
          className="mb-4"
          action={
            <Button size={tam} variant="neutral" onClick={() => void sincronizar()} loading={sincronizando} leftIcon={<Sparkles className="h-3.5 w-3.5" />}>
              Sincronizar
            </Button>
          }
        >
          O Contexto da IA mudou depois que estas instruções foram geradas.
        </Banner>
      )}

      {!editando && (
        <AvisoDeFerramentas
          agent={agent}
          tamanho={tam}
          onEditar={() => setEditando(true)}
          onRevisar={assistenteDisponivel ? () => setRevisando(true) : undefined}
        />
      )}

      <div className="overflow-hidden rounded-lg border border-surface-700 bg-[var(--sf2)]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-b border-surface-700 px-4 py-2 text-xs text-surface-400">
          <span className="whitespace-nowrap font-semibold text-surface-200">{editando ? 'Editando' : 'Em uso'}</span>
          <span aria-hidden className="hidden sm:inline">·</span>
          <span className="whitespace-nowrap">atualizadas em {new Date(agent.updated_at).toLocaleDateString('pt-BR')}</span>
          <span className="ml-auto whitespace-nowrap font-mono tabular-nums text-surface-500">{(editando ? rascunho : agent.system_prompt).length.toLocaleString('pt-BR')} caracteres</span>
        </div>
        {editando ? (
          <Textarea
            aria-label="Instruções do agente"
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            rows={24}
            autoFocus
            className="min-h-[60dvh] rounded-none border-0 bg-transparent px-4 py-4 font-sans leading-relaxed focus:ring-0 sm:min-h-[420px] sm:px-5 sm:font-mono sm:text-[13px]"
          />
        ) : agent.system_prompt.trim() ? (
          <div className="flex flex-col gap-3 px-5 py-4 text-sm leading-relaxed text-surface-200">
            {renderPromptSections(linhas)}
          </div>
        ) : (
          <div className="px-5 py-8 text-sm text-surface-400">
            Ainda sem instruções. Clique em Editar para escrever como o agente deve atender.
          </div>
        )}
      </div>

      {!editando && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <OQueOAgenteRecebe agent={agent} tamanho={tam} />
          {assistenteDisponivel && (
            <Button variant="ghost" size={tam} leftIcon={<ListChecks className="h-3.5 w-3.5" />} onClick={() => setRevisando(true)}>
              Revisar com o assistente novo
            </Button>
          )}
          {temHub && !desatualizado && (
            <Button variant="ghost" size={tam} onClick={() => void sincronizar()} loading={sincronizando} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
              Reaplicar o Contexto da IA
            </Button>
          )}
        </div>
      )}
      {/* Celular: editando um texto longo, salvar fica sempre à mão. */}
      {editando && movel && (
        <div className="sticky bottom-0 z-10 -mx-4 mt-4 flex items-center gap-2 border-t border-surface-700 bg-surface-950 px-4 py-3">
          <Button variant="neutral" size="md" className="flex-1" onClick={descartar} disabled={salvando}>
            {sujo ? 'Descartar' : 'Cancelar'}
          </Button>
          <Button size="md" className="flex-1" onClick={() => void gravar()} disabled={!sujo} loading={salvando}>
            Salvar
          </Button>
        </div>
      )}
      <AnimatePresence>
        {revisando && (
          <AssistenteDeAgente
            agentId={agent.id}
            onClose={() => setRevisando(false)}
            onCreated={(a) => { setRevisando(false); onAtualizar(a); toast('Nova versão publicada.', 'success') }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
