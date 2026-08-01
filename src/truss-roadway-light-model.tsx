'use client'

import { useEffect, useMemo } from 'react'
import { Object3D } from 'three'
import {
  buildCobraHeadHousingGeometry,
  buildCobraHeadLensGeometry,
} from './truss-roadway-light-geometry'
import { resolveTrussRoadwayLightLayout } from './truss-roadway-light-geometry'
import {
  LampBase,
  LampLicensePlate,
  LampMetalMaterial,
  LampPoleSegment,
  NO_RAYCAST,
  RoadwayHead,
} from './roadway-lamp-primitives'
import type { TrussRoadwayLightNode } from './schema'

function TrussBar({
  color,
  from,
  ghost,
  layer,
  radius,
  to,
}: {
  color: string
  from: [number, number]
  ghost: boolean
  layer: number
  radius: number
  to: [number, number]
}) {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const length = Math.hypot(dx, dy)
  return (
    <mesh
      castShadow
      layers={layer}
      position={[(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, 0]}
      raycast={ghost ? NO_RAYCAST : undefined}
      receiveShadow
      rotation={[0, 0, Math.atan2(dx, dy)]}
    >
      <cylinderGeometry args={[radius, radius, length, 12]} />
      <LampMetalMaterial color={color} ghost={ghost} />
    </mesh>
  )
}

export function TrussRoadwayLightModel({
  node,
  ghost = false,
  layer = 0,
}: {
  node: TrussRoadwayLightNode
  ghost?: boolean
  layer?: number
}) {
  const layout = useMemo(() => resolveTrussRoadwayLightLayout(node), [node.height, node.armLength, node.braceDepth])
  const poleColor = node.poleColor ?? '#363b40'
  const lightColor = node.lightColor ?? '#ffd39a'
  const lightOn = node.lightOn ?? false
  const lightTarget = useMemo(() => new Object3D(), [])
  const housingGeometry = useMemo(() => buildCobraHeadHousingGeometry(layout), [layout])
  const lensGeometry = useMemo(() => buildCobraHeadLensGeometry(layout), [layout])
  useEffect(
    () => () => {
      housingGeometry.dispose()
      lensGeometry.dispose()
    },
    [housingGeometry, lensGeometry],
  )

  return (
    <group layers={layer}>
      <LampBase baseRadius={0.25} color={poleColor} ghost={ghost} layer={layer} boltOffset={0.15} baseTopRadius={0.88} />
      <LampPoleSegment bottomRadius={0.18} color={poleColor} ghost={ghost} height={0.36} layer={layer} topRadius={0.14} y={0.04} />
      <LampPoleSegment bottomRadius={layout.poleRadius * 1.25} color={poleColor} ghost={ghost} height={layout.poleTopY} layer={layer} topRadius={layout.poleRadius} />
      <TrussBar color={poleColor} from={[0, layout.armY]} ghost={ghost} layer={layer} radius={layout.armRadius} to={[layout.armLength, layout.armY]} />
      <TrussBar color={poleColor} from={[0.08, layout.armY - layout.braceDepth]} ghost={ghost} layer={layer} radius={layout.armRadius * 0.62} to={[layout.armLength, layout.armY]} />
      <TrussBar color={poleColor} from={[layout.armLength * 0.52, layout.armY - layout.braceDepth * 0.52]} ghost={ghost} layer={layer} radius={layout.armRadius * 0.48} to={[layout.armLength * 0.52, layout.armY]} />
      <RoadwayHead
        color={poleColor}
        distance={Math.max(12, layout.height * 2.6)}
        fixtureGeometry={housingGeometry}
        ghost={ghost}
        includeArm={false}
        intensity={node.intensity ?? 1400}
        layer={layer}
        lensGeometry={lensGeometry}
        lightColor={lightColor}
        lightOn={lightOn}
        lightTarget={lightTarget}
        layout={layout}
      />
      <LampLicensePlate ghost={ghost} height={layout.height} layer={layer} poleRadius={layout.poleRadius} />
    </group>
  )
}
