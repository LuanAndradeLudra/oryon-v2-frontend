import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { MobilePageHeader } from '@/components/layout/MobilePageHeader'
import { useIsMobile } from '@/hooks/useIsMobile'
import { jornadasApi } from '@/services/jornadas/jornadasApi'
import type { Jornada } from '@/services/jornadas/tipos'
import { AvisoDeExemplo, SeloDoStatus } from '@/components/jornadas/comum'
import { useCarregar } from '@/components/jornadas/apoio'
import { EditorDeJornada } from '@/components/jornadas/editor/EditorDeJornada'
import { PessoasDaJornada } from '@/components/jornadas/PessoasDaJornada'
import { ResultadosDaJornada } from '@/components/jornadas/ResultadosDaJornada'

/**
 * ORY-60 — uma jornada: Desenho (canvas), Pessoas e Resultados.
 * No celular, o desenho é só leitura (decisão do desenho, §2.11).
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
  return (
    <div className="flex flex-col h-full w-full bg-surface-950 min-h-0">
      {isMobile && <MobilePageHeader title={jornada.name} onBack={() => navigate('/jornadas')} />}
      <div className="px-4 md:px-6 pt-3 md:pt-4 space-y-3 border-b border-surface-700">
        {!isMobile && (
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="sm" iconOnly aria-label="Voltar para as jornadas" onClick={() => navigate('/jornadas')}><ArrowLeft className="w-4 h-4" /></Button>
            <h1 className="truncate text-base font-semibold text-surface-50">{jornada.name}</h1>
            <SeloDoStatus status={jornada.status} />
          </div>
        )}
        <AvisoDeExemplo onRestaurado={recarregar} />
        <Tabs
          label="Partes da jornada"
          value={aba}
          onChange={setAba}
          tabs={[
            { id: 'desenho', label: 'Desenho' },
            { id: 'pessoas', label: 'Pessoas' },
            { id: 'resultados', label: 'Resultados' },
          ]}
        />
      </div>
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
