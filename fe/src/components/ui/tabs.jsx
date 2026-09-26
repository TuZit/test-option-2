import { cn } from '../../lib/utils'

/**
 * Lightweight, accessible segmented control in the shadcn Tabs spirit.
 * Triggers stay real `<button>` elements (with `aria-pressed` + `data-state`)
 * so filter choices are announced as a group of toggle buttons.
 */
function Tabs({ className, ...props }) {
  return <div className={cn('ui-tabs', className)} {...props} />
}

function TabsList({ className, label, ...props }) {
  return <div role="group" aria-label={label} className={cn('ui-tabs__list', className)} {...props} />
}

function TabsTrigger({ className, value, active = false, onSelect, count, children, ...props }) {
  return (
    <button
      type="button"
      data-value={value}
      data-state={active ? 'active' : 'inactive'}
      aria-pressed={active}
      className={cn('ui-tabs__trigger', active && 'is-active', className)}
      onClick={() => onSelect?.(value)}
      {...props}
    >
      <span className="ui-tabs__label">{children}</span>
      {count !== undefined && count !== null ? (
        <span className="ui-tabs__count" aria-hidden="true">
          {count}
        </span>
      ) : null}
    </button>
  )
}

export { Tabs, TabsList, TabsTrigger }
