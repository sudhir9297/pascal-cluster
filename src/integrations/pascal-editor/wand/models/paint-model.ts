'use client'

import {
  generateSceneMaterialId, getCatalogMaterialById, getDynamicLibraryMaterials,
  getLibraryMaterialIdFromRef, getLibraryMaterialsVersion, getMaterialsForCategory,
  MATERIAL_CATEGORIES, subscribeLibraryMaterials, toLibraryMaterialRef, toSceneMaterialRef,
  useScene, type MaterialSource,
} from '@pascal-app/core'
import { getActivePaintMaterialLabel, hasActivePaintMaterial, useEditor } from '@pascal-app/editor'
import type { XRWandPaintModel } from '../../../../xr/wand'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { PascalXRWandBindings } from '../bindings'

const SOURCE_FILTERS: { id: MaterialSource; label: string }[] = [
  { id: 'pascal', label: 'Pascal' },
  { id: 'mine', label: 'Mine' },
  { id: 'workspace', label: 'Workspace' },
  { id: 'community', label: 'Community' },
]

export function usePascalXRWandPaintModel(bindings: PascalXRWandBindings): XRWandPaintModel {
  const mode = useEditor((state) => state.mode)
  const activePaintMaterial = useEditor((state) => state.activePaintMaterial)
  const paintEraser = useEditor((state) => state.paintEraser)
  const paintHover = useEditor((state) => state.paintHover)
  const paintScope = useEditor((state) => state.paintScope)
  const materials = useScene((state) => state.materials)
  const [selectedCategory, setSelectedCategory] = useState<(typeof MATERIAL_CATEGORIES)[number]>(MATERIAL_CATEGORIES[0])
  const [sourceFilter, setSourceFilter] = useState<MaterialSource>('pascal')
  const [showScene, setShowScene] = useState(false)
  useSyncExternalStore(subscribeLibraryMaterials, getLibraryMaterialsVersion, getLibraryMaterialsVersion)
  const selectedCatalogId = getLibraryMaterialIdFromRef(activePaintMaterial?.materialPreset)
  useEffect(() => {
    const category = getCatalogMaterialById(selectedCatalogId ?? undefined)?.category
    if (category) setSelectedCategory(category)
  }, [selectedCatalogId])

  const lastHover = useRef<typeof paintHover>(null)
  if (mode !== 'material-paint') lastHover.current = null
  else if (paintHover) lastHover.current = paintHover
  const context = paintHover ?? lastHover.current
  const enabled = mode === 'material-paint' && (paintEraser || hasActivePaintMaterial(activePaintMaterial))
  const scopes = context?.scopes ?? ['single']
  const effectiveScope = scopes.includes(paintScope) ? paintScope : 'single'
  const availableCategories = MATERIAL_CATEGORIES.filter((category) => getMaterialsForCategory(category).length > 0)
  const visibleSourceFilters = SOURCE_FILTERS.filter((source) => source.id !== 'workspace' ||
    getDynamicLibraryMaterials().some((item) => item.source === 'workspace'))
  const catalogItems = getMaterialsForCategory(selectedCategory).filter((item) => (item.source ?? 'pascal') === sourceFilter)
  const selectMaterial = (ref: string) => {
    bindings.activatePaintMode()
    useEditor.getState().armMaterialPaint({
      materialPreset: ref,
      sourceTarget: activePaintMaterial?.sourceTarget ?? 'item',
    })
  }
  const changeCategory = (direction: number) => {
    const index = availableCategories.indexOf(selectedCategory)
    const next = availableCategories[(index + direction + availableCategories.length) % availableCategories.length]
    if (next) { setShowScene(false); setSelectedCategory(next) }
  }
  const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)
  const scopeLabel = effectiveScope === 'object' ? `Whole ${context?.nodeNoun ?? 'object'}` :
    effectiveScope === 'matching' ? 'All matching' : effectiveScope === 'room' ? 'Room' :
    context?.slotLabel || 'This surface'
  return {
    activeMaterialLabel: getActivePaintMaterialLabel(activePaintMaterial),
    canPaint: hasActivePaintMaterial(activePaintMaterial),
    stopPainting: bindings.activateSelectMode,
    categories: [
      ...availableCategories.map((category) => ({
        id: category, label: label(category), selected: !showScene && selectedCategory === category,
        onSelect: () => { setShowScene(false); setSelectedCategory(category) },
      })),
      { id: 'scene', label: 'Scene materials', selected: showScene, onSelect: () => setShowScene(true) },
      ...visibleSourceFilters.map((source) => ({
        id: `source-${source.id}`, label: `Source: ${source.label}`, selected: sourceFilter === source.id,
        onSelect: () => { setShowScene(false); setSourceFilter(source.id) },
      })),
    ],
    brushActive: mode === 'material-paint' && !paintEraser,
    eraserActive: mode === 'material-paint' && paintEraser,
    category: {
      canChange: availableCategories.length > 1,
      label: showScene ? 'Scene materials' : label(selectedCategory),
      next: () => changeCategory(1), previous: () => changeCategory(-1),
      position: availableCategories.indexOf(selectedCategory), total: availableCategories.length,
    },
    items: showScene ? Object.values(materials).map((item) => ({
      id: item.id, label: item.name, icon: { color: item.material.properties?.color ?? '#ffffff' },
      onSelect: () => selectMaterial(toSceneMaterialRef(item.id)),
      selected: !paintEraser && activePaintMaterial?.materialPreset === toSceneMaterialRef(item.id),
    })) : catalogItems.map((item) => ({
      id: item.id, label: item.label, icon: { color: item.previewColor ?? item.preset.mapProperties.color, src: item.previewThumbnailUrl },
      onSelect: () => selectMaterial(toLibraryMaterialRef(item.id)),
      selected: !paintEraser && activePaintMaterial?.materialPreset === toLibraryMaterialRef(item.id),
    })),
    mark: mode === 'material-paint' ? (paintEraser ? 'Erasing' : 'Painting') : 'Browse materials',
    page: 0, pageCount: 1,
    scope: {
      disabled: !enabled || !context || scopes.length <= 1,
      label: !enabled ? 'Choose a material or activate Paint / Erase' : context ? `${paintEraser ? 'Erase' : 'Paint'}: ${scopeLabel}` : 'Aim at a surface',
      onSelect: () => useEditor.getState().cyclePaintScope(),
      selected: scopes.length > 1 && effectiveScope !== 'single',
    },
    actions: [{ id: 'create-material', label: 'Add material', onSelect: () => {
      const id = generateSceneMaterialId()
      useScene.getState().addSceneMaterial({
        id, name: `Material ${Object.keys(useScene.getState().materials).length + 1}`,
        material: { preset: 'custom', properties: {
          color: '#ffffff', roughness: 0.5, metalness: 0, opacity: 1, transparent: false, side: 'front',
        } },
      })
      selectMaterial(toSceneMaterialRef(id))
      setShowScene(true)
    } }],
    startPainting: () => { bindings.activatePaintMode(); useEditor.getState().setPaintEraser(false) },
    toggleEraser: () => { bindings.activatePaintMode(); useEditor.getState().setPaintEraser(mode !== 'material-paint' || !paintEraser) },
  }
}
