'use client'
import { useEditor } from '@pascal-app/editor'
import ShowerPresetCatalog from '../shower-common/preset-catalog'
import { ShowerHoseNode, SHOWER_HOSE, showerHosePresets } from './schema'
import { setShowerHoseStyle, useShowerHoseStyle, useShowerHoseStage } from './placement-settings'
import smoothThumbnail from './assets/smooth.webp'
import metalThumbnail from './assets/metal.webp'
import ribbonThumbnail from './assets/ribbon.webp'

type ThumbnailAsset = string | { src: string }
const thumbnailSrc = (asset: ThumbnailAsset | undefined) => typeof asset === 'string' ? asset : asset?.src

const showerHoseThumbnails: Record<ShowerHoseNode['style'], ThumbnailAsset> = {
  smooth: smoothThumbnail,
  metal: metalThumbnail,
  ribbon: ribbonThumbnail,
}
export function ShowerHosePreview({ style = 'smooth' }: { style?: ShowerHoseNode['style'] }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 88 64"
      className="h-full w-full p-2"
      fill="none"
      stroke="currentColor"
      strokeWidth={style === 'smooth' ? 3 : 4}
    >
      <path
        d="M24 10v25c0 28 40 28 40 0V10"
        strokeDasharray={style === 'smooth' ? undefined : style === 'metal' ? '2 1' : '4 1'}
      />
      <path d="M21 5h6v9h-6zM61 5h6v9h-6z" strokeWidth="1.5" />
    </svg>
  )
}

export default function ShowerHoseCatalog({ query }: { query: string }) {
  const stage = useShowerHoseStage()
  const style = useShowerHoseStyle()
  const active = useEditor((s) => s.tool === SHOWER_HOSE)
  return (
    <ShowerPresetCatalog
      title="Shower hose"
      prefix="shower-hose"
      items={showerHosePresets.map((p) => ({ id: p.style, label: p.label }))}
      query={query}
      selectedId={style}
      active={active}
      onSelect={(id) => {
        setShowerHoseStyle(id as ShowerHoseNode['style'])
        useEditor.getState().setTool(SHOWER_HOSE)
      }}
      renderPreview={(id) => (
        <img src={thumbnailSrc(showerHoseThumbnails[id as ShowerHoseNode['style']])} alt="" className="h-full w-full object-contain p-1" />
      )}
      hint={stage}
    />
  )
}
