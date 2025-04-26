<template>
  <div class="min-h-screen bg-white px-8 py-5">
    <!-- Logo -->
    <div class="flex justify-center mb-4">
      <img src="./assets/logo.svg" alt="Logo" class="h-8" />
    </div>

    <!-- Main Content -->
    <div class="flex gap-8">
      <!-- Left Section: Video and Chat -->
      <div class="flex-1 flex flex-col gap-8">
        <VideoStream />
        <UserTranscript />
        <AITranscript />
      </div>

      <!-- Right Section: History -->
      <History :messages="displayedMessages" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { messages } from './data/dummyMessages'
import VideoStream from './components/VideoStream.vue'
import UserTranscript from './components/UserTranscript.vue'
import AITranscript from './components/AITranscript.vue'
import History from './components/History.vue'

const displayedMessages = ref([])
let messageInterval = null

// Formatiert einen Zeitstempel im Format HH:MM:SS
const formatTime = (date) => {
  return date.toTimeString().split(' ')[0]
}

// Generiert eine zufällige Zahl zwischen min und max
const getRandomInterval = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min) * 1000
}

// Fügt eine neue Nachricht hinzu
const addMessage = () => {
  const randomMessage = messages[Math.floor(Math.random() * messages.length)]
  const newMessage = {
    id: Date.now(),
    text: randomMessage,
    timestamp: formatTime(new Date())
  }
  
  displayedMessages.value.unshift(newMessage)
  
  // Plane die nächste Nachricht
  scheduleNextMessage()
}

// Plant die nächste Nachricht
const scheduleNextMessage = () => {
  messageInterval = setTimeout(() => {
    addMessage()
  }, getRandomInterval(2, 8))
}

onMounted(() => {
  // Starte mit einer Nachricht
  addMessage()
})

onUnmounted(() => {
  if (messageInterval) {
    clearTimeout(messageInterval)
  }
})
</script>