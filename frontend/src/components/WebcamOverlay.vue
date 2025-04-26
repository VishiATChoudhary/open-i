<template>
  <div class="fixed inset-0">
    <!-- Top gradient with logo -->
    <div class="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#484848] via-[#484848]/50 to-transparent">
      <div class="flex justify-center items-center h-full">
        <img src="../assets/logo.svg" alt="Logo" class="h-12" />
      </div>
    </div>

    <!-- Features panel -->
    <div class="absolute top-1/2 right-8 -translate-y-1/2 w-100">
      <!-- Background gradient -->
      <div class="absolute inset-0 rounded-3xl bg-gradient-to-b from-[#FAF9F6] to-[#FAF9F6]/20"></div>
      
      <!-- Content -->
      <div class="relative px-6 py-4">
        <h2 class="text-xl font-semibold mb-2 text-center">Features</h2>
        <div class="space-y-3">
          <TransitionGroup name="message" tag="div">
            <div v-for="message in displayedMessages" 
                 :key="message.id"
                 class="flex justify-between items-center space-x-2">
              <span class="text-gray-800">{{ message.text }}</span>
              <span class="text-gray-400 font-mono">{{ message.timestamp }}</span>
            </div>
          </TransitionGroup>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { messages } from '../data/dummyMessages'

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
  
  // Behalte maximal 5 Nachrichten
  if (displayedMessages.value.length > 5) {
    displayedMessages.value.pop()
  }
  
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

<style scoped>
.message-enter-active,
.message-leave-active {
  transition: all 0.5s ease;
}

.message-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.message-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style> 