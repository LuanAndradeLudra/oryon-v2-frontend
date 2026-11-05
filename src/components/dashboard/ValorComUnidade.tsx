/**
 * Número do painel com a unidade menor e mais leve ("10h 20m", "39,0%",
 * "3 d 1 h", "2 de 2") — direção minimalista aprovada pelo PO (01/10).
 * Texto sem dígito ("—", "agora") sai inteiro, sem separar nada.
 * `data-valor` guarda o texto original (testes e leitura).
 */
export function ValorComUnidade({ texto }: { texto: string }) {
  if (!/\d/.test(texto)) return <span data-valor={texto}>{texto}</span>
  // Moeda: "R$" é a unidade inteira, antes do número (o split separava "R" de "$ 1.250,50" — A19).
  const moeda = /^R\$\s*(.+)$/.exec(texto)
  if (moeda) {
    return (
      <span data-valor={texto}>
        <span className="text-[0.58em] font-semibold text-surface-400 mr-[3px] tracking-normal">R$</span>
        <span>{moeda[1]}</span>
      </span>
    )
  }
  const partes = texto.split(/([a-zà-ú%]+)/i).filter((p) => p.trim() !== '')
  return (
    <span data-valor={texto}>
      {partes.map((p, i) =>
        /^[a-zà-ú%]+$/i.test(p.trim())
          ? <span key={i} className="text-[0.58em] font-semibold text-surface-400 ml-[1px] mr-[3px] tracking-normal">{p.trim()}</span>
          : <span key={i}>{p.trim()}</span>,
      )}
    </span>
  )
}
