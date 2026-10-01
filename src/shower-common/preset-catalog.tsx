'use client'
import type { ReactNode } from 'react'
import { CatalogEmptyState } from '../catalog-ui'
import { catalogFamilies, type CatalogFamily } from './catalog-families'
export default function ShowerPresetCatalog({
  title,
  prefix,
  items,
  query,
  selectedId,
  active,
  onSelect,
  renderPreview,
  hint,
  families,
  consolidate = true,
}: {
  title: string
  prefix: string
  items: readonly { id: string; label: string }[]
  query: string
  selectedId: string
  active: boolean
  onSelect: (id: string) => void
  renderPreview: (id: string) => ReactNode
  hint: string
  families?: readonly CatalogFamily[]
  consolidate?: boolean
}) {
  const groups =
    families ??
    (consolidate
      ? [{ id: prefix, label: title, itemIds: items.map((item) => item.id) }]
      : items.map((item) => ({ id: item.id, label: item.label, itemIds: [item.id] })))
  const visible = catalogFamilies(items, groups, selectedId, query)
  return (
    <section className="space-y-2 border-t border-border/60 pt-3">
      <h3 className="text-xs font-semibold">{title}</h3>
      <div className="grid grid-cols-3 gap-2">
        {visible.map((family) => (
          <button
            key={family.id}
            type="button"
            aria-label={`Add ${family.label}`}
            aria-pressed={active && family.active}
            onClick={() => onSelect(family.selectedId)}
            className={`w-full overflow-hidden rounded-lg border text-left ${active && family.active ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent/30'}`}
          >
            <span className="flex aspect-[7/4] items-center justify-center bg-background/40">
              {renderPreview(family.selectedId)}
            </span>
            <span className="block min-h-8 px-2 py-1.5 text-[11px] font-medium leading-4">
              {family.label}
            </span>
          </button>
        ))}
      </div>
      {!visible.length && <CatalogEmptyState>No matching items.</CatalogEmptyState>}
      {consolidate && visible.length > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Select a placed item to change its shape and options.
        </p>
      )}
      {active && (
        <p role="status" className="text-[11px] text-muted-foreground">
          {hint} Esc to cancel.
        </p>
      )}
    </section>
  )
}
export type ShowerCatalogFilterProps = { query: string }
