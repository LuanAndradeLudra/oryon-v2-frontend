// ─── Barra de chips de fila (A6 / SCRUM-1017) ────────────────────────────────

/**
 * Filtro por fila. **Não renderiza nada** quando não há fila conhecida — e essa
 * é a regra, não um detalhe: enquanto o BE.6 não subir com a D30 (`queue` no
 * item), a barra inteira some. Nunca chips vazios, nunca um "Todas as filas"
 * sozinho fingindo ser um filtro que não filtra nada.
 *
 * A contagem é **da página corrente**, então `mostrarContagem` a esconde quando
 * há mais de uma página: número parcial com cara de total é exatamente o que
 * não se quer numa tela de operação.
 */
export function HandoffQueueChips({
  filas,
  mostrarContagem,
  selecionada,
  onSelecionar,
}: {
  filas: Array<{ nome: string; n: number }>
  mostrarContagem: boolean
  selecionada?: string
  onSelecionar: (fila?: string) => void
}) {
  if (filas.length === 0) return null

  const chip = (ativo: boolean) =>
    'rounded-full border px-2.5 py-0.5 text-3xs font-medium transition-colors '
    + (ativo
      ? 'border-brand-500/40 bg-brand-500/15 text-brand-400'
      : 'border-surface-700 bg-surface-800 text-surface-300 hover:border-surface-600')

  return (
    <div role="group" aria-label="Filtrar por fila" className="flex flex-wrap items-center gap-1.5">
      <button type="button" onClick={() => onSelecionar(undefined)}
              aria-pressed={!selecionada} className={chip(!selecionada)}>
        Todas as filas
      </button>
      {filas.map(({ nome, n }) => (
        <button key={nome} type="button" onClick={() => onSelecionar(nome)}
                aria-pressed={selecionada === nome} className={chip(selecionada === nome)}>
          {nome}
          {mostrarContagem && <b className="ml-1 font-mono font-normal opacity-60">{n}</b>}
        </button>
      ))}
    </div>
  )
}
