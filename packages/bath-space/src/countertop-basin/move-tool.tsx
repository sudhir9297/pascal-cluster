'use client'
import type { AnyNode } from '@pascal-app/core'
import BasinTool from './tool'
import { BasinNode, UNDERMOUNT_BASIN, DROP_IN_BASIN, SEMI_RECESSED_BASIN } from './schema'
export default function BasinMoveTool({ node }: { node: AnyNode }) {
  const basin = BasinNode.parse(node)
  return <BasinTool existing={basin} undermount={basin.type === UNDERMOUNT_BASIN} dropIn={basin.type === DROP_IN_BASIN} semiRecessed={basin.type === SEMI_RECESSED_BASIN} />
}
