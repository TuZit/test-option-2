import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Input = forwardRef(function Input({ className, type = 'text', ...props }, ref) {
  return <input ref={ref} type={type} className={cn('ui-input', className)} {...props} />
})

Input.displayName = 'Input'

export { Input }
export default Input
