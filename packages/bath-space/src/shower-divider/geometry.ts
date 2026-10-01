import type { GeometryContext } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import {
  BoxGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  type BufferGeometry,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { dividerLayout, ShowerDividerNode } from './schema'

export function buildShowerDividerGeometry(
  raw: ShowerDividerNode,
  ctx?: GeometryContext,
) {
  const n = ShowerDividerNode.parse(raw),
    root = new Group()
  const framePieces: BufferGeometry[] = []
  const { frame, bar, innerWidth, innerHeight } = dividerLayout(n)
  const material = (slot: string) =>
    n.slots?.[slot]
      ? resolveMaterialRef(n.slots[slot]!, ctx?.materials, 'rendered')
      : null
  const frameMaterial =
    material('frame') ?? createDefaultMaterial('#ffffff', 0.25, 'rendered')
  const glassMaterial =
    material('glass') ??
    new MeshPhysicalMaterial({
      color: '#d9f3fa',
      roughness: 0.08,
      transparent: true,
      opacity: 0.28,
      transmission: 0.45,
      thickness: n.glassThickness,
      side: DoubleSide,
      depthWrite: false,
    })
  const box = (
    name: string,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    slot = 'frame',
  ) => {
    const geometry = new BoxGeometry(width, height, depth)
    // BoxGeometry uses normalized UVs; map each face in metres for the paint tool.
    const uv = geometry.getAttribute('uv')
    for (let i = 0; i < uv.count; i++) {
      const face = Math.floor(i / 4)
      uv.setXY(
        i,
        uv.getX(i) * (face < 2 ? depth : width),
        uv.getY(i) * (face === 2 || face === 3 ? depth : height),
      )
    }
    if (slot === 'frame') {
      geometry.translate(x, y, 0)
      framePieces.push(geometry)
      return
    }
    const mesh = new Mesh(geometry, glassMaterial)
    mesh.name = name
    mesh.position.set(x, y, 0)
    mesh.userData = { slotId: slot, __fromGeometry: true }
    mesh.castShadow = slot !== 'glass'
    mesh.receiveShadow = true
    root.add(mesh)
  }
  box(
    'divider-glass',
    innerWidth,
    innerHeight,
    n.glassThickness,
    0,
    n.height / 2,
    'glass',
  )
  for (const side of [-1, 1])
    box(
      'divider-side-frame',
      frame,
      n.height,
      n.frameDepth,
      (side * (n.width - frame)) / 2,
      n.height / 2,
    )
  for (const y of [frame / 2, n.height - frame / 2])
    box('divider-horizontal-frame', innerWidth, frame, n.frameDepth, 0, y)
  for (let i = 1; i < n.columns; i++)
    box(
      'divider-mullion',
      bar,
      innerHeight,
      n.frameDepth,
      -innerWidth / 2 + (innerWidth * i) / n.columns,
      n.height / 2,
    )
  for (let i = 1; i < n.rows; i++)
    box(
      'divider-transom',
      innerWidth,
      bar,
      n.frameDepth,
      0,
      frame + (innerHeight * i) / n.rows,
    )
  // All bars share one paint slot, so render them in one draw rather than one per bar.
  const frameGeometry = mergeGeometries(framePieces, false)!
  for (const piece of framePieces) piece.dispose()
  const frameMesh = new Mesh(frameGeometry, frameMaterial)
  frameMesh.name = 'divider-frame'
  frameMesh.userData = { slotId: 'frame', __fromGeometry: true }
  frameMesh.castShadow = true
  frameMesh.receiveShadow = true
  root.add(frameMesh)
  return root
}
