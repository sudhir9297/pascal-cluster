'use client'
import type { HalfPedestalBasinNode } from '../countertop-basin/schema'
import WallBasinTool from '../wall-hung-basin/tool'
export default function HalfPedestalTool({ node }: { node?: HalfPedestalBasinNode }) { return <WallBasinTool node={node} halfPedestal /> }
