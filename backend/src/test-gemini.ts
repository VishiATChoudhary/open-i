import { GoogleGenerativeAI } from '@google/generative-ai';

async function testGemini() {
  try {
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Create a simple test image (a red square)
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Draw a red square
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 100, 100);

    // Convert to base64
    const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];

    console.log('Sending test image to Gemini...');

    // Send to Gemini
    const response = await model.generateContent([
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image
        }
      },
      { text: "Describe what you see in this image in detail." }
    ]);

    const result = response.response;
    const text = result.text();
    
    console.log('Gemini Response:', text);
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error testing Gemini:', error);
  }
}

// Run the test
testGemini(); 