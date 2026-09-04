import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Spinner — o "padrão oficial" que a auditoria de tokens visuais assumia
 * já existir (99 arquivos reimplementam `<Loader2 className="...
 * animate-spin" />` à mão, contra só ~25 usando algo compartilhado — mas
 * esse "algo compartilhado" era o Skeleton, que é outro padrão visual
 * inteiramente: pulse/placeholder ("aqui vem uma forma parecida com
 * isso"), não giro ("processando, duração desconhecida"). Não existia
 * nenhum componente Spinner até este arquivo — por isso ele nasce agora,
 * antes de qualquer migração fazer sentido.
 *
 * Prefira Skeleton quando a FORMA do conteúdo já é conhecida (reduz layout
 * shift); prefira Spinner pra ação em andamento sem forma prévia (botão
 * salvando, ação pontual, carregamento inicial de uma tela pequena).
 */
interface SpinnerProps {
  /** Tamanho/cor via classe — mesma convenção do Skeleton. Default w-4 h-4
   *  (o tamanho mais comum entre os usos manuais hoje). */
  className?: string
  /** Texto acessível pra leitor de tela, só quando o spinner é o ÚNICO
   *  sinal de carregamento (sem nenhum texto visível ao lado, ex.: um
   *  spinner sozinho no centro de um card vazio). Na maioria dos casos há
   *  texto visível adjacente ("Salvando…", "Carregando…") que já cumpre
   *  esse papel — nesses, omita `label` e o spinner fica decorativo
   *  (aria-hidden), como o Skeleton. */
  label?: string
}

export function Spinner({ className, label }: SpinnerProps) {
  const icon = <Loader2 className={cn('w-4 h-4 animate-spin', className)} aria-hidden="true" />
  if (!label) return icon
  return (
    <span role="status" className="inline-flex items-center">
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  )
}
