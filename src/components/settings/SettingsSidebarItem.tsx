import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface SettingsSidebarItemProps {
  section: string
  label: string
  icon: ReactNode
  adminOnly?: boolean
  currentRole?: string
}

export function SettingsSidebarItem({ section, label, icon, adminOnly, currentRole }: SettingsSidebarItemProps) {
  const { section: activeSection } = useParams()
  const isActive = activeSection === section

  // Defense-in-depth duplicate of the parent's filter — accept all "admin"
  // tiers (admin / business_admin / super_admin), not just literal 'admin'.
  if (
    adminOnly
    && currentRole !== 'admin'
    && currentRole !== 'business_admin'
    && currentRole !== 'super_admin'
  ) return null

  return (
    <Link
      to={`/settings/${section}`}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150',
        isActive
          ? 'bg-brand-600/10 text-brand-400'
          : 'text-surface-400 hover:bg-surface-800 hover:text-surface-100'
      )}
    >
      <span className="w-4 h-4 flex-shrink-0">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
