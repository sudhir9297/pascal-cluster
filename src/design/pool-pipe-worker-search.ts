import type { NodePort, PipeFittingNode } from '@pascal-app/core'
import { Euler, Quaternion, Vector3 } from 'three'
import type { serializePoolPipeInput } from '../editor/pool-pipe-plan'
import { searchPoolPipeLayout } from './pool-pipe-search'

export function searchSerializedPoolPipes(input: ReturnType<typeof serializePoolPipeInput>) {
  const fittingPorts = (node: PipeFittingNode): NodePort[] => {
    const rotation = new Quaternion().setFromEuler(new Euler(...node.rotation))
    const position = new Vector3(...node.position)
    const template = input.templates[node.fittingType]
    if (!template) throw new Error(`Unsupported pipe fitting: ${node.fittingType}`)
    return template.map(port => ({ ...port, nodeId: node.id,
      position: new Vector3(...port.position).applyQuaternion(rotation).add(position).toArray() as [number, number, number],
      direction: new Vector3(...port.direction).applyQuaternion(rotation).toArray() as [number, number, number],
    }))
  }
  const existing = input.existing.map(v => ({ ...v, a: new Vector3(...v.a), b: new Vector3(...v.b), sockets: v.sockets.map(p => new Vector3(...p)) }))
  return searchPoolPipeLayout(input.pool, input.ports, input.options, fittingPorts, existing)
}
