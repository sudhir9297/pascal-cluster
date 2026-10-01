'use client'
import type { SceneApi } from '@pascal-app/core'
import WallBasinSystem from '../wall-hung-basin/system'
export default function FullPedestalSystem({ sceneApi }: { sceneApi: SceneApi }) { return <WallBasinSystem sceneApi={sceneApi} pedestal /> }
