import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Textarea = forwardRef(function Textarea({ className, rows = 3, ...props }, ref) {
  return <textarea ref={ref} rows={rows} className={cn('ui-textarea', className)} {...props} />
})

Textarea.displayName = 'Textarea'

export { Textarea }
export default Textarea
