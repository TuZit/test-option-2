import { cn } from '../../lib/utils'

const VARIANTS = {
  default: 'ui-badge--default',
  secondary: 'ui-badge--secondary',
  outline: 'ui-badge--outline',
  success: 'ui-badge--success',
}

function Badge({ className, variant = 'default', ...props }) {
  return (
    <span
      data-variant={variant}
      className={cn('ui-badge', VARIANTS[variant] ?? VARIANTS.default, className)}
      {...props}
    />
  )
}

export { Badge }
export default Badge
