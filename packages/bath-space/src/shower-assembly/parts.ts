import { BodyJetNode } from '../body-jet/schema'
import { WallSpoutNode } from '../wall-spout/schema'
import { type ShowerAssemblyNode } from './schema'
export function assemblyJet(n: ShowerAssemblyNode) {
  return BodyJetNode.parse({
    style:
      n.jetShape === 'rectangle'
        ? 'slim-rectangle'
        : n.jetShape === 'square'
          ? 'square-swivel'
          : 'round-swivel',
    width: Math.min(n.jetSize, (n.height * 0.32) / Math.max(1, n.jets - 1) - 0.012),
    height:
      n.jetShape === 'rectangle'
        ? Math.max(
            0.04,
            Math.min(n.jetSize, (n.height * 0.32) / Math.max(1, n.jets - 1) - 0.012) * 0.7,
          )
        : Math.min(n.jetSize, (n.height * 0.32) / Math.max(1, n.jets - 1) - 0.012),
    pitch: n.jetTilt,
    projection: 0.012,
    flangeEnabled: false,
  })
}
export const assemblyJetHeight = (n: ShowerAssemblyNode, i: number) =>
  n.height * (0.46 + (i * 0.32) / Math.max(1, n.jets - 1))
export function assemblySpout(n: ShowerAssemblyNode) {
  return WallSpoutNode.parse({
    style: n.profile === 'square' ? 'square-straight' : 'round-curved',
    length: 0.16,
    drop: 0.045,
    tubeSize: n.tubeSize,
    flangeEnabled: false,
    slots: n.slots,
  })
}

export const assemblySurface = (n: ShowerAssemblyNode, y: number) =>
  (n.family === 'panel' ? n.depth : n.projection) +
  (n.family === 'panel' && n.profile === 'curved' ? 0.14 * (y / n.height) * (1 - y / n.height) : 0)
