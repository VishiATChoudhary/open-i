<template>
  <div class="h-screen bg-white flex flex-col">
    <!-- Logo -->
    <div class="flex justify-center items-center gap-2 my-5">
      <img src="./assets/logo.svg" alt="Logo" class="h-8" />
      <span class="text-2xl font-semibold text-gray-800">Open i</span>
    </div>

    <!-- Main Content Container -->
    <div class="flex-1 min-h-0 flex flex-col md:flex-row md:gap-8 px-8">
      <div class="flex flex-col md:flex-1">
        <!-- Left Section: Video and Chat -->
        <div class="flex-1 flex flex-col mb-5">
          <VideoStream class="flex-[2]" />
          <div class="flex-1 flex flex-col justify-center gap-8 mt-4 md:mt-0">
            <UserTranscript />
            <AITranscript />
          </div>
        </div>

        <!-- Right Section: History (auf Mobile) -->
        <div class="block md:hidden w-full mb-5">
          <History :messages="displayedMessages" />
        </div>
      </div>

      <!-- Right Section: History (auf Desktop) -->
      <div class="hidden md:block w-96 mb-5">
        <History :messages="displayedMessages" />
      </div>
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