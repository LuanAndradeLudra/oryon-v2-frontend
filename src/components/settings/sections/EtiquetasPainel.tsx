import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil, Trash2, Check, X, Search, Tag as TagIcon, ArrowUpRight, Copy } from 'lucide-react'
import { SectionHeader } from '../SectionHeader'
import { ConfirmModal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Skeleton'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { useToast } from '@/hooks/useToast'
import { DEFAULT_ENTITY_COLOR } from '@/lib/colorPalette'
import { useAuth } from '@/contexts/AuthContext'
import { useTags } from '@/contexts/TagsContext'
import { isAdminTier } from '@/lib/roleHelpers'
import { cn, getApiErrorMessage } from '@/lib/utils'
import type { Tag } from '@/types'

/**
 * Etiquetas reestruturada (SCRUM-1253, PO 07/10). A tela é um INVENTÁRIO:
 * cada etiqueta aparece como ela aparece em Conversas (o chip de verdade), com
 * o uso ao lado e um atalho para ver as conversas. Criar e editar acontecem na
 * própria linha — antes um formulário abria no topo, longe da etiqueta.
 * Busca, ordem por uso e o filtro "Sem uso" ajudam a limpar a lista.
 */
type Ordem = 'uso' | 'nome'
type Filtro = 'todas' | 'sem-uso'

const plural = (n: number) => `${n.toLocaleString('pt-BR')} conversa${n === 1 ? '' : 's'}`

function Chip({ nome, cor }: { nome: string; cor: string }) {
  return (
    <span
      className="color-chip inline-flex h-6 max-w-full items-center gap-1.5 rounded-[6px] border px-2 text-xs font-semibold"
      style={{ ['--chip' as string]: cor }}
    >
      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: cor }} aria-hidden />
      <span className="truncate">{nome || 'Nova etiqueta'}</span>
    </span>
  )
}

/** Linha em edição (criar ou editar): nome + cor + prévia do chip. */
function LinhaEditando({
  inicial, salvando, onSalvar, onCancelar, rotuloSalvar,
}: {
  inicial: { nome: string; cor: string }
  salvando: boolean
  onSalvar: (nome: string, cor: string) => void
  onCancelar: () => void
  rotuloSalvar: string
}) {
  const [nome, setNome] = useState(inicial.nome)
  const [cor, setCor] = useState(inicial.cor)
  const salvar = () => { if (nome.trim() && !salvando) onSalvar(nome.trim(), cor) }
  return (
    <div className="flex flex-col gap-3 bg-[var(--sf2)] px-4 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          autoFocus
          aria-label="Nome da etiqueta"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Convênio, Retorno, VIP"
          onKeyDown={(e) => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') onCancelar() }}
          className="max-w-xs"
        />
        <span className="text-xs text-surface-500">Fica assim:</span>
        <Chip nome={nome} cor={cor} />
      </div>
      <ColorPicker value={cor} onChange={setCor} />
      <div className="flex gap-2">
        <Button size="sm" onClick={salvar} loading={salvando} disabled={!nome.trim()} leftIcon={<Check className="h-3.5 w-3.5" />}>{rotuloSalvar}</Button>
        <Button size="sm" variant="ghost" onClick={onCancelar}>Cancelar</Button>
      </div>
    </div>
  )
}

export function EtiquetasPainel() {
  const { toast } = useToast()
  const { user } = useAuth()
  const podeGerir = isAdminTier(user?.role)
  const { tags, loadingTags, createTag, updateTag, deleteTag } = useTags()
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState<Ordem>('uso')
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [criando, setCriando] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [excluir, setExcluir] = useState<Tag | null>(null)
  const [salvando, setSalvando] = useState(false)

  const semUso = tags.filter((t) => !t.usageCount).length
  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return tags
      .filter((t) => (filtro === 'sem-uso' ? !t.usageCount : true))
      .filter((t) => !termo || t.name.toLowerCase().includes(termo))
      .sort((a, b) => (ordem === 'uso' ? (b.usageCount ?? 0) - (a.usageCount ?? 0) : a.name.localeCompare(b.name, 'pt-BR')))
  }, [tags, busca, ordem, filtro])

  const criar = async (nome: string, cor: string) => {
    setSalvando(true)
    try {
      await createTag(nome, cor)
      setCriando(false)
      toast('Etiqueta criada.', 'success')
    } catch (err) {
      toast(getApiErrorMessage(err, 'Erro ao criar a etiqueta.'), 'error')
    } finally {
      setSalvando(false)
    }
  }
  const atualizar = async (id: string, nome: string, cor: string) => {
    setSalvando(true)
    try {
      await updateTag(id, { name: nome, color: cor })
      setEditando(null)
      toast('Etiqueta atualizada.', 'success')
    } catch (err) {
      toast(getApiErrorMessage(err, 'Erro ao atualizar a etiqueta.'), 'error')
    } finally {
      setSalvando(false)
    }
  }
  // Trava de exclusão: o estado só vale no próximo render, então um duplo
  // clique em "Excluir" mandava dois DELETEs. A ref barra o 2º na hora; o
  // estado desabilita o botão (loading) e o diálogo fecha só ao concluir.
  const excluindoRef = useRef(false)
  const [excluindo, setExcluindo] = useState(false)
  const remover = async () => {
    if (!excluir || excluindoRef.current) return
    excluindoRef.current = true
    setExcluindo(true)
    try {
      await deleteTag(excluir.id)
      toast('Etiqueta excluída.', 'success')
    } catch (err) {
      toast(getApiErrorMessage(err, 'Erro ao excluir a etiqueta.'), 'error')
    } finally {
      excluindoRef.current = false
      setExcluindo(false)
      setExcluir(null)
    }
  }

  const cabecalho = (
    <SectionHeader
      title="Etiquetas"
      description="Marcam conversas para filtrar e organizar. A cor é a mesma da lista de Conversas e dos filtros."
      action={podeGerir && !criando ? (
        <Button onClick={() => { setEditando(null); setCriando(true) }} leftIcon={<Plus className="h-4 w-4" />}>Nova etiqueta</Button>
      ) : null}
    />
  )

  if (loadingTags) return <div>{cabecalho}<SkeletonList items={5} /></div>

  return (
    <div>
      {cabecalho}

      {tags.length === 0 && !criando ? (
        <EmptyState
          icon={TagIcon}
          title="Nenhuma etiqueta ainda"
          hint="Crie etiquetas como Convênio, Retorno ou VIP para filtrar as conversas."
        />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-500" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar etiqueta" aria-label="Buscar etiqueta" className="pl-8" />
            </div>
            <SegmentedControl
              label="Mostrar"
              value={filtro}
              onChange={setFiltro}
              options={[{ value: 'todas', label: `Todas ${tags.length}` }, { value: 'sem-uso', label: `Sem uso ${semUso}` }]}
            />
            <SegmentedControl
              label="Ordem"
              value={ordem}
              onChange={setOrdem}
              options={[{ value: 'uso', label: 'Mais usadas' }, { value: 'nome', label: 'A–Z' }]}
              className="ml-auto"
            />
          </div>

          <div className="overflow-hidden rounded-[10px] border border-surface-700 bg-surface-800">
            <div className="grid grid-cols-[minmax(0,1fr)_140px_100px] items-center gap-3 border-b border-surface-700 bg-[var(--sf2)] px-4 py-2 text-2xs font-semibold text-surface-500">
              <span>Etiqueta</span><span>Uso</span><span className="sr-only">Ações</span>
            </div>
            {criando && (
              <div className="border-b border-surface-700">
                <LinhaEditando inicial={{ nome: '', cor: DEFAULT_ENTITY_COLOR }} salvando={salvando} onSalvar={criar} onCancelar={() => setCriando(false)} rotuloSalvar="Criar" />
              </div>
            )}
            <ul className="divide-y divide-surface-700">
              {visiveis.map((t) => editando === t.id ? (
                <li key={t.id}>
                  <LinhaEditando inicial={{ nome: t.name, cor: t.color }} salvando={salvando} onSalvar={(n, c) => atualizar(t.id, n, c)} onCancelar={() => setEditando(null)} rotuloSalvar="Salvar" />
                </li>
              ) : (
                <li key={t.id} className="group grid grid-cols-[minmax(0,1fr)_140px_100px] items-center gap-3 px-4 py-2.5 hover:bg-[var(--rowhover)]">
                  <span className="min-w-0"><Chip nome={t.name} cor={t.color} /></span>
                  {t.usageCount ? (
                    <Link to={`/conversations?etiqueta=${encodeURIComponent(t.id)}`} className="inline-flex items-center gap-1 text-xs text-surface-300 hover:text-surface-100" title="Ver conversas com esta etiqueta">
                      {plural(t.usageCount)} <ArrowUpRight className="h-3 w-3" aria-hidden />
                    </Link>
                  ) : (
                    <span className="text-xs text-surface-500">Sem uso</span>
                  )}
                  <span className="flex justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    {/* "Copiar nome" voltou (PO 10/10): estava no menu da etiqueta antes
                        do redesenho; vale para todos, não só para quem gerencia. */}
                    <button
                      type="button"
                      onClick={() => { void navigator.clipboard?.writeText(t.name).then(() => toast('Nome copiado.', 'success')).catch(() => {}) }}
                      aria-label={`Copiar o nome ${t.name}`}
                      title="Copiar nome"
                      className="rounded-[6px] p-1.5 text-surface-400 hover:bg-[var(--rowhover)] hover:text-surface-100"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  {podeGerir && (
                    <>
                      <button type="button" onClick={() => { setCriando(false); setEditando(t.id) }} aria-label={`Editar ${t.name}`} title="Editar" className="rounded-[6px] p-1.5 text-surface-400 hover:bg-[var(--rowhover)] hover:text-surface-100">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => setExcluir(t)} aria-label={`Excluir ${t.name}`} title="Excluir" className="rounded-[6px] p-1.5 text-surface-400 hover:bg-danger/10 hover:text-danger">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  </span>
                </li>
              ))}
            </ul>
            {visiveis.length === 0 && (
              <p className={cn('px-4 py-6 text-center text-xs text-surface-500')}>
                {filtro === 'sem-uso' && !busca ? 'Todas as etiquetas estão em uso.' : 'Nenhuma etiqueta com essa busca.'}
                {busca && <button type="button" onClick={() => setBusca('')} className="ml-1 inline-flex items-center gap-0.5 font-semibold text-accent-dark"><X className="h-3 w-3" />Limpar</button>}
              </p>
            )}
          </div>
          {semUso > 0 && filtro === 'todas' && (
            <p className="mt-2 text-xs text-surface-500">{semUso} {semUso === 1 ? 'etiqueta não está' : 'etiquetas não estão'} em nenhuma conversa — veja em "Sem uso" se vale manter.</p>
          )}
        </>
      )}

      <ConfirmModal
        open={!!excluir}
        onClose={() => setExcluir(null)}
        onConfirm={remover}
        title="Excluir etiqueta"
        impact={{ label: `${excluir?.name ?? ''}${excluir?.usageCount ? ` — em ${plural(excluir.usageCount)}` : ''}`, tone: 'danger' }}
        description="Ela sai de todas as conversas. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        danger
        loading={excluindo}
      />
    </div>
  )
}
