import { useEffect, useRef } from 'react'

/**
 * Atualização periódica só com a aba VISÍVEL (página Suporte e, na 1384, a
 * fila da Oryon): a cada `ms` e ao voltar para a aba. Aba escondida não
 * consulta nada. O aviso em tempo real pelo socket chega com a SCRUM-1386.
 */
export function useAtualizacaoPeriodica(atualizar: () => void, ms = 30_000) {
  const ultima = useRef(atualizar)
  useEffect(() => { ultima.current = atualizar })
  useEffect(() => {
    const seVisivel = () => { if (document.visibilityState === 'visible') ultima.current() }
    const t = setInterval(seVisivel, ms)
    document.addEventListener('visibilitychange', seVisivel)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', seVisivel) }
  }, [ms])
}
