<template>
  <div class="aspect-video bg-neutral-900 rounded-3xl overflow-hidden relative">
    <video ref="videoElement" class="w-full h-full object-cover [transform:scaleX(-1)]" autoplay playsinline></video>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

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

onUnmounted(() => {
  if (videoElement.value?.srcObject) {
    videoElement.value.srcObject.getTracks().forEach(track => track.stop())
  }
})
</script> 