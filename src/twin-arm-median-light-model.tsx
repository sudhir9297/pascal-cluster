'use client'

import { useEffect, useMemo } from 'react'
import { Object3D } from 'three'
import {
  buildCobraHeadHousingGeometry,
  buildCobraHeadLensGeometry,
} from './cobra-head-light-geometry'
import { resolveTwinArmMedianLightLayout } from './twin-arm-median-light-geometry'
import {
  LampBase,
  LampLicensePlate,
  LampPoleSegment,
  RoadwayHead,
} from './roadway-lamp-primitives'
import type { TwinArmMedianLightNode } from './schema'

export function TwinArmMedianLightModel({
  node,
  ghost = false,
  layer = 0,
}: {
  node: TwinArmMedianLightNode
  ghost?: boolean
  layer?: number
}) {
  const layout = useMemo(() => resolveTwinArmMedianLightLayout(node), [node.height, node.armLength])
  const poleColor = node.poleColor ?? '#363b40'
  const lightColor = node.lightColor ?? '#ffd39a'
  const lightOn = node.lightOn ?? false
  const fixtureGeometry = useMemo(() => buildCobraHeadHousingGeometry(layout), [layout])
  const lensGeometry = useMemo(() => buildCobraHeadLensGeometry(layout), [layout])
  const lightTargets = useMemo(() => [new Object3D(), new Object3D()], [])
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
      {[1, -1].map((side, index) => (
        <group key={side} layers={layer} rotation={[0, side < 0 ? Math.PI : 0, 0]}>
          <RoadwayHead
            color={poleColor}
            distance={Math.max(12, layout.height * 2.6)}
            fixtureGeometry={fixtureGeometry}
            ghost={ghost}
            intensity={node.intensity ?? 1400}
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
