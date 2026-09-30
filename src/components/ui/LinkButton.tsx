import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { buttonClasses, type ButtonSize, type ButtonVariant } from './buttonStyles'

interface LinkButtonProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** Rota do app (react-router). Use `href` para âncoras (#secao) e externos. */
  to?: string
  href?: string
  variant?: ButtonVariant
  size?: ButtonSize
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  children?: ReactNode
}

/**
 * Link com o visual EXATO do `Button` (mesma receita em `buttonStyles.ts`).
 * Existe porque <button> dentro de <a> é HTML inválido e a landing/CTAs
 * precisam navegar. `to` → <Link>; `href` → <a> (âncoras e externos).
 */
export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(
  ({ to, href, variant = 'primary', size = 'md', leftIcon, rightIcon, children, className, ...props }, ref) => {
    const cls = buttonClasses({ variant, size, className })
    const inner = (
      <>
        {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        {children && <span>{children}</span>}
        {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </>
    )
    if (to) {
      return <Link ref={ref} to={to} className={cls} {...props}>{inner}</Link>
    }
    return <a ref={ref} href={href} className={cls} {...props}>{inner}</a>
  },
)
LinkButton.displayName = 'LinkButton'
