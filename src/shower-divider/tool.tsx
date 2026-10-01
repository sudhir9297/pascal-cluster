'use client'
import { sceneRegistry } from '@pascal-app/core'
import { createPortal } from '@react-three/fiber'
import {
  CursorSphere,
  DraftMeasurementLabel,
  EDITOR_LAYER,
  formatLinearMeasurement,
} from '@pascal-app/editor'
import { getSceneTheme, useViewer } from '@pascal-app/viewer'
import { useDividerDraft } from './session'

/** Unit boxes stay mounted while pointer motion changes only their transforms. */
export default function DividerTool() {
  const levelId = useViewer((state) => state.selection.levelId)
  const unit = useViewer((state) => state.unit)
  const isDark = useViewer(
    (state) => getSceneTheme(state.sceneTheme).appearance === 'dark',
  )
  const notation = useViewer((state) => state.metricNotation)
  const draft = useDividerDraft(levelId)
  const parent = levelId ? sceneRegistry.nodes.get(levelId) : null
  if (!parent) return null
  return createPortal(
    <group>
      {draft.cursor && (
        <group position={[draft.cursor[0], draft.elevation, draft.cursor[1]]}>
          <CursorSphere height={draft.height} />
        </group>
      )}
      {[0, 1, 2, 3].map((index) => {
        const segment = draft.segments[index]
        const visible = Boolean(
          segment && segment.width >= 0.2 && segment.width <= 8,
        )
        return (
          <group
            key={index}
            position={segment?.position ?? [0, 0, 0]}
            rotation={[0, segment?.rotation ?? 0, 0]}
            visible={visible}
          >
            <mesh
              position={[0, draft.height / 2, 0]}
              scale={[segment?.width ?? 1, draft.height, draft.depth]}
              layers={EDITOR_LAYER}
              renderOrder={1}
              raycast={() => {}}
            >
              <boxGeometry />
              <meshBasicMaterial
                color="#818cf8"
                transparent
                opacity={0.35}
                depthTest={false}
                depthWrite={false}
              />
            </mesh>
            {visible && segment && (
              <DraftMeasurementLabel
                label={formatLinearMeasurement(segment.width, unit, notation)}
                position={[0, draft.height + 0.22, 0]}
                color={isDark ? '#ffffff' : '#111111'}
                shadowColor={isDark ? '#111111' : '#ffffff'}
              />
            )}
          </group>
        )
      })}
    </group>,
    parent,
  )
}
