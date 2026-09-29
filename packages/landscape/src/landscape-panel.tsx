'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PanelSection, useEditor } from '@pascal-app/editor'
import { type AnyNode, type AnyNodeId, useScene } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { PergolaPanel } from './pergola/editor/panel'
import TreePanel from './tree/editor/panel'
import { TREE_SPECIES, TREE_SPECIES_BY_KEY, treeControls } from './tree/domain/species'
import { PathwayPanel } from './pathways/editor/panel'
import { GroundAccessPanel } from './ground-access/panel'
import GroundAreaPanel from './ground-areas/editor/panel'
import { GROUND_AREA_KIND } from './ground-areas/domain/schema'
import { CatalogListRow } from './editor/catalog-list-row'
import { GROUND_SURFACE_THUMBNAILS, LANDSCAPE_CATALOG_THUMBNAILS } from './editor/catalog-thumbnails'
import type { GroundSurface } from './ground-areas/domain/schema'

type Menu = 'root' | 'pergola' | 'pathway' | 'patio' | 'deck' | 'concrete-slab' | 'landing' | 'edging' | 'retaining-wall' | 'tree'
type Target = 'ground-area' | Exclude<Menu, 'root'>
type CatalogItem = { label: string; target: Target; species?: string }
type CatalogGroup = { title: string; items: CatalogItem[] }
type LayoutTab = 'layout' | 'planting' | 'review'
type SceneGroup = 'Structures' | 'Surfaces' | 'Pathways' | 'Plants'
type SceneRow = { key: string; label: string; detail: string; thumbnail: string; nodes: AnyNode[]; target: Target; species?: string }

const catalog: CatalogGroup[] = [
  { title: 'Plants', items: TREE_SPECIES.map((species) => ({ label: species.name, target: 'tree', species: species.key })) },
  { title: 'Site', items: [{ label: 'Ground areas', target: 'ground-area' }] },
  { title: 'Pathways', items: [{ label: 'Walkways', target: 'pathway' }] },
  { title: 'Structures', items: [
    { label: 'Pergola', target: 'pergola' }, { label: 'Deck', target: 'deck' },
    { label: 'Patio', target: 'patio' }, { label: 'Landing', target: 'landing' },
    { label: 'Concrete slab', target: 'concrete-slab' }, { label: 'Edging', target: 'edging' },
    { label: 'Retaining wall', target: 'retaining-wall' },
  ] },
]

const TABS: { id: LayoutTab; label: string; number: string }[] = [
  { id: 'layout', label: 'Layout', number: '1' },
  { id: 'planting', label: 'Planting', number: '2' },
  { id: 'review', label: 'Review', number: '3' },
]

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.2 4.2" /></svg>
}

function CatalogThumb({ item, size = 36 }: { item: CatalogItem; size?: number }) {
  return <img src={LANDSCAPE_CATALOG_THUMBNAILS[item.target]} alt="" aria-hidden="true"
    width={size} height={size} style={{ width: size, height: size, flex: `0 0 ${size}px`,
      objectFit: 'cover', borderRadius: 5, border: '1px solid color-mix(in srgb, var(--foreground) 13%, transparent)' }} />
}

function formatDetail(node: AnyNode) {
  if ((node.type as string) === 'landscape:tree') return `SeedThree · ${TREE_SPECIES_BY_KEY[(node as AnyNode & { species?: string }).species ?? 'whiteOak']?.name ?? 'Tree'}`
  const raw = node as AnyNode & { width?: number; depth?: number; vertices?: unknown[]; edges?: unknown[] }
  if (Array.isArray(raw.edges)) return `${raw.edges.length} ${raw.edges.length === 1 ? 'segment' : 'segments'}`
  if (typeof raw.width === 'number' && typeof raw.depth === 'number') return `${raw.width.toFixed(1)} m × ${raw.depth.toFixed(1)} m`
  return 'Landscape element'
}

function sceneRows(nodes: AnyNode[], group: SceneGroup): SceneRow[] {
  const buckets = new Map<string, SceneRow>()
  for (const node of nodes) {
    const type = node.type as string
    const metadata = (node as AnyNode & { metadata?: Record<string, unknown> }).metadata
    let definition: { group: SceneGroup; key: string; label: string; target: Target; thumbnail: string; species?: string } | null = null
    if (type === 'landscape:pergola' && group === 'Structures') definition = { group, key: type, label: 'Pergola', target: 'pergola', thumbnail: LANDSCAPE_CATALOG_THUMBNAILS.pergola }
    else if (type === 'landscape:tree' && group === 'Plants') {
      const species = (node as AnyNode & { species?: string }).species ?? 'whiteOak'
      definition = { group, key: `${type}:${species}`, label: TREE_SPECIES_BY_KEY[species]?.name ?? 'Tree',
        target: 'tree', species, thumbnail: LANDSCAPE_CATALOG_THUMBNAILS.tree }
    }
    else if (type === 'landscape:deck' && group === 'Structures') definition = { group, key: type, label: 'Deck', target: 'deck', thumbnail: LANDSCAPE_CATALOG_THUMBNAILS.deck }
    else if (type === 'wall' && metadata?.landscapeRetainingWall === true && group === 'Structures') definition = { group, key: 'landscape:retaining-wall', label: 'Retaining wall', target: 'retaining-wall', thumbnail: LANDSCAPE_CATALOG_THUMBNAILS['retaining-wall'] }
    else if (type === 'landscape:ground-area' && group === 'Surfaces') {
      const surface = (node as AnyNode & { surface?: string }).surface ?? 'grass'
      const inventorySurface = surface === 'grass2' ? 'grass' : surface
      const label = inventorySurface.charAt(0).toUpperCase() + inventorySurface.slice(1)
      definition = { group, key: `${type}:${inventorySurface}`, label, target: 'ground-area',
        thumbnail: GROUND_SURFACE_THUMBNAILS[inventorySurface as keyof typeof GROUND_SURFACE_THUMBNAILS] ?? LANDSCAPE_CATALOG_THUMBNAILS['ground-area'] }
    } else if (type === 'landscape:pathway' && group === 'Pathways') {
      definition = { group, key: type, label: 'Walkways', target: 'pathway', thumbnail: LANDSCAPE_CATALOG_THUMBNAILS.pathway }
    } else if (group === 'Structures') {
      const structures: Record<string, { label: string; target: Target }> = {
        'landscape:patio': { label: 'Patio', target: 'patio' },
        'landscape:concrete-slab': { label: 'Concrete slab', target: 'concrete-slab' },
        'landscape:landing': { label: 'Landing', target: 'landing' },
        'landscape:edging': { label: 'Edging', target: 'edging' },
      }
      const structure = structures[type]
      if (structure) definition = { group, key: type, ...structure, thumbnail: LANDSCAPE_CATALOG_THUMBNAILS[structure.target] }
    }
    if (!definition) continue
    const row = buckets.get(definition.key) ?? { key: definition.key, label: definition.label,
      detail: formatDetail(node), thumbnail: definition.thumbnail, nodes: [], target: definition.target, species: definition.species }
    row.nodes.push(node)
    buckets.set(definition.key, row)
  }
  return [...buckets.values()].sort((a, b) => a.label.localeCompare(b.label))
}

function inventoryRows(group: SceneGroup, placed: SceneRow[]): SceneRow[] {
  const structures: SceneRow[] = [
    ['pergola', 'Pergola'], ['deck', 'Deck'], ['patio', 'Patio'], ['landing', 'Landing'],
    ['concrete-slab', 'Concrete slab'], ['edging', 'Edging'], ['retaining-wall', 'Retaining wall'],
  ].map(([target, label]) => ({ key: target === 'retaining-wall' ? 'landscape:retaining-wall' : `landscape:${target}`,
    label: String(label || target || 'Landscape'), target: String(target) as Target, thumbnail: LANDSCAPE_CATALOG_THUMBNAILS[target as keyof typeof LANDSCAPE_CATALOG_THUMBNAILS] ?? LANDSCAPE_CATALOG_THUMBNAILS['ground-area'], detail: 'Landscape structure', nodes: [] }))
  const surfaces: SceneRow[] = (Object.keys(GROUND_SURFACE_THUMBNAILS) as (keyof typeof GROUND_SURFACE_THUMBNAILS)[])
    .filter((surface) => surface !== 'grass2')
    .map((surface) => ({ key: `landscape:ground-area:${surface}`, label: surface.charAt(0).toUpperCase() + surface.slice(1),
      target: 'ground-area' as const, thumbnail: GROUND_SURFACE_THUMBNAILS[surface], detail: 'Ground cover', nodes: [] }))
  const pathways: SceneRow[] = [{ key: 'landscape:pathway', label: 'Walkways', target: 'pathway',
    thumbnail: LANDSCAPE_CATALOG_THUMBNAILS.pathway, detail: 'Connected pathways', nodes: [] }]
  const plants: SceneRow[] = TREE_SPECIES.map((species) => ({ key: `landscape:tree:${species.key}`,
    label: species.name, target: 'tree', species: species.key,
    thumbnail: LANDSCAPE_CATALOG_THUMBNAILS.tree, detail: 'SeedThree plant', nodes: [] }))
  const defaults = group === 'Structures' ? structures : group === 'Surfaces' ? surfaces : group === 'Plants' ? plants : pathways
  const placedByKey = new Map(placed.map((row) => [row.key, row]))
  return defaults.map((row) => {
    const current = placedByKey.get(row.key)
    return current ? { ...row, detail: current.detail, nodes: current.nodes } : row
  })
}

function InventoryRow({ row, onSelect, onAdd }: { row: SceneRow; onSelect: (node: AnyNode) => void; onAdd: (row: SceneRow) => void }) {
  const thumbnail = <img src={row.thumbnail} alt="" aria-hidden="true" width={42} height={42}
    style={{ width: 42, height: 42, flex: '0 0 42px', objectFit: 'cover', borderRadius: 6,
      border: '1px solid color-mix(in srgb, var(--foreground) 12%, transparent)' }} />
  return <div className="flex w-full items-center gap-1 rounded-md px-1 transition-colors hover:bg-accent/30">
    <button type="button" onClick={() => row.nodes.length ? onSelect(row.nodes.at(-1)!) : onAdd(row)}
    aria-label={`Select ${row.label}, ${row.nodes.length} in scene`}
    className="flex min-w-0 flex-1 items-center gap-2.5 border-0 bg-transparent py-1.5 text-left text-foreground focus-visible:outline-2 focus-visible:outline-ring"
    style={{ background: 'transparent' }}>
    {thumbnail}
    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium">{row.label}</span>
      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{row.detail}</span></span>
    <span aria-label={`${row.nodes.length} placed`} className="min-w-7 rounded bg-secondary px-2 py-1 text-center text-xs font-medium">{row.nodes.length}</span>
    </button>
  </div>
}

function InventoryGridCard({ row, onSelect, onAdd }: { row: SceneRow; onSelect: (node: AnyNode) => void; onAdd: (row: SceneRow) => void }) {
  return <button type="button" onClick={() => row.nodes.length ? onSelect(row.nodes.at(-1)!) : onAdd(row)}
    aria-label={`${row.nodes.length ? 'Select' : 'Add'} ${row.label}, ${row.nodes.length} in scene`}
    className="overflow-hidden rounded-md border border-border bg-secondary/30 text-left text-foreground transition-colors hover:bg-accent/30 focus-visible:outline-2 focus-visible:outline-ring">
    <img src={row.thumbnail} alt="" aria-hidden="true" width={112} height={54}
      className="h-[54px] w-full object-cover" />
    <span className="flex min-h-8 items-center gap-1.5 px-2 py-1">
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium">{row.label}</span>
      <span aria-label={`${row.nodes.length} placed`} className="min-w-6 rounded bg-background/60 px-1.5 py-0.5 text-center text-[10px]">{row.nodes.length}</span>
    </span>
  </button>
}

export default function LandscapePanel() {
  const [menu, setMenu] = useState<Menu>('root')
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<LayoutTab>('layout')
  const hasSelectedLevel = useViewer((state) => Boolean(state.selection.levelId))
  const activeLevelId = useViewer((state) => state.selection.levelId)
  const selection = useViewer((state) => state.selection.selectedIds)
  const activeTool = useEditor((state) => state.tool)
  const groundAreaDefaults = useEditor((state) => state.toolDefaults[GROUND_AREA_KIND])
  const nodes = useScene((state) => state.nodes)
  const content = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    content.current?.scrollTo({ top: 0 })
    heading.current?.focus({ preventScroll: true })
  }, [menu, tab])
  const back = () => {
    const editor = useEditor.getState()
    if (editor.tool?.startsWith('landscape:') || (menu === 'retaining-wall' && editor.tool === 'wall' &&
      (editor.toolDefaults.wall?.metadata as { landscapeRetainingWall?: boolean } | undefined)?.landscapeRetainingWall)) editor.setTool(null)
    setMenu('root')
  }
  const filteredCatalog = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return catalog
    return catalog.map((group) => ({ ...group, items: group.items.filter((item) => item.label.toLowerCase().includes(term)) }))
      .filter((group) => group.title.toLowerCase().includes(term) || group.items.length > 0)
  }, [query])
  const selectedProduct = catalog.flatMap((group) => group.items).find((item) => item.target === menu)
  const menuTitle: Record<Menu, string> = {
    root: 'Landscape', pergola: 'Pergola', pathway: 'Walkways',
    tree: 'SeedThree plants',
    patio: 'Patio', deck: 'Deck', 'concrete-slab': 'Concrete slab', landing: 'Landing', edging: 'Edging', 'retaining-wall': 'Retaining wall',
  }
  const levelNodes = useMemo(() => Object.values(nodes).filter((node) => node.parentId === activeLevelId), [nodes, activeLevelId])
  const groups = useMemo(() => ({
    Structures: inventoryRows('Structures', sceneRows(levelNodes, 'Structures')),
    Surfaces: inventoryRows('Surfaces', sceneRows(levelNodes, 'Surfaces')),
    Pathways: inventoryRows('Pathways', sceneRows(levelNodes, 'Pathways')),
    Plants: inventoryRows('Plants', sceneRows(levelNodes, 'Plants')),
  }), [levelNodes])
  const openProduct = (target: Target, row?: SceneRow | CatalogItem) => {
    setMenu(target === 'ground-area' ? 'root' : target)
    const requestedSurface = target === 'ground-area'
      ? row && 'key' in row && row.key.startsWith('landscape:ground-area:')
        ? row.key.split(':').at(-1) as GroundSurface : 'grass'
      : null
    const editor = useEditor.getState()
    if (target === 'tree') {
      const species = row?.species ?? 'whiteOak'
      const current = editor.toolDefaults['landscape:tree']
      editor.setToolDefaults('landscape:tree', current?.species === species
        ? current : { ...current, species, controls: treeControls(species), lod: {} })
    }
    if (!hasSelectedLevel) return
    if (target === 'patio' || target === 'deck' || target === 'concrete-slab' || target === 'landing' || target === 'edging') {
      const tool = `landscape:${target}`
      if (target !== 'edging' && !editor.toolDefaults[tool]?.shape) editor.setToolDefaults(tool, { ...editor.toolDefaults[tool], shape: 'rectangle' })
      editor.setMode('build'); editor.setTool(tool)
    } else if (target === 'retaining-wall') {
      editor.setPhase('structure'); editor.setStructureLayer('elements')
      const metadata = editor.toolDefaults.wall?.metadata
      editor.setToolDefaults('wall', { ...editor.toolDefaults.wall,
        metadata: { ...(metadata && typeof metadata === 'object' ? metadata : {}), landscapeRetainingWall: true, roomBoundary: false },
        thickness: editor.toolDefaults['landscape:retaining-wall']?.depth ?? 0.25,
        height: editor.toolDefaults['landscape:retaining-wall']?.thickness ?? 0.9 })
      editor.armToolMode({ mode: 'build', tool: 'wall' })
    } else if (target === 'ground-area') {
      if (requestedSurface) editor.setToolDefaults('landscape:ground-area', {
        ...editor.toolDefaults['landscape:ground-area'], surface: requestedSurface,
      })
      editor.setMode('build'); editor.setTool('landscape:ground-area')
    } else if (target === 'pergola') {
      const kind = 'landscape:pergola'
      editor.setToolDefaults(kind, { ...editor.toolDefaults[kind], roofForm: editor.toolDefaults[kind]?.roofForm ?? 'flat' })
      editor.setMode('build'); editor.setTool(kind)
    } else if (target === 'tree') {
      editor.setMode('build'); editor.setTool('landscape:tree')
    }
  }
  const selectNode = (node: AnyNode) => {
    useViewer.getState().setSelection({ selectedIds: [node.id as AnyNodeId] })
  }
  const renderInventory = (names: SceneGroup[], placedOnly = false, layout: 'list' | 'grid' = 'list') => names.flatMap((name) => {
    const rows = groups[name].filter((row) => (!placedOnly || row.nodes.length > 0) &&
      (!query.trim() || row.label.toLowerCase().includes(query.trim().toLowerCase())))
    if (placedOnly && rows.length === 0) return []
    return <PanelSection key={name} title={name}>
      {rows.length ? layout === 'grid'
        ? <div className="grid grid-cols-2 gap-2 px-1 pb-2">{rows.map((row) => <InventoryGridCard key={row.key} row={row} onSelect={selectNode} onAdd={(item) => openProduct(item.target, item)} />)}</div>
        : rows.map((row) => <InventoryRow key={row.key} row={row} onSelect={selectNode} onAdd={(item) => openProduct(item.target, item)} />)
        : <p className="px-1 py-2 text-xs text-muted-foreground">{query ? `No ${name.toLowerCase()} match “${query}”.` : `No ${name.toLowerCase()} placed yet.`}</p>}
    </PanelSection>
  })
  const searchedItems = filteredCatalog.flatMap((group) => group.items)
  const countAll = Object.values(groups).reduce((total, rows) => total + rows.reduce((subtotal, row) => subtotal + row.nodes.length, 0), 0)
  return (
    <section aria-label="Landscape" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', color: 'var(--foreground)', fontSize: 13 }}>
      <header style={{ padding: '14px 14px 0', flexShrink: 0 }}>
        {menu !== 'root' && <button type="button" onClick={back} aria-label="Back to landscape" style={{ background: 'transparent', border: 0, color: 'var(--muted-foreground)', cursor: 'pointer', padding: '0 0 10px' }}>← Landscape</button>}
        <h2 ref={heading} tabIndex={-1} style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>{menuTitle[menu]}</h2>
        {menu === 'root' ? <label style={{ height: 36, display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--secondary)', color: 'var(--muted-foreground)' }}>
          <SearchIcon />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search landscape elements..." aria-label="Search landscape elements" style={{ width: '100%', minWidth: 0, border: 0, outline: 0, padding: 0, background: 'transparent', color: 'var(--foreground)', font: 'inherit', fontSize: 12 }} />
        </label> : null}
      </header>
      {menu === 'root' && <nav aria-label="Landscape workflow" role="tablist" className="mx-4 mt-3 flex border-b border-border">
        {TABS.map((item) => <button key={item.id} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}
          className={`flex flex-1 items-center justify-center gap-1.5 border-0 border-b-2 px-1 pb-2.5 pt-1 text-xs transition-colors ${tab === item.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold ${tab === item.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>{item.number}</span>{item.label}
        </button>)}
      </nav>}
      {menu !== 'root' && selectedProduct && <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}><CatalogThumb item={selectedProduct} size={76} /></div>}
      <div ref={content} role={menu === 'root' ? 'tabpanel' : undefined} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehaviorY: 'contain', padding: menu === 'root' ? '0 12px 12px' : 14 }}>
        {menu === 'root' && tab === 'layout' && activeTool === GROUND_AREA_KIND &&
          <div className="pt-3"><GroundAreaPanel inSidebar surfaceChoice={groundAreaDefaults?.surface as GroundSurface | undefined} /></div>}
        {menu === 'root' && tab === 'layout' && activeTool !== GROUND_AREA_KIND && <>
          {query.trim() && <PanelSection title="Add landscape elements">
            {searchedItems.map((item) => <CatalogListRow key={`${item.target}:${item.species ?? ''}`} label={item.label} thumbnail={<CatalogThumb item={item} />} chevron onClick={() => openProduct(item.target, item)} />)}
            {!searchedItems.length && <p className="px-1 py-2 text-xs text-muted-foreground">No landscape elements match “{query}”.</p>}
          </PanelSection>}
          {renderInventory(['Structures', 'Surfaces', 'Pathways'], false, 'grid')}
          {!activeLevelId && <p className="px-1 py-3 text-xs text-muted-foreground">Select a level to see its landscape items.</p>}
        </>}
        {menu === 'root' && tab === 'planting' && <>
          <PanelSection title="Add trees">
            {TREE_SPECIES.filter((species) => !query.trim() || species.name.toLowerCase().includes(query.trim().toLowerCase()))
              .map((species) => <CatalogListRow key={species.key} label={species.name}
                thumbnail={<CatalogThumb item={{ label: species.name, target: 'tree', species: species.key }} />}
                chevron onClick={() => openProduct('tree', { label: species.name, target: 'tree', species: species.key })} />)}
          </PanelSection>
          <p className="px-1 py-4 text-xs leading-5 text-muted-foreground">
            Grass and other ground covers are listed once under Layout → Surfaces.
          </p>
        </>}
        {menu === 'root' && tab === 'review' && <>
          <div className="px-1 pb-2 pt-4"><h3 className="m-0 text-sm font-semibold">Landscape review</h3><p className="mb-0 mt-1 text-xs text-muted-foreground">A summary of the items in this scene.</p></div>
          {countAll > 0 ? <>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {(['Structures', 'Surfaces', 'Pathways', 'Plants'] as const).map((name) => {
                const total = groups[name].reduce((sum, row) => sum + row.nodes.length, 0)
                return total > 0 && <div key={name} className="rounded-md border border-border bg-secondary/40 p-3"><span className="block text-xs text-muted-foreground">{name}</span><strong className="mt-1 block text-lg">{total}</strong></div>
              })}
              <div className="rounded-md border border-border bg-secondary/40 p-3"><span className="block text-xs text-muted-foreground">Total items</span><strong className="mt-1 block text-lg">{countAll}</strong></div>
            </div>
            {renderInventory(['Structures', 'Surfaces', 'Pathways'], true)}
          </> : <p className="px-1 py-3 text-xs text-muted-foreground">Nothing has been placed in this scene yet.</p>}
        </>}
        {menu === 'pergola' && <PergolaPanel />}
        {menu === 'tree' && <TreePanel />}
        {menu === 'pathway' && <PathwayPanel />}
        {menu !== 'root' && ['patio', 'deck', 'concrete-slab', 'landing', 'edging', 'retaining-wall'].includes(menu) && <GroundAccessPanel item={menu as 'patio' | 'deck' | 'concrete-slab' | 'landing' | 'edging' | 'retaining-wall'} />}
      </div>
      {menu === 'root' && selection.length > 0 && <footer className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">{selection.length} item{selection.length === 1 ? '' : 's'} selected</footer>}
    </section>
  )
}
