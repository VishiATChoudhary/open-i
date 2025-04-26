<template>
  <div class="flex gap-4 items-center w-full">
    <div 
      class="w-16 h-32 bg-[#FAF3DD] rounded-full flex items-center justify-center flex-shrink-0"
      :class="{ 'bounce-animation': store.isAIResponding }"
    >
      <img src="../assets/ai.svg" alt="AI" class="w-8 h-8" />
    </div>
    <div class="flex-1 bg-[#FAF3DD] rounded-4xl px-8 h-32 flex items-center">
      {{ store.aiTranscript }}
    </div>
  </div>
</template>

<script setup>
import { useTranscriptStore } from '../stores/transcriptStore'

const store = useTranscriptStore()
</script>

<style scoped>
@keyframes bounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  75% { transform: scale(0.95); }
  100% { transform: scale(1); }
}

.bounce-animation {
  animation: bounce 0.6s cubic-bezier(0.28, 0.84, 0.42, 1) infinite;
}
</style> 