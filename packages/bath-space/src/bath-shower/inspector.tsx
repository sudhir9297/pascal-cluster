'use client'
import ShowerAssemblyInspector from '../shower-assembly/inspector'
import { type BathShowerNode, bathShowerAssembly } from './schema'
export default function BathShowerInspector({ node }: { node: BathShowerNode }) {
  return <ShowerAssemblyInspector node={bathShowerAssembly(node)} />
}
