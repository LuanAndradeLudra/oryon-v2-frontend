import { Fragment, useState, type RefObject } from 'react'
import { ArrowLeft, ChevronDown, Download, Eye, MessageSquare, Monitor, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Tabs } from '@/components/ui/Tabs'
import { showToast } from '@/hooks/useToast'
import { cn, getApiErrorMessage } from '@/lib/utils'
import { adminSupportApi } from '@/services/supportApi'
import type { ChamadoDaEquipe } from '@/types/support'
import { FioDoChamado, MensagensMarcadas } from '../SupportPieces'
import { dataCurta, tituloDoChamado } from '../supportModel'
import { linhasDoContexto } from '../contextoTecnico'
import { canalDe } from './modeloDaFila'
import { PrazoNaFila, PrioridadeNaFila, StatusNaFila } from './PecasDaFila'
import { PropriedadesDaFila } from './PropriedadesDaFila'
import { CampoUnicoDaFila, type CampoDaFilaRef } from './CampoUnicoDaFila'
import { AbaEvidencia } from './AbaEvidencia'
import { AbaConversaDoCliente } from './AbaConversaDoCliente'
import { AtividadeRecenteDoChamado } from './AtividadeRecenteDoChamado'

type Aba = 'atividade' | 'evidencia' | 'conversa' | 'contexto'

/**
 * O CHAMADO na fila: cabeçalho (número, empresa, canal; prioridade e status),
 * abas Atividade (um fio só, com as notas internas tracejadas) · Evidência ·
 * Conversa do cliente (acesso auditado, 1385) · Contexto técnico, o campo único
 * no pé e as propriedades numa coluna de 300 px (abaixo de 1280 px, dobráveis).
 */
export function DetalheDaFila({ c, agora, colunaCabe, onAtualizar, onRecarregar, onAbrir, onVoltar, campoRef }: {
  c: ChamadoDaEquipe
  agora: number
  colunaCabe: boolean
  onAtualizar: (c: ChamadoDaEquipe) => void
  onRecarregar: () => void
  onAbrir: (id: string) => void
  onVoltar?: () => void
  campoRef: RefObject<CampoDaFilaRef | null>
}) {
  const [aba, setAba] = useState<Aba>('atividade')
  const [verPropriedades, setVerPropriedades] = useState(false)
  const [baixando, setBaixando] = useState(false)
  const propriedades = <PropriedadesDaFila c={c} agora={agora} onAtualizar={onAtualizar} onRecarregar={onRecarregar} onAbrir={onAbrir} />

  const baixarDossie = async () => {
    setBaixando(true)
    try {
      await adminSupportApi.baixarDossie(c.id, c.numero)
      showToast('Dossiê baixado. O acesso ficou registrado no chamado.', 'success')
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Não foi possível gerar o dossiê.'), 'error')
    } finally {
      setBaixando(false)
    }
  }

  return (
    <section className="flex-1 min-w-0 flex min-h-0" aria-label={`Chamado ${c.numero}`}>
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        <div className="px-4 md:px-6 pt-3 border-b border-surface-800 flex-shrink-0 flex flex-col gap-2">
          <div className="flex items-start gap-3">
            {onVoltar && (
              <button type="button" onClick={onVoltar} aria-label="Voltar para a fila" className="w-8 h-8 -ml-1 rounded-[6px] flex items-center justify-center text-surface-300 hover:bg-[var(--rowhover)] flex-shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-surface-400 truncate">
                <span className="font-mono">{c.numero}</span> · {c.tenantNome} · {canalDe(c)}{c.kind === 'oco' ? ' · ocorrência interna' : ''}
              </p>
              <h2 className="text-[16px] font-semibold text-surface-50 leading-snug break-words">{tituloDoChamado(c)}</h2>
              <p className="text-xs text-surface-400">{c.contatoNome ? `${c.contatoNome} · ` : ''}{c.abertoPor} · {dataCurta(c.abertoEm)}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
              <PrioridadeNaFila prioridade={c.prioridade} className="text-xs" />
              <StatusNaFila status={c.status} />
              <Button size="sm" variant="ghost" leftIcon={<Download className="w-3.5 h-3.5" />} loading={baixando} onClick={() => void baixarDossie()} aria-label="Baixar o dossiê de auditoria">
                <span className="hidden sm:inline">Dossiê</span>
              </Button>
            </div>
          </div>
          {c.proximoPrazo && <PrazoNaFila prazo={c.proximoPrazo} agora={agora} sempre />}
          <Tabs<Aba>
            label="Seções do chamado"
            value={aba}
            onChange={setAba}
            tabs={[
              { id: 'atividade', label: 'Atividade', icon: <MessageSquare className="w-3.5 h-3.5" />, count: c.eventos.length },
              { id: 'evidencia', label: 'Evidência', icon: <Wrench className="w-3.5 h-3.5" /> },
              ...(c.conversationId ? [{ id: 'conversa' as Aba, label: 'Conversa do cliente', icon: <Eye className="w-3.5 h-3.5" /> }] : []),
              ...(c.contextoTecnico ? [{ id: 'contexto' as Aba, label: 'Contexto técnico', icon: <Monitor className="w-3.5 h-3.5" /> }] : []),
            ]}
            className="border-b-0"
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-[820px] mx-auto px-4 md:px-6 py-5 flex flex-col gap-5">
            {!colunaCabe && (
              <div className="sup-cartao">
                <button type="button" onClick={() => setVerPropriedades((v) => !v)} aria-expanded={verPropriedades} className="w-full flex items-center gap-2 px-4 py-2.5 text-left">
                  <span className="text-[13px] font-semibold text-surface-100 flex-1">Propriedades</span>
                  <span className="text-xs text-surface-400 truncate">{c.responsavel ?? 'Sem dono'}</span>
                  <ChevronDown className={cn('w-4 h-4 text-surface-400 transition-transform', verPropriedades && 'rotate-180')} aria-hidden />
                </button>
                {verPropriedades && <div className="px-4 pb-4">{propriedades}</div>}
              </div>
            )}
            {/* Auditoria de UX de 28/10: o que foi reportado vem antes do fio, sem trocar de aba. */}
            {aba === 'atividade' && (
              <div className="flex flex-col gap-5">
                {c.mensagens.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-surface-400">Mensagens marcadas</h3>
                    <MensagensMarcadas mensagens={c.mensagens} />
                  </div>
                )}
                <FioDoChamado c={c} interno titulo={null} />
              </div>
            )}
            {aba === 'evidencia' && <AbaEvidencia c={c} />}
            {aba === 'conversa' && c.conversationId && <AbaConversaDoCliente c={c} onAtualizar={onAtualizar} />}
            {aba === 'contexto' && c.contextoTecnico && (
              <div className="flex flex-col gap-3">
                <p className="text-[11px] text-surface-400">Capturado no navegador de quem abriu, no momento em que abriu o formulário. Sem dados pessoais: o endereço vai sem os parâmetros de busca.</p>
                <section className="sup-cartao px-4 py-3">
                  <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1.5 text-xs">
                    {linhasDoContexto(c.contextoTecnico).map(([r, v]) => (
                      <Fragment key={r}><dt className="text-surface-400">{r}</dt><dd className={cn('text-surface-100 break-all', r === 'Endereço' && 'font-mono text-[11px]')}>{v}</dd></Fragment>
                    ))}
                  </dl>
                </section>
                {c.contextoTecnico.recentes && <AtividadeRecenteDoChamado a={c.contextoTecnico.recentes} />}
              </div>
            )}
          </div>
        </div>

        <CampoUnicoDaFila key={c.id} c={c} onAtualizar={(x) => { onAtualizar(x); setAba('atividade') }} onRecarregar={onRecarregar} campoRef={campoRef} />
      </div>

      {colunaCabe && (
        <aside className="w-[300px] flex-shrink-0 border-l border-surface-800 bg-surface-900 overflow-y-auto" aria-label="Propriedades do chamado">
          <div className="px-4 py-4">{propriedades}</div>
        </aside>
      )}
    </section>
  )
}
