'use client'
import { useEditor } from '@pascal-app/editor'
import { SHOWER_DIVIDER } from './schema'
import { CatalogGrid, CatalogHeading, CatalogItemCard } from '../catalog-ui'
import dividerThumbnail from './assets/divider.webp'
type ThumbnailAsset = string | { src: string }
const thumbnailSrc = (asset: ThumbnailAsset | undefined) => typeof asset === 'string' ? asset : asset?.src
export function DividerPreview({ columns = 1, rows = 1 }: { columns?: number; rows?: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 88 64"
      className="h-full w-full p-3"
      stroke="currentColor"
      fill="none"
      strokeWidth="2"
    >
      <rect x="18" y="5" width="52" height="54" fill="#d9f3fa" fillOpacity="0.25" />
      {Array.from({ length: columns - 1 }, (_, i) => (
        <path key={`c${i}`} d={`M${18 + (52 * (i + 1)) / columns} 5v54`} strokeWidth="1" />
      ))}
      {Array.from({ length: rows - 1 }, (_, i) => (
        <path key={`r${i}`} d={`M18 ${5 + (54 * (i + 1)) / rows}h52`} strokeWidth="1" />
      ))}
    </svg>
  )
}
export default function DividerCatalog({ query }: { query: string }) {
  const active = useEditor((state) => state.tool === SHOWER_DIVIDER && state.mode === 'build')
  if (!'shower divider glass partition screen'.includes(query.trim().toLowerCase())) return null
  return (
    <section className="space-y-2 border-t border-border/60 pt-3">
      <CatalogHeading>Shower divider</CatalogHeading>
      <CatalogGrid>
        <CatalogItemCard
          type="button"
          aria-label="Draw shower divider"
          aria-pressed={active}
          label="Draw shower divider"
          onClick={() => useEditor.getState().setTool(SHOWER_DIVIDER)}
        >
          <img src={thumbnailSrc(dividerThumbnail)} alt="" className="h-full w-full object-contain p-1" />
        </CatalogItemCard>
      </CatalogGrid>
      {active && (
        <p role="status" className="text-[11px] text-muted-foreground">
          Click a start and end point. R toggles line or rectangle. Enter finishes.
          Esc cancels the draft; press again to exit.
        </p>
      )}
    </section>
  )
}
