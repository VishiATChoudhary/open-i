<template>
  <div class="w-full bg-[#F3F3F3] rounded-3xl p-6 border-2 border-gray-200">
    <h2 class="text-xl text-gray-800 font-semibold mb-4">HISTORY</h2>
    <div class="space-y-3 h-[calc(100vh-12rem)] overflow-hidden">
      <div v-for="insight in store.imageInsights" 
           :key="insight.id"
           class="flex justify-between items-center space-x-2">
        <span class="text-gray-700">{{ insight.text }}</span>
        <span class="text-gray-500 font-mono text-sm">{{ insight.timestamp }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useTranscriptStore } from '../stores/transcriptStore'

const store = useTranscriptStore()
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