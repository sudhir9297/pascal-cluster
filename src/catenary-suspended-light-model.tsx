'use client'

import { useEffect, useMemo } from 'react'
import { Object3D, Quaternion, Vector3 } from 'three'
import type { CatalogLampNode } from './catalog-lamp-config'
import {
  buildCatenaryCableCurve,
  buildCatenaryHousingGeometry,
  buildCatenaryOpticGeometry,
  CATENARY_SUSPENDED_LIGHT_DIMENSIONS,
  catenaryHeightAt,
  resolveCatenarySuspendedLightLayout,
} from './catenary-suspended-light-geometry'
import {
  LampLensMaterial,
  LampMetalMaterial,
  NO_RAYCAST,
} from './roadway-lamp-primitives'

const BASE_BOLTS = [
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
] as const

function RodBetween({
  color,
  end,
  ghost,
  layer,
  name,
  radius,
  start,
}: {
  color: string
  end: readonly [number, number, number]
  ghost: boolean
  layer: number
  name: string
  radius: number
  start: readonly [number, number, number]
}) {
  const startVector = new Vector3(...start)
  const endVector = new Vector3(...end)
  const delta = endVector.clone().sub(startVector)
  const length = delta.length()
  const quaternion = new Quaternion().setFromUnitVectors(
    new Vector3(0, 1, 0),
    delta.normalize(),
  )
  const midpoint = startVector.add(endVector).multiplyScalar(0.5)

  return (
    <mesh
      castShadow={!ghost}
      layers={layer}
      name={name}
      position={[midpoint.x, midpoint.y, midpoint.z]}
      quaternion={quaternion}
      raycast={ghost ? NO_RAYCAST : undefined}
    >
      <cylinderGeometry args={[radius, radius, length, 10]} />
      <LampMetalMaterial color={color} ghost={ghost} metalness={0.82} roughness={0.28} />
    </mesh>
  )
}

function CatenarySupportPole({
  color,
  ghost,
  height,
  layer,
  side,
  span,
}: {
  color: string
  ghost: boolean
  height: number
  layer: number
  side: -1 | 1
  span: number
}) {
  const dimensions = CATENARY_SUSPENDED_LIGHT_DIMENSIONS
  const x = side * span / 2

  return (
    <group layers={layer} name="catalog-lamp-pole" position={[x, 0, 0]}>
      <group layers={layer} name="catalog-catenary-support-pole">
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-catenary-base-plate"
        position={[0, dimensions.basePlateHeight / 2, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <boxGeometry args={[dimensions.basePlateSize, dimensions.basePlateHeight, dimensions.basePlateSize]} />
        <LampMetalMaterial color="#262d32" ghost={ghost} metalness={0.84} roughness={0.34} />
      </mesh>

      {BASE_BOLTS.map(([xSign, zSign]) => (
        <mesh
          key={`${xSign}:${zSign}`}
          castShadow={!ghost}
          layers={layer}
          name="catalog-catenary-anchor-bolt"
          position={[
            xSign * dimensions.baseBoltOffset,
            dimensions.basePlateHeight + 0.025,
            zSign * dimensions.baseBoltOffset,
          ]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <cylinderGeometry args={[dimensions.baseBoltRadius, dimensions.baseBoltRadius, 0.05, 8]} />
          <LampMetalMaterial color="#818a90" ghost={ghost} metalness={0.92} roughness={0.2} />
        </mesh>
      ))}

      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-catenary-tapered-pole"
        position={[0, dimensions.basePlateHeight + height / 2, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <cylinderGeometry args={[dimensions.poleTopRadius, dimensions.poleBottomRadius, height, 24]} />
        <LampMetalMaterial color={color} ghost={ghost} metalness={0.74} roughness={0.38} />
      </mesh>

      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-catenary-pole-cap"
        position={[0, height + dimensions.basePlateHeight, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[dimensions.poleCapRadius * 0.86, dimensions.poleCapRadius, dimensions.poleCapHeight, 20]} />
        <LampMetalMaterial color="#505a61" ghost={ghost} metalness={0.82} roughness={0.28} />
      </mesh>

      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-catenary-end-anchor"
        position={[side * -0.04, height, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[dimensions.anchorPlateWidth, dimensions.anchorPlateHeight, dimensions.anchorPlateDepth]} />
        <LampMetalMaterial color="#3d464c" ghost={ghost} metalness={0.84} roughness={0.3} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-catenary-anchor-pin"
        position={[0, height, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.04, 0.04, 0.12, 12]} />
        <LampMetalMaterial color="#8a949a" ghost={ghost} metalness={0.92} roughness={0.18} />
      </mesh>
      </group>
    </group>
  )
}

export function CatenarySuspendedLightModel({
  distance,
  ghost = false,
  layer = 0,
  node,
}: {
  distance: number
  ghost?: boolean
  layer?: number
  node: Pick<CatalogLampNode, 'armLength' | 'height' | 'intensity' | 'lightColor' | 'lightOn' | 'poleColor'>
}) {
  const dimensions = CATENARY_SUSPENDED_LIGHT_DIMENSIONS
  const layout = useMemo(
    () => resolveCatenarySuspendedLightLayout(node.height ?? 6, node.armLength ?? 6),
    [node.armLength, node.height],
  )
  const cableCurve = useMemo(() => buildCatenaryCableCurve(layout), [layout])
  const housingGeometry = useMemo(() => buildCatenaryHousingGeometry(), [])
  const opticGeometry = useMemo(() => buildCatenaryOpticGeometry(), [])
  const lightTarget = useMemo(() => new Object3D(), [])
  const poleColor = node.poleColor ?? '#343b40'
  const bodyColor = '#4b555c'
  const lightColor = node.lightColor ?? '#ffd39a'
  const lightOn = node.lightOn ?? false
  const fixtureBottomY = layout.fixtureCenterY - dimensions.bodyHeight / 2
  const bridgeY = layout.fixtureCenterY + dimensions.bodyHeight / 2 + 0.09

  useEffect(
    () => () => {
      housingGeometry.dispose()
      opticGeometry.dispose()
    },
    [housingGeometry, opticGeometry],
  )

  return (
    <group layers={layer} name="catalog-catenary-lamp">
      <CatenarySupportPole color={poleColor} ghost={ghost} height={layout.height} layer={layer} side={-1} span={layout.span} />
      <CatenarySupportPole color={poleColor} ghost={ghost} height={layout.height} layer={layer} side={1} span={layout.span} />

      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-catenary-span"
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <tubeGeometry args={[cableCurve, 64, dimensions.cableRadius, 10, false]} />
        <LampMetalMaterial color="#1f2529" ghost={ghost} metalness={0.9} roughness={0.24} />
      </mesh>

      {dimensions.opticModuleCenters.map((x) => {
        const clampY = catenaryHeightAt(x < 0 ? -dimensions.clampOffset : dimensions.clampOffset, layout)
        const clampX = x < 0 ? -dimensions.clampOffset : dimensions.clampOffset
        return (
          <group key={`clamp:${x}`} layers={layer}>
            <mesh
              castShadow={!ghost}
              layers={layer}
              name="catalog-catenary-cable-clamp"
              position={[clampX, clampY, 0]}
              raycast={ghost ? NO_RAYCAST : undefined}
              rotation={[0, Math.PI / 2, 0]}
            >
              <torusGeometry args={[dimensions.clampRadius, 0.014, 8, 18]} />
              <LampMetalMaterial color="#7b858b" ghost={ghost} metalness={0.9} roughness={0.22} />
            </mesh>
            <mesh
              castShadow={!ghost}
              layers={layer}
              name="catalog-catenary-clamp-bolt"
              position={[clampX, clampY - 0.045, 0]}
              raycast={ghost ? NO_RAYCAST : undefined}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.016, 0.016, 0.12, 10]} />
              <LampMetalMaterial color="#949da2" ghost={ghost} metalness={0.94} roughness={0.18} />
            </mesh>
            <RodBetween
              color="#59636a"
              end={[x, bridgeY, 0]}
              ghost={ghost}
              layer={layer}
              name="catalog-catenary-suspension-yoke"
              radius={dimensions.yokeRadius}
              start={[clampX, clampY - 0.055, 0]}
            />
          </group>
        )
      })}

      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-catenary-yoke-bridge"
        position={[0, bridgeY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[0.46, 0.04, 0.08]} />
        <LampMetalMaterial color="#59636a" ghost={ghost} metalness={0.82} roughness={0.28} />
      </mesh>

      {dimensions.opticModuleCenters.map((x) => (
        <mesh
          key={`yoke-joint:${x}`}
          castShadow={!ghost}
          layers={layer}
          name="catalog-catenary-yoke-joint-pin"
          position={[x, bridgeY + 0.012, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.026, 0.026, 0.105, 12]} />
          <LampMetalMaterial color="#838d93" ghost={ghost} metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-catenary-suspension-boss"
        position={[0, layout.fixtureCenterY + dimensions.bodyHeight / 2 + 0.045, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[0.065, 0.09, 0.09, 18]} />
        <LampMetalMaterial color="#5f6970" ghost={ghost} metalness={0.82} roughness={0.28} />
      </mesh>

      <mesh
        castShadow={!ghost}
        geometry={housingGeometry}
        layers={layer}
        name="catalog-catenary-aero-housing"
        position={[0, layout.fixtureCenterY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <LampMetalMaterial color={bodyColor} ghost={ghost} metalness={0.78} roughness={0.33} />
      </mesh>

      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-catenary-service-cover"
        position={[0, layout.fixtureCenterY + dimensions.bodyHeight / 2 + 0.016, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[0.3, 0.028, 0.2]} />
        <LampMetalMaterial color="#626d74" ghost={ghost} metalness={0.76} roughness={0.34} />
      </mesh>

      <mesh
        castShadow={!ghost}
        layers={layer}
        name="catalog-catenary-protector"
        position={[0, fixtureBottomY - dimensions.protectorDepth / 2 + 0.006, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[dimensions.protectorLength, dimensions.protectorDepth, dimensions.protectorWidth]} />
        <LampMetalMaterial color="#c0c7ca" ghost={ghost} metalness={0.36} roughness={0.24} />
      </mesh>

      {dimensions.opticModuleCenters.map((x) => (
        <mesh
          key={`optic:${x}`}
          geometry={opticGeometry}
          layers={layer}
          name="catalog-catenary-optic-module"
          position={[x, fixtureBottomY - dimensions.protectorDepth - 0.004, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <LampLensMaterial color={lightColor} emissiveIntensity={2.5} ghost={ghost} lightOn={lightOn} />
        </mesh>
      ))}

      {dimensions.opticModuleCenters.flatMap((moduleX) =>
        dimensions.opticCellXOffsets.flatMap((offsetX) =>
          dimensions.opticCellZOffsets.map((z) => (
            <mesh
              key={`${moduleX}:${offsetX}:${z}`}
              layers={layer}
              name="catalog-catenary-optic-cell"
              position={[moduleX + offsetX, fixtureBottomY - dimensions.protectorDepth - 0.025, z]}
              raycast={ghost ? NO_RAYCAST : undefined}
            >
              <cylinderGeometry args={[0.017, 0.021, 0.012, 14]} />
              <meshStandardMaterial
                color={lightOn ? '#fff8de' : '#dce2e3'}
                depthWrite={!ghost}
                emissive={lightOn ? lightColor : '#000000'}
                emissiveIntensity={ghost ? 0.22 : lightOn ? 3.2 : 0}
                opacity={ghost ? 0.52 : 0.98}
                roughness={0.1}
                transparent={ghost}
              />
            </mesh>
          )),
        ),
      )}

      {[-1, 1].map((side) => (
        <mesh
          key={side}
          castShadow={!ghost}
          layers={layer}
          name="catalog-catenary-housing-fastener"
          position={[side * 0.31, layout.fixtureCenterY + 0.015, dimensions.bodyWidth / 2 + 0.014]}
          raycast={ghost ? NO_RAYCAST : undefined}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.018, 0.018, 0.012, 10]} />
          <LampMetalMaterial color="#9aa2a6" ghost={ghost} metalness={0.9} roughness={0.18} />
        </mesh>
      ))}

      {!ghost && lightOn && (node.intensity ?? 1300) > 0 && (
        <>
          <primitive layers={layer} object={lightTarget} position={[0, 0.1, 0]} />
          <spotLight
            angle={Math.PI * 0.3}
            color={lightColor}
            decay={2}
            distance={distance}
            intensity={node.intensity ?? 1300}
            layers={layer}
            penumbra={0.62}
            position={[0, fixtureBottomY - 0.06, 0]}
            target={lightTarget}
          />
        </>
      )}
    </group>
  )
}
