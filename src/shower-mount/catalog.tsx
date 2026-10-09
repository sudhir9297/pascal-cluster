'use client'
import { useEditor } from '@pascal-app/editor'
import ShowerPresetCatalog from '../shower-common/preset-catalog'
import { SHOWER_MOUNT, showerMountPresets, type ShowerMountNode } from './schema'
import { setShowerMountStyle, useShowerMountStyle } from './placement-settings'
import roundHolderThumbnail from './assets/round-holder.webp'
import squareHolderThumbnail from './assets/square-holder.webp'
import adjustableHolderThumbnail from './assets/adjustable-holder.webp'
import roundCombinedThumbnail from './assets/round-combined.webp'
import squareCombinedThumbnail from './assets/square-combined.webp'
import roundOutletThumbnail from './assets/round-outlet.webp'
import squareOutletThumbnail from './assets/square-outlet.webp'
import roundRailThumbnail from './assets/round-rail.webp'
import squareRailThumbnail from './assets/square-rail.webp'

type ThumbnailAsset = string | { src: string }
const thumbnailSrc = (asset: ThumbnailAsset | undefined) => typeof asset === 'string' ? asset : asset?.src

export const showerMountThumbnails: Record<ShowerMountNode['style'], ThumbnailAsset> = {
  'round-holder': roundHolderThumbnail,
  'square-holder': squareHolderThumbnail,
  'adjustable-holder': adjustableHolderThumbnail,
  'round-combined': roundCombinedThumbnail,
  'square-combined': squareCombinedThumbnail,
  'round-outlet': roundOutletThumbnail,
  'square-outlet': squareOutletThumbnail,
  'round-rail': roundRailThumbnail,
  'square-rail': squareRailThumbnail,
}
export function ShowerMountPreview({
  style = 'round-holder',
}: {
  style?: ShowerMountNode['style']
}) {
  const rail = style.endsWith('rail'),
    outlet = style.endsWith('outlet'),
    combined = style.endsWith('combined'),
    square = style.startsWith('square')
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 88 64"
      className="h-full w-full p-2"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      {rail ? (
        <>
          <path d="M40 5h8v54h-8zM27 11h13M27 53h13M39 4h10M39 60h10" />
          {square ? (
            <>
              <rect x="19" y="6" width="10" height="10" />
              <rect x="19" y="48" width="10" height="10" />
            </>
          ) : (
            <>
              <circle cx="24" cy="11" r="5" />
              <circle cx="24" cy="53" r="5" />
            </>
          )}
          <path d="M48 29h15v9H48M51 33h16M52 39v6" />
          <ellipse cx="66" cy="29" rx="8" ry="4" />
        </>
      ) : (
        <>
          {square ? (
            <rect x="19" y="18" width="24" height="24" />
          ) : (
            <circle cx="31" cy="30" r="13" />
          )}
          <path d="M42 26h24v10H42" />
          {outlet ? (
            <path d="M58 36v13h8V36M58 42h8M58 45h8" />
          ) : (
            <>
              <ellipse cx="65" cy="28" rx="10" ry="6" />
              <path d="M55 28v12q10 10 20 0V28" />
            </>
          )}
          {combined && <path d="M44 36v14h8V36M44 44h8M44 47h8" />}
          {style === 'adjustable-holder' && <path d="M49 30v17h5" />}
        </>
      )}
    </svg>
  )
}
export default function ShowerMountCatalog({ query }: { query: string }) {
  const style = useShowerMountStyle()
  const active = useEditor((s) => s.tool === SHOWER_MOUNT)
  return (
    <ShowerPresetCatalog
      title="Hand shower mount"
      prefix="shower-mount"
      items={showerMountPresets.map((p) => ({ id: p.style, label: p.label }))}
      query={query}
      selectedId={style}
      active={active}
      onSelect={(id) => {
        setShowerMountStyle(id as ShowerMountNode['style'])
        useEditor.getState().setTool(SHOWER_MOUNT)
      }}
      renderPreview={(id) => (
        <img src={thumbnailSrc(showerMountThumbnails[id as ShowerMountNode['style']])} alt="" className="h-full w-full object-contain p-1" />
      )}
      hint={'Click a wall to place.'}
    />
  )
}
