import { GoogleGenAI } from "@google/genai"
import { useBoundingBoxStore } from '../stores/boundingBoxStore'

class BoundingBoxAnalyzer {
  constructor() {
    this.analyzeInterval = null
    this.ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GOOGLE_API_KEY })
    this.lastAnalysisTime = 0
    this.minInterval = 4000
    this.store = null
  }

  getStore() {
    if (!this.store) {
      this.store = useBoundingBoxStore()
    }
    return this.store
  }

  async analyzeFrame(canvas) {
    if (!this.getStore().isBoundingBoxAnalysisEnabled) {
      console.log('Bounding Box Analyse ist deaktiviert')
      return
    }

    const now = Date.now()
    if (now - this.lastAnalysisTime < this.minInterval) {
      console.log('Analyse übersprungen - zu früh seit letzter Analyse:', now - this.lastAnalysisTime, 'ms')
      return
    }

    console.log('Starte neue Frame-Analyse')
    try {
      const context = canvas.getContext('2d')
      const video = document.querySelector('video')
      
      console.log('Video und Canvas Dimensionen:', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height
      })
      
      // Video-Frame auf Canvas zeichnen
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      // Canvas zu Base64 konvertieren
      const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
      console.log('Base64 Image Länge:', base64Image.length)
      
      const contents = [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        },
        { 
          text: "Detect the all of the prominent items in the image. The box_2d should be [ymin, xmin, ymax, xmax] normalized to 0-1000. Only return items that are particularly interesting or unusual. Return ONLY a JSON array with objects containing 'box_2d' and 'label', no other text or formatting." 
        },
      ]

      console.log('Sende Anfrage an Gemini API')
      const response = await this.ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: contents,
      })

      console.log('API Antwort erhalten:', response.text)

      try {
        // Entferne Markdown-Formatierung und parse JSON
        const jsonStr = response.text.replace(/```json\n?|\n?```/g, '').trim()
        console.log('Bereinigte JSON-String:', jsonStr)
        
        const boxes = JSON.parse(jsonStr)
        console.log('Geparste Bounding Boxes:', boxes)
        
        const normalizedBoxes = boxes.map(box => ({
          ...box,
          box_2d: box.box_2d.map(coord => coord / 1000) // Normalize to 0-1
        }))
        
        console.log('Normalisierte Bounding Boxes:', normalizedBoxes)
        this.getStore().setBoundingBoxes(normalizedBoxes)
        this.lastAnalysisTime = now
      } catch (error) {
        console.error('Fehler beim Parsen der Bounding Boxes:', error)
        console.error('Ursprünglicher Text:', response.text)
        this.getStore().clearBoundingBoxes()
      }
    } catch (error) {
      console.error('Fehler bei der Bounding Box Analyse:', error)
      this.getStore().clearBoundingBoxes()
    }
  }

  startAnalysis(canvas) {
    console.log('Starte Bounding Box Analyse')
    this.stopAnalysis()
    this.analyzeInterval = setInterval(() => {
      this.analyzeFrame(canvas)
    }, 2000)
  }

  stopAnalysis() {
    console.log('Stoppe Bounding Box Analyse')
    if (this.analyzeInterval) {
      clearInterval(this.analyzeInterval)
      this.analyzeInterval = null
    }
    this.getStore().clearBoundingBoxes()
  }
}

export default new BoundingBoxAnalyzer() 