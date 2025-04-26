import { defineStore } from 'pinia'

export const useBoundingBoxStore = defineStore('boundingBoxes', {
  state: () => ({
    boxes: [],
    isBoundingBoxAnalysisEnabled: false
  }),
  
  actions: {
    setBoundingBoxes(boxes) {
      console.log('Setze neue Bounding Boxes im Store:', boxes)
      this.boxes = boxes
    },
    
    clearBoundingBoxes() {
      this.boxes = []
    },

    setBoundingBoxAnalysisEnabled(enabled) {
      console.log('Setze Bounding Box Analyse auf:', enabled)
      this.isBoundingBoxAnalysisEnabled = enabled
      if (!enabled) {
        this.clearBoundingBoxes()
      }
    }
  },

  getters: {
    isEnabled: (state) => state.isBoundingBoxAnalysisEnabled
  }
}) 