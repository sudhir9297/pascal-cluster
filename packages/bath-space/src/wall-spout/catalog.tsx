'use client'
import { useMemo } from 'react'
import { wallSpoutSection } from './section'
import { FixturePreview } from '../section/fixture-preview'
import { useEditor } from '@pascal-app/editor'
import ShowerPresetCatalog, { type ShowerCatalogFilterProps } from '../shower-common/preset-catalog'
import { WALL_SPOUT, wallSpoutPresets, wallSpoutPresetNode } from './schema'
import { setWallSpoutPreset, useWallSpoutPreset, type SpoutPresetId } from './placement-settings'
import RoundThumbnail from './assets/round.webp'
import CurveThumbnail from './assets/curve.webp'
import ArchThumbnail from './assets/arch.webp'
import TaperThumbnail from './assets/taper.webp'
import SquareThumbnail from './assets/square.webp'
import AngledThumbnail from './assets/angled.webp'
import WaterfallOpenThumbnail from './assets/waterfall-open.webp'
import WaterfallClosedThumbnail from './assets/waterfall-closed.webp'
import RoundDiverterThumbnail from './assets/round-diverter.webp'
import SquareDiverterThumbnail from './assets/square-diverter.webp'
import ButtonDiverterThumbnail from './assets/button-diverter.webp'
import WaterfallDiverterThumbnail from './assets/waterfall-diverter.webp'
import BibRoundThumbnail from './assets/bib-round.webp'
import BibSquareThumbnail from './assets/bib-square.webp'
import BibCrossThumbnail from './assets/bib-cross.webp'

type ThumbnailAsset = string | { src: string }
const thumbnailSrc = (asset: ThumbnailAsset | undefined) => typeof asset === 'string' ? asset : asset?.src
const wallSpoutThumbnails: Record<string, ThumbnailAsset> = {
  'round': RoundThumbnail,
  'curve': CurveThumbnail,
  'arch': ArchThumbnail,
  'taper': TaperThumbnail,
  'square': SquareThumbnail,
  'angled': AngledThumbnail,
  'waterfall-open': WaterfallOpenThumbnail,
  'waterfall-closed': WaterfallClosedThumbnail,
  'round-diverter': RoundDiverterThumbnail,
  'square-diverter': SquareDiverterThumbnail,
  'button-diverter': ButtonDiverterThumbnail,
  'waterfall-diverter': WaterfallDiverterThumbnail,
  'bib-round': BibRoundThumbnail,
  'bib-square': BibSquareThumbnail,
  'bib-cross': BibCrossThumbnail,
}
export function WallSpoutPreview({ preset = 'round' }: { preset?: SpoutPresetId }) {
  const drawing = useMemo(() => {
    const n = wallSpoutPresetNode(wallSpoutPresets.find((p) => p.id === preset) ?? wallSpoutPresets[0])
    return wallSpoutSection(n).drawing
  }, [preset])
  return <FixturePreview drawing={drawing} />
}

export default function WallSpoutCatalog(props: ShowerCatalogFilterProps) {
  const preset = useWallSpoutPreset(),
    active = useEditor((s) => s.tool === WALL_SPOUT)
  return (
    <ShowerPresetCatalog
      {...props}
      title="Wall spouts and bib taps"
      prefix="wall-spout"
      items={wallSpoutPresets}
      families={[
        {
          id: 'spout',
          label: 'Wall spout',
          itemIds: wallSpoutPresets.filter((p) => !p.id.startsWith('bib-')).map((p) => p.id),
        },
        {
          id: 'bib',
          label: 'Bib tap',
          itemIds: wallSpoutPresets.filter((p) => p.id.startsWith('bib-')).map((p) => p.id),
        },
      ]}
      selectedId={preset}
      active={active}
      onSelect={(id) => {
        setWallSpoutPreset(id as SpoutPresetId)
        useEditor.getState().setTool(WALL_SPOUT)
      }}
      renderPreview={(id) => (
        <img src={thumbnailSrc(wallSpoutThumbnails[id])} alt="" className="h-full w-full object-contain p-1" />
      )}
      hint="Click a wall to place."
    />
  )
}
