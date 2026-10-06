'use client'
import { useEditor } from '@pascal-app/editor'
import ShowerPresetCatalog from '../shower-common/preset-catalog'
import { ShowerHeadNode, SHOWER_HEAD, showerHeadPresets } from './schema'
import { setShowerHeadStyle, useShowerHeadStyle } from './placement-settings'
import roundRainThumbnail from './assets/round-rain.webp'
import squareRainThumbnail from './assets/square-rain.webp'
import softSquareThumbnail from './assets/soft-square.webp'
import rectangularThumbnail from './assets/rectangular.webp'
import compactThumbnail from './assets/compact.webp'
import bellThumbnail from './assets/bell.webp'

type ThumbnailAsset = string | { src: string }
const thumbnailSrc = (asset: ThumbnailAsset | undefined) => typeof asset === 'string' ? asset : asset?.src

const showerHeadThumbnails: Record<ShowerHeadNode['style'], ThumbnailAsset> = {
  'round-rain': roundRainThumbnail,
  'square-rain': squareRainThumbnail,
  'soft-square': softSquareThumbnail,
  rectangular: rectangularThumbnail,
  compact: compactThumbnail,
  bell: bellThumbnail,
}
export function ShowerHeadPreview({ style = 'round-rain' }: { style?: ShowerHeadNode['style'] }) {
  const circular = ['round-rain', 'compact'].includes(style)
  const width = style === 'rectangular' ? 68 : style === 'compact' ? 36 : 54
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 88 64"
      className="h-full w-full p-2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M40 8h8v12h-8z" />
      {style === 'bell' ? (
        <>
          <path d="M34 20h20l18 24H16Z" />
          <ellipse cx="44" cy="44" rx="28" ry="9" />
        </>
      ) : circular ? (
        <ellipse cx="44" cy="36" rx={width / 2} ry="16" />
      ) : (
        <rect
          x={(88 - width) / 2}
          y="21"
          width={width}
          height={style === 'rectangular' ? 27 : 32}
          rx={style === 'soft-square' ? 8 : 0}
        />
      )}
      <path
        d={
          style === 'bell'
            ? 'M26 44h36M32 49h24'
            : style === 'compact'
              ? 'M32 30h24M32 36h24M32 42h24'
              : 'M26 30h36M26 36h36M26 42h36'
        }
        strokeDasharray="1 5"
        strokeWidth="2"
      />
    </svg>
  )
}

export default function ShowerHeadCatalog({ query }: { query: string }) {
  const style = useShowerHeadStyle()
  const active = useEditor((s) => s.tool === SHOWER_HEAD)
  return (
    <ShowerPresetCatalog
      title="Overhead shower head"
      prefix="shower-head"
      items={showerHeadPresets.map((p) => ({ id: p.style, label: p.label }))}
      query={query}
      selectedId={style}
      active={active}
      onSelect={(id) => {
        setShowerHeadStyle(id as ShowerHeadNode['style'])
        useEditor.getState().setTool(SHOWER_HEAD)
      }}
      renderPreview={(id) => (
        <img
          src={thumbnailSrc(showerHeadThumbnails[id as ShowerHeadNode['style']])}
          alt=""
          className="h-full w-full object-contain p-1"
        />
      )}
      hint={'Click an arm to attach. Replaces an existing head.'}
    />
  )
}
