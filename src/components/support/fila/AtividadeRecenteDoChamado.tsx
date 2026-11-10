import type { AtividadeRecente } from '@/lib/atividadeRecente'

const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

/**
 * O que o navegador de quem abriu viu falhar nos 15 min antes do chamado
 * (SCRUM-1390) — só existe quando a pessoa deixou incluir. O `requestId` liga
 * cada falha ao erro do servidor (evidência "Erros do servidor").
 */
export function AtividadeRecenteDoChamado({ a }: { a: AtividadeRecente }) {
  return (
    <section className="sup-cartao px-4 py-3 flex flex-col gap-3" aria-label="Atividade recente do navegador">
      <p className="text-[13px] font-semibold text-surface-100">Nos 15 min antes (navegador de quem abriu)</p>
      {a.falhas.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold text-surface-400">Chamadas ao servidor que falharam</p>
          <ul className="flex flex-col gap-1.5 text-xs">
            {a.falhas.map((f, i) => (
              <li key={`${f.em}-${i}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="tabular-nums text-surface-400">{hora(f.em)}</span>
                <span className="text-surface-100">{f.tela}</span>
                <span className="font-mono text-[11px] text-surface-300 break-all">{f.metodo} {f.rota}</span>
                <span className="font-semibold text-warning">{f.status ?? 'sem resposta'}</span>
                {f.requestId && <span className="font-mono text-[11px] text-surface-400 break-all">req {f.requestId}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {a.erros.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-semibold text-surface-400">Erros na página</p>
          <ul className="flex flex-col gap-1 text-xs">
            {a.erros.map((e, i) => (
              <li key={`${e.em}-${i}`} className="flex flex-wrap items-baseline gap-x-2">
                <span className="tabular-nums text-surface-400">{hora(e.em)}</span>
                <span className="text-surface-100">{e.tela}</span>
                <span className="text-surface-300 break-words"><span className="font-mono text-[11px]">{e.tipo}</span>{e.mensagem ? `: ${e.mensagem}` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {a.telas.length > 0 && (
        <p className="text-[11px] text-surface-400">
          Telas: {a.telas.map((t) => `${t.tela} (${hora(t.em)})`).join(' → ')}
        </p>
      )}
    </section>
  )
}
