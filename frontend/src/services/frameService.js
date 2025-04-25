/**
 * Sendet ein Video-Frame an das Backend zur Verarbeitung
 * @param {Blob} frameBlob - Das Frame als Blob
 * @returns {Promise<Response>} Die Server-Antwort
 */
export const sendFrameToBackend = async (frameBlob) => {
  try {
    const formData = new FormData()
    formData.append('frame', frameBlob)
    
    const response = await fetch('/api/process-frame', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response
  } catch (error) {
    console.error('Fehler beim Senden des Frames:', error)
    throw error
  }
}

/**
 * Konvertiert ein Canvas-Element zu einem Blob
 * @param {HTMLCanvasElement} canvas - Das Canvas-Element
 * @param {string} type - Der MIME-Type (z.B. 'image/jpeg')
 * @param {number} quality - Die Bildqualität (0-1)
 * @returns {Promise<Blob>} Das Frame als Blob
 */
export const canvasToBlob = async (canvas, type = 'image/jpeg', quality = 0.8) => {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
} 