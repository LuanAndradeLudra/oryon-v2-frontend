import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  name: string
  imageUrl?: string
  /** `2xs` = 20px (spec 1b TEAM-03: avatar mono de lista densa).
   *  Tamanhos numéricos = px exatos da spec 1d: `30` chat header (CONV-CHAT-02,
   *  11px), `36` item da lista (CONV-LIST-14, 12px), `44` painel do contato
   *  (CONV-PANEL-02, 15px). `xs` = 24 (bolha, CONV-CHAT-16), `md` = 40 (drawer). */
  size?: '2xs' | 'xs' | 'sm' | '30' | '36' | 'md' | '44' | 'lg'
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
  '2xs': 'w-5 h-5 text-[9px]',
  xs: 'w-6 h-6 text-3xs',
  sm: 'w-8 h-8 text-xs',
  '30': 'w-[30px] h-[30px] text-[11px]',
  '36': 'w-9 h-9 text-xs',
  md: 'w-10 h-10 text-sm',
  '44': 'w-11 h-11 text-[15px]',
  lg: 'w-12 h-12 text-base',
}

const dotSizes = {
  '2xs': 'w-[7px] h-[7px]',
  xs: 'w-1.5 h-1.5',
  sm: 'w-2 h-2',
  '30': 'w-2 h-2',
  '36': 'w-2.5 h-2.5',
  md: 'w-2.5 h-2.5',
  '44': 'w-3 h-3',
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
            // Iniciais 700 em toda a spec (CONT-HDR-10, CONV-LIST-14, CONV-CHAT-02…).
            'flex items-center justify-center font-bold',
            // SCRUM-1097 (spec 1a/1d/shell: `--avs/--avi`): operador e contato
            // no MESMO par monocromático por tema — o que distingue "é da
            // casa" é a FORMA (quadrado arredondado), não um gradiente teal.
            // `.avatar-operador` (gradiente) saiu de uso.
            'bg-avatar-surface text-avatar-initials',
            sizes[size],
          )}
        >
          {getInitials(name)}
        </div>
      )}
      {online !== undefined && (
        <span
          className={cn(
            // Canvas 1b (Equipe): dot 7px com anel de 1.5px na cor da SUPERFÍCIE (--sf).
            'absolute bottom-0 right-0 rounded-full border-[1.5px] border-surface-800',
            dotSizes[size],
            online ? 'bg-online' : 'bg-offline'
          )}
        />
      )}
    </div>
  )
}
