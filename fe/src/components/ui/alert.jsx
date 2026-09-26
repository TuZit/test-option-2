import { cn } from '../../lib/utils'

const VARIANTS = {
  default: 'ui-alert--default',
  destructive: 'ui-alert--destructive',
  success: 'ui-alert--success',
}

function Alert({ className, variant = 'default', role, ...props }) {
  return (
    <div
      role={role ?? (variant === 'default' ? 'status' : 'alert')}
      data-variant={variant}
      className={cn('ui-alert', VARIANTS[variant] ?? VARIANTS.default, className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }) {
  return <p className={cn('ui-alert__title', className)} {...props} />
}

function AlertDescription({ className, ...props }) {
  return <div className={cn('ui-alert__description', className)} {...props} />
}

export { Alert, AlertTitle, AlertDescription }
