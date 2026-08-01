'use client'

import { useEffect, useMemo } from 'react'
import {
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  Quaternion,
  Shape,
  Vector2,
  Vector3,
} from 'three'
import type { UtilityPoleNode } from './schema'
import { resolveUtilityPoleLayout, type UtilityPoleLayout } from './utility-pole-geometry'

const NO_RAYCAST = () => {}
const UP = new Vector3(0, 1, 0)

function addWoodVariation(geometry: BufferGeometry): BufferGeometry {
  const position = geometry.getAttribute('position')
  const colors: number[] = []
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    const angle = Math.atan2(z, x)
    const grain = Math.sin(angle * 9 + y * 5.3) * 0.045 + Math.sin(y * 13.7) * 0.025
    const shade = 0.86 + grain
    colors.push(shade, shade, shade)
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  return geometry
}

function buildPoleGeometry(layout: UtilityPoleLayout): BufferGeometry {
  const geometry = new CylinderGeometry(
    layout.poleTopRadius,
    layout.poleBottomRadius,
    layout.height,
    28,
    14,
  )
  const position = geometry.getAttribute('position')
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    const radial = Math.hypot(x, z)
    if (radial > 0.01) {
      const angle = Math.atan2(z, x)
      const heightT = y / layout.height + 0.5
      const irregularity =
        1 + Math.sin(angle * 3 + heightT * 8.7) * 0.012 + Math.sin(angle * 7) * 0.006
      position.setXYZ(i, x * irregularity, y, z * irregularity)
    }
  }
  geometry.computeVertexNormals()
  return addWoodVariation(geometry)
}

function buildCrossarmGeometry(layout: UtilityPoleLayout): BufferGeometry {
  const halfLength = layout.crossarmLength / 2
  const halfHeight = layout.crossarmHeight / 2
  const shape = new Shape()
  shape.moveTo(-halfLength, -halfHeight)
  shape.lineTo(halfLength, -halfHeight)
  shape.lineTo(halfLength, halfHeight)
  shape.lineTo(-halfLength, halfHeight)
  shape.closePath()
  const bevel = 0.018
  const geometry = new ExtrudeGeometry(shape, {
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: bevel,
    bevelThickness: bevel,
    depth: layout.crossarmDepth - bevel * 2,
    steps: 1,
  })
  geometry.translate(0, 0, -layout.crossarmDepth / 2 + bevel)
  return addWoodVariation(geometry)
}

function buildInsulatorGeometry(): BufferGeometry {
  const points = [
    new Vector2(0.034, 0),
    new Vector2(0.052, 0.018),
    new Vector2(0.058, 0.04),
    new Vector2(0.098, 0.055),
    new Vector2(0.104, 0.07),
    new Vector2(0.07, 0.095),
    new Vector2(0.062, 0.112),
    new Vector2(0.095, 0.128),
    new Vector2(0.1, 0.143),
    new Vector2(0.064, 0.17),
    new Vector2(0.052, 0.21),
    new Vector2(0.06, 0.245),
    new Vector2(0.045, 0.275),
    new Vector2(0.032, 0.29),
  ]
  const geometry = new LatheGeometry(points, 24)
  geometry.computeVertexNormals()
  return geometry
}

function WoodMaterial({
  color,
  ghost,
  vertexColors = false,
}: {
  color: string
  ghost: boolean
  vertexColors?: boolean
}) {
  return (
    <meshStandardMaterial
      color={color}
      depthWrite={!ghost}
      metalness={0.01}
      opacity={ghost ? 0.5 : 1}
      roughness={0.88}
      transparent={ghost}
      vertexColors={vertexColors}
    />
  )
}

function MetalMaterial({
  color,
  ghost,
  roughness = 0.38,
}: {
  color: string
  ghost: boolean
  roughness?: number
}) {
  return (
    <meshStandardMaterial
      color={color}
      depthWrite={!ghost}
      metalness={0.72}
      opacity={ghost ? 0.48 : 1}
      roughness={roughness}
      transparent={ghost}
    />
  )
}

function Rod({
  from,
  to,
  radius,
  color,
  ghost,
  layer,
}: {
  from: readonly [number, number, number]
  to: readonly [number, number, number]
  radius: number
  color: string
  ghost: boolean
  layer: number
}) {
  const transform = useMemo(() => {
    const start = new Vector3(...from)
    const end = new Vector3(...to)
    const direction = end.clone().sub(start)
    return {
      length: direction.length(),
      midpoint: start.add(end).multiplyScalar(0.5),
      quaternion: new Quaternion().setFromUnitVectors(UP, direction.normalize()),
    }
  }, [from, to])

  return (
    <mesh
      castShadow
      layers={layer}
      position={transform.midpoint}
      quaternion={transform.quaternion}
      raycast={ghost ? NO_RAYCAST : undefined}
    >
      <cylinderGeometry args={[radius, radius, transform.length, 10]} />
      <MetalMaterial color={color} ghost={ghost} />
    </mesh>
  )
}

function HardwareBolt({
  position,
  ghost,
  layer,
}: {
  position: readonly [number, number, number]
  ghost: boolean
  layer: number
}) {
  return (
    <group layers={layer} position={position}>
      <mesh
        layers={layer}
        raycast={ghost ? NO_RAYCAST : undefined}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <cylinderGeometry args={[0.037, 0.037, 0.038, 6]} />
        <MetalMaterial color="#434744" ghost={ghost} />
      </mesh>
      <mesh layers={layer} position={[0, 0, -0.022]} raycast={ghost ? NO_RAYCAST : undefined}>
        <boxGeometry args={[0.095, 0.095, 0.014]} />
        <MetalMaterial color="#555a56" ghost={ghost} roughness={0.5} />
      </mesh>
    </group>
  )
}

function PinInsulator({
  geometry,
  position,
  ghost,
  layer,
}: {
  geometry: BufferGeometry
  position: readonly [number, number, number]
  ghost: boolean
  layer: number
}) {
  return (
    <group layers={layer} position={position}>
      <mesh layers={layer} position={[0, 0.09, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <cylinderGeometry args={[0.018, 0.018, 0.18, 10]} />
        <MetalMaterial color="#4a4d4b" ghost={ghost} />
      </mesh>
      <mesh
        castShadow
        geometry={geometry}
        layers={layer}
        position={[0, 0.075, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <meshPhysicalMaterial
          clearcoat={0.55}
          clearcoatRoughness={0.2}
          color="#7d4937"
          depthWrite={!ghost}
          metalness={0.02}
          opacity={ghost ? 0.5 : 1}
          roughness={0.22}
          transparent={ghost}
        />
      </mesh>
      <mesh layers={layer} position={[0, 0.37, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <cylinderGeometry args={[0.032, 0.032, 0.025, 10]} />
        <MetalMaterial color="#3f4341" ghost={ghost} />
      </mesh>
    </group>
  )
}

function StrainInsulator({
  geometry,
  position,
  ghost,
  layer,
}: {
  geometry: BufferGeometry
  position: readonly [number, number, number]
  ghost: boolean
  layer: number
}) {
  return (
    <group layers={layer} position={position} rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow geometry={geometry} layers={layer} raycast={ghost ? NO_RAYCAST : undefined}>
        <meshPhysicalMaterial
          clearcoat={0.45}
          clearcoatRoughness={0.22}
          color="#704336"
          depthWrite={!ghost}
          metalness={0.02}
          opacity={ghost ? 0.5 : 1}
          roughness={0.25}
          transparent={ghost}
        />
      </mesh>
      {[-0.16, 0, 0.16].map((z) => (
        <mesh
          key={z}
          layers={layer}
          position={[0, 0, z]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <torusGeometry args={[0.074, 0.012, 8, 16]} />
          <MetalMaterial color="#4a504d" ghost={ghost} roughness={0.44} />
        </mesh>
      ))}
    </group>
  )
}

function PoleBand({
  positionY,
  radius,
  ghost,
  layer,
}: {
  positionY: number
  radius: number
  ghost: boolean
  layer: number
}) {
  return (
    <mesh
      castShadow
      layers={layer}
      position={[0, positionY, 0]}
      raycast={ghost ? NO_RAYCAST : undefined}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <torusGeometry args={[radius, 0.016, 8, 28]} />
      <MetalMaterial color="#555a56" ghost={ghost} roughness={0.5} />
    </mesh>
  )
}

function TransformerBushing({
  position,
  scale = 1,
  ghost,
  layer,
}: {
  position: readonly [number, number, number]
  scale?: number
  ghost: boolean
  layer: number
}) {
  return (
    <group layers={layer} position={position} scale={scale}>
      <mesh layers={layer} position={[0, 0.06, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <cylinderGeometry args={[0.052, 0.068, 0.12, 14]} />
        <meshPhysicalMaterial
          clearcoat={0.45}
          color="#50362e"
          depthWrite={!ghost}
          opacity={ghost ? 0.5 : 1}
          roughness={0.25}
          transparent={ghost}
        />
      </mesh>
      <mesh layers={layer} position={[0, 0.115, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <torusGeometry args={[0.052, 0.012, 8, 16]} />
        <meshPhysicalMaterial
          clearcoat={0.45}
          color="#5f4035"
          depthWrite={!ghost}
          opacity={ghost ? 0.5 : 1}
          roughness={0.25}
          transparent={ghost}
        />
      </mesh>
      <mesh layers={layer} position={[0, 0.17, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <cylinderGeometry args={[0.024, 0.024, 0.11, 8]} />
        <MetalMaterial color="#444946" ghost={ghost} />
      </mesh>
    </group>
  )
}

function Transformer({
  color,
  ghost,
  layer,
  position,
}: {
  color: string
  ghost: boolean
  layer: number
  position: readonly [number, number, number]
}) {
  return (
    <group layers={layer} position={position}>
      <mesh castShadow layers={layer} raycast={ghost ? NO_RAYCAST : undefined} receiveShadow>
        <cylinderGeometry args={[0.315, 0.335, 0.84, 28]} />
        <MetalMaterial color={color} ghost={ghost} roughness={0.33} />
      </mesh>
      <mesh layers={layer} position={[0, 0.43, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <cylinderGeometry args={[0.35, 0.33, 0.055, 28]} />
        <MetalMaterial color="#59635f" ghost={ghost} roughness={0.38} />
      </mesh>
      <mesh layers={layer} position={[0, -0.43, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <cylinderGeometry args={[0.33, 0.34, 0.045, 28]} />
        <MetalMaterial color="#535c58" ghost={ghost} roughness={0.42} />
      </mesh>
      <mesh
        layers={layer}
        position={[0, 0.36, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[0.31, 0.017, 8, 28]} />
        <MetalMaterial color="#4d5652" ghost={ghost} />
      </mesh>
      <TransformerBushing ghost={ghost} layer={layer} position={[-0.15, 0.455, 0]} />
      <TransformerBushing ghost={ghost} layer={layer} position={[0.15, 0.455, 0]} scale={0.88} />
      <mesh
        layers={layer}
        position={[0, -0.04, 0.338]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[0.19, 0.24, 0.014]} />
        <meshStandardMaterial
          color="#c4c0aa"
          depthWrite={!ghost}
          metalness={0.55}
          opacity={ghost ? 0.42 : 1}
          roughness={0.46}
          transparent={ghost}
        />
      </mesh>
      <mesh
        layers={layer}
        position={[0.22, -0.44, 0.12]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <cylinderGeometry args={[0.025, 0.03, 0.08, 8]} />
        <MetalMaterial color="#424744" ghost={ghost} />
      </mesh>
    </group>
  )
}

function ProtectiveDevice({
  kind,
  position,
  ghost,
  layer,
}: {
  kind: 'cutout' | 'arrester'
  position: readonly [number, number, number]
  ghost: boolean
  layer: number
}) {
  const bodyColor = kind === 'cutout' ? '#71675a' : '#747a72'
  const height = kind === 'cutout' ? 0.5 : 0.38
  return (
    <group layers={layer} position={position} rotation={[0, 0, kind === 'cutout' ? -0.12 : 0.08]}>
      <mesh castShadow layers={layer} raycast={ghost ? NO_RAYCAST : undefined}>
        <cylinderGeometry args={[0.045, 0.055, height, 12]} />
        <meshPhysicalMaterial
          clearcoat={0.25}
          color={bodyColor}
          depthWrite={!ghost}
          opacity={ghost ? 0.48 : 1}
          roughness={0.38}
          transparent={ghost}
        />
      </mesh>
      {[-0.16, -0.08, 0, 0.08, 0.16]
        .filter((offset) => Math.abs(offset) < height / 2)
        .map((offset) => (
          <mesh key={offset} layers={layer} position={[0, offset, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
            <cylinderGeometry args={[0.077, 0.077, 0.018, 12]} />
            <meshStandardMaterial
              color={bodyColor}
              depthWrite={!ghost}
              opacity={ghost ? 0.48 : 1}
              roughness={0.4}
              transparent={ghost}
            />
          </mesh>
        ))}
      <mesh layers={layer} position={[0, height / 2 + 0.035, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <cylinderGeometry args={[0.025, 0.025, 0.07, 8]} />
        <MetalMaterial color="#414542" ghost={ghost} />
      </mesh>
      <mesh layers={layer} position={[0, -height / 2 - 0.035, 0]} raycast={ghost ? NO_RAYCAST : undefined}>
        <cylinderGeometry args={[0.025, 0.025, 0.07, 8]} />
        <MetalMaterial color="#414542" ghost={ghost} />
      </mesh>
    </group>
  )
}

function JunctionTapRack({
  layout,
  ghost,
  layer,
}: {
  layout: UtilityPoleLayout
  ghost: boolean
  layer: number
}) {
  const tapY = layout.crossarmY - 0.46
  const tapZ = 0.52
  const tapLength = Math.min(layout.crossarmLength * 0.9, 2.15)
  const phasePositions = [
    [-layout.outerPinX, layout.crossarmY + layout.crossarmHeight / 2 + 0.36],
    [0, layout.height + 0.36],
    [layout.outerPinX, layout.crossarmY + layout.crossarmHeight / 2 + 0.36],
  ] as const
  return (
    <group layers={layer}>
      <mesh
        castShadow
        layers={layer}
        position={[0, tapY, tapZ]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[tapLength, 0.1, 0.12]} />
        <WoodMaterial color="#65432c" ghost={ghost} vertexColors />
      </mesh>
      <Rod
        color="#4b524e"
        from={[0, tapY - 0.04, 0]}
        ghost={ghost}
        layer={layer}
        radius={0.022}
        to={[0, tapY - 0.34, tapZ]}
      />
      {phasePositions.map(([x, y]) => (
        <Rod
          key={`jumper:${x}`}
          color="#3e4642"
          from={[x, y, 0]}
          ghost={ghost}
          layer={layer}
          radius={0.014}
          to={[x, tapY - 0.24, tapZ]}
        />
      ))}
      {[-tapLength * 0.35, 0, tapLength * 0.35].map((x) => (
        <ProtectiveDevice
          key={x}
          ghost={ghost}
          kind="cutout"
          layer={layer}
          position={[x, tapY - 0.24, tapZ]}
        />
      ))}
    </group>
  )
}

export function UtilityPoleModel({
  node,
  ghost = false,
  layer = 0,
}: {
  node: UtilityPoleNode
  ghost?: boolean
  layer?: number
}) {
  const layout = useMemo(
    () => resolveUtilityPoleLayout(node),
    [node.height, node.crossarmLength],
  )
  const poleGeometry = useMemo(() => buildPoleGeometry(layout), [layout])
  const crossarmGeometry = useMemo(() => buildCrossarmGeometry(layout), [layout])
  const insulatorGeometry = useMemo(buildInsulatorGeometry, [])
  useEffect(
    () => () => {
      poleGeometry.dispose()
      crossarmGeometry.dispose()
    },
    [poleGeometry, crossarmGeometry],
  )
  useEffect(() => () => insulatorGeometry.dispose(), [insulatorGeometry])

  const woodColor = node.woodColor ?? '#765033'
  const transformerColor = node.transformerColor ?? '#66716d'
  const outsidePinY = layout.crossarmY + layout.crossarmHeight / 2
  const braceZ = layout.crossarmDepth * 0.56
  const armEndCapX = layout.crossarmLength / 2 + 0.006
  const transformerBandRadius =
    layout.poleTopRadius +
    (layout.poleBottomRadius - layout.poleTopRadius) *
      (1 - layout.transformerY / layout.height)

  return (
    <group layers={layer}>
      <mesh
        castShadow
        geometry={poleGeometry}
        layers={layer}
        position={[0, layout.height / 2, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <WoodMaterial color={woodColor} ghost={ghost} vertexColors />
      </mesh>

      <mesh
        castShadow
        geometry={crossarmGeometry}
        layers={layer}
        position={[0, layout.crossarmY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <WoodMaterial color="#704a30" ghost={ghost} vertexColors />
      </mesh>
      {[-armEndCapX, armEndCapX].map((x) => (
        <mesh
          key={x}
          layers={layer}
          position={[x, layout.crossarmY, 0]}
          raycast={ghost ? NO_RAYCAST : undefined}
        >
          <boxGeometry args={[0.015, layout.crossarmHeight * 0.82, layout.crossarmDepth * 0.82]} />
          <WoodMaterial color="#4f321f" ghost={ghost} />
        </mesh>
      ))}

      {[-1, 1].flatMap((side) =>
        [-1, 1].map((depthSide) => (
          <Rod
            key={`${side}:${depthSide}`}
            color="#555b57"
            from={[
              side * layout.crossarmLength * 0.32,
              layout.crossarmY - 0.045,
              depthSide * braceZ,
            ]}
            ghost={ghost}
            layer={layer}
            radius={0.017}
            to={[0, layout.crossarmY - 0.88, depthSide * braceZ]}
          />
        )),
      )}

      {node.assembly === 'dead-end' ? (
        <>
          <StrainInsulator
            geometry={insulatorGeometry}
            ghost={ghost}
            layer={layer}
            position={[-layout.outerPinX, outsidePinY, 0]}
          />
          <StrainInsulator
            geometry={insulatorGeometry}
            ghost={ghost}
            layer={layer}
            position={[layout.outerPinX, outsidePinY, 0]}
          />
          <StrainInsulator
            geometry={insulatorGeometry}
            ghost={ghost}
            layer={layer}
            position={[0, layout.height, 0]}
          />
        </>
      ) : (
        <>
          <PinInsulator
            geometry={insulatorGeometry}
            ghost={ghost}
            layer={layer}
            position={[-layout.outerPinX, outsidePinY, 0]}
          />
          <PinInsulator
            geometry={insulatorGeometry}
            ghost={ghost}
            layer={layer}
            position={[layout.outerPinX, outsidePinY, 0]}
          />
          <PinInsulator
            geometry={insulatorGeometry}
            ghost={ghost}
            layer={layer}
            position={[0, layout.height, 0]}
          />
        </>
      )}

      <mesh
        castShadow
        layers={layer}
        position={[0, layout.neutralCrossarmY, 0.12]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow
      >
        <boxGeometry args={[0.72, 0.09, 0.1]} />
        <WoodMaterial color="#704a30" ghost={ghost} vertexColors />
      </mesh>
      <Rod
        color="#555b57"
        from={[0, layout.neutralCrossarmY - 0.04, 0]}
        ghost={ghost}
        layer={layer}
        radius={0.015}
        to={[0, layout.neutralCrossarmY - 0.5, 0]}
      />
      <PinInsulator
        geometry={insulatorGeometry}
        ghost={ghost}
        layer={layer}
        position={[0, layout.neutralCrossarmY, 0.12]}
      />

      {node.assembly === 'junction' && (
        <JunctionTapRack ghost={ghost} layer={layer} layout={layout} />
      )}

      {(node.assembly === 'small-angle' || node.assembly === 'dead-end') && (
        <>
          <Rod
            color={node.assembly === 'dead-end' ? '#353c38' : '#7b847f'}
            from={[0, layout.crossarmY - 0.55, 0]}
            ghost={ghost}
            layer={layer}
            radius={node.assembly === 'dead-end' ? 0.022 : 0.016}
            to={[0, 0.08, node.assembly === 'dead-end' ? -3.8 : -2.05]}
          />
          <mesh
            castShadow
            layers={layer}
            position={[0, 0.08, node.assembly === 'dead-end' ? -3.8 : -2.05]}
            raycast={ghost ? NO_RAYCAST : undefined}
          >
            <boxGeometry
              args={
                node.assembly === 'dead-end'
                  ? [0.52, 0.11, 0.24]
                  : [0.24, 0.06, 0.14]
              }
            />
            <MetalMaterial color="#4b514d" ghost={ghost} roughness={0.52} />
          </mesh>
          {node.assembly === 'small-angle' && (
            <Rod
              color="#7b847f"
              from={[layout.outerPinX * 0.72, layout.crossarmY - 0.12, 0.02]}
              ghost={ghost}
              layer={layer}
              radius={0.026}
              to={[layout.outerPinX * 0.34, layout.crossarmY - 0.94, -0.08]}
            />
          )}
        </>
      )}

      {[-layout.outerPinX, 0, layout.outerPinX].map((x) => (
        <HardwareBolt
          key={x}
          ghost={ghost}
          layer={layer}
          position={[x, layout.crossarmY, layout.crossarmDepth / 2 + 0.023]}
        />
      ))}

      <mesh
        layers={layer}
        position={[0, layout.height * 0.36, layout.poleBottomRadius + 0.012]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[0.1, 0.19, 0.012]} />
        <MetalMaterial color="#a6a796" ghost={ghost} roughness={0.52} />
      </mesh>
      <mesh
        layers={layer}
        position={[layout.poleBottomRadius * 0.84, layout.height * 0.51, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        rotation={[0, Math.PI / 2, 0]}
      >
        <circleGeometry args={[0.055, 16]} />
        <meshStandardMaterial
          color="#3f281b"
          depthWrite={!ghost}
          opacity={ghost ? 0.3 : 0.72}
          roughness={1}
          transparent
        />
      </mesh>

      {node.transformerMounted !== false && (
        <>
          <PoleBand
            ghost={ghost}
            layer={layer}
            positionY={layout.transformerY + 0.34}
            radius={transformerBandRadius + 0.012}
          />
          <PoleBand
            ghost={ghost}
            layer={layer}
            positionY={layout.transformerY - 0.34}
            radius={transformerBandRadius + 0.02}
          />
          <Rod
            color="#4c514e"
            from={[-0.43, layout.transformerY + 0.3, layout.poleBottomRadius * 0.74]}
            ghost={ghost}
            layer={layer}
            radius={0.022}
            to={[0.43, layout.transformerY + 0.3, layout.poleBottomRadius * 0.74]}
          />
          <Rod
            color="#4c514e"
            from={[-0.43, layout.transformerY - 0.3, layout.poleBottomRadius * 0.74]}
            ghost={ghost}
            layer={layer}
            radius={0.022}
            to={[0.43, layout.transformerY - 0.3, layout.poleBottomRadius * 0.74]}
          />
          <Transformer
            color={transformerColor}
            ghost={ghost}
            layer={layer}
            position={[0, layout.transformerY, layout.poleBottomRadius + 0.34]}
          />
          <Rod
            color="#555a56"
            from={[-0.6, layout.crossarmY - 0.7, layout.poleTopRadius + 0.08]}
            ghost={ghost}
            layer={layer}
            radius={0.018}
            to={[0.6, layout.crossarmY - 0.7, layout.poleTopRadius + 0.08]}
          />
          <ProtectiveDevice
            ghost={ghost}
            kind="cutout"
            layer={layer}
            position={[0.42, layout.crossarmY - 1.02, layout.poleTopRadius + 0.12]}
          />
          <ProtectiveDevice
            ghost={ghost}
            kind="arrester"
            layer={layer}
            position={[-0.4, layout.crossarmY - 0.94, layout.poleTopRadius + 0.12]}
          />
        </>
      )}
    </group>
  )
}
