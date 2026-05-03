import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MobileFeatureGate } from './MobileFeatureGate'

interface AdminMobileBlockProps {
  /** Nome amigavel da pagina admin (mostrado no titulo do gate). */
  featureName: string
  children: ReactNode
}

/**
 * Wrapper para rotas /admin/* — em mobile substitui o conteudo por
 * MobileFeatureGate. Paginas Oryon staff sao todas desktop-first
 * (tabelas larguissimas, charts, drill modais, prompt editors), nao vale
 * adaptar uma por uma.
 */
export function AdminMobileBlock({ featureName, children }: AdminMobileBlockProps) {
  const isMobile = useIsMobile()
  const navigate = useNavigate()

  if (isMobile) {
    return (
      <MobileFeatureGate
        open
        onClose={() => navigate('/home')}
        featureName={featureName}
        description="Telas de Oryon staff têm tabelas largas, drill modais e editores de prompt que ficam ilegíveis em viewport estreita. Abra no desktop para uma experiência sem fricção."
      />
    )
  }

  return <>{children}</>
}
