'use client'
import { useId, useState, type ReactNode, type KeyboardEvent } from 'react'

const tabs = ['Organisation', 'Idées et cadeaux', 'Frais']

export default function CelebrationTabs({ organisation, ideas, costs }: { organisation: ReactNode; ideas: ReactNode; costs: ReactNode }) {
  const id = useId()
  const [active, setActive] = useState(0)
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3 : null
    if (next === null) return
    event.preventDefault()
    setActive(next)
    document.getElementById(`${id}-tab-${next}`)?.focus()
  }
  return <div className="min-w-0 space-y-5">
    <div role="tablist" aria-label="Ma célébration" className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-surface p-1">
      {tabs.map((label, index) => <button key={label} type="button" role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={active === index} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={event => move(event, index)} className={'min-h-11 min-w-0 rounded-lg px-1 py-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-accent sm:px-3 sm:text-sm ' + (active === index ? 'bg-action text-on-action' : 'text-ink hover:bg-ink/10')}>{label}</button>)}
    </div>
    {[organisation, ideas, costs].map((content, index) => <div key={tabs[index]} id={`${id}-panel-${index}`} role="tabpanel" aria-labelledby={`${id}-tab-${index}`} hidden={active !== index} tabIndex={0} className="min-w-0 space-y-5 focus-visible:outline-2 focus-visible:outline-accent">{content}</div>)}
  </div>
}
