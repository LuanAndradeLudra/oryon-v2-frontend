import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, FilePlus2, Sparkles } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/hooks/useToast'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import type { Receita } from '@/services/jornadas/tipos'
import { IconeDoCatalogo, Selo } from './comum'
import { useCarregar } from './apoio'

/**
 * A galeria: receitas nomeadas pelo RESULTADO ("Reduzir faltas"), primeiro as de
 * clínica. Usar uma receita cria um rascunho com o desenho pronto para ajustar.
 */
export function GaleriaDeReceitas({ compacta = false }: { compacta?: boolean }) {
  const { dados: receitas } = useCarregar(() => jornadasApi.receitas(), [])
  const [escolhida, setEscolhida] = useState<Receita | 'zero' | null>(null)

  const cartao = 'group flex h-full flex-col text-left rounded-[12px] border px-5 py-5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500'
  return (
    <div className="space-y-3">
      <p className="text-[13px] text-surface-400">Cada receita já vem montada e com os textos prontos. Escolha uma, ajuste o que for da sua unidade e teste antes de publicar.</p>
      <div className={compacta ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'}>
        {(receitas ?? []).map((r) => (
          <button key={r.id} type="button" onClick={() => setEscolhida(r)} className={`${cartao} border-surface-700 bg-surface-800 hover:bg-[var(--rowhover)] hover:border-[var(--bd2)]`}>
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-[10px] bg-surface-700 text-surface-100">
                <IconeDoCatalogo nome={r.icon} className="w-5 h-5" />
              </span>
              <span className="flex flex-wrap justify-end gap-1">
                {r.segment === 'clinica' && <Selo tom="azul">Clínica</Selo>}
                {r.usesAi ? <Selo tom="violeta"><Sparkles className="w-3 h-3" aria-hidden />Usa IA</Selo> : <Selo tom="cinza">Sem IA</Selo>}
              </span>
            </div>
            <p className="mt-4 text-[15px] font-semibold text-surface-50 leading-5">{r.name}</p>
            <p className="mt-1 text-[12.5px] font-medium text-brand-500">{r.outcome}</p>
            <p className="mt-2 text-[12.5px] text-surface-400 leading-relaxed">{r.description}</p>
            <div className="mt-auto pt-4 flex items-center justify-between text-[12px]">
              <span className="text-surface-500">{Object.keys(r.version.graph.nodes).length} passos</span>
              <span className="inline-flex items-center gap-1 font-semibold text-surface-300 group-hover:text-brand-500 transition-colors">Usar esta receita<ArrowRight className="w-3.5 h-3.5" aria-hidden /></span>
            </div>
          </button>
        ))}
        {!compacta && receitas && (
          <button type="button" onClick={() => setEscolhida('zero')} className={`${cartao} border-dashed border-surface-600 bg-transparent hover:bg-[var(--rowhover)]`}>
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-[10px] border border-dashed border-surface-600 text-surface-300">
              <FilePlus2 className="w-5 h-5" aria-hidden />
            </span>
            <p className="mt-4 text-[15px] font-semibold text-surface-50 leading-5">Começar do zero</p>
            <p className="mt-2 text-[12.5px] text-surface-400 leading-relaxed">Um canvas em branco. Para quem já sabe o caminho que quer montar.</p>
            <div className="mt-auto pt-4 flex justify-end text-[12px]">
              <span className="inline-flex items-center gap-1 font-semibold text-surface-300 group-hover:text-brand-500 transition-colors">Criar em branco<ArrowRight className="w-3.5 h-3.5" aria-hidden /></span>
            </div>
          </button>
        )}
      </div>
      <CriarJornada escolha={escolhida} onClose={() => setEscolhida(null)} />
    </div>
  )
}

function CriarJornada({ escolha, onClose }: { escolha: Receita | 'zero' | null; onClose: () => void }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [nome, setNome] = useState('')
  const [criando, setCriando] = useState(false)
  const receita = escolha && escolha !== 'zero' ? escolha : null
  const nomeFinal = nome.trim() || receita?.name || 'Nova jornada'

  const criar = async () => {
    setCriando(true)
    try {
      const j = await jornadasApi.criar({ name: nomeFinal, recipeId: receita?.id ?? null })
      onClose()
      setNome('')
      navigate(`/jornadas/${j.id}`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não foi possível criar.', 'error')
    } finally {
      setCriando(false)
    }
  }

  return (
    <Modal
      open={escolha !== null}
      onClose={onClose}
      title={receita ? `Usar a receita "${receita.name}"` : 'Começar do zero'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={criar} loading={criando}>Criar rascunho</Button>
        </div>
      }
    >
      <div className="space-y-3 text-sm text-surface-200">
        {receita && <p className="text-surface-300">{receita.description}</p>}
        <label className="block">
          <span className="block text-xs text-surface-400 mb-1">Nome da jornada</span>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder={receita?.name ?? 'Nova jornada'} autoFocus />
        </label>
        <p className="text-xs text-surface-400">Nasce como rascunho: nada roda até você publicar. Dá para testar e deixar em sombra antes.</p>
      </div>
    </Modal>
  )
}
