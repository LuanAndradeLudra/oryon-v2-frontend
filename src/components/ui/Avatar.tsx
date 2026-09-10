import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  name: string
  imageUrl?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  online?: boolean
  className?: string
  /**
   * QUEM é esta pessoa para o produto.
   *
   * `contact` (padrão) é o cliente — o assunto da tela. `operator` é gente da
   * plataforma: o dono do negócio, quem está atribuído, o autor de uma nota, o
   * usuário logado. As duas apareciam com o mesmo rosto, e numa lista de
   * atendimento isso é confusão real: o avatar ao lado de "atribuído a" lia
   * igual ao avatar de quem escreveu.
   */
  kind?: 'contact' | 'operator'
}

const sizes = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

const dotSizes = {
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
}


export function Avatar({ name, imageUrl, size = 'md', online, className, kind = 'contact' }: AvatarProps) {
  /* A FORMA é o sinal principal: círculo para o cliente, quadrado de cantos
     arredondados para quem é da casa. Raio em PORCENTAGEM para acompanhar o
     tamanho — a 40 px dá 12 px de canto, a 24 px dá 7 px; um raio fixo viraria
     quase-círculo nos avatares pequenos e a distinção se perderia justamente
     onde ela mais aparece (listas). Vale também para a FOTO: um operador com
     foto continua sendo um quadrado arredondado. */
  const forma = kind === 'operator' ? 'rounded-[30%]' : 'rounded-full'

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className={cn(forma, 'object-cover', sizes[size])}
        />
      ) : (
        /**
         * Fallback MONOCROMÁTICO.
         *
         * Aqui havia oito cores sorteadas por `name.charCodeAt(0) % 8` — o
         * PRIMEIRO caractere, e só ele. Todo "A" saía índigo, todo "M"
         * esmeralda, e "Zeca" colidia com "Bruno" (90 % 8 = 66 % 8). Numa
         * lista ordenada por nome isso produzia faixas da mesma cor, e a cor
         * duplicava exatamente a informação que as iniciais já mostram.
         *
         * Ou seja: era a maior mancha de cor da tela (círculo de 40 px, vinte
         * vezes na lista de conversas) gastando o recurso mais escasso da
         * interface com zero informação. Cor é para ESTADO — a urgência, o
         * não lido, o alerta. Identidade se resolve com forma e texto.
         *
         * Foto continua sendo foto: quando existe `imageUrl`, nada disto vale.
         *
         * Disco e inicial vêm de tokens SEMÂNTICOS (`avatar-surface` /
         * `avatar-initials`), não de degraus da escala. É o que permite o
         * escuro inverter — disco cinza claro, letra na cor do chão da lista,
         * recortada nele — sem arrastar o tema claro junto, onde chão e disco
         * são vizinhos e o recorte apagaria a letra. Um nome só aqui, dois
         * valores por tema no `index.css`, com as medidas de contraste.
         */
        <div
          className={cn(
            forma,
            'flex items-center justify-center font-semibold',
            // Operador leva o gradiente da marca (`.avatar-operador`, no
            // index.css) — teal diz "é da casa". O contato fica no par
            // monocromático por tema: cliente é identidade, e identidade não
            // se codifica em cor.
            kind === 'operator'
              ? 'avatar-operador'
              : 'bg-avatar-surface text-avatar-initials',
            sizes[size],
          )}
        >
          {getInitials(name)}
        </div>
      )}
      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-surface-900',
            dotSizes[size],
            online ? 'bg-online' : 'bg-offline'
          )}
        />
      )}
    </div>
  )
}
