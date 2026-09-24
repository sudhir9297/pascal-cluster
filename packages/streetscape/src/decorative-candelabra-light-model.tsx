'use client'

import { useMemo } from 'react'
import { QuadraticBezierCurve3, Vector3 } from 'three'
import {
  CANDELABRA_LANTERN_MOUNT_OFFSET,
  resolveDecorativeCandelabraLayout,
  type DecorativeCandelabraLayout,
} from './decorative-candelabra-light-geometry'
import {
  LampLensMaterial as LensMaterial,
  LampMetalMaterial as MetalMaterial,
  NO_RAYCAST,
} from './roadway-lamp-primitives'
import type { DecorativeCandelabraLightNode } from './schema'

type RenderProps = {
  ghost: boolean
  layer: number
  color: string
}

function OrnamentalPole({
  color,
  ghost,
  layer,
  layout,
}: RenderProps & { layout: DecorativeCandelabraLayout }) {
  const shaftLength = layout.shaftTopY - 0.82
  const ribAngles = Array.from({ length: 8 }, (_, index) => (index * Math.PI) / 4)

  return (
    <group layers={layer} name="catalog-lamp-pole">
      <mesh castShadow={!ghost} layers={layer} name="catalog-candelabra-base-plinth" position={[0, 0.055, 0]} raycast={ghost ? NO_RAYCAST : undefined} receiveShadow>
        <cylinderGeometry args={[layout.baseRadius * 0.9, layout.baseRadius, 0.11, 8]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.76} roughness={0.4} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} name="catalog-candelabra-base-step" position={[0, 0.17, 0]} raycast={ghost ? NO_RAYCAST : undefined} receiveShadow>
        <cylinderGeometry args={[0.25, 0.3, 0.14, 8]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.76} roughness={0.4} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} name="catalog-candelabra-flared-pedestal" position={[0, 0.48, 0]} raycast={ghost ? NO_RAYCAST : undefined} receiveShadow>
        <cylinderGeometry args={[layout.shaftBottomRadius, 0.245, 0.52, 12]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.76} roughness={0.39} />
      </mesh>
      {ribAngles.map((angle) => (
        <mesh key={angle} castShadow={!ghost} layers={layer} name="catalog-candelabra-base-flute" position={[Math.cos(angle) * 0.205, 0.49, Math.sin(angle) * 0.205]} raycast={ghost ? NO_RAYCAST : undefined} rotation={[0, -angle, 0]}>
          <boxGeometry args={[0.035, 0.42, 0.045]} />
          <MetalMaterial color={color} ghost={ghost} metalness={0.8} roughness={0.34} />
        </mesh>
      ))}
      <mesh castShadow={!ghost} layers={layer} name="catalog-candelabra-lower-collar" position={[0, 0.78, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <cylinderGeometry args={[0.2, 0.23, 0.12, 16]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.78} roughness={0.36} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} name="catalog-candelabra-tapered-shaft" position={[0, 0.82 + shaftLength / 2, 0]} raycast={ghost ? NO_RAYCAST : undefined} receiveShadow>
        <cylinderGeometry args={[layout.shaftTopRadius, layout.shaftBottomRadius, shaftLength, 20]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.78} roughness={0.37} />
      </mesh>
      {[0.36, 0.68].map((fraction) => (
        <mesh key={fraction} castShadow={!ghost} layers={layer} name="catalog-candelabra-shaft-band" position={[0, 0.82 + shaftLength * fraction, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
          <cylinderGeometry args={[0.135 - fraction * 0.025, 0.14 - fraction * 0.025, 0.075, 18]} />
          <MetalMaterial color={color} ghost={ghost} metalness={0.82} roughness={0.32} />
        </mesh>
      ))}
      <mesh castShadow={!ghost} layers={layer} name="catalog-candelabra-arm-hub" position={[0, layout.armHubY, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <sphereGeometry args={[0.19, 18, 12]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.8} roughness={0.34} />
      </mesh>
    </group>
  )
}

function ScrollArm({
  color,
  ghost,
  layer,
  layout,
  side,
}: RenderProps & { layout: DecorativeCandelabraLayout; side: -1 | 1 }) {
  const mainCurve = useMemo(
    () => new QuadraticBezierCurve3(
      // Start inside the hub, not at its surface. Tube end caps otherwise
      // reveal a hairline gap under shallow perspective views.
      new Vector3(0, layout.armHubY, 0),
      new Vector3(side * layout.armSpan * 0.53, layout.armHubY + 0.2, 0),
      new Vector3(side * layout.armSpan, layout.sideMountY, 0),
    ),
    [layout.armHubY, layout.armSpan, layout.sideMountY, side],
  )
  const braceCurve = useMemo(
    () => new QuadraticBezierCurve3(
      // Bury both lower scrolls in the shaft so their joints remain closed.
      new Vector3(0, layout.armHubY - 0.29, 0),
      new Vector3(side * layout.armSpan * 0.47, layout.armHubY - 0.6, 0),
      new Vector3(side * layout.armSpan * 0.76, layout.sideMountY - 0.03, 0),
    ),
    [layout.armHubY, layout.armSpan, layout.sideMountY, side],
  )

  return (
    <group layers={layer} name="catalog-candelabra-scroll-arm">
      <mesh castShadow={!ghost} layers={layer} name="catalog-candelabra-main-arm" raycast={ghost ? NO_RAYCAST : undefined} receiveShadow>
        <tubeGeometry args={[mainCurve, 30, 0.065, 12, false]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.8} roughness={0.33} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} name="catalog-candelabra-scroll-brace" raycast={ghost ? NO_RAYCAST : undefined} receiveShadow>
        <tubeGeometry args={[braceCurve, 26, 0.036, 10, false]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.8} roughness={0.33} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} name="catalog-candelabra-scroll-volute" position={[side * layout.armSpan * 0.73, layout.sideMountY - 0.1, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <torusGeometry args={[0.105, 0.027, 9, 24]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.82} roughness={0.32} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} name="catalog-candelabra-arm-socket-joint" position={[side * layout.armSpan, layout.sideMountY, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <sphereGeometry args={[0.082, 14, 10]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.8} roughness={0.33} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} name="catalog-candelabra-lantern-fitter" position={[side * layout.armSpan, layout.sideMountY + 0.065, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <cylinderGeometry args={[0.09, 0.075, 0.13, 14]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.8} roughness={0.34} />
      </mesh>
    </group>
  )
}

function HeritageLantern({
  color,
  ghost,
  intensity,
  layer,
  lightColor,
  lightOn,
  position,
  distance,
}: RenderProps & {
  intensity: number
  lightColor: string
  lightOn: boolean
  position: [number, number, number]
  distance: number
}) {
  const cageHalfWidth = 0.165
  const corners = [-1, 1].flatMap((x) =>
    [-1, 1].map((z) => [x * cageHalfWidth, z * cageHalfWidth] as const),
  )
  const panes: Array<{
    key: string
    position: [number, number, number]
    size: [number, number, number]
  }> = [
    { key: 'front', position: [0, 0, cageHalfWidth - 0.012], size: [0.3, 0.4, 0.014] },
    { key: 'back', position: [0, 0, -cageHalfWidth + 0.012], size: [0.3, 0.4, 0.014] },
    { key: 'left', position: [-cageHalfWidth + 0.012, 0, 0], size: [0.014, 0.4, 0.3] },
    { key: 'right', position: [cageHalfWidth - 0.012, 0, 0], size: [0.014, 0.4, 0.3] },
  ]
  const cageFrames: Array<{
    key: string
    position: [number, number, number]
    size: [number, number, number]
  }> = [-0.23, 0.23].flatMap((y) => [
    { key: `${y}:front`, position: [0, y, cageHalfWidth], size: [0.37, 0.045, 0.035] },
    { key: `${y}:back`, position: [0, y, -cageHalfWidth], size: [0.37, 0.045, 0.035] },
    { key: `${y}:left`, position: [-cageHalfWidth, y, 0], size: [0.035, 0.045, 0.37] },
    { key: `${y}:right`, position: [cageHalfWidth, y, 0], size: [0.035, 0.045, 0.37] },
  ])

  return (
    <group layers={layer} name="catalog-candelabra-lantern" position={position}>
      {panes.map((pane) => (
        <mesh key={pane.key} castShadow={!ghost} layers={layer} name="catalog-candelabra-glass-pane" position={pane.position} raycast={ghost ? NO_RAYCAST : undefined}>
          <boxGeometry args={pane.size} />
          <LensMaterial color={lightColor} emissiveIntensity={lightOn ? 1.9 : 0} ghost={ghost} lightOn={lightOn} />
        </mesh>
      ))}
      {corners.map(([x, z]) => (
        <mesh key={`${x}:${z}`} castShadow={!ghost} layers={layer} name="catalog-candelabra-cage-rail" position={[x, 0, z]} raycast={ghost ? NO_RAYCAST : undefined}>
          <boxGeometry args={[0.032, 0.5, 0.032]} />
          <MetalMaterial color={color} ghost={ghost} metalness={0.78} roughness={0.34} />
        </mesh>
      ))}
      {cageFrames.map((frame) => (
        <mesh key={frame.key} castShadow={!ghost} layers={layer} name="catalog-candelabra-cage-frame" position={frame.position} raycast={ghost ? NO_RAYCAST : undefined}>
          <boxGeometry args={frame.size} />
          <MetalMaterial color={color} ghost={ghost} metalness={0.78} roughness={0.34} />
        </mesh>
      ))}
      <mesh castShadow={!ghost} layers={layer} name="catalog-candelabra-lantern-base" position={[0, -0.285, 0]} raycast={ghost ? NO_RAYCAST : undefined} rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[0.21, 0.25, 0.11, 4]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.8} roughness={0.34} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} name="catalog-candelabra-mansard-roof" position={[0, 0.34, 0]} raycast={ghost ? NO_RAYCAST : undefined} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.32, 0.25, 4]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.8} roughness={0.34} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} name="catalog-candelabra-roof-finial" position={[0, 0.53, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <sphereGeometry args={[0.065, 12, 8]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.82} roughness={0.31} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} name="catalog-candelabra-roof-finial-tip" position={[0, 0.63, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <coneGeometry args={[0.055, 0.14, 10]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.82} roughness={0.31} />
      </mesh>
      {!ghost && lightOn && intensity > 0 && <pointLight color={lightColor} decay={2} distance={distance} intensity={intensity} layers={layer} />}
    </group>
  )
}

export function DecorativeCandelabraLightModel({
  ghost = false,
  layer = 0,
  node,
}: {
  ghost?: boolean
  layer?: number
  node: DecorativeCandelabraLightNode
}) {
  const layout = resolveDecorativeCandelabraLayout(node)
  const color = node.poleColor ?? '#25282d'
  const lightColor = node.lightColor ?? '#ffd5a0'
  const lightOn = node.lightOn ?? false
  const distance = Math.max(8, layout.height * 2.3)
  const perLanternIntensity = (node.intensity ?? 1100) / 3
  const centerStemBottom = layout.shaftTopY
  const centerStemTop = layout.centerLanternY - CANDELABRA_LANTERN_MOUNT_OFFSET + 0.015
  const centerStemLength = centerStemTop - centerStemBottom

  return (
    <group layers={layer} name="catalog-decorative-candelabra-light">
      <OrnamentalPole color={color} ghost={ghost} layer={layer} layout={layout} />
      {([-1, 1] as const).map((side) => <ScrollArm key={side} color={color} ghost={ghost} layer={layer} layout={layout} side={side} />)}
      <mesh castShadow={!ghost} layers={layer} name="catalog-candelabra-center-stem" position={[0, centerStemBottom + centerStemLength / 2, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <cylinderGeometry args={[0.075, 0.105, centerStemLength, 16]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.8} roughness={0.34} />
      </mesh>
      <mesh castShadow={!ghost} layers={layer} name="catalog-candelabra-center-collar" position={[0, centerStemBottom + 0.06, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <cylinderGeometry args={[0.14, 0.17, 0.12, 16]} />
        <MetalMaterial color={color} ghost={ghost} metalness={0.8} roughness={0.34} />
      </mesh>
      <HeritageLantern color={color} distance={distance} ghost={ghost} intensity={perLanternIntensity} layer={layer} lightColor={lightColor} lightOn={lightOn} position={[0, layout.centerLanternY, 0]} />
      {([-1, 1] as const).map((side) => (
        <HeritageLantern key={side} color={color} distance={distance} ghost={ghost} intensity={perLanternIntensity} layer={layer} lightColor={lightColor} lightOn={lightOn} position={[side * layout.armSpan, layout.sideLanternY, 0]} />
      ))}
    </group>
  )
}
