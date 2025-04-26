<template>
  <div class="flex gap-4 items-center">
    <div 
      class="w-12 h-12 bg-[#FAF3DD] rounded-full flex items-center justify-center"
      :class="{ 'bounce-animation': isResponding }"
    >
      <img src="../assets/ai.svg" alt="AI" class="w-8 h-8" />
    </div>
    <div class="flex-1 bg-[#FAF3DD] rounded-full px-8 h-12 flex items-center">
      
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const isResponding = ref(true)
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