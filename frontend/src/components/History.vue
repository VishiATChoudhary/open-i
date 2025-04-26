<template>
  <div class="bg-[#F3F3F3] rounded-3xl p-6 border-2 border-gray-200">
    <h2 class="text-xl text-gray-800 font-semibold mb-4">HISTORY</h2>
    <div class="space-y-3 h-[calc(100vh-11rem)] overflow-hidden">
      <div>
        <div v-for="message in messages" 
             :key="message.id"
             class="flex justify-between items-center space-x-2 mb-3">
          <span class="text-gray-700">{{ message.text }}</span>
          <span class="text-gray-500 font-mono text-xs">{{ message.timestamp }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  messages: {
    type: Array,
    required: true
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