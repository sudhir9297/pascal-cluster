'use client'
import type { FullPedestalBasinNode } from '../countertop-basin/schema'
import WallBasinTool from '../wall-hung-basin/tool'
export default function FullPedestalTool({ node }: { node?: FullPedestalBasinNode }) { return <WallBasinTool node={node} pedestal /> }
