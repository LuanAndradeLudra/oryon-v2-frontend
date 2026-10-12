/**
 * Número do painel com a unidade menor e mais leve ("10h 20m", "39,0%",
 * "3 d 1 h", "2 de 2") — direção minimalista aprovada pelo PO (01/10).
 * Texto sem dígito ("—", "agora") sai inteiro, sem separar nada.
 * `data-valor` guarda o texto original (testes e leitura).
 */
export function ValorComUnidade({ texto }: { texto: string }) {
  if (!/\d/.test(texto)) return <span data-valor={texto}>{texto}</span>
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
