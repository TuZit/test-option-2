import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const VARIANTS = {
  default: 'ui-button--default',
  secondary: 'ui-button--secondary',
  outline: 'ui-button--outline',
  ghost: 'ui-button--ghost',
  destructive: 'ui-button--destructive',
  success: 'ui-button--success',
}

const SIZES = {
  default: 'ui-button--md',
  sm: 'ui-button--sm',
  lg: 'ui-button--lg',
  icon: 'ui-button--icon',
}

/**
 * Local shadcn/ui-style Button. No component runtime is required.
 * `data-variant` / `data-size` are exposed for styling and test hooks.
 */
const Button = forwardRef(function Button(
  { className, variant = 'default', size = 'default', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-variant={variant}
      data-size={size}
      className={cn('ui-button', VARIANTS[variant] ?? VARIANTS.default, SIZES[size] ?? SIZES.default, className)}
      {...props}
    />
  )
})

Button.displayName = 'Button'

export { Button }
export default Button
