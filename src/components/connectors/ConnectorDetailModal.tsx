import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { X, Clock } from 'lucide-react'
import { useLayer } from '@/contexts/LayerContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Banner } from '@/components/ui/Banner'
import { Tabs } from '@/components/ui/Tabs'
import { ComingSoonBadge } from '@/components/ui/ComingSoonBadge'
import type { Connector } from './connectorsMock'

type TabId = 'overview' | 'how' | 'requirements'

interface ConnectorDetailModalProps {
  connector: Connector
  onClose: () => void
  onConnect: () => void
}

/**
 * "Coluna de identidade" (README §3.10, `3d`) — não é o `Modal` genérico
 * (header título+X padrão): a coluna esquerda tem sua própria identidade e o
 * `×` fecha na MESMA linha das tabs à direita, não numa barra de topo
 * separada. Reimplementa portal + `useLayer` (mesmo mecanismo do `Modal`),
 * igual já feito no popover de evento da Leva 9.
 */
export function ConnectorDetailModal({ connector, onClose, onConnect }: ConnectorDetailModalProps) {
  const semMovimento = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const { zIndex } = useLayer(true, onClose)
  const [tab, setTab] = useState<TabId>('overview')

  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', keyHandler)
    return () => document.removeEventListener('keydown', keyHandler)
  }, [onClose])

  const comingSoon = connector.status === 'comingSoon'
  const blockedByPlan = connector.status === 'business'

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex }} className="flex items-center justify-center p-4">
      <div className="overlay-scrim absolute inset-0" onClick={onClose} aria-hidden />
      <motion.div
        ref={ref}
        role="dialog"
        aria-label={connector.name}
        initial={semMovimento ? false : { opacity: 0, scale: 0.97, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 4 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative z-10 w-[760px] max-w-full h-[460px] max-h-[90vh] bg-surface-900 overlay-frame border rounded-[10px] overflow-hidden flex"
      >
        {/* Coluna de identidade */}
        <div
          style={{ background: `color-mix(in srgb, ${connector.brandColor} ${comingSoon ? 5 : 7}%, var(--color-surface-900))` }}
          className={cn(
            'w-[240px] flex-shrink-0 flex flex-col p-4 border-r',
            comingSoon ? 'border-dashed border-surface-700' : 'border-surface-800',
          )}
        >
          <div
            style={{ boxShadow: comingSoon ? undefined : `inset 0 -3px 0 ${connector.brandColor}` }}
            className="w-[52px] h-[52px] rounded-[10px] bg-white flex items-center justify-center flex-shrink-0"
          >
            <span style={{ color: connector.brandColor, fontSize: 22 }} className="font-extrabold">
              {connector.logoInitial}
            </span>
          </div>
          <h2 className="text-[17px] font-bold text-surface-50 mt-3">{connector.name}</h2>
          <p className="text-2xs text-surface-500 mt-0.5">
            por {connector.vendor}{connector.version ? ` · ${connector.version}` : ''}
          </p>

          <div className="flex flex-wrap gap-1.5 mt-2.5">
            <span className="inline-flex items-center rounded-xs border border-surface-700 bg-surface-800 px-1.5 py-px text-[10.5px] font-medium text-surface-400">
              {connector.category}
            </span>
            {comingSoon ? (
              <ComingSoonBadge />
            ) : (
              <span
                className="color-chip inline-flex items-center rounded-xs border px-1.5 py-px text-[10.5px] font-semibold"
                style={{ ['--chip' as string]: connector.status === 'installed' ? 'var(--color-success)' : 'var(--color-brand-500)' }}
              >
                {connector.status === 'installed' ? 'Instalado' : 'Disponível'}
              </span>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto mt-3.5 divide-y divide-surface-800/70">
            {comingSoon ? (
              <FichaRow label="Fila" value={`${connector.requestCount ?? 0} clientes pediram`} />
            ) : (
              <>
                {connector.auth && <FichaRow label="Autenticação" value={connector.auth} />}
                {connector.dataAccessed && <FichaRow label="Dados acessados" value={connector.dataAccessed} />}
                {connector.sync && <FichaRow label="Sincronização" value={connector.sync} />}
                {connector.planRequirement && <FichaRow label="Plano" value={connector.planRequirement} />}
              </>
            )}
          </div>

          <Button
            size="md"
            variant={comingSoon ? 'neutral' : connector.status === 'installed' ? 'neutral' : 'primary'}
            className="w-full mt-3 flex-shrink-0"
            leftIcon={comingSoon ? <Clock className="w-3.5 h-3.5" /> : undefined}
            onClick={onConnect}
          >
            {comingSoon ? 'Priorizar' : connector.status === 'installed' ? 'Gerenciar' : blockedByPlan ? 'Ver planos' : 'Conectar'}
          </Button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between pr-3 flex-shrink-0">
            <Tabs
              label="Seções do conector"
              className="px-3 border-b-0"
              value={tab}
              onChange={setTab}
              tabs={[
                { id: 'overview', label: 'Visão geral' },
                { id: 'how', label: 'Como funciona' },
                { id: 'requirements', label: 'Requisitos' },
              ]}
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="w-7 h-7 rounded-md flex items-center justify-center text-surface-400 hover:bg-surface-800 hover:text-surface-100 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="border-b border-surface-800/60 flex-shrink-0" />

          <div className="flex-1 overflow-y-auto px-5 py-[18px] text-[13px] leading-[1.55] text-surface-300">
            {blockedByPlan && (
              <Banner variant="warning" className="mb-4">
                Disponível no plano Business — o conteúdo abaixo continua legível, conectar exige upgrade.
              </Banner>
            )}
            {comingSoon && (
              <Banner variant="neutral" className="mb-4">
                Ainda não construída. Ao priorizar, você recebe um aviso quando ficar disponível — e o pedido conta na nossa fila.
              </Banner>
            )}

            {tab === 'overview' && (
              <>
                <p>{connector.howItWorks}</p>
                {connector.capabilities.length > 0 && (
                  <>
                    <p className="text-2xs font-bold uppercase tracking-wide text-surface-500 mt-5 mb-2.5">
                      O que o agente passa a fazer
                    </p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {connector.capabilities.map((c) => (
                        <div
                          key={c.title}
                          className={cn(
                            'rounded-[7px] border p-2.5',
                            comingSoon ? 'border-dashed border-surface-700' : 'border-surface-800 bg-surface-800/40',
                          )}
                        >
                          <p className="text-xs font-semibold text-surface-200">{c.title}</p>
                          <p className="text-2xs text-surface-500 mt-0.5 leading-relaxed">{c.description}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {tab === 'how' && (
              <ol className="list-decimal list-inside space-y-2">
                {connector.auth && <li>Autentica via {connector.auth.toLowerCase()}.</li>}
                {connector.sync && <li>Sincroniza dados a cada {connector.sync.toLowerCase()}.</li>}
                <li>Os agentes chamam as capacidades acima durante a conversa, sem sair do WhatsApp.</li>
              </ol>
            )}

            {tab === 'requirements' && (
              <div className="grid grid-cols-[140px_1fr] gap-y-2.5">
                <span className="text-surface-500">Autenticação</span>
                <span>{connector.auth ?? '—'}</span>
                <span className="text-surface-500">Dados acessados</span>
                <span>{connector.dataAccessed ?? '—'}</span>
                <span className="text-surface-500">Sincronização</span>
                <span>{connector.sync ?? '—'}</span>
                <span className="text-surface-500">Plano</span>
                <span>{connector.planRequirement ?? 'Todos'}</span>
              </div>
            )}
          </div>

          {(connector.socialProof || connector.guideUrl) && (
            <div className="flex items-center justify-between gap-3 px-5 py-2.5 border-t border-surface-800/60 text-2xs text-surface-500 flex-shrink-0">
              <span>{connector.socialProof}</span>
              {connector.guideUrl && (
                <a href={connector.guideUrl} className="text-brand-400 hover:text-brand-300 font-medium">
                  Guia de conexão ↗
                </a>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body,
  )
}

function FichaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2 first:pt-0">
      <p className="text-2xs text-surface-500">{label}</p>
      <p className="text-xs text-surface-300 mt-0.5">{value}</p>
    </div>
  )
}
