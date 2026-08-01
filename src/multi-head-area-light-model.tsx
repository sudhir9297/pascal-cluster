'use client'

import { useEffect, useMemo } from 'react'
import { Object3D } from 'three'
import {
  buildCobraHeadHousingGeometry,
  buildCobraHeadLensGeometry,
} from './multi-head-area-light-geometry'
import { areaHeadAngles, resolveMultiHeadAreaLightLayout } from './multi-head-area-light-geometry'
import {
  LampBase,
  LampLicensePlate,
  LampPoleSegment,
  RoadwayHead,
} from './roadway-lamp-primitives'
import type { MultiHeadAreaLightNode } from './schema'

export function MultiHeadAreaLightModel({
  node,
  ghost = false,
  layer = 0,
}: {
  node: MultiHeadAreaLightNode
  ghost?: boolean
  layer?: number
}) {
  const layout = useMemo(() => resolveMultiHeadAreaLightLayout(node), [node.height, node.armLength])
  const poleColor = node.poleColor ?? '#363b40'
  const lightColor = node.lightColor ?? '#ffd39a'
  const lightOn = node.lightOn ?? false
  const fixtureGeometry = useMemo(() => buildCobraHeadHousingGeometry(layout), [layout])
  const lensGeometry = useMemo(() => buildCobraHeadLensGeometry(layout), [layout])
  const angles = areaHeadAngles(node.headCount)
  const lightTargets = useMemo(() => angles.map(() => new Object3D()), [angles.length])
  useEffect(
    () => () => {
      fixtureGeometry.dispose()
      lensGeometry.dispose()
    },
    [fixtureGeometry, lensGeometry],
  )

  return (
    <group layers={layer}>
      <LampBase baseRadius={0.28} color={poleColor} ghost={ghost} layer={layer} boltOffset={0.16} baseTopRadius={0.86} />
      <LampPoleSegment bottomRadius={0.2} color={poleColor} ghost={ghost} height={0.38} layer={layer} topRadius={0.15} y={0.04} />
      <LampPoleSegment bottomRadius={layout.poleRadius * 1.25} color={poleColor} ghost={ghost} height={layout.poleTopY} layer={layer} topRadius={layout.poleRadius} />
      <LampPoleSegment bottomRadius={layout.armRadius * 1.15} color={poleColor} ghost={ghost} height={layout.armY - layout.poleTopY} layer={layer} topRadius={layout.armRadius} y={layout.poleTopY} />
      {angles.map((angle, index) => (
        <group key={angle} layers={layer} rotation={[0, angle, 0]}>
          <RoadwayHead
            color={poleColor}
            distance={Math.max(12, layout.height * 2.5)}
            fixtureGeometry={fixtureGeometry}
            ghost={ghost}
            intensity={node.intensity ?? 1200}
            layer={layer}
            lensGeometry={lensGeometry}
            lightColor={lightColor}
            lightOn={lightOn}
            lightTarget={lightTargets[index]!}
            layout={layout}
          />
        </group>
      ))}
      <LampLicensePlate ghost={ghost} height={layout.height} layer={layer} poleRadius={layout.poleRadius} />
    </group>
  )
}
