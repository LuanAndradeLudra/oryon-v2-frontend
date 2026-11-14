import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FilePlus2, Sparkles } from 'lucide-react'
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

  return (
    <div className="space-y-3">
      <div className={compacta ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3'}>
        {!compacta && (
          <button
            type="button"
            onClick={() => setEscolhida('zero')}
            className="text-left rounded-[10px] border border-dashed border-surface-600 bg-transparent px-4 py-4 hover:bg-[var(--rowhover)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <FilePlus2 className="w-5 h-5 text-surface-400" aria-hidden />
            <p className="mt-2 text-sm font-semibold text-surface-50">Começar do zero</p>
            <p className="mt-1 text-xs text-surface-400">Um canvas em branco, com a porta manual. Para quem já sabe o que quer montar.</p>
          </button>
        )}
        {(receitas ?? []).map((r) => {
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setEscolhida(r)}
              className="text-left rounded-[10px] border border-surface-700 bg-surface-800 px-4 py-4 hover:bg-[var(--rowhover)] hover:border-[var(--bd2)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-[8px] bg-surface-700 text-surface-100">
                  <IconeDoCatalogo nome={r.icon} className="w-4 h-4" />
                </span>
                <span className="flex flex-wrap justify-end gap-1">
                  {r.segment === 'clinica' && <Selo tom="azul">Clínica</Selo>}
                  {r.usesAi ? <Selo tom="violeta"><Sparkles className="w-3 h-3" aria-hidden />Usa IA</Selo> : <Selo tom="cinza">Sem IA</Selo>}
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold text-surface-50">{r.name}</p>
              <p className="mt-0.5 text-xs font-medium text-brand-500">{r.outcome}</p>
              <p className="mt-1.5 text-xs text-surface-400 leading-relaxed">{r.description}</p>
              <p className="mt-2 text-[11px] text-surface-500">{Object.keys(r.version.graph.nodes).length} passos</p>
            </button>
          )
        })}
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
