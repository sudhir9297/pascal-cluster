'use client'
import {
  formatLinearMeasurement,
  useFloorplanRender,
  type FloorplanToolContext,
} from '@pascal-app/editor'
import { useDividerDraft } from './session'

export default function DividerFloorplanTool({
  activeLevelId,
  unit,
  metricNotation,
}: FloorplanToolContext) {
  const draft = useDividerDraft(activeLevelId)
  const context = useFloorplanRender()
  const scale = context?.unitsPerPixel ?? 0.01
  const sceneRotation = context?.sceneRotationDeg ?? 0
  return (
    <g pointerEvents="none">
      {draft.segments.map((segment, index) =>
        segment.width < 0.2 ? null : (
          <g
            key={index}
            transform={`translate(${segment.position[0]} ${segment.position[2]}) rotate(${(-segment.rotation * 180) / Math.PI})`}
          >
            <rect
              x={-segment.width / 2}
              y={-draft.depth / 2}
              width={segment.width}
              height={draft.depth}
              fill="#818cf8"
              fillOpacity={0.35}
              stroke="#8b5cf6"
              strokeWidth={2 * scale}
            />
            <text
              transform={`rotate(${(segment.rotation * 180) / Math.PI - sceneRotation})`}
              y={-12 * scale}
              textAnchor="middle"
              fill="currentColor"
              fontSize={12 * scale}
            >
              {formatLinearMeasurement(segment.width, unit, metricNotation)}
            </text>
          </g>
        ),
      )}
      {draft.cursor && (
        <g transform={`translate(${draft.cursor[0]} ${draft.cursor[1]})`}>
          <circle r={4 * scale} fill="#8b5cf6" />
          {draft.error && (
            <text
              transform={`rotate(${-sceneRotation})`}
              y={-20 * scale}
              fill="#ef4444"
              fontSize={12 * scale}
            >
              {draft.error}
            </text>
          )}
        </g>
      )}
    </g>
  )
}
