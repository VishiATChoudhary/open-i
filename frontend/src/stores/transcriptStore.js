import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTranscriptStore = defineStore('transcript', {
  state: () => ({
    userTranscript: '',
    aiTranscript: '',
    imageInsights: ref([]),
    isUserSpeaking: false,
    isAIResponding: false
  }),
  actions: {
    setUserTranscript(transcript) {
      this.userTranscript = transcript
    },
    setAITranscript(transcript) {
      this.aiTranscript = transcript
    },
    addImageInsight(insight) {
      this.imageInsights.unshift({
        id: Date.now(),
        text: insight,
        timestamp: new Date().toLocaleTimeString()
      })
    },
    setIsUserSpeaking(isSpeaking) {
      this.isUserSpeaking = isSpeaking
    },
    setIsAIResponding(isResponding) {
      this.isAIResponding = isResponding
    },
    clearTranscripts() {
      this.userTranscript = ''
      this.aiTranscript = ''
    },
    clearImageInsights() {
      this.imageInsights = []
    }
  }
}) 