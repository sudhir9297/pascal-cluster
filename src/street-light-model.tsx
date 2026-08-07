'use client'

import { useMemo } from 'react'
import { CatmullRomCurve3, Color, CubicBezierCurve3, Object3D, Vector3 } from 'three'
import type { StreetLightNode } from './schema'
import {
  buildLampHousingGeometry,
  buildLampLensGeometry,
  resolveStreetLightLayout,
} from './street-light-geometry'
import {
  LampBase,
  LampLensMaterial,
  LampLicensePlate,
  LampMetalMaterial,
  LampPoleSegment,
  NO_RAYCAST,
} from './roadway-lamp-primitives'

const ROADWAY_OPTIC_COLUMNS = [0.46, 0.6, 0.74, 0.88] as const
const ROADWAY_OPTIC_ROWS = [-0.12, 0, 0.12] as const
const ROADWAY_HEAT_SINK_FINS = [0.3, 0.39, 0.48, 0.57, 0.66, 0.75] as const

export function StreetLightModel({
  node,
  ghost = false,
  layer = 0,
}: {
  node: StreetLightNode
  ghost?: boolean
  layer?: number
}) {
  const layout = useMemo(
    () => resolveStreetLightLayout(node),
    [node.height, node.armLength],
  )
  const {
    height,
    armLength,
    poleRadius,
    armRadius,
    poleTop,
    armEndY,
    socketLength,
    socketRadius,
    fixtureStartX,
    fixtureLength,
  } = layout
  const poleColor = node.poleColor ?? '#30343b'
  const housingColor = useMemo(
    () => `#${new Color(poleColor).lerp(new Color('#7d878d'), 0.2).getHexString()}`,
    [poleColor],
  )
  const lightColor = node.lightColor ?? '#ffd9a3'
  const lightOn = node.lightOn ?? false
  const socketCenterX = armLength
  const lightX = fixtureStartX + fixtureLength * 0.66
  const lightTargets = useMemo(() => [new Object3D(), new Object3D()], [])
  const housingGeometry = useMemo(() => buildLampHousingGeometry(layout), [layout])
  const lensGeometry = useMemo(() => buildLampLensGeometry(layout), [layout])
  const armCurve = useMemo(
    () =>
      new CubicBezierCurve3(
        new Vector3(0, poleTop - 0.02, 0),
        new Vector3(0, poleTop + 0.34, 0),
        new Vector3(armLength * 0.24, armEndY, 0),
        new Vector3(armLength, armEndY, 0),
      ),
    [armLength, armEndY, poleTop],
  )
  const sideRailCurves = useMemo(
    () =>
      [-1, 1].map(
        (side) =>
          new CatmullRomCurve3([
            new Vector3(0.14, 0.055, side * 0.2),
            new Vector3(0.36, -0.005, side * 0.285),
            new Vector3(0.84, -0.018, side * 0.27),
            new Vector3(1.01, 0.005, side * 0.2),
          ]),
      ),
    [],
  )
  return (
    <group layers={layer} name="street-light-roadway-led">
      <LampBase baseRadius={0.25} color={poleColor} ghost={ghost} layer={layer} boltOffset={0.14} baseTopRadius={0.88} />
      <LampPoleSegment bottomRadius={0.18} color={poleColor} ghost={ghost} height={0.36} layer={layer} topRadius={0.135} y={0.04} />
      <LampPoleSegment bottomRadius={poleRadius} color={poleColor} ghost={ghost} height={poleTop} layer={layer} topRadius={armRadius} />
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="street-light-swept-outreach"
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <tubeGeometry args={[armCurve, 36, armRadius, 16, false]} />
        <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.76} roughness={0.35} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="street-light-pole-neck"
        position={[0, poleTop - 0.08, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[armRadius * 1.08, armRadius * 1.22, 0.28, 18]} />
        <LampMetalMaterial color={poleColor} ghost={ghost} metalness={0.76} roughness={0.35} />
      </mesh>

      <mesh
        castShadow={!ghost}
        layers={layer}
        name="street-light-integrated-spigot"
        position={[socketCenterX, armEndY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
        rotation={[0, 0, -Math.PI / 2]}
      >
        <cylinderGeometry args={[socketRadius * 1.3, armRadius, socketLength, 18]} />
        <LampMetalMaterial color={housingColor} ghost={ghost} metalness={0.72} roughness={0.36} />
      </mesh>
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="street-light-spigot-clamp"
        position={[armLength - socketLength * 0.38, armEndY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
        rotation={[0, 0, -Math.PI / 2]}
      >
        <cylinderGeometry args={[armRadius * 1.12, armRadius * 1.12, 0.045, 16]} />
        <LampMetalMaterial color={poleColor} ghost={ghost} />
      </mesh>
      <mesh
        castShadow={!ghost}
        geometry={housingGeometry}
        layers={layer}
        name="street-light-die-cast-housing"
        position={[fixtureStartX, armEndY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <LampMetalMaterial color={housingColor} ghost={ghost} metalness={0.68} roughness={0.38} />
      </mesh>
      <mesh
        geometry={lensGeometry}
        layers={layer}
        name="street-light-optic-window"
        position={[fixtureStartX, armEndY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <LampLensMaterial color={lightColor} ghost={ghost} lightOn={lightOn} emissiveIntensity={2.15} />
      </mesh>
      {sideRailCurves.map((curve, index) => (
        <mesh
          key={index}
          castShadow={!ghost}
          layers={layer}
          name="street-light-sculpted-side-rail"
          position={[fixtureStartX, armEndY, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <tubeGeometry args={[curve, 24, 0.014, 10, false]} />
          <LampMetalMaterial color={housingColor} ghost={ghost} metalness={0.72} roughness={0.34} />
        </mesh>
      ))}
      {ROADWAY_HEAT_SINK_FINS.map((x) => (
        <mesh
          key={x}
          castShadow={!ghost}
          layers={layer}
          name="street-light-heat-sink-fin"
          position={[fixtureStartX + x, armEndY + 0.145 - x * 0.045, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <boxGeometry args={[0.028, 0.03, 0.39]} />
          <LampMetalMaterial color="#566169" ghost={ghost} metalness={0.76} roughness={0.34} />
        </mesh>
      ))}
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="street-light-service-panel"
        position={[fixtureStartX + 0.17, armEndY - 0.135, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[0.27, 0.018, 0.32]} />
        <LampMetalMaterial color="#454e55" ghost={ghost} metalness={0.7} roughness={0.4} />
      </mesh>
      {ROADWAY_OPTIC_COLUMNS.flatMap((x) =>
        ROADWAY_OPTIC_ROWS.map((z) => (
          <mesh
            key={`${x}:${z}`}
            layers={layer}
            name="street-light-optic-cell"
            position={[fixtureStartX + x, armEndY - 0.15 + (x - 0.46) * 0.055, z]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <cylinderGeometry args={[0.035, 0.041, 0.015, 12]} />
            <meshStandardMaterial
              color={lightOn ? lightColor : '#d2d7da'}
              depthWrite={!ghost}
              emissive={lightOn ? lightColor : '#000000'}
              emissiveIntensity={ghost ? 0.22 : lightOn ? 2.55 : 0}
              opacity={ghost ? 0.55 : 0.98}
              roughness={0.16}
              transparent={ghost}
            />
          </mesh>
        )),
      )}
      <mesh
        castShadow={!ghost}
        layers={layer}
        name="street-light-control-socket"
        position={[fixtureStartX + fixtureLength * 0.22, armEndY + 0.16, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[0.045, 0.05, 0.04, 16]} />
        <meshStandardMaterial
          color="#31383e"
          depthWrite={!ghost}
          metalness={0.35}
          opacity={ghost ? 0.45 : 1}
          roughness={0.42}
          transparent={ghost}
        />
      </mesh>

      <LampLicensePlate ghost={ghost} height={height} layer={layer} poleRadius={poleRadius} />

      {!ghost && lightOn && (node.intensity ?? 1200) > 0 && (
        <>
          {lightTargets.map((target, index) => {
            const side = index === 0 ? -1 : 1
            return (
              <group key={side} layers={layer}>
                <primitive layers={layer} object={target} position={[lightX, 0, side * height * 0.18]} />
                <spotLight
                  angle={Math.PI * 0.25}
                  castShadow={false}
                  color={lightColor}
                  decay={2}
                  distance={Math.max(10, height * 2.5)}
                  intensity={(node.intensity ?? 1200) * 0.58}
                  layers={layer}
                  penumbra={0.64}
                  position={[lightX, armEndY - 0.15, side * 0.09]}
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
