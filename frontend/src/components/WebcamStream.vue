<template>
  <div class="fixed inset-0 w-screen h-screen overflow-hidden">
    <video ref="videoElement" class="w-full h-full object-cover" autoplay playsinline></video>
    <WebcamOverlay />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import WebcamOverlay from './WebcamOverlay.vue'

const videoElement = ref(null)

onMounted(async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
    if (videoElement.value) {
      videoElement.value.srcObject = stream
    }
  } catch (error) {
    console.error('Fehler beim Zugriff auf die Webcam:', error)
  }
})
</script> 