import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChartColumn, Users, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { useIsMobile } from '@/hooks/useIsMobile'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import type { Jornada } from '@/services/jornadas/tipos'
import { SeloDoStatus } from '@/components/jornadas/comum'
import { numero, useCarregar } from '@/components/jornadas/apoio'
import { EditorDeJornada } from '@/components/jornadas/editor/EditorDeJornada'
import { PessoasDaJornada } from '@/components/jornadas/PessoasDaJornada'
import { ResultadosDaJornada } from '@/components/jornadas/ResultadosDaJornada'

/**
 * ORY-60 — uma jornada: Desenho (canvas), Pessoas e Resultados.
 * Um cabeçalho só (voltar, nome, status, versão e as abas), para o canvas ficar
 * com a altura toda. No celular, o desenho é só leitura (§2.11).
 */

type Aba = 'desenho' | 'pessoas' | 'resultados'

export function JornadaPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [aba, setAba] = useState<Aba>('desenho')
  const { dados, erro, recarregar, setDados } = useCarregar(async () => {
    const [jornada, catalogo, apoio, resultados] = await Promise.all([jornadasApi.ver(id), jornadasApi.catalogo(), jornadasApi.apoio(), jornadasApi.resultados(id)])
    return { jornada, catalogo, apoio, resultados }
  }, [id])

  // Depois de salvar ou publicar: o editor segue com o estado dele (só lê o
  // rascunho ao montar); o resto da página passa a ver o rascunho salvo.
  const aoMudar = useCallback((j: Jornada) => {
    setDados((d) => (d ? { ...d, jornada: j } : d))
  }, [setDados])

  if (erro) return <div className="p-6"><ErrorState title="Não foi possível abrir a jornada" onRetry={recarregar} /></div>
  if (!dados) return <div className="flex h-full items-center justify-center gap-2 text-sm text-surface-400"><Spinner className="w-4 h-4" /> Abrindo a jornada…</div>

  const { jornada, catalogo, apoio, resultados } = dados
  const abas = (
    <SegmentedControl
      label="Partes da jornada"
      size="32"
      value={aba}
      onChange={setAba}
      options={[
        { value: 'desenho', label: 'Desenho', icon: Workflow },
        { value: 'pessoas', label: 'Pessoas', icon: Users },
        { value: 'resultados', label: 'Resultados', icon: ChartColumn },
      ]}
    />
  )

  return (
    <div className="flex flex-col h-full w-full bg-surface-950 min-h-0">
      {isMobile ? (
        <>
          <MobilePageHeader title={jornada.name} onBack={() => navigate('/jornadas')} />
          <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-2.5 border-b border-surface-700">
            <SeloDoStatus status={jornada.status} />
            {abas}
          </div>
        </>
      ) : (
        <header className="shrink-0 flex items-center gap-3 h-14 px-4 border-b border-surface-700 bg-surface-950">
          <Button variant="ghost" size="sm" iconOnly aria-label="Voltar para as jornadas" title="Voltar para as jornadas" onClick={() => navigate('/jornadas')}><ArrowLeft className="w-4 h-4" /></Button>
          <div className="min-w-0 flex items-center gap-2.5">
            <h1 className="truncate text-[15px] font-semibold text-surface-50" title={jornada.name}>{jornada.name}</h1>
            <SeloDoStatus status={jornada.status} />
            <span className="hidden lg:inline whitespace-nowrap text-[12px] text-surface-500">
              {jornada.publishedVersion ? `v${jornada.publishedVersion} no ar · ${numero(jornada.enrolledNow)} dentro agora` : 'Ainda não publicada'}
            </span>
          </div>
          <div className="ml-auto">{abas}</div>
        </header>
      )}
      <div className="flex-1 min-h-0">
        {aba === 'desenho' && (
          <EditorDeJornada key={jornada.id} jornada={jornada} catalogo={catalogo} apoio={apoio} resultados={resultados} somenteLeitura={isMobile} onJornadaMudou={aoMudar} />
        )}
        {aba === 'pessoas' && <div className="h-full overflow-y-auto"><PessoasDaJornada jornada={jornada} catalogo={catalogo} /></div>}
        {aba === 'resultados' && <div className="h-full overflow-y-auto"><ResultadosDaJornada jornada={jornada} catalogo={catalogo} resultados={resultados} /></div>}
      </div>
    </div>
  )
}
