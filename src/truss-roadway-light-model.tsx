'use client'

import { useEffect, useMemo } from 'react'
import {
  Color,
  CubicBezierCurve3,
  Object3D,
  Quaternion,
  Vector3,
} from 'three'
import {
  buildTrussRoadwayHousingGeometry,
  buildTrussRoadwayLensGeometry,
  resolveTrussRoadwayLightLayout,
} from './truss-roadway-light-geometry'
import {
  LampBase,
  LampLensMaterial,
  LampLicensePlate,
  LampMetalMaterial,
  LampPoleSegment,
  NO_RAYCAST,
} from './roadway-lamp-primitives'
import type { TrussRoadwayLightNode } from './schema'

const OPTIC_COLUMNS = [0.43, 0.56, 0.69, 0.82] as const
const OPTIC_ROWS = [-0.105, 0.105] as const
const HEAT_SINK_FINS = [0.3, 0.4, 0.5, 0.6, 0.7] as const
const MOUNT_OFFSETS = [-0.055, 0.055] as const

function TrussTube({
  color,
  from,
  ghost,
  layer,
  name,
  radius,
  to,
}: {
  color: string
  from: Vector3
  ghost: boolean
  layer: number
  name: string
  radius: number
  to: Vector3
}) {
  const { length, midpoint, quaternion } = useMemo(() => {
    const direction = to.clone().sub(from)
    return {
      length: direction.length(),
      midpoint: from.clone().add(to).multiplyScalar(0.5),
      quaternion: new Quaternion().setFromUnitVectors(
        new Vector3(0, 1, 0),
        direction.normalize(),
      ),
    }
  }, [from.x, from.y, from.z, to.x, to.y, to.z])

  return (
    <mesh
      castShadow={!ghost}
      layers={layer}
      name={name}
      position={midpoint}
      quaternion={quaternion}
      raycast={ghost ? NO_RAYCAST : undefined}
      receiveShadow
    >
      <cylinderGeometry args={[radius, radius, length, 14]} />
      <LampMetalMaterial color={color} ghost={ghost} metalness={0.78} roughness={0.32} />
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
  const layout = useMemo(
    () => resolveTrussRoadwayLightLayout(node),
    [node.height, node.armLength, node.braceDepth],
  )
  const poleColor = node.poleColor ?? '#596166'
  const housingColor = useMemo(
    () => `#${new Color(poleColor).lerp(new Color('#92999c'), 0.22).getHexString()}`,
    [poleColor],
  )
  const lightColor = node.lightColor ?? '#ffd39a'
  const lightOn = node.lightOn ?? false
  const housingGeometry = useMemo(
    () => buildTrussRoadwayHousingGeometry(layout),
    [layout],
  )
  const lensGeometry = useMemo(
    () => buildTrussRoadwayLensGeometry(layout),
    [layout],
  )
  const lightTargets = useMemo(() => [new Object3D(), new Object3D()], [])
  const upperArmCurve = useMemo(
    () =>
      new CubicBezierCurve3(
        new Vector3(layout.poleRadius * 0.72, layout.upperMountY, 0),
        new Vector3(layout.armLength * 0.2, layout.upperMountY + 0.03, 0),
        new Vector3(layout.armLength * 0.44, layout.armY - 0.02, 0),
        new Vector3(layout.armLength, layout.armY, 0),
      ),
    [layout],
  )
  const lowerBraceStart = useMemo(
    () => new Vector3(layout.poleRadius * 0.72, layout.lowerMountY, 0),
    [layout.lowerMountY, layout.poleRadius],
  )
  const trussJoint = useMemo(
    () => new Vector3(layout.trussJointX, layout.trussJointY, 0),
    [layout.trussJointX, layout.trussJointY],
  )
  const webTop = useMemo(() => upperArmCurve.getPoint(0.34), [upperArmCurve])
  const webBottom = useMemo(() => {
    const ratio = Math.min(1, webTop.x / layout.trussJointX)
    return lowerBraceStart.clone().lerp(trussJoint, ratio)
  }, [layout.trussJointX, lowerBraceStart, trussJoint, webTop.x])
  const lightX = layout.fixtureStartX + layout.fixtureLength * 0.66

  useEffect(
    () => () => {
      housingGeometry.dispose()
      lensGeometry.dispose()
    },
    [housingGeometry, lensGeometry],
  )

  return (
    <group layers={layer} name="truss-roadway-light-assembly">
      <LampBase
        baseRadius={0.27}
        baseTopRadius={0.86}
        boltOffset={0.155}
        color={poleColor}
        ghost={ghost}
        layer={layer}
      />
      <LampPoleSegment
        bottomRadius={0.19}
        color={poleColor}
        ghost={ghost}
        height={0.42}
        layer={layer}
        topRadius={0.145}
        y={0.04}
      />
      <LampPoleSegment
        bottomRadius={layout.poleRadius * 1.16}
        color={poleColor}
        ghost={ghost}
        height={layout.poleTopY}
        layer={layer}
        topRadius={layout.poleRadius * 0.72}
      />
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="truss-roadway-pole-cap"
        position={[0, layout.poleTopY + 0.025, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[layout.poleRadius * 0.78, layout.poleRadius * 0.72, 0.05, 18]} />
        <LampMetalMaterial color={poleColor} ghost={ghost} />
      </mesh>

      {[layout.upperMountY, layout.lowerMountY].map((mountY) => (
        <group key={mountY} name="truss-roadway-pole-fitting">
          <mesh
            castShadow={!ghost}
            layers={layer}
            name="truss-roadway-mounting-plate"
            position={[layout.poleRadius * 0.72, mountY, 0]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <boxGeometry args={[0.08, 0.19, 0.25]} />
            <LampMetalMaterial color={housingColor} ghost={ghost} metalness={0.76} roughness={0.34} />
          </mesh>
          {MOUNT_OFFSETS.map((offset) => (
            <mesh
              key={offset}
              layers={layer}
              name="truss-roadway-fitting-bolt"
              position={[layout.poleRadius * 0.79, mountY + offset, 0]}
              raycast={ghost ? NO_RAYCAST : undefined}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.018, 0.018, 0.29, 10]} />
              <LampMetalMaterial color="#252b2f" ghost={ghost} metalness={0.82} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ))}

      <mesh
        castShadow={!ghost}
        layers={layer}
        name="truss-roadway-rising-upper-arm"
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <tubeGeometry args={[upperArmCurve, 40, layout.armRadius, 16, false]} />
        <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.78} roughness={0.32} />
      </mesh>
      <TrussTube
        color={poleColor}
        from={lowerBraceStart}
        ghost={ghost}
        layer={layer}
        name="truss-roadway-lower-diagonal-chord"
        radius={layout.braceRadius}
        to={trussJoint}
      />
      <TrussTube
        color={poleColor}
        from={webBottom}
        ghost={ghost}
        layer={layer}
        name="truss-roadway-vertical-web"
        radius={layout.braceRadius * 0.82}
        to={webTop}
      />
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="truss-roadway-convergence-fitting"
        position={trussJoint}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <sphereGeometry args={[layout.armRadius * 1.28, 16, 12]} />
        <LampMetalMaterial color={housingColor} ghost={ghost} metalness={0.76} roughness={0.34} />
      </mesh>

      <mesh
        castShadow={!ghost}
        layers={layer}
        name="truss-roadway-integrated-spigot"
        position={[layout.armLength + layout.socketLength * 0.12, layout.armY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        rotation={[0, 0, -Math.PI / 2]}
      >
        <cylinderGeometry args={[layout.socketRadius * 1.24, layout.armRadius, layout.socketLength, 18]} />
        <LampMetalMaterial color={housingColor} ghost={ghost} metalness={0.72} roughness={0.36} />
      </mesh>
      <mesh
        castShadow={!ghost}
        geometry={housingGeometry}
        layers={layer}
        name="truss-roadway-led-housing"
        position={[layout.fixtureStartX, layout.armY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <LampMetalMaterial color={housingColor} ghost={ghost} metalness={0.69} roughness={0.37} />
      </mesh>
      <mesh
        geometry={lensGeometry}
        layers={layer}
        name="truss-roadway-optic-window"
        position={[layout.fixtureStartX, layout.armY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <LampLensMaterial color={lightColor} ghost={ghost} lightOn={lightOn} emissiveIntensity={2.2} />
      </mesh>

      {HEAT_SINK_FINS.map((x) => (
        <mesh
          key={x}
          castShadow={!ghost}
          layers={layer}
          name="truss-roadway-heat-sink-fin"
          position={[layout.fixtureStartX + x, layout.armY + 0.133 - x * 0.055, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <boxGeometry args={[0.025, 0.027, 0.34]} />
          <LampMetalMaterial color="#596268" ghost={ghost} metalness={0.78} roughness={0.33} />
        </mesh>
      ))}
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="truss-roadway-service-panel"
        position={[layout.fixtureStartX + 0.15, layout.armY - 0.121, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[0.25, 0.016, 0.29]} />
        <LampMetalMaterial color="#464e53" ghost={ghost} metalness={0.7} roughness={0.4} />
      </mesh>
      {OPTIC_COLUMNS.flatMap((x) =>
        OPTIC_ROWS.map((z) => (
          <mesh
            key={`${x}:${z}`}
            layers={layer}
            name="truss-roadway-optic-cell"
            position={[layout.fixtureStartX + x, layout.armY - 0.142 + (x - 0.43) * 0.06, z]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <cylinderGeometry args={[0.034, 0.039, 0.014, 12]} />
            <meshStandardMaterial
              color={lightOn ? lightColor : '#d3d8da'}
              depthWrite={!ghost}
              emissive={lightOn ? lightColor : '#000000'}
              emissiveIntensity={ghost ? 0.22 : lightOn ? 2.5 : 0}
              opacity={ghost ? 0.55 : 0.98}
              roughness={0.15}
              transparent={ghost}
            />
          </mesh>
        )),
      )}
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="truss-roadway-control-socket"
        position={[layout.fixtureStartX + layout.fixtureLength * 0.2, layout.armY + 0.14, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[0.042, 0.047, 0.038, 16]} />
        <meshStandardMaterial
          color="#30373b"
          depthWrite={!ghost}
          metalness={0.38}
          opacity={ghost ? 0.45 : 1}
          roughness={0.4}
          transparent={ghost}
        />
      </mesh>

      <LampLicensePlate
        ghost={ghost}
        height={layout.height}
        layer={layer}
        poleRadius={layout.poleRadius}
      />

      {!ghost && lightOn && (node.intensity ?? 1400) > 0 && (
        <>
          {lightTargets.map((target, index) => {
            const side = index === 0 ? -1 : 1
            return (
              <group key={side} layers={layer}>
                <primitive
                  layers={layer}
                  object={target}
                  position={[lightX, 0, side * layout.height * 0.2]}
                />
                <spotLight
                  angle={Math.PI * 0.25}
                  castShadow={false}
                  color={lightColor}
                  decay={2}
                  distance={Math.max(12, layout.height * 2.7)}
                  intensity={(node.intensity ?? 1400) * 0.58}
                  layers={layer}
                  penumbra={0.65}
                  position={[lightX, layout.armY - 0.15, side * 0.08]}
                  target={target}
                />
              </group>
            )
          })}
        </>
      )}
    </group>
  )
}
