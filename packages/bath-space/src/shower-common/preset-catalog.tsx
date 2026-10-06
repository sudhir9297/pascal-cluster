'use client'
import { type ReactNode } from 'react'
import { useCatalogPreferences } from './catalog-preferences'
import { CatalogEmptyState, CatalogGrid, CatalogHeading, CatalogItemCard } from '../catalog-ui'
import type { CatalogFamily } from './catalog-families'
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
}) {
  const preferences = useCatalogPreferences()
  const key = (id: string) => `${prefix}:${id}`
  const choose = (familyId: string, id: string) => { preferences.remember(key(familyId)); onSelect(id) }
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const visible = items.filter((item) => {
    const family = families?.find((family) => family.itemIds.includes(item.id))
    const text = `${title} ${family?.label ?? ''} ${item.label}`.toLowerCase()
    return words.every((word) => text.includes(word))
  })
  return (
    <section className="space-y-2 border-t border-border/60 pt-3">
      <CatalogHeading>{title}</CatalogHeading>
      <CatalogGrid>
        {visible.map((item) => (
          <CatalogItemCard
            key={item.id}
            aria-label={`Add ${item.label}`}
            aria-pressed={active && selectedId === item.id}
            onClick={() => choose(item.id, item.id)}
            label={item.label}
          >
            {renderPreview(item.id)}
          </CatalogItemCard>
        ))}
      </CatalogGrid>
      {!visible.length && <CatalogEmptyState>{'No matching items.'}</CatalogEmptyState>}
      {active && (
        <p role="status" className="text-[11px] text-muted-foreground">
          {hint} Esc to cancel.
        </p>
      )}
    </section>
  )
}
export type ShowerCatalogFilterProps = { query: string }
