import { Tabs, TabsList, TabsTrigger } from './ui/tabs'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'done', label: 'Done' },
]

/**
 * All/Open/Done filter control.
 *
 * @param {object} props
 * @param {'all'|'open'|'done'} props.value
 * @param {(value: 'all'|'open'|'done') => void} props.onChange
 * @param {{ all?: number, open?: number, done?: number }} [props.counts]
 */
function TaskFilters({ value = 'all', onChange, counts = {} }) {
  return (
    <Tabs className="task-filters">
      <TabsList label="Filter tasks">
        {FILTERS.map((filter) => (
          <TabsTrigger
            key={filter.value}
            value={filter.value}
            active={value === filter.value}
            count={counts[filter.value]}
            onSelect={onChange}
          >
            {filter.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

export default TaskFilters
