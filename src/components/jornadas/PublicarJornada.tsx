import { useEffect, useState } from 'react'
import { CircleAlert, Ghost, Rocket } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/lib/utils'
import { ehConfirmacao, jornadasApi } from '@/services/jornadas/jornadasApi'
import type { ConfirmacaoNecessaria, Jornada } from '@/services/jornadas/tipos'
import { numero } from './apoio'

/**
 * Publicar e retomar em DUAS ETAPAS, como as ações críticas da v1 (ORY-11):
 * 1) escolher o modo e pedir a prévia (o que vai acontecer + token de 10 min);
 * 2) confirmar a mesma ação com o token. Pausar é seguro e fica fora daqui.
 */
export function PublicarJornada({ open, acao, onClose, jornada, erros, salvarAntes, onPronto }: {
  open: boolean
  acao: 'publicar' | 'retomar'
  onClose: () => void
  jornada: Jornada
  erros: number
  salvarAntes: () => Promise<Jornada>
  onPronto: (j: Jornada) => void
}) {
  const { toast } = useToast()
  const [modo, setModo] = useState<'shadow' | 'active'>(jornada.publishedVersion ? 'active' : 'shadow')
  const [previa, setPrevia] = useState<ConfirmacaoNecessaria | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setPrevia(null)
    setFalha(null)
    // Nunca publicada: começa em sombra. Já rodando: publicar mudanças mantém ativa (ou vira, se estava em sombra).
    setModo(jornada.publishedVersion ? 'active' : 'shadow')
  }, [open, jornada.publishedVersion])

  const pedirPrevia = async () => {
    setOcupado(true)
    setFalha(null)
    try {
      await salvarAntes()
      const r = acao === 'retomar' ? await jornadasApi.retomar(jornada.id) : await jornadasApi.publicar(jornada.id, modo)
      if (ehConfirmacao(r)) setPrevia(r)
      else onPronto(r)
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível pedir a prévia.')
    } finally {
      setOcupado(false)
    }
  }

  const confirmar = async () => {
    if (!previa) return
    setOcupado(true)
    setFalha(null)
    try {
      const r = acao === 'retomar' ? await jornadasApi.retomar(jornada.id, previa.confirmationToken) : await jornadasApi.publicar(jornada.id, modo, previa.confirmationToken)
      if (ehConfirmacao(r)) { setPrevia(r); return }
      toast(acao === 'retomar' ? 'Jornada retomada.' : modo === 'shadow' ? `Publicada em sombra (v${r.publishedVersion}). Nada é enviado.` : `Publicada e ativa (v${r.publishedVersion}).`, 'success')
      onPronto(r)
    } catch (e) {
      setFalha(e instanceof Error ? e.message : 'Não foi possível publicar.')
    } finally {
      setOcupado(false)
    }
  }

  const titulo = acao === 'retomar' ? 'Retomar a jornada' : jornada.publishedVersion ? 'Publicar as mudanças' : 'Publicar a jornada'
  const p = previa?.preview

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titulo}
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {previa && <span className="mr-auto text-[11px] text-surface-500">A prévia vale até {new Date(previa.expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.</span>}
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          {!previa
            ? <Button onClick={pedirPrevia} loading={ocupado} disabled={erros > 0 && acao === 'publicar'}>Ver a prévia</Button>
            : <Button onClick={confirmar} loading={ocupado} leftIcon={modo === 'shadow' && acao === 'publicar' ? <Ghost className="w-4 h-4" /> : <Rocket className="w-4 h-4" />}>
                {acao === 'retomar' ? 'Confirmar e retomar' : modo === 'shadow' ? 'Confirmar e pôr em sombra' : 'Confirmar e ativar'}
              </Button>}
        </div>
      }
    >
      <div className="space-y-4 text-sm text-surface-200">
        {erros > 0 && acao === 'publicar' && (
          <p className="flex items-start gap-2 rounded-[8px] bg-[color-mix(in_srgb,var(--color-danger)_12%,var(--color-surface-800))] px-3 py-2">
            <CircleAlert className="w-4 h-4 mt-0.5 text-[var(--color-danger)] shrink-0" aria-hidden />
            O desenho tem {erros} problema(s). Resolva antes de publicar (veja a conferência no painel da direita).
          </p>
        )}

        {acao === 'publicar' && !previa && (
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Como publicar">
            {([
              ['shadow', 'Em sombra', 'Roda de verdade, mas não envia nada: cada passo grava o que teria feito. Use para comparar com o n8n antes de virar.', Ghost],
              ['active', 'Ativa', 'Começa a enviar. Quem entrar a partir de agora segue esta versão; quem já está dentro continua na versão em que entrou.', Rocket],
            ] as const).map(([valor, rotulo, texto, Icone]) => (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={modo === valor}
                onClick={() => setModo(valor)}
                className={cn('text-left rounded-[10px] border px-3 py-3 transition-colors', modo === valor ? 'border-brand-500 bg-[var(--color-accent-soft)]' : 'border-surface-700 bg-surface-800 hover:bg-[var(--rowhover)]')}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-surface-50"><Icone className="w-4 h-4" aria-hidden />{rotulo}</span>
                <span className="mt-1 block text-xs text-surface-400 leading-relaxed">{texto}</span>
              </button>
            ))}
          </div>
        )}

        {acao === 'retomar' && !previa && <p className="text-surface-300">A jornada volta a aceitar inscrições na versão publicada (v{jornada.publishedVersion}).</p>}

        {p && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-surface-300">O que vai acontecer</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                ['Versão', p.fromVersion ? `v${p.fromVersion} → v${p.toVersion}` : `v${p.toVersion}`],
                ['Entram hoje', numero(p.wouldEnterToday)],
                ['Mensagens por dia', p.mode === 'shadow' ? '0 (sombra)' : numero(p.messagesPerDay)],
                ['IA por inscrição', p.estimatedCreditsPerEnrollment ? `${p.estimatedCreditsPerEnrollment.toLocaleString('pt-BR')} créd.` : 'zero'],
                ['Linhas', p.whatsappNumbers.join(', ') || '—'],
                ['Ficam na versão antiga', numero(p.enrolledInPreviousVersions)],
              ].map(([r, v]) => (
                <div key={r} className="rounded-[8px] bg-surface-800 px-3 py-2">
                  <p className="text-[11px] text-surface-500">{r}</p>
                  <p className="text-sm font-semibold text-surface-50 break-words">{v}</p>
                </div>
              ))}
            </div>
            {p.changes.length > 0 && <ul className="list-disc pl-5 space-y-0.5 text-xs text-surface-300">{p.changes.map((c) => <li key={c}>{c}</li>)}</ul>}
            {p.warnings.length > 0 && <ul className="space-y-1 text-xs text-surface-400">{p.warnings.map((w) => <li key={w}>• {w}</li>)}</ul>}
          </div>
        )}

        {falha && <p className="text-sm text-[var(--color-danger)]">{falha}</p>}
        <p className="text-[11.5px] text-surface-500">Nada muda antes da confirmação. Só administradores publicam e retomam jornadas.</p>
      </div>
    </Modal>
  )
}
