import { useEffect, useRef } from 'react'
import { cn } from '../../lib/utils'
import { Button } from './button'

/**
 * Minimal shadcn-style modal built on the native `<dialog>` element.
 * Kept dependency-free; the page currently edits tasks inline but this
 * primitive is available for future confirm flows.
 */
function Dialog({ open = false, onOpenChange, title, description, className, children, footer }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const node = dialogRef.current
    if (!node) return

    if (open && !node.open) {
      if (typeof node.showModal === 'function') node.showModal()
      else node.setAttribute('open', '')
    } else if (!open && node.open) {
      if (typeof node.close === 'function') node.close()
      else node.removeAttribute('open')
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      className={cn('ui-dialog', className)}
      onClose={() => onOpenChange?.(false)}
      onCancel={() => onOpenChange?.(false)}
    >
      <div className="ui-dialog__panel">
        {title ? <h2 className="ui-dialog__title">{title}</h2> : null}
        {description ? <p className="ui-dialog__description">{description}</p> : null}
        <div className="ui-dialog__body">{children}</div>
        <div className="ui-dialog__footer">
          {footer ?? (
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>
              Close
            </Button>
          )}
        </div>
      </div>
    </dialog>
  )
}

export { Dialog }
export default Dialog
