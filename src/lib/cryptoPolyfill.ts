// crypto.randomUUID() so esta disponivel em secure context (HTTPS ou localhost).
// Em dev mobile via HTTP + IP da LAN, o metodo nao existe e qualquer chamada
// lanca TypeError, derrubando fluxos como save de contato, criacao de toasts,
// gerador de IDs de sessao do Copilot, etc.
//
// Este polyfill so substitui se o metodo nao existe — em prod (HTTPS) usa o
// nativo do navegador.

if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
  const fallback = (): `${string}-${string}-${string}-${string}-${string}` => {
    // RFC4122 v4 UUID baseado em Math.random — colisao improvavel para uso UI.
    // Nao usar para criptografia. Em HTTPS o nativo seguro entra em acao.
    const hex = (n: number) => n.toString(16).padStart(2, '0')
    const bytes = new Uint8Array(16)
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
    bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10
    const s = Array.from(bytes, hex).join('')
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}` as `${string}-${string}-${string}-${string}-${string}`
  }
  // Object.defineProperty pra evitar erro caso `crypto.randomUUID` seja getter
  // somente-leitura em algumas implementacoes.
  Object.defineProperty(crypto, 'randomUUID', {
    value: fallback,
    writable: false,
    configurable: true,
  })
}
