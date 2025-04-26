import { useTranscriptStore } from '../stores/transcriptStore'
import { GoogleGenAI } from "@google/genai"

class FrameAnalyzer {
  constructor() {
    this.analyzeInterval = null
    this.store = null
    this.ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GOOGLE_API_KEY })
  }

  getStore() {
    if (!this.store) {
      this.store = useTranscriptStore()
    }
    return this.store
  }

  async analyzeFrame(canvas) {
    try {
      const context = canvas.getContext('2d')
      const video = document.querySelector('video')
      
      // Video-Frame auf Canvas zeichnen
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Canvas zu Base64 konvertieren
      const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
      
      const contents = [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        },
        { 
            text: "Caption this image. Be very concise, especially if nothing has changed. Be very specific about any unexpected or unusual details, such as strong emotions or actions. Be sure to always mention and accurately describe any people in the scene." 
        },
      ]

      const response = await this.ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: contents,
      })

      const caption = response.text
      if (caption) {
        this.getStore().addImageInsight(caption)
      }
    } catch (error) {
      console.error('Fehler bei der Frame-Analyse:', error)
    }
  }

  startAnalysis(canvas) {
    // Stoppe vorherige Analyse, falls vorhanden
    this.stopAnalysis()

    // Starte neue Analyse-Intervall
    this.analyzeInterval = setInterval(() => {
      this.analyzeFrame(canvas)
    }, 4000) // Alle 4 Sekunden
  }

  stopAnalysis() {
    if (this.analyzeInterval) {
      clearInterval(this.analyzeInterval)
      this.analyzeInterval = null
    }
  }
}

export default new FrameAnalyzer() 