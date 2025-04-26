import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTranscriptStore = defineStore('transcript', () => {
  const userTranscript = ref('')
  const aiTranscript = ref('')
  const imageInsights = ref([])
  const isUserSpeaking = ref(false)
  const isAIResponding = ref(false)

  function setUserTranscript(text) {
    userTranscript.value = text
  }

  function setAITranscript(text) {
    aiTranscript.value = text
  }

  function addImageInsight(insight) {
    imageInsights.value.unshift({
      id: Date.now(),
      text: insight,
      timestamp: new Date().toLocaleTimeString()
    })
  }

  function setUserSpeaking(isSpeaking) {
    isUserSpeaking.value = isSpeaking
  }

  function setAIResponding(isResponding) {
    isAIResponding.value = isResponding
  }

  function clearTranscripts() {
    userTranscript.value = ''
    aiTranscript.value = ''
  }

  function clearImageInsights() {
    imageInsights.value = []
  }

  return {
    userTranscript,
    aiTranscript,
    imageInsights,
    isUserSpeaking,
    isAIResponding,
    setUserTranscript,
    setAITranscript,
    addImageInsight,
    setUserSpeaking,
    setAIResponding,
    clearTranscripts,
    clearImageInsights
  }
}) 