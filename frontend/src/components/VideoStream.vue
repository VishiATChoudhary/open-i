<template>
  <div 
    class="aspect-video bg-neutral-900 rounded-3xl overflow-hidden relative transition-all duration-300"
    :class="{ 'ring-4 ring-red-500': isAnalyzing }"
  >
    <video 
      ref="videoElement" 
      class="w-full h-full object-cover [transform:scaleX(-1)]" 
      autoplay 
      playsinline
      @play="initializeCanvas"
    ></video>
    <canvas ref="canvasElement" class="hidden"></canvas>
    <canvas 
      ref="overlayCanvas" 
      class="absolute top-0 left-0 w-full h-full pointer-events-none"
    ></canvas>
    
    <!-- Analyze Switch -->
    <button 
      @click="toggleAnalysis"
      class="absolute top-4 left-4 px-4 py-2 rounded-full flex items-center gap-2 transition-colors"
      :class="isAnalyzing ? 'bg-red-500 text-white' : 'bg-green-500 text-white'"
    >
      <span class="text-sm font-medium">{{ isAnalyzing ? 'Stop Analysis' : 'Start Analysis' }}</span>
    </button>

    <!-- Voice Status -->
    <div 
      v-if="isAnalyzing"
      class="absolute top-4 right-4 px-4 py-2 rounded-full bg-blue-500 text-white text-sm font-medium"
    >
      {{ isRecording ? 'Sprachaufnahme aktiv' : 'Sprachaufnahme gestartet...' }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import frameAnalyzer from '../services/frameAnalyzer'
import boundingBoxAnalyzer from '../services/boundingBoxAnalyzer'
import voiceService from '../services/voiceService'
import { useBoundingBoxStore } from '../stores/boundingBoxStore'

const videoElement = ref(null)
const canvasElement = ref(null)
const overlayCanvas = ref(null)
const isAnalyzing = ref(false)
const isRecording = ref(false)
const boundingBoxStore = useBoundingBoxStore()

onMounted(async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { facingMode: 'user' } 
    })
    videoElement.value.srcObject = stream

    // Canvas-Größe an Video anpassen
    canvasElement.value.width = videoElement.value.videoWidth || 640
    canvasElement.value.height = videoElement.value.videoHeight || 480
    overlayCanvas.value.width = videoElement.value.videoWidth || 640
    overlayCanvas.value.height = videoElement.value.videoHeight || 480
  } catch (error) {
    console.error('Fehler beim Zugriff auf die Kamera:', error)
  }
})

const initializeCanvas = () => {
  // Canvas-Größe aktualisieren, nachdem das Video geladen ist
  canvasElement.value.width = videoElement.value.videoWidth
  canvasElement.value.height = videoElement.value.videoHeight
  overlayCanvas.value.width = videoElement.value.videoWidth
  overlayCanvas.value.height = videoElement.value.videoHeight
}

const drawBoundingBoxes = () => {
  console.log('Starte Rendering der Bounding Boxes')
  const ctx = overlayCanvas.value.getContext('2d')
  ctx.clearRect(0, 0, overlayCanvas.value.width, overlayCanvas.value.height)
  
  const boxes = boundingBoxStore.boxes
  console.log('Boxes für Rendering:', boxes)
  
  boxes.forEach((box, index) => {
    const [yMin, xMin, yMax, xMax] = box.box_2d
    const width = overlayCanvas.value.width
    const height = overlayCanvas.value.height
    
    // Koordinaten auf Canvas-Größe skalieren
    const x = xMin * width
    const y = yMin * height
    const w = (xMax - xMin) * width
    const h = (yMax - yMin) * height
    
    console.log(`Rendering Box ${index}:`, {
      original: box.box_2d,
      scaled: { x, y, w, h },
      label: box.label
    })
    
    // Bounding Box zeichnen
    ctx.strokeStyle = '#ff0000'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, w, h)
    
    // Label zeichnen
    ctx.fillStyle = '#ff0000'
    ctx.font = '14px Arial'
    ctx.fillText(box.label, x, y - 5)
  })
}

// Watch für Bounding Boxes
watch(() => boundingBoxStore.boxes, (newBoxes) => {
  console.log('Bounding Boxes haben sich geändert:', newBoxes)
  drawBoundingBoxes()
}, { deep: true })

const toggleAnalysis = async () => {
  if (isAnalyzing.value) {
    frameAnalyzer.stopAnalysis()
    boundingBoxAnalyzer.stopAnalysis()
    boundingBoxStore.$patch({ isBoundingBoxAnalysisEnabled: false })
    await voiceService.stopRecording()
    isRecording.value = false
  } else {
    frameAnalyzer.startAnalysis(canvasElement.value)
    boundingBoxStore.$patch({ isBoundingBoxAnalysisEnabled: false })
    boundingBoxAnalyzer.startAnalysis(canvasElement.value)
    try {
      await voiceService.startRecording()
      isRecording.value = true
    } catch (error) {
      console.error('Fehler beim Starten der Sprachaufnahme:', error)
    }
  }
  isAnalyzing.value = !isAnalyzing.value
}

onBeforeUnmount(() => {
  frameAnalyzer.stopAnalysis()
  boundingBoxAnalyzer.stopAnalysis()
  voiceService.stopRecording()
  
  // Stream beenden
  if (videoElement.value?.srcObject) {
    videoElement.value.srcObject.getTracks().forEach(track => track.stop())
  }
})
</script> 