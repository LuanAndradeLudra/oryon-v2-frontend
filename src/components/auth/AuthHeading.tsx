import type { ReactNode } from 'react'

/** Título + subtítulo do formulário de autenticação (h2 — o h1 da página é do AuthLayout). */
export function AuthHeading({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-surface-50 tracking-tight">{title}</h2>
      {description && <p className="text-sm text-surface-400 mt-1">{description}</p>}
    </div>
  )
}
