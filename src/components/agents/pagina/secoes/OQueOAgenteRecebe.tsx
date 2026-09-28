import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { getEffectivePrompt, type AgentConfigWithTools, type EffectivePrompt } from '@/services/agentsApi'
import { Banner } from '@/components/ui/Banner'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * "Ver o que o agente recebe" (onda 3). Antes, o prompt era montado em três
 * lugares e ninguém via o resultado. Aqui aparece, camada por camada, o que o
 * modelo recebe — montado pelo mesmo caminho do /chat (dry_run), não por uma
 * cópia que poderia divergir.
 */
export function OQueOAgenteRecebe({ agent, tamanho }: { agent: AgentConfigWithTools; tamanho: 'sm' | 'md' }) {
  const [aberto, setAberto] = useState(false)
  const [dados, setDados] = useState<EffectivePrompt | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!aberto) return
    let vivo = true
    setDados(null)
    setErro(null)
    getEffectivePrompt(agent)
      .then((d) => { if (vivo) setDados(d) })
      .catch((e: unknown) => { if (vivo) setErro(e instanceof Error ? e.message : 'Não foi possível montar.') })
    return () => { vivo = false }
  }, [aberto, agent])

  return (
    <>
      <Button variant="ghost" size={tamanho} leftIcon={<Eye className="h-3.5 w-3.5" />} onClick={() => setAberto(true)}>
        Ver o que o agente recebe
      </Button>
      <Modal open={aberto} onClose={() => setAberto(false)} title="O que o agente recebe" className="max-w-3xl" fillHeight>
        <div className="space-y-4 text-sm">
          <p className="text-surface-400">
            O que o modelo lê antes de cada resposta, na ordem em que lê. É o que a bancada de teste usa e o que o
            atendimento usa quando a montagem única estiver ligada. A conversa e o estado dela entram depois disto.
          </p>
          {erro && (
            <Banner variant="danger">
              Não foi possível montar agora ({erro}). O servidor dos agentes pode estar numa versão anterior.
            </Banner>
          )}
          {!dados && !erro && (
            <div className="space-y-3" aria-label="Montando">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}
          {dados && (
            <>
              {dados.layers.map((camada) => (
                <section key={camada.id} className="overflow-hidden rounded-lg border border-surface-700">
                  <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-surface-700 bg-[var(--sf2)] px-4 py-2">
                    <h3 className="text-sm font-semibold text-surface-100">{camada.title}</h3>
                    <span className="text-xs text-surface-500">{camada.source}</span>
                  </header>
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words px-4 py-3 font-mono text-xs leading-relaxed text-surface-300">
                    {camada.text}
                  </pre>
                </section>
              ))}
              <section>
                <h3 className="mb-2 text-sm font-semibold text-surface-100">
                  Ferramentas disponíveis <span className="font-normal text-surface-500">({dados.tools.length})</span>
                </h3>
                {dados.tools.length === 0 ? (
                  <p className="text-surface-400">Nenhuma: o agente só conversa.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {dados.tools.map((t) => (
                      <li key={t.name} className="text-xs">
                        <span className="font-mono text-surface-200">{t.name}</span>
                        <span className="text-surface-500"> — {t.description.split('\n')[0]}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <p className="text-xs text-surface-500">
                {dados.totalChars.toLocaleString('pt-BR')} caracteres de instruções · modelo {dados.model}
              </p>
            </>
          )}
        </div>
      </Modal>
    </>
  )
}
