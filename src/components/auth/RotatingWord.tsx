import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

// Restaurado a pedido do PO (commit cab9bdf^ tinha tirado) — a proibição de
// framer-motion valia para as peças NOVAS do palco (docs/design/landing-2026),
// não para repor o que já existia na tela de login.
const ROTATING_WORDS = ['convertem.', 'encantam.', 'fidelizam.', 'crescem.']

/** Palavra que troca a cada 2,4s. Em reduced-motion, mostra a primeira, fixa. */
export function RotatingWord() {
  const [index, setIndex] = useState(0)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % ROTATING_WORDS.length), 2400)
    return () => clearInterval(timer)
  }, [reduced])

  if (reduced) {
    return <span className="inline-block text-brand-400">{ROTATING_WORDS[0]}</span>
  }

  return (
    <span className="relative inline-block overflow-hidden h-[1.2em] align-bottom">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={index}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          exit={{ y: '-100%', opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block text-brand-400"
        >
          {ROTATING_WORDS[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
