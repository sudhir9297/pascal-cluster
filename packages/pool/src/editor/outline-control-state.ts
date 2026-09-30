import { create } from 'zustand'

// Editing preferences are transient; geometry and exported scenes are unaffected.
export const usePoolOutlineControls = create<{
  nodeId: string | null
  focusedIndex: number | null
  showAll: boolean
  focus: (nodeId: string, index: number | null) => void
  setShowAll: (nodeId: string, showAll: boolean) => void
}>((set) => ({
  nodeId: null, focusedIndex: null, showAll: false,
  focus: (nodeId, focusedIndex) => set((state) => ({ nodeId, focusedIndex, showAll: state.nodeId === nodeId && state.showAll })),
  setShowAll: (nodeId, showAll) => set((state) => ({ nodeId, showAll, focusedIndex: state.nodeId === nodeId ? state.focusedIndex : null })),
}))
