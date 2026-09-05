// ─── audienceTint ──────────────────────────────────────────────────────────
// Duas leituras da mesma cor de acento, para os chips do construtor de
// público. Existe porque o mockup usa DOIS tons de cada acento e o mapa
// compartilhado (`ui/accentColor`) só devolve o cheio:
//
//   fundo e borda do chip  → o acento cheio, com pouca opacidade
//   TEXTO do chip          → um tom claro do mesmo acento
//
// (`p1b-extra.html:299-300`: `.val span` usa `--brand300` e `.val span.neg`
// usa `#FDA4AF`, ambos mais claros que o acento cheio.)
//
// Não é preciosismo: o acento cheio como texto de 12.5px sobre `--s800` fica
// em torno de 4.2:1 de contraste, abaixo do mínimo de 4.5:1 para texto
// pequeno. Clareando, passa com folga.
//
// Fica local em vez de entrar no `ui/accentColor` porque só o construtor
// precisa dos dois tons hoje; se uma segunda tela pedir, aí sim sobe para a
// primitiva compartilhada.
import { accentColor, type Accent } from '@/components/ui/accentColor'

/** Tom claro do acento — o mesmo papel de `--brand300` / `#FDA4AF` no mockup,
 *  mas derivado do token em vez de hex cru (Carta §7). 50% já cai quase em
 *  cima do valor do mockup, e continua sendo a mesma cor da família. */
export function accentText(accent: Accent): string {
  return `color-mix(in srgb, ${accentColor(accent)} 50%, white)`
}

/** Fundo/borda: o acento cheio com opacidade, como `.val span` faz. */
export function accentSurface(accent: Accent, pct: number): string {
  return `color-mix(in srgb, ${accentColor(accent)} ${pct}%, transparent)`
}
