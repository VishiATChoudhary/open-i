import { useTranscriptStore } from '../stores/transcriptStore'

class VoiceService {
  constructor() {
    this.peerConnection = null
    this.dataChannel = null
    this.audioElement = null
    this.mediaStream = null
    this.isRecording = false
    this.store = null
    this.currentTranscript = ''
    this.currentAIResponse = ''
  }

  getStore() {
    if (!this.store) {
      this.store = useTranscriptStore()
    }
    return this.store
  }

  async startRecording() {
    try {
      // Audio-Element für die Ausgabe erstellen
      this.audioElement = document.createElement('audio')
      this.audioElement.autoplay = true
      document.body.appendChild(this.audioElement)

      // WebRTC Peer Connection erstellen
      this.peerConnection = new RTCPeerConnection()

      // Audio-Stream von Mikrofon abrufen
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.mediaStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.mediaStream)
      })

      // Data Channel für Events erstellen
      this.dataChannel = this.peerConnection.createDataChannel('oai-events')
      this.setupDataChannel()

      // Remote Audio Stream verarbeiten
      this.peerConnection.ontrack = (event) => {
        console.log('Audio Track empfangen:', event)
        this.audioElement.srcObject = event.streams[0]
      }

      // Session starten
      const offer = await this.peerConnection.createOffer()
      await this.peerConnection.setLocalDescription(offer)

      // Session mit OpenAI initialisieren
      const baseUrl = 'https://api.openai.com/v1/realtime'
      const model = 'gpt-4o-realtime-preview-2024-12-17'
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          'Content-Type': 'application/sdp',
          'OpenAI-Beta': 'realtime=v1'
        }
      })

      const answer = {
        type: 'answer',
        sdp: await sdpResponse.text()
      }
      await this.peerConnection.setRemoteDescription(answer)

      this.isRecording = true
      console.log('Sprachaufnahme gestartet')
    } catch (error) {
      console.error('Fehler beim Starten der Sprachaufnahme:', error)
      throw error
    }
  }

  setupDataChannel() {
    this.dataChannel.addEventListener('message', (event) => {
      const data = JSON.parse(event.data)
      console.log('Empfangene Daten:', data)
      
      // Benutzer Transkription Events
      if (data.type === 'conversation.item.input_audio_transcription.delta') {
        this.getStore().setIsUserSpeaking(true)
        this.currentTranscript += data.delta
        this.getStore().setUserTranscript(this.currentTranscript)
      } else if (data.type === 'conversation.item.input_audio_transcription.completed') {
        this.getStore().setIsUserSpeaking(false)
        this.currentTranscript = data.transcript
        this.getStore().setUserTranscript(this.currentTranscript)
      } else if (data.type === 'conversation.item.created') {
        // Reset current transcript für neue Konversation
        this.currentTranscript = ''
        this.currentAIResponse = ''
        this.getStore().setIsUserSpeaking(false)
        this.getStore().setIsAIResponding(false)
      } else if (data.type === 'input_audio_buffer.speech_stopped') {
        // Wenn der Benutzer aufhört zu sprechen, Transkription abschließen
        this.getStore().setIsUserSpeaking(false)
        this.getStore().setUserTranscript(this.currentTranscript)
      } else if (data.type === 'input_audio_buffer.speech_started') {
        this.getStore().setIsUserSpeaking(true)
      }

      // AI Antwort Events
      if (data.type === 'response.audio_transcript.delta') {
        this.getStore().setIsAIResponding(true)
        this.currentAIResponse += data.delta
        this.getStore().setAITranscript(this.currentAIResponse)
      } else if (data.type === 'response.audio_transcript.done') {
        this.getStore().setIsAIResponding(false)
        this.currentAIResponse = data.transcript
        this.getStore().setAITranscript(this.currentAIResponse)
      } else if (data.type === 'response.done') {
        // Finale AI Antwort verarbeiten
        // this.getStore().setIsAIResponding(false)
        if (data.response?.text) {
          this.currentAIResponse = data.response.text
          this.getStore().setAITranscript(this.currentAIResponse)
        }
      }

      // Alternativer Ansatz für Audio-Status und Antworten
      if (data.type === 'response.output_item.added') {
        this.getStore().setIsAIResponding(true)
      } else if (data.type === 'response.output_item.delta') {
        this.getStore().setIsAIResponding(true)
      } else if (data.type === 'response.output_item.removed') {
        this.getStore().setIsAIResponding(false)
      }
    })
  }

  async stopRecording() {
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }

    if (this.audioElement) {
      this.audioElement.remove()
      this.audioElement = null
    }

    this.isRecording = false
    this.currentTranscript = ''
    this.currentAIResponse = ''
    this.getStore().setIsUserSpeaking(false)
    this.getStore().setIsAIResponding(false)
    console.log('Sprachaufnahme beendet')
  }
}

export default new VoiceService() 