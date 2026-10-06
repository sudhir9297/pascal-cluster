export type CatalogItem = { id: string; label: string }
export type CatalogFamily = { id: string; label: string; itemIds: readonly string[] }

// Search every variant, but show one card per family. Keep the last selected
// variant when adding another item; a search never changes placement settings.
export function catalogFamilies(
  items: readonly CatalogItem[],
  families: readonly CatalogFamily[],
  selectedId: string,
  query: string,
) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return families.flatMap((family) => {
    const members = items.filter((item) => family.itemIds.includes(item.id))
    if (!members.length || !members.some(item => {
      const text = `${family.label} ${item.label}`.toLowerCase()
      return words.every(word => text.includes(word))
    })) return []
    const selected = members.find((item) => item.id === selectedId) ?? members[0]!
    return [
      {
        ...family,
        selectedId: selected.id,
        active: members.some((item) => item.id === selectedId),
      },
    ]
  })
}
