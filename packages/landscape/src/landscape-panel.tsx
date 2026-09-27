'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { PanelSection, useEditor } from '@pascal-app/editor'
import { useViewer } from '@pascal-app/viewer'
import { PergolaPanel } from './pergola/editor/panel'
import { PathwayPanel } from './pathways/editor/panel'
import { GroundAreaPanel } from './ground-areas/editor/panel'
import { GroundAccessPanel } from './ground-access/panel'
import { CatalogListRow } from './editor/catalog-list-row'
import { LANDSCAPE_CATALOG_THUMBNAILS } from './editor/catalog-thumbnails'

type Menu = 'root' | 'pergola' | 'pathway' | 'ground-area' | 'patio' | 'deck' | 'concrete-slab' | 'landing' | 'edging' | 'retaining-wall'
type CatalogItem = { label: string; target: Exclude<Menu, 'root'> }
type CatalogGroup = { title: string; items: CatalogItem[] }

const catalog: CatalogGroup[] = [
  { title: 'Site', items: [
    { label: 'Ground areas', target: 'ground-area' },
  ] },
  { title: 'Hardscape', items: [
    { label: 'Patio', target: 'patio' },
    { label: 'Walkways', target: 'pathway' },
    { label: 'Deck', target: 'deck' },
    { label: 'Concrete slab', target: 'concrete-slab' },
    { label: 'Landing', target: 'landing' },
    { label: 'Edging', target: 'edging' },
    { label: 'Retaining wall', target: 'retaining-wall' },
  ] },
  { title: 'Structures', items: [
    { label: 'Pergola', target: 'pergola' },
  ] },
]

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.2 4.2" />
  </svg>
}

function TuneIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M4 7h9m4 0h3M4 17h3m4 0h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" />
  </svg>
}

function CatalogThumb({ item, size = 36 }: { item: CatalogItem; size?: number }) {
  return <img src={LANDSCAPE_CATALOG_THUMBNAILS[item.target]} alt="" aria-hidden="true"
    width={size} height={size} style={{ width: size, height: size, flex: `0 0 ${size}px`,
      objectFit: 'cover', borderRadius: 4, border: '1px solid color-mix(in srgb, var(--foreground) 13%, transparent)' }} />
}

export default function LandscapePanel() {
  const [menu, setMenu] = useState<Menu>('root')
  const [query, setQuery] = useState('')
  const hasSelectedLevel = useViewer((state) => Boolean(state.selection.levelId))
  const content = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    content.current?.scrollTo({ top: 0 })
    heading.current?.focus({ preventScroll: true })
  }, [menu])
  const back = () => {
    const editor = useEditor.getState()
    if (editor.tool?.startsWith('landscape:') || (menu === 'retaining-wall' && editor.tool === 'wall' &&
      (editor.toolDefaults.wall?.metadata as { landscapeRetainingWall?: boolean } | undefined)?.landscapeRetainingWall))
      editor.setTool(null)
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
    root: 'Landscape Catalog', pergola: 'Pergola', pathway: 'Walkways', 'ground-area': 'Ground areas',
    patio: 'Patio', deck: 'Deck', 'concrete-slab': 'Concrete slab', landing: 'Landing', edging: 'Edging', 'retaining-wall': 'Retaining wall',
  }
  const openProduct = (target: Exclude<Menu, 'root'>) => {
    setMenu(target)
    if (!hasSelectedLevel) return
    const editor = useEditor.getState()
    if (target === 'patio' || target === 'deck' || target === 'concrete-slab' || target === 'landing' || target === 'edging') {
      const tool = `landscape:${target}`
      if (target !== 'edging' && !editor.toolDefaults[tool]?.shape) {
        editor.setToolDefaults(tool, { ...editor.toolDefaults[tool], shape: 'rectangle' })
      }
      editor.setMode('build')
      editor.setTool(tool)
    } else if (target === 'retaining-wall') {
      editor.setPhase('structure')
      editor.setStructureLayer('elements')
      const metadata = editor.toolDefaults.wall?.metadata
      editor.setToolDefaults('wall', {
        ...editor.toolDefaults.wall,
        metadata: { ...(metadata && typeof metadata === 'object' ? metadata : {}), landscapeRetainingWall: true, roomBoundary: false },
        thickness: editor.toolDefaults['landscape:retaining-wall']?.depth ?? 0.25,
        height: editor.toolDefaults['landscape:retaining-wall']?.thickness ?? 0.9,
      })
      editor.armToolMode({ mode: 'build', tool: 'wall' })
    } else if (target === 'ground-area') {
      editor.setMode('build')
      editor.setTool('landscape:ground-area')
    } else if (target === 'pergola') {
      const kind = 'landscape:pergola'
      editor.setToolDefaults(kind, { ...editor.toolDefaults[kind], roofForm: editor.toolDefaults[kind]?.roofForm ?? 'flat' })
      editor.setMode('build')
      editor.setTool(kind)
    }
  }
  return (
    <section aria-label="Landscape" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', color: 'var(--foreground)', fontSize: 13 }}>
      <header style={{ padding: '14px 14px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {menu !== 'root' && <button type="button" onClick={back} aria-label="Back to landscape catalog" style={{ background: 'transparent', border: 0, color: 'var(--muted-foreground)', cursor: 'pointer', padding: '0 0 10px' }}>← Landscape catalog</button>}
        <h2 ref={heading} tabIndex={-1} style={{ fontSize: 17, fontWeight: 600, margin: 0 }}>
          {menuTitle[menu]}
        </h2>
        {menu === 'root' ? <div style={{ display: 'flex', gap: 5, marginTop: 12 }}>
          <label style={{ height: 36, flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--secondary)', color: 'var(--muted-foreground)' }}>
            <SearchIcon />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search elements..." aria-label="Search landscape elements" style={{ width: '100%', minWidth: 0, border: 0, outline: 0, padding: 0, background: 'transparent', color: 'var(--foreground)', font: 'inherit', fontSize: 12 }} />
          </label>
          <button type="button" aria-label="Catalog settings" title="Catalog settings" style={{ width: 36, height: 36, flex: '0 0 36px', display: 'grid', placeItems: 'center', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--secondary)', color: 'var(--foreground)', cursor: 'pointer' }}><TuneIcon /></button>
        </div> : null}
      </header>
      {menu !== 'root' && menu !== 'ground-area' && selectedProduct && <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <CatalogThumb item={selectedProduct} size={76} />
      </div>}
      <div ref={content} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehaviorY: 'contain', padding: menu === 'root' ? '0 12px 12px' : 14 }}>
        {menu === 'root' && <div>
          {filteredCatalog.map((group) => {
            return <PanelSection key={group.title} title={group.title}>
              {group.items.map((item) => <CatalogListRow key={item.label} label={item.label}
                thumbnail={<CatalogThumb item={item} />} chevron onClick={() => openProduct(item.target)} />)}
            </PanelSection>
          })}
          {filteredCatalog.length === 0 && <p style={{ padding: '16px 4px', color: 'var(--muted-foreground)', fontSize: 12 }}>No elements match “{query}”.</p>}
        </div>}
        {menu === 'pergola' && <PergolaPanel />}
        {menu === 'pathway' && <PathwayPanel />}
        {menu === 'ground-area' && <GroundAreaPanel />}
        {menu !== 'root' && ['patio', 'deck', 'concrete-slab', 'landing', 'edging', 'retaining-wall'].includes(menu) &&
          <GroundAccessPanel item={menu as 'patio' | 'deck' | 'concrete-slab' | 'landing' | 'edging' | 'retaining-wall'} />}
      </div>
    </section>
  )
}
