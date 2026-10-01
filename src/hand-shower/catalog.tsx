'use client'
import { useEditor } from '@pascal-app/editor'
import ShowerPresetCatalog from '../shower-common/preset-catalog'
import { HandShowerNode, HAND_SHOWER, handShowerPresets } from './schema'
import { setHandShowerStyle, useHandShowerStyle } from './placement-settings'
export function HandShowerPreview({ style = 'round' }: { style?: HandShowerNode['style'] }) {
  const wand = style.endsWith('wand')
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 88 64"
      className="h-full w-full p-2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M39 37h10v21H39z" />
      {wand ? (
        <rect x="38" y="8" width="12" height="49" rx={style === 'round-wand' ? 5 : 0} />
      ) : ['round', 'oval'].includes(style) ? (
        <ellipse cx="44" cy="24" rx="19" ry={style === 'oval' ? 23 : 19} />
      ) : (
        <rect x="25" y="5" width="38" height="38" rx={style === 'soft-square' ? 7 : 0} />
      )}
      <path d={wand ? 'M42 16v30M46 16v30' : 'M32 18h24M32 25h24M32 32h24'} strokeDasharray="1 5" />
    </svg>
  )
}

export default function HandShowerCatalog({ query }: { query: string }) {
  const style = useHandShowerStyle()
  const active = useEditor((s) => s.tool === HAND_SHOWER)
  return (
    <ShowerPresetCatalog
      title="Hand shower"
      prefix="hand-shower"
      items={handShowerPresets.map((p) => ({ id: p.style, label: p.label }))}
      query={query}
      selectedId={style}
      active={active}
      onSelect={(id) => {
        setHandShowerStyle(id as HandShowerNode['style'])
        useEditor.getState().setTool(HAND_SHOWER)
      }}
      renderPreview={(id) => <HandShowerPreview style={id as HandShowerNode['style']} />}
      hint={'Click a holder or rail to attach. Replaces an existing handset.'}
    />
  )
}
