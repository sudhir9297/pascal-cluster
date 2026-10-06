'use client'
import { Children, createContext, isValidElement, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react'
import { defaultRangeExtractor, useVirtualizer } from '@tanstack/react-virtual'

const CatalogViewport = createContext<{ element: HTMLDivElement | null; layout: number; activeGrid: Element | null }>({ element: null, layout: 0, activeGrid: null })

export function CatalogScrollArea({ children, resetKey, ...props }: HTMLAttributes<HTMLDivElement> & { resetKey: string }) {
  const [element, setElement] = useState<HTMLDivElement | null>(null)
  const content = useRef<HTMLDivElement>(null)
  const [activeGrid, setActiveGrid] = useState<Element | null>(null)
  const [layout, setLayout] = useState(0)
  useLayoutEffect(() => {
    if (!content.current) return
    const observer = new ResizeObserver(() => setLayout((value) => value + 1))
    observer.observe(content.current)
    return () => observer.disconnect()
  }, [])
  useLayoutEffect(() => { if (element) element.scrollTop = 0 }, [element, resetKey])
  const viewport = useMemo(() => ({ element, layout, activeGrid }), [element, layout, activeGrid])
  return <div {...props} ref={setElement} data-catalog-scroll=""
    onFocusCapture={(event) => {
      const grid = (event.target as Element).closest('[data-catalog-items]')
      if (grid) setActiveGrid(grid)
    }}
    onBlurCapture={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActiveGrid(null)
    }}>
    <CatalogViewport.Provider value={viewport}><div ref={content}>{children}</div></CatalogViewport.Provider>
  </div>
}

const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', columnGap: 8, alignItems: 'start' } as const

export function CatalogGrid({ children, ...props }: Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'>) {
  const viewport = useContext(CatalogViewport)
  // Catalog previews outside this panel retain the ordinary grid layout.
  return viewport.element
    ? <VirtualCatalogGrid {...props} viewport={viewport}>{children}</VirtualCatalogGrid>
    : <div {...props} style={{ ...gridStyle, rowGap: 12 }}>{children}</div>
}

function VirtualCatalogGrid({ children, viewport, ...props }: Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'style'> & {
  viewport: { element: HTMLDivElement | null; layout: number; activeGrid: Element | null }
}) {
  const items = useMemo(() => Children.toArray(children), [children])
  const grid = useRef<HTMLDivElement>(null)
  const [geometry, setGeometry] = useState({ width: 240, offset: 0 })
  const [focusedRow, setFocusedRow] = useState<number | null>(null)
  useLayoutEffect(() => {
    const element = grid.current, scroll = viewport.element
    if (!element || !scroll) return
    const update = () => {
      const bounds = element.getBoundingClientRect()
      const next = { width: bounds.width, offset: bounds.top - scroll.getBoundingClientRect().top + scroll.scrollTop }
      setGeometry((old) => old.width === next.width && Math.abs(old.offset - next.offset) < 0.5 ? old : next)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [viewport.element, viewport.layout, children])
  const count = Math.ceil(items.length / 3)
  const grids = viewport.element ? [...viewport.element.querySelectorAll('[data-catalog-items]')].filter((grid) => Number(grid.getAttribute('data-catalog-items')) > 0) : []
  const activeIndex = viewport.activeGrid ? grids.indexOf(viewport.activeGrid) : -1
  const gridIndex = grid.current ? grids.indexOf(grid.current) : -1
  // Mount boundary rows in adjacent sections so Tab and Shift+Tab can cross
  // sections, including their native details/summary controls.
  const boundaryRow = activeIndex >= 0 && gridIndex === activeIndex + 1 ? 0
    : activeIndex >= 0 && gridIndex === activeIndex - 1 ? count - 1 : null
  // Thumbnail aspect ratio + label (32 px) + label spacing (6 px).
  const rowHeight = Math.max(0, (geometry.width - 16) / 3) * 4 / 7 + 38
  const getItemKey = useCallback((index: number) => items.slice(index * 3, index * 3 + 3).map((item, slot) =>
    isValidElement(item) ? item.key ?? slot : slot).join('|'), [items])
  const virtualizer = useVirtualizer({
    count, getScrollElement: () => viewport.element, estimateSize: () => rowHeight,
    getItemKey, scrollMargin: geometry.offset, gap: 12, overscan: 2,
    rangeExtractor: (range) => {
      const indices = defaultRangeExtractor(range)
      // Keep the focused row and its neighbours mounted for keyboard navigation.
      if (focusedRow !== null) for (let index = focusedRow - 1; index <= focusedRow + 1; index++) {
        if (index >= 0 && index < count) indices.push(index)
      }
      if (boundaryRow !== null && count > 0) indices.push(boundaryRow)
      return [...new Set(indices)].sort((a, b) => a - b)
    },
  })
  useLayoutEffect(() => { virtualizer.measure() }, [virtualizer, rowHeight])
  const offset = virtualizer.scrollOffset ?? 0
  const height = virtualizer.scrollRect?.height ?? 0
  const rows = virtualizer.getVirtualItems().filter((row) =>
    (row.end >= offset - rowHeight * 2 && row.start <= offset + height + rowHeight * 2) ||
    (focusedRow !== null && Math.abs(row.index - focusedRow) <= 1) || row.index === boundaryRow)
  return <div {...props} ref={grid} data-catalog-items={items.length}
    onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusedRow(null) }}
    style={{ position: 'relative', height: virtualizer.getTotalSize() }}>
    {rows.map((row) => <div key={row.key} data-catalog-row={row.index}
      onFocusCapture={() => setFocusedRow(row.index)}
      style={{ ...gridStyle, position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${row.start - geometry.offset}px)` }}>
      {items.slice(row.index * 3, row.index * 3 + 3)}
    </div>)}
  </div>
}

export function CatalogItemCard({ label, children, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style'> & { label: string }) {
  const selected = props['aria-pressed'] === true || props['aria-pressed'] === 'true'
  const selectionColor = 'color-mix(in srgb, var(--foreground) 65%, var(--background))'
  return <button {...props} type="button" title={props.title ?? label}
    className="focus-visible:outline-2 focus-visible:outline-ring"
    style={{ display: 'block', width: '100%', minWidth: 0, padding: 0, border: 0, background: 'transparent', textAlign: 'left' }}>
    <span aria-hidden="true" className="bg-background/40 hover:bg-accent/30"
      style={{ display: 'block', position: 'relative', width: '100%', aspectRatio: '7 / 4', overflow: 'hidden', boxSizing: 'border-box', border: `${selected ? 2 : 1}px solid ${selected ? selectionColor : 'var(--border)'}`, background: selected ? 'color-mix(in srgb, var(--foreground) 10%, var(--background))' : undefined, borderRadius: 8 }}>
      <span style={{ display: 'flex', position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>{children}</span>
    </span>
    <span style={{ display: 'block', paddingTop: 6 }}>
      <span className="text-foreground" style={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, height: 32, overflow: 'hidden', overflowWrap: 'anywhere', fontSize: 11, fontWeight: selected ? 600 : 500, lineHeight: '16px' }}>{label}</span>
    </span>
  </button>
}

export function CatalogEmptyState({ children }: { children: ReactNode }) {
  return <p style={{ padding: '28px 12px' }} className="rounded-lg border border-dashed border-border/70 px-3 py-7 text-center text-xs text-muted-foreground">{children}</p>
}

export function CatalogHeading({ children, count }: { children: ReactNode; count?: number }) {
  return <div className="flex min-h-7 items-center justify-between gap-2">
    <h3 className="text-xs font-semibold">{children}</h3>
    {count !== undefined && <span className="text-[11px] tabular-nums text-muted-foreground">{count} {count === 1 ? 'style' : 'styles'}</span>}
  </div>
}
