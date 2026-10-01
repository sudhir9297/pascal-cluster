'use client'
import { useEditor } from '@pascal-app/editor'
import ShowerPresetCatalog, { type ShowerCatalogFilterProps } from '../shower-common/preset-catalog'
import { BODY_JET, bodyJetPresets, bodyJetPresetNode } from './schema'
import { roundBodyJet } from './targets'
import { setBodyJetPreset, useBodyJetPreset, type BodyJetPresetId } from './placement-settings'
export function BodyJetPreview({ preset = 'round-flush' }: { preset?: BodyJetPresetId }) {
  const n = bodyJetPresetNode(bodyJetPresets.find((p) => p.id === preset)!),
    round = roundBodyJet(n),
    group = n.jetCount > 1
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 88 64"
      className="h-full w-full p-2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      {Array.from({ length: n.jetCount }, (_, i) => {
        const x = 44 + (group && n.groupDirection === 'horizontal' ? (i - 1) * 23 : 0),
          y = 32 + (group && n.groupDirection === 'vertical' ? (i - 1) * 17 : 0),
          w = group ? 14 : 38,
          h = n.style === 'slim-rectangle' ? 18 : w
        return (
          <g key={i}>
            {round ? (
              <circle cx={x} cy={y} r={w / 2} />
            ) : (
              <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx="1" />
            )}
            <path
              d={`M${x - w * 0.3} ${y - h * 0.25}h${w * 0.6}M${x - w * 0.3} ${y}h${w * 0.6}M${x - w * 0.3} ${y + h * 0.25}h${w * 0.6}`}
              strokeDasharray="1 4"
            />
          </g>
        )
      })}
    </svg>
  )
}
export default function BodyJetCatalog(props: ShowerCatalogFilterProps) {
  const preset = useBodyJetPreset(),
    active = useEditor((s) => s.tool === BODY_JET)
  return (
    <ShowerPresetCatalog
      {...props}
      title="Body jet"
      prefix="body-jet"
      items={bodyJetPresets}
      selectedId={preset}
      active={active}
      onSelect={(id) => {
        setBodyJetPreset(id as BodyJetPresetId)
        useEditor.getState().setTool(BODY_JET)
      }}
      renderPreview={(id) => <BodyJetPreview preset={id as BodyJetPresetId} />}
      hint="Click a wall to place."
    />
  )
}
