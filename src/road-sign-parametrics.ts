import type { AnyNode, AnyNodeId, ParametricDescriptor } from '@pascal-app/core'
import { ROAD_SIGN_IDS } from './road-sign-config'
import type { RoadNetworkNode, RoadSignNode } from './schema'
import RoadSignTextEditor from './road-sign-text-editor'

export const roadSignParametrics: ParametricDescriptor<RoadSignNode> = {
  groups: [
    {
      label: 'Sign',
      fields: [
        { key: 'signId', kind: 'enum', options: ROAD_SIGN_IDS, display: 'select' },
        {
          key: 'text-editor',
          kind: 'custom',
          component: RoadSignTextEditor,
          visibleIf: (node) => ['speed-limit', 'directional', 'stop', 'yield', 'warning', 'no-parking'].includes(node.signId),
        },
        { key: 'scale', kind: 'number', min: 0.5, max: 2.5, step: 0.05 },
        { key: 'mounting', kind: 'enum', options: ['single-post', 'double-post'], display: 'segmented' },
      ],
    },
    {
      label: 'Mounting',
      fields: [
        { key: 'postHeight', kind: 'number', unit: 'm', min: 1.2, max: 4.5, step: 0.05 },
        { key: 'postColor', kind: 'color' },
        { key: 'backColor', kind: 'color' },
      ],
    },
    {
      label: 'Position',
      fields: [{ key: 'position', kind: 'vec3' }],
    },
  ],
  onDelete: (node, nodes) => {
    const ref = node.roadAttachment
    if (!ref) return []
    const road = nodes[ref.networkNodeId as AnyNodeId] as unknown as RoadNetworkNode | undefined
    const attachment = road?.attachments?.[ref.attachmentId]
    if (!road || !attachment) return []
    const { [ref.attachmentId]: _removed, ...attachments } = road.attachments
    return [{
      id: road.id as AnyNodeId,
      data: {
        attachments,
        ...(attachment.generatedKey
          ? {
              roadsideDecorationSuppressed: {
                ...(road.roadsideDecorationSuppressed ?? {}),
                [attachment.generatedKey]: true,
              },
            }
          : null),
      } as Partial<AnyNode>,
    }]
  },
}
