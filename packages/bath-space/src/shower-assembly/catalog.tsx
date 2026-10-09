'use client'
import { useEditor } from '@pascal-app/editor'
import ShowerPresetCatalog, { type ShowerCatalogFilterProps } from '../shower-common/preset-catalog'
import { SHOWER_ASSEMBLY, showerAssemblyPresets } from './schema'
import { useAssemblyPreset, setAssemblyPreset, type AssemblyPresetId } from './placement-settings'
import RoundColumnThumbnail from './assets/round-column.webp'
import SquareColumnThumbnail from './assets/square-column.webp'
import CurvedColumnThumbnail from './assets/curved-column.webp'
import ClassicColumnThumbnail from './assets/classic-column.webp'
import FlatPanelThumbnail from './assets/flat-panel.webp'
import RoundedPanelThumbnail from './assets/rounded-panel.webp'
import CurvedPanelThumbnail from './assets/curved-panel.webp'
import WaterfallPanelThumbnail from './assets/waterfall-panel.webp'

type ThumbnailAsset = string | { src: string }
const thumbnailSrc = (asset: ThumbnailAsset | undefined) => typeof asset === 'string' ? asset : asset?.src
export const assemblyThumbnails: Record<string, ThumbnailAsset> = {
  'round-column': RoundColumnThumbnail,
  'square-column': SquareColumnThumbnail,
  'curved-column': CurvedColumnThumbnail,
  'classic-column': ClassicColumnThumbnail,
  'flat-panel': FlatPanelThumbnail,
  'rounded-panel': RoundedPanelThumbnail,
  'curved-panel': CurvedPanelThumbnail,
  'waterfall-panel': WaterfallPanelThumbnail,
}
export function ShowerAssemblyPreview({ preset = 'round-column' }: { preset?: AssemblyPresetId }) {
  const p = showerAssemblyPresets.find((p) => p.id === preset)!,
    panel = p.family === 'panel'
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 88 72"
      className="h-full w-full p-2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      {panel ? (
        <rect x="24" y="6" width="20" height="60" rx={p.profile === 'rounded' ? 4 : 0} />
      ) : (
        <path d="M32 64V12q0-6 6-6h20v8" />
      )}
      <path d="M44 8h16v8h-18M40 37h12l4-9M54 28v12M50 40q20 32 6 25q-12 0-12-12" />
      {panel ? (
        <>
          <circle cx="34" cy="24" r="3" />
          <circle cx="34" cy="36" r="3" />
          <circle cx="34" cy="49" r="3" />
        </>
      ) : (
        <rect x="20" y="58" width="24" height="6" rx="2" />
      )}
    </svg>
  )
}
export default function ShowerAssemblyCatalog({ query }: ShowerCatalogFilterProps) {
  const selected = useAssemblyPreset(),
    active = useEditor((s) => s.tool === SHOWER_ASSEMBLY)
  return (
    <ShowerPresetCatalog
      title="Columns and panels"
      prefix="shower-assembly"
      items={showerAssemblyPresets}
      families={[
        {
          id: 'column',
          label: 'Shower column',
          itemIds: showerAssemblyPresets.filter((p) => p.family === 'column').map((p) => p.id),
        },
        {
          id: 'panel',
          label: 'Shower panel',
          itemIds: showerAssemblyPresets.filter((p) => p.family === 'panel').map((p) => p.id),
        },
      ]}
      query={query}
      selectedId={selected}
      active={active}
      onSelect={(id) => {
        setAssemblyPreset(id as AssemblyPresetId)
        useEditor.getState().setTool(SHOWER_ASSEMBLY)
      }}
      renderPreview={(id) => (
        <img src={thumbnailSrc(assemblyThumbnails[id])} alt="" className="h-full w-full object-contain p-1" />
      )}
      hint="Click a wall to place."
    />
  )
}
