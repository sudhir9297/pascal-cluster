'use client'

import { useEditor } from '@pascal-app/editor'
import { CATALOG_ITEMS } from '@pascal-app/editor/catalog'
import { useViewer } from '@pascal-app/viewer'
import type { XRWandBuildItem, XRWandItemsModel } from '../../../../xr/wand'
import type { PascalXRWandBindings } from '../bindings'

const furnishTools = [
  { catalogCategory: 'furniture', label: 'Furniture', iconSrc: '/icons/couch.webp' },
  { catalogCategory: 'appliance', label: 'Appliance', iconSrc: '/icons/appliance.webp' },
  { catalogCategory: 'kitchen', label: 'Kitchen', iconSrc: '/icons/kitchen.webp' },
  { catalogCategory: 'bathroom', label: 'Bathroom', iconSrc: '/icons/bathroom.webp' },
  { catalogCategory: 'outdoor', label: 'Outdoor', iconSrc: '/icons/tree.webp' },
] as const

export function usePascalXRWandItemsModel(_bindings: PascalXRWandBindings, category?: (typeof furnishTools)[number]['catalogCategory']): XRWandBuildItem[] {
  const selectedItem = useEditor((state) => state.selectedItem)
  return CATALOG_ITEMS.filter((item) => !category || item.category === category).map((item) => ({
    active: selectedItem?.src === item.src,
    icon: { src: item.thumbnail },
    id: `item-${item.id}`,
    label: item.name,
    onSelect: () => {
      useViewer.getState().setSelection({ selectedIds: [], zoneId: null })
      const editor = useEditor.getState()
      editor.setSelectedItem(item)
      editor.setTool(item.tool ?? 'item')
      editor.setMode('build')
    },
  }))
}

export function usePascalXRWandItemsPanelModel(bindings: PascalXRWandBindings): XRWandItemsModel {
  const catalogCategory = useEditor((state) => state.catalogCategory)
  const categoryId = furnishTools.find((category) => category.catalogCategory === catalogCategory)?.catalogCategory ?? furnishTools[0]!.catalogCategory
  const items = usePascalXRWandItemsModel(bindings, categoryId)
  return {
    categoryId,
    items,
    categories: furnishTools.map((category) => ({
      id: category.catalogCategory, label: category.label, icon: { src: category.iconSrc },
      active: category.catalogCategory === categoryId,
      onSelect: () => useEditor.getState().setCatalogCategory(category.catalogCategory),
    })),
  }
}
