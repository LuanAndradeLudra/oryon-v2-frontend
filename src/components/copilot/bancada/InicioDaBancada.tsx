import { useEffect, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import api from '@/services/api'

// ─── "Para começar" (proposta SCRUM-1253) ───────────────────────────────────
// Sem conversa aberta, a bancada não fica vazia: mostra o que está acontecendo
// agora na operação (mesmos totais da aba Agora do Dashboard) e o alcance do
// Copilot em pedidos prontos. Clicar envia o pedido.

interface Fila { esperando: number; semDono: number; maiorEsperaMin: number | null }

const GRUPOS: Array<{ titulo: string; nota: string; pedidos: string[] }> = [
  {
    titulo: 'Analisar',
    nota: 'Só lê seus dados — nada muda no CRM.',
    pedidos: ['Analise meus leads desta semana', 'Quais contatos estão esfriando?', 'Como foi a última campanha?'],
  },
  {
    titulo: 'Executar com sua aprovação',
    nota: 'O Copilot prepara; você revisa na aba Aprovações antes de acontecer.',
    pedidos: ['Cadastre um contato novo', 'Etiquete os leads que pediram orçamento', 'Monte uma campanha para leads frios'],
  },
  {
    titulo: 'Criar documentos',
    nota: 'Ficam guardados na aba Artefatos.',
    pedidos: ['Faça um relatório do mês em PDF', 'Monte uma apresentação dos resultados'],
  },
]

export function InicioDaBancada({ onPedido }: { onPedido: (texto: string) => void }) {
  const [fila, setFila] = useState<Fila | null>(null)
  useEffect(() => {
    let vivo = true
    api.get('/home/queue').then((r) => {
      const d = r.data as Partial<Fila>
      if (vivo) setFila({ esperando: d.esperando ?? 0, semDono: d.semDono ?? 0, maiorEsperaMin: d.maiorEsperaMin ?? null })
    }).catch(() => {})
    return () => { vivo = false }
  }, [])

  const agora: Array<{ rotulo: string; valor: string; pedido: string }> = []
  if (fila && fila.semDono > 0) agora.push({ rotulo: 'conversas sem dono', valor: String(fila.semDono), pedido: `Resuma as ${fila.semDono} conversas sem dono e diga por onde começar` })
  if (fila && fila.esperando > 0) agora.push({ rotulo: 'esperando resposta', valor: String(fila.esperando), pedido: 'Quem está esperando resposta há mais tempo?' })

  return (
    <div className="flex flex-col gap-7 max-w-xl">
      {agora.length > 0 && (
        <section>
          <h3 className="text-[13px] font-semibold text-surface-100">Agora na sua operação</h3>
          <ul className="mt-2 rounded-[10px] border border-surface-700 divide-y divide-surface-700 overflow-hidden">
            {agora.map((a) => (
              <li key={a.rotulo}>
                <button type="button" onClick={() => onPedido(a.pedido)}
                  className="group w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-[var(--rowhover)] transition-colors focus-visible:outline-none focus-visible:bg-[var(--rowhover)]">
                  <span className="text-[20px] leading-none font-semibold tabular-nums text-surface-50 w-10">{a.valor}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] text-surface-200">{a.rotulo}</span>
                    <span className="block text-xs text-surface-400 truncate">“{a.pedido}”</span>
                  </span>
                  <span className="text-xs font-semibold text-accent-dark opacity-80 group-hover:opacity-100">Perguntar</span>
                  <ChevronRight className="w-3.5 h-3.5 text-surface-400" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {GRUPOS.map((g) => (
        <section key={g.titulo}>
          <h3 className="text-[13px] font-semibold text-surface-100">{g.titulo}</h3>
          <p className="text-xs text-surface-400 mt-0.5">{g.nota}</p>
          <ul className="mt-2 flex flex-col">
            {g.pedidos.map((p) => (
              <li key={p}>
                <button type="button" onClick={() => onPedido(p)}
                  className="group w-full flex items-center gap-2 h-9 px-2 -mx-2 rounded-[6px] text-left text-[13px] text-surface-200 hover:bg-[var(--rowhover)] hover:text-surface-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
                  <span className="flex-1 min-w-0 truncate">{p}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-surface-400 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
