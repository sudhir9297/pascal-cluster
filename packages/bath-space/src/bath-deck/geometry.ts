import type { AnyNode, GeometryContext } from '@pascal-app/core'
import { createDefaultMaterial, resolveMaterialRef } from '@pascal-app/viewer'
import { BoxGeometry, ExtrudeGeometry, Group, Mesh, Path, Shape } from 'three'
import { BathtubNode, BATHTUB, bathUsesDeck, bathRimWidth } from '../bathtub/schema'
import { bathtubOutline } from '../bathtub/geometry'
import { BathDeckNode } from './schema'

export function deckBaths(node: BathDeckNode, children: readonly AnyNode[]) {
  return children.filter(raw => String(raw.type) === BATHTUB && raw.parentId === node.id).map(raw => BathtubNode.parse(raw)).filter(bath => bathUsesDeck(bath))
}
export function deckOpening(bath: BathtubNode) {
  const c = Math.cos(bath.rotation), s = Math.sin(bath.rotation)
  const inset = bath.shape === 'undermount' ? bathRimWidth(bath) * 2 - 0.006 : 0.02
  return bathtubOutline({ ...bath, length: bath.length - inset, width: bath.width - inset }).map(([x,z]) => [bath.position[0] + x*c + z*s, bath.position[2] - x*s + z*c] as [number,number])
}
export function deckBathFits(deck: BathDeckNode, bath: BathtubNode) {
  return deckOpening(bath).every(([x,z]) => Math.abs(x) <= deck.length / 2 - 0.05 && Math.abs(z) <= deck.width / 2 - 0.05)
}
export function deckSurfaceGeometry(node: BathDeckNode, children: readonly AnyNode[] = []) {
  const shape = new Shape()
  shape.moveTo(-node.length/2,-node.width/2); shape.lineTo(node.length/2,-node.width/2)
  shape.lineTo(node.length/2,node.width/2); shape.lineTo(-node.length/2,node.width/2); shape.closePath()
  for (const bath of deckBaths(node, children).filter(bath => deckBathFits(node,bath))) {
    const hole = new Path(), points = deckOpening(bath)
    hole.moveTo(points[0]![0], -points[0]![1])
    for (const [x,z] of points.slice(1)) hole.lineTo(x,-z)
    hole.closePath(); shape.holes.push(hole)
  }
  const geometry = new ExtrudeGeometry(shape, { depth: node.thickness, bevelEnabled: false, steps: 1 })
  geometry.rotateX(-Math.PI/2)
  return geometry
}
export function buildBathDeckGeometry(raw: BathDeckNode, ctx?: GeometryContext) {
  const node = BathDeckNode.parse(raw), root = new Group()
  const add = (name: string, geometry: BoxGeometry | ExtrudeGeometry, slot: string) => {
    const material = (node.slots?.[slot] ? resolveMaterialRef(node.slots[slot]!,ctx?.materials,'rendered') : null) ?? createDefaultMaterial('#e8e3d9',0.35,'rendered')
    const mesh = new Mesh(geometry,material); mesh.name = name; mesh.userData = {slotId:slot,__fromGeometry:true}; mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); return mesh
  }
  add('bath-deck-surface',deckSurfaceGeometry(node,ctx?.children),'deck').position.y = node.height-node.thickness
  if(node.enclosure) {
    const h=node.height-node.thickness,t=0.025
    for(const sign of [-1,1]) {
      add('bath-deck-front-back',new BoxGeometry(node.length,h,t),'enclosure').position.set(0,h/2,sign*(node.width-t)/2)
      add('bath-deck-end',new BoxGeometry(t,h,node.width-t*2),'enclosure').position.set(sign*(node.length-t)/2,h/2,0)
    }
  }
  return root
}
