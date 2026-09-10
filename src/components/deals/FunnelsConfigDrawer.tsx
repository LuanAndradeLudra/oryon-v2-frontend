import { AnimatePresence, motion } from 'framer-motion'
import { X, ArrowUpRight } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { FunnelsSettings } from '@/components/settings/sections/crm/FunnelsSettings'
import { comVolta } from '@/lib/voltarPara'

interface Props {
  open: boolean
  onClose: () => void
}

/**
 * Configuração de funis em PAINEL, ao lado do quadro.
 *
 * A necessidade nasce olhando o funil — "falta uma etapa entre Proposta e
 * Fechamento", "este motivo de perda não existe" —, e sair da tela para
 * resolver custa o contexto inteiro: a aba, o filtro, a rolagem, o card que se
 * estava lendo. O painel resolve ao lado e devolve o quadro intacto ao fechar.
 *
 * Por dentro é o MESMO `FunnelsSettings` de /settings, não uma segunda
 * implementação — criar funil, renomear, etapas, motivos de desfecho, acesso por
 * setor e arquivar. Duas portas para a mesma sala: o que muda é de onde se
 * entra, nunca o que existe lá dentro. Por isso o link para a tela cheia fica no
 * rodapé, para quem foi configurar de verdade e não de passagem.
 *
 * O funil exibido vem de `?pipeline=` na URL (ver `FunnelsSettings`), então
 * abrir o painel a partir de um quadro já mostra AQUELE funil — e recarregar a
 * página com o painel aberto devolve a mesma seleção.
 */
export function FunnelsConfigDrawer({ open, onClose }: Props) {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  /* O link de saída leva o caminho de VOLTA. Quem clica aqui já estava
     configurando de dentro do funil; ir para a tela cheia não deveria custar o
     caminho de retorno. O endereço de origem inclui `?config=funis`, então
     voltar reabre o painel — o operador retoma exatamente onde parou. */
  const telaCheia = comVolta(
    `/settings/pipeline-stages?pipeline=${searchParams.get('pipeline') ?? ''}`,
    `${location.pathname}${location.search}`,
    'Voltar para o funil',
  )
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="funis-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 z-[39]"
            onClick={onClose}
          />
          <motion.div
            key="funis-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.9 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[44rem] z-40 bg-surface-950 border-l overlay-frame flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Configurar funis"
            data-testid="funnels-config-drawer"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-800 flex-shrink-0">
              <div>
                <h2 className="text-base font-semibold text-surface-50">Configurar funis</h2>
                <p className="text-xs text-surface-500 mt-0.5">Etapas, motivos de desfecho e acesso por setor</p>
              </div>
              <button
                onClick={onClose}
                title="Fechar"
                aria-label="Fechar"
                className="p-1.5 rounded-lg text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <FunnelsSettings />
            </div>

            <div className="px-5 py-3 border-t border-surface-800 flex-shrink-0">
              <Link
                to={telaCheia}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 text-xs text-surface-400 hover:text-surface-100 transition-colors"
              >
                Abrir em Configurações <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
