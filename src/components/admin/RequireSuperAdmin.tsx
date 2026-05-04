// ─── Super Admin Route Guard ───────────────────────────────────────────────
// Renders the children only when the authenticated user is Oryon staff.
// Anything under /admin/* must be wrapped with this — the agent-server
// already enforces the role on the API side, but the inline guard avoids
// flashing forbidden screens at the user.

import type { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ShieldAlert } from 'lucide-react'

export function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  if (user?.role !== 'super_admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-status-pending-bg flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6 text-status-pending" />
        </div>
        <h1 className="text-lg font-semibold text-surface-100 mb-2">
          Área restrita à equipe Oryon
        </h1>
        <p className="text-sm text-surface-400 max-w-md">
          Esta seção é usada para administrar o catálogo da plataforma e atribuir
          skills aos agentes dos clientes. Acesso disponível apenas para
          administradores internos.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
