'use client'
import { useMemo } from 'react'
import { wallSpoutSection } from './section'
import { FixturePreview } from '../section/fixture-preview'
import { useEditor } from '@pascal-app/editor'
import ShowerPresetCatalog, { type ShowerCatalogFilterProps } from '../shower-common/preset-catalog'
import { WALL_SPOUT, wallSpoutPresets, wallSpoutPresetNode } from './schema'
import { setWallSpoutPreset, useWallSpoutPreset, type SpoutPresetId } from './placement-settings'
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
      renderPreview={(id) => <WallSpoutPreview preset={id as SpoutPresetId} />}
      hint="Click a wall to place."
    />
  )
}
