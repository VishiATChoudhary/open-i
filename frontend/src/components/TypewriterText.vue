<template>
  <span>{{ displayedText }}</span>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  text: {
    type: String,
    required: true
  },
  speed: {
    type: Number,
    default: 50 // Millisekunden pro Zeichen
  }
})

const displayedText = ref('')
let currentIndex = 0
let typingInterval = null

const typeText = () => {
  if (currentIndex < props.text.length) {
    displayedText.value = props.text.slice(0, currentIndex + 1)
    currentIndex++
  } else {
    clearInterval(typingInterval)
  }
}

const startTyping = () => {
  displayedText.value = ''
  currentIndex = 0
  if (typingInterval) clearInterval(typingInterval)
  typingInterval = setInterval(typeText, props.speed)
}

watch(() => props.text, () => {
  startTyping()
})

onMounted(() => {
  startTyping()
})
</script> 