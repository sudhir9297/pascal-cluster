'use client'

import { useEffect, useMemo } from 'react'
import { DoubleSide, FrontSide, SRGBColorSpace, TextureLoader } from 'three'
import {
  buildRoadSignBackGeometry,
  buildRoadSignPlateGeometry,
  resolveRoadSignLayout,
  resolveRoadSignBracketWidth,
  resolveRoadSignPostPositions,
  ROAD_SIGN_BACK_FACE_GAP_M,
  ROAD_SIGN_BRACKET_DEPTH_M,
  ROAD_SIGN_BRACKET_HEIGHT_M,
  ROAD_SIGN_FACE_GRAPHIC_GAP_M,
  ROAD_SIGN_POST_DEPTH_M,
  ROAD_SIGN_POST_THICKNESS_M,
  ROAD_SIGN_POST_WIDTH_M,
} from './road-sign-geometry'
import { getRoadSignConfig, roadSignGraphicDataUri } from './road-sign-config'
import type { RoadSignNode } from './schema'

const NO_RAYCAST = () => {}

function SignMetalMaterial({ color, ghost }: { color: string; ghost: boolean }) {
  return (
    <meshStandardMaterial
      color={color}
      depthWrite={!ghost}
      metalness={0.52}
      opacity={ghost ? 0.5 : 1}
      roughness={0.38}
      side={DoubleSide}
      transparent={ghost}
    />
  )
}

function RoadSignPost({
  ghost,
  layer,
  layout,
  postColor,
  x,
}: {
  ghost: boolean
  layer: number
  layout: ReturnType<typeof resolveRoadSignLayout>
  postColor: string
  x: number
}) {
  const postCenterZ = -(layout.plateThickness / 2 + 0.0005 + ROAD_SIGN_POST_DEPTH_M / 2)
  const commonProps = {
    castShadow: !ghost,
    layers: layer,
    raycast: ghost ? NO_RAYCAST : undefined,
    receiveShadow: !ghost,
  }

  if (layout.postStyle === 'round') {
    return (
      <mesh {...commonProps} position={[x, layout.postTopY / 2, postCenterZ]}>
        <cylinderGeometry key="post-geometry" args={[layout.postRadius, layout.postRadius * 1.08, layout.postTopY, 16]} />
        <SignMetalMaterial color={postColor} ghost={ghost} key="post-material" />
      </mesh>
    )
  }

  const postFlangeX = ROAD_SIGN_POST_WIDTH_M / 2 - ROAD_SIGN_POST_THICKNESS_M / 2
  const webZ = postCenterZ + ROAD_SIGN_POST_DEPTH_M / 2 - ROAD_SIGN_POST_THICKNESS_M / 2
  return (
    <group layers={layer}>
      <mesh {...commonProps} key="web" position={[x, layout.postTopY / 2, webZ]}>
        <boxGeometry
          key="web-geometry"
          args={[ROAD_SIGN_POST_WIDTH_M, layout.postTopY, ROAD_SIGN_POST_THICKNESS_M]}
        />
        <SignMetalMaterial color={postColor} ghost={ghost} key="web-material" />
      </mesh>
      <mesh {...commonProps} key="flange-left" position={[x - postFlangeX, layout.postTopY / 2, postCenterZ]}>
        <boxGeometry
          key="flange-left-geometry"
          args={[ROAD_SIGN_POST_THICKNESS_M, layout.postTopY, ROAD_SIGN_POST_DEPTH_M]}
        />
        <SignMetalMaterial color={postColor} ghost={ghost} key="flange-left-material" />
      </mesh>
      <mesh {...commonProps} key="flange-right" position={[x + postFlangeX, layout.postTopY / 2, postCenterZ]}>
        <boxGeometry
          key="flange-right-geometry"
          args={[ROAD_SIGN_POST_THICKNESS_M, layout.postTopY, ROAD_SIGN_POST_DEPTH_M]}
        />
        <SignMetalMaterial color={postColor} ghost={ghost} key="flange-right-material" />
      </mesh>
    </group>
  )
}

export function RoadSignModel({
  node,
  ghost = false,
  layer = 0,
}: {
  node: RoadSignNode
  ghost?: boolean
  layer?: number
}) {
  const layout = useMemo(() => resolveRoadSignLayout(node), [node.mounting, node.postHeight, node.scale, node.signId])
  const config = getRoadSignConfig(node.signId)
  const plateGeometry = useMemo(() => buildRoadSignPlateGeometry(layout), [layout])
  const backGeometry = useMemo(() => buildRoadSignBackGeometry(layout), [layout])
  const graphicUri = useMemo(
    () => roadSignGraphicDataUri({ signId: node.signId, text: node.text, width: layout.width, height: layout.height }),
    [layout.height, layout.width, node.signId, node.text],
  )
  const graphicTexture = useMemo(() => {
    const texture = new TextureLoader().load(graphicUri)
    texture.colorSpace = SRGBColorSpace
    return texture
  }, [graphicUri])

  useEffect(
    () => () => {
      plateGeometry.dispose()
      backGeometry.dispose()
      graphicTexture.dispose()
    },
    [backGeometry, graphicTexture, plateGeometry],
  )

  const postPositions = resolveRoadSignPostPositions(layout)
  const bracketWidth = resolveRoadSignBracketWidth(layout)
  const bracketY = layout.signBottomY + layout.height * 0.18
  const bracketZ = -(layout.plateThickness / 2 + ROAD_SIGN_BRACKET_DEPTH_M / 2)
  const fastenerX = [-bracketWidth * 0.34, bracketWidth * 0.34]
  return (
    <group layers={layer}>
      {postPositions.map((x, index) => (
        <RoadSignPost
          ghost={ghost}
          key={`road-sign-post-${index}`}
          layer={layer}
          layout={layout}
          postColor={node.postColor ?? '#687177'}
          x={x}
        />
      ))}

      <mesh
        castShadow={!ghost}
        geometry={plateGeometry}
        layers={layer}
        position={[0, layout.signCenterY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
        receiveShadow={!ghost}
      >
        <meshStandardMaterial
          color={config.backgroundColor}
          depthWrite={!ghost}
          metalness={0.34}
          opacity={ghost ? 0.54 : 1}
          roughness={0.42}
          side={DoubleSide}
          transparent={ghost}
        />
      </mesh>

      <mesh
        geometry={backGeometry}
        layers={layer}
        position={[0, layout.signCenterY, 0]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <SignMetalMaterial color={node.backColor ?? '#747d83'} ghost={ghost} />
      </mesh>

      <mesh
        layers={layer}
        position={[0, layout.signCenterY, layout.plateThickness / 2 + ROAD_SIGN_FACE_GRAPHIC_GAP_M]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <planeGeometry args={[layout.width, layout.height]} />
        <meshStandardMaterial
          alphaTest={0.02}
          color="#ffffff"
          depthWrite={false}
          map={graphicTexture}
          opacity={ghost ? 0.58 : 1}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
          roughness={0.42}
          side={FrontSide}
          transparent
        />
      </mesh>

      <mesh
        layers={layer}
        position={[0, bracketY, bracketZ]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[bracketWidth, ROAD_SIGN_BRACKET_HEIGHT_M, ROAD_SIGN_BRACKET_DEPTH_M]} />
        <SignMetalMaterial color={node.postColor ?? '#687177'} ghost={ghost} />
      </mesh>

      <mesh
        layers={layer}
        position={[0, bracketY, bracketZ - ROAD_SIGN_BRACKET_DEPTH_M / 2 - 0.004]}
        raycast={ghost ? NO_RAYCAST : undefined}
      >
        <boxGeometry args={[0.08, ROAD_SIGN_BRACKET_HEIGHT_M * 1.35, 0.012]} />
        <SignMetalMaterial color={node.postColor ?? '#687177'} ghost={ghost} />
      </mesh>

      {fastenerX.map((x, index) => (
        <group key={`fastener-${index}`} layers={layer}>
          <mesh
            layers={layer}
            position={[x, bracketY, bracketZ - ROAD_SIGN_BRACKET_DEPTH_M / 2 - ROAD_SIGN_BACK_FACE_GAP_M]}
            raycast={ghost ? NO_RAYCAST : undefined}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.024, 0.024, 0.006, 12]} />
            <SignMetalMaterial color={node.backColor ?? '#747d83'} ghost={ghost} />
          </mesh>
          <mesh
            layers={layer}
            position={[x, bracketY, bracketZ - ROAD_SIGN_BRACKET_DEPTH_M / 2 - 0.012]}
            raycast={ghost ? NO_RAYCAST : undefined}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[0.012, 0.012, 0.014, 8]} />
            <SignMetalMaterial color={node.postColor ?? '#687177'} ghost={ghost} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
