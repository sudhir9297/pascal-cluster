import type { AnyNode, AnyNodeId, ParametricDescriptor } from '@pascal-app/core'
import type { RoadNetworkNode, StreetLightNode } from './schema'

export const streetLightParametrics: ParametricDescriptor<StreetLightNode> = {
  groups: [
    {
      label: 'Street light',
      fields: [
        { key: 'height', kind: 'number', unit: 'm', min: 0.5, max: 30, step: 0.25 },
        { key: 'armLength', kind: 'number', unit: 'm', min: 0.3, max: 3, step: 0.1 },
        { key: 'poleColor', kind: 'color' },
      ],
    },
    {
      label: 'Lamp',
      fields: [
        { key: 'lightOn', kind: 'boolean' },
        { key: 'lightColor', kind: 'color', visibleIf: (n) => n.lightOn },
        {
          key: 'intensity',
          kind: 'number',
          min: 0,
          max: 5000,
          step: 100,
          visibleIf: (n) => n.lightOn,
        },
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
