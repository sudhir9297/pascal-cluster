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
  const search = query.trim().toLowerCase()
  return families.flatMap((family) => {
    const members = items.filter((item) => family.itemIds.includes(item.id))
    if (
      !members.length ||
      !`${family.label} ${members.map((item) => item.label).join(' ')}`
        .toLowerCase()
        .includes(search)
    )
      return []
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
