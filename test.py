# Import necessary libraries and modules
import os
from openai import OpenAI
import openai
import base64
import requests
import cv2
import sounddevice as sd
import soundfile as sf
import io
import keyboard
import threading
import argparse
from dotenv import load_dotenv
import time

# Load environment variables from .env file
load_dotenv()

# Set OpenAI API key from environment variable
openai.api_key = os.getenv("OPENAI_API_KEY")
# Initialize OpenAI client
client = OpenAI()

# Function to get description for a single image using OpenAI GPT-4 Vision model
def current_frame_descriptions(image):
    try:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {openai.api_key}"
        }

        payload = {
            "model": "gpt-4.1-nano",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """Describe the image. Keep it brief. Don't start with 'The image shows'. Just give the description."""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image}"
                            }
                        },
                    ]
                }
            ],
            "max_tokens": 300
        }

        response = requests.post("https://api.openai.com/v1/chat/completions", 
                              headers=headers, 
                              json=payload,
                              timeout=30)  # Added timeout
        
        if response.status_code != 200:
            print(f"API Error: Status code {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
        return response.json()['choices'][0]['message']['content']
    except requests.exceptions.Timeout:
        print("API request timed out")
        return None
    except requests.exceptions.RequestException as e:
        print(f"API request failed: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error in current_frame_descriptions: {e}")
        return None

# Function to get description for two consecutive images with contextual analysis
def continous_frame_descriptions(prev_image, curr_image, preview):
    try:
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {openai.api_key}"
        }

        payload = {
            "model": "gpt-4.1-nano",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"""The images are two consecutive frames of a continuous live video. 
                                    The first image is of the previous frame, and the second image is of the current frame.
                                    The description of the previous frame is {preview}.
                                    Compare the two images and also compare the description of both the frames.
                                    Then describe the current frame or anything new comes in the description. 
                                    Don't repeat anything that is already there in the previous frame or {preview}.
                                    Always make a connection between the two frames and between the current description and {preview} 
                                    as these are the images from a continuous live video feed. Don't mention anything about comparison in your final answer.
                                    Just describe the current frame after doing the above analysis. Don't start with 'in this frame'.  Keep it brief."""
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{prev_image}"}
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{curr_image}"}
                        },
                    ]
                }
            ],
            "max_tokens": 300
        }

        response = requests.post("https://api.openai.com/v1/chat/completions", 
                              headers=headers, 
                              json=payload,
                              timeout=30)  # Added timeout
        
        if response.status_code != 200:
            print(f"API Error: Status code {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
        return response.json()['choices'][0]['message']['content']
    except requests.exceptions.Timeout:
        print("API request timed out")
        return None
    except requests.exceptions.RequestException as e:
        print(f"API request failed: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error in continous_frame_descriptions: {e}")
        return None

# Function to convert text to speech using OpenAI TTS-1-HD model
def text_to_speech(text):
    # Generating text to speech using OpenAI TTS-1-HD model.
    spoken_response = client.audio.speech.create(
        model="tts-1-hd",
        voice="nova",
        response_format="opus",
        input=text
    )

    # Converting audio response to playable format and play the audio
    buffer = io.BytesIO()
    for chunk in spoken_response.iter_bytes(chunk_size = 4096):
        buffer.write(chunk)
    buffer.seek(0)

    with sf.SoundFile(buffer, 'r') as sound_file:
        data = sound_file.read(dtype = 'int16')
        sd.play(data, sound_file.samplerate)
        sd.wait()

# Initialize video capture - will be set in main function
cap = None

def process_video(video_path: str, cycle: int = 300):
    """Process video in a single thread."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("Error: Could not open video file")
        return

    # Get video properties
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0
    
    print(f"\nVideo Information:")
    print(f"FPS: {fps}")
    print(f"Total Frames: {total_frames}")
    print(f"Duration: {duration:.2f} seconds")
    print(f"Processing every {cycle} frames")
    print(f"Expected to process ~{total_frames/cycle:.1f} frames")
    if fps > 0:
        print(f"Processing rate: ~{fps/cycle:.2f} frames per second")
    
    preview = ""
    n = 0
    i = 0
    last_processed_time = time.time()
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("\nEnd of video reached")
                break
                
            # Display the frame
            cv2.imshow('Video', frame)
            
            # Process every Nth frame
            if n % cycle == 0:
                current_time = time.time()
                time_since_last = current_time - last_processed_time
                last_processed_time = current_time
                
                try:
                    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                    base64_frame = base64.b64encode(buffer).decode('utf-8')
                    
                    print(f"\nProcessing frame {n}/{total_frames} ({(n/total_frames*100):.1f}%)")
                    print(f"Time since last processed frame: {time_since_last:.2f} seconds")
                    
                    if i == 0:
                        image_description_crnt = current_frame_descriptions(base64_frame)
                    else:
                        image_description_crnt = continous_frame_descriptions(base64_frame_prev, base64_frame, preview)
                    
                    if image_description_crnt:
                        print(f"Description: {image_description_crnt}")
                        text_to_speech(text=image_description_crnt)
                        preview = " ".join([preview, image_description_crnt])
                        base64_frame_prev = base64_frame
                        i += 1
                    else:
                        print("Skipping frame due to processing error")
                        
                except Exception as e:
                    print(f"Error processing frame {n}: {e}")
                    import traceback
                    traceback.print_exc()
            
            n += 1
            
            # Break on 'q' key press
            if cv2.waitKey(1) & 0xFF == ord('q'):
                print("\nUser requested quit")
                break
                
    except Exception as e:
        print(f"Error in video processing: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cap.release()
        cv2.destroyAllWindows()
        print("\nVideo processing completed")
        print(f"Processed {i} frames out of {n} total frames")
        if n > 0:
            print(f"Processing rate: {i/(n/fps):.2f} frames per second")

def main():
    parser = argparse.ArgumentParser(description='Video description tool')
    parser.add_argument('--video', type=str, help='Path to video file (if not specified, webcam will be used)')
    parser.add_argument('--cycle', type=int, default=5, help='Process every Nth frame (default: 5)')
    parser.add_argument('--fps', type=float, default=None, help='Target frames per second to process (overrides cycle)')
    args = parser.parse_args()
    
    if args.video:
        if not os.path.exists(args.video):
            print(f"Error: Video file '{args.video}' not found.")
            return
            
        # If fps is specified, calculate cycle based on video's actual fps
        if args.fps is not None:
            cap = cv2.VideoCapture(args.video)
            video_fps = cap.get(cv2.CAP_PROP_FPS)
            cap.release()
            
            if video_fps > 0:
                cycle = int(video_fps / args.fps)
                print(f"Video FPS: {video_fps}, Target FPS: {args.fps}, Processing every {cycle} frames")
            else:
                print("Could not determine video FPS, using cycle value instead")
                cycle = args.cycle
        else:
            cycle = args.cycle
            
        process_video(args.video, cycle=cycle)
    else:
        print("Webcam mode not implemented in this version")
        return

if __name__ == "__main__":
    main()