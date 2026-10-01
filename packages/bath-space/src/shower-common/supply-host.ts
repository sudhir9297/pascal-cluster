import {BATH_SHOWER,BathShowerNode,bathShowerAssembly} from '../bath-shower/schema'
import { SHOWER_ASSEMBLY, ShowerAssemblyNode } from '../shower-assembly/schema'
import { assemblySockets } from '../shower-assembly/targets'
import { WALL_SPOUT, WallSpoutNode } from '../wall-spout/schema'
import { wallSpoutSockets } from '../wall-spout/targets'
import { getEffectiveNode, type AnyNode } from '@pascal-app/core'
import { SHOWER_MOUNT, ShowerMountNode } from '../shower-mount/schema'
import { showerMountSockets } from '../shower-mount/targets'
import { SHOWER_CONTROL, ShowerControlNode } from '../shower-control/schema'
import { showerControlSockets } from '../shower-control/targets'
import {SHOWER_CONNECTOR,ShowerConnectorNode} from '../shower-connector/schema'
import {connectorSocket} from '../shower-connector/geometry'
export function showerSupplyHost(raw: AnyNode) {
  const type = String(raw.type)
  if(type===SHOWER_CONNECTOR) {
    const node=ShowerConnectorNode.parse(getEffectiveNode(raw))
    return node.outletType==='hose'?{node,slots:[connectorSocket(node)]}:null
  }
  if (type === SHOWER_ASSEMBLY || type===BATH_SHOWER) {
    const node = type===BATH_SHOWER?bathShowerAssembly(BathShowerNode.parse(getEffectiveNode(raw))):ShowerAssemblyNode.parse(getEffectiveNode(raw))
    return { node, slots: assemblySockets(node) }
  }
  if (type === SHOWER_MOUNT) {
    const node = ShowerMountNode.parse(getEffectiveNode(raw))
    return { node, slots: showerMountSockets(node) }
  }
  if (type === SHOWER_CONTROL) {
    const node = ShowerControlNode.parse(getEffectiveNode(raw))
    return { node, slots: showerControlSockets(node) }
  }
  if (type === WALL_SPOUT) {
    const node = WallSpoutNode.parse(getEffectiveNode(raw))
    return { node, slots: wallSpoutSockets(node) }
  }
  return null
}
