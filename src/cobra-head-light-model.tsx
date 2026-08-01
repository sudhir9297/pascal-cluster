'use client'

import { useEffect, useMemo } from 'react'
import { Object3D } from 'three'
import {
  buildCobraHeadHousingGeometry,
  buildCobraHeadLensGeometry,
  resolveCobraHeadLightLayout,
} from './cobra-head-light-geometry'
import {
  LampBase,
  LampLicensePlate,
  LampPoleSegment,
  RoadwayHead,
} from './roadway-lamp-primitives'
import type { CobraHeadLightNode } from './schema'

export function CobraHeadLightModel({
  node,
  ghost = false,
  layer = 0,
}: {
  node: CobraHeadLightNode
  ghost?: boolean
  layer?: number
}) {
  const layout = useMemo(() => resolveCobraHeadLightLayout(node), [node.height, node.armLength])
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
      <LampPoleSegment bottomRadius={layout.armRadius * 1.15} color={poleColor} ghost={ghost} height={layout.armY - layout.poleTopY} layer={layer} topRadius={layout.armRadius} y={layout.poleTopY} />
      <RoadwayHead
        color={poleColor}
        distance={Math.max(12, layout.height * 2.6)}
        fixtureGeometry={housingGeometry}
        ghost={ghost}
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
