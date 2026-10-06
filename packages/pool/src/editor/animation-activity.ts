'use client'

import { useViewer } from '@pascal-app/viewer'
import { useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'

/** All pool effects pause for hidden documents and interactive editor drags. */
export function usePoolAnimationActivity() {
  const dragging = useViewer(state => state.inputDragging)
  const invalidate = useThree(state => state.invalidate)
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden')
  useEffect(() => {
    const update = () => {
      setVisible(document.visibilityState !== 'hidden')
      if (document.visibilityState !== 'hidden') invalidate()
    }
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [invalidate])
  return visible && !dragging
}
