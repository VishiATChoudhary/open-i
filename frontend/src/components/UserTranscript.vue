<template>
  <div class="flex gap-4">
    <div class="flex-1 flex gap-4 items-center">
      <div class="flex-1 bg-[#F3F3F3] rounded-full px-8 h-12 flex items-center">
        
      </div>
      <div 
        class="w-12 h-12 bg-[#F3F3F3] rounded-full flex items-center justify-center"
        :class="{ 'bounce-animation': isSpeaking }"
      >
        <img src="../assets/user.svg" alt="User" class="w-8 h-8" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const isSpeaking = ref(false)
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