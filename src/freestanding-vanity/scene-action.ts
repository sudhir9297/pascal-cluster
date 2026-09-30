import type { AnyNodeId, SceneActionCapability } from '@pascal-app/core'
import { toggleVanityOpening } from './interaction'
import { useViewer } from '@pascal-app/viewer'

export const vanitySceneAction: SceneActionCapability = {
  resolveTarget: (object) => {
    const pose = object.userData.vanityPose as { id?: unknown; kind?: unknown } | undefined
    return pose && typeof pose.id === 'string' && (pose.kind === 'drawer' || pose.kind === 'door') ? pose.id : null
  },
  activate: (node, target) => {
    if (typeof target !== 'string' || !toggleVanityOpening(node.id as AnyNodeId, target)) return false
    useViewer.getState().setSelection({ selectedIds: [node.id] })
    return true
  },
}
