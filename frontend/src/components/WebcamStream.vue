<template>
  <div class="fixed inset-0 w-screen h-screen overflow-hidden">
    <video ref="videoElement" class="w-full h-full object-cover" autoplay playsinline></video>
    <canvas ref="canvasElement" class="hidden"></canvas>
    <WebcamOverlay />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import WebcamOverlay from './WebcamOverlay.vue'
import { sendFrameToBackend, canvasToBlob } from '../services/frameService'

const videoElement = ref(null)
const canvasElement = ref(null)
let captureInterval = null

const captureAndSendFrame = async () => {
  if (!videoElement.value || !canvasElement.value) return

  const video = videoElement.value
  const canvas = canvasElement.value
  
  // Setze Canvas-Dimensionen auf Video-Dimensionen
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  
  // Zeichne aktuelles Video-Frame auf Canvas
  const context = canvas.getContext('2d')
  context.drawImage(video, 0, 0, canvas.width, canvas.height)
  
  try {
    // Konvertiere Canvas zu Blob und sende ans Backend
    const blob = await canvasToBlob(canvas)
    await sendFrameToBackend(blob)
  } catch (error) {
    console.error('Fehler bei der Frame-Verarbeitung:', error)
  }
}

onMounted(async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    if (videoElement.value) {
      videoElement.value.srcObject = stream
      
      // Starte Intervall für Frame-Capture sobald Video lädt
      videoElement.value.onloadedmetadata = () => {
        captureInterval = setInterval(captureAndSendFrame, 1000)
      }
    }
  } catch (error) {
    console.error('Fehler beim Zugriff auf die Webcam:', error)
  }
})

onUnmounted(() => {
  // Cleanup: Stoppe Intervall und Stream
  if (captureInterval) {
    clearInterval(captureInterval)
  }
  if (videoElement.value?.srcObject) {
    videoElement.value.srcObject.getTracks().forEach(track => track.stop())
  }
})
</script> 