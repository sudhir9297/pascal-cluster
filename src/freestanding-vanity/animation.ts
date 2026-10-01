import type { Object3D } from 'three'
import type { VanityNode } from './schema'
import { vanityPartOpening } from './layout'

type VanityPose =
  | { kind: 'drawer'; id: string; closedZ: number; travel: number }
  | { kind: 'door'; id: string; direction: number }

export function poseVanityMovingParts(root: Object3D, node: VanityNode) {
  root.traverse((part) => {
    const pose = part.userData.vanityPose as VanityPose | undefined
    if (!pose) return
    const progress = vanityPartOpening(node, pose)
    if (pose.kind === 'drawer') part.position.z = pose.closedZ - (part.userData.basinBlocked ? 0 : progress) * pose.travel
    else part.rotation.y = pose.direction * (part.userData.basinBlocked ? 0 : progress) * Math.PI / 2
  })
}
