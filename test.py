# Import necessary libraries and modules
import os
import openai
from openai import AsyncOpenAI
from openai.helpers import LocalAudioPlayer
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
import asyncio
import aiohttp
import websockets
import json
import pyaudio
import wave
import numpy as np
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCIceCandidate
from aiortc.contrib.media import MediaPlayer, MediaRecorder
import av

# Load environment variables from .env file
load_dotenv()

# Set OpenAI API key from environment variable
openai.api_key = os.getenv("OPENAI_API_KEY")
# Initialize OpenAI client
client = AsyncOpenAI()

# Audio configuration
CHUNK = 1024
FORMAT = 'int16'
CHANNELS = 1
RATE = 44100

async def setup_webrtc():
    """Set up WebRTC connection."""
    pc = RTCPeerConnection()
    
    # Set up audio track
    audio = MediaPlayer(
        "default",  # Use default audio input
        format="pulse",  # Use PulseAudio
        options={
            "channels": CHANNELS,
            "rate": str(RATE),
        }
    )
    
    # Add audio track to peer connection
    pc.addTrack(audio.audio)
    
    return pc, audio

async def process_audio_stream(stream, websocket):
    """Process audio stream and send to WebSocket."""
    try:
        while True:
            data = stream.read(CHUNK)
            # Convert to numpy array for processing
            audio_data = np.frombuffer(data, dtype=np.int16)
            # Send audio data through WebSocket
            await websocket.send(audio_data.tobytes())
    except Exception as e:
        print(f"Error in audio processing: {e}")

async def handle_audio_response(websocket):
    """Handle incoming audio responses from the model."""
    try:
        while True:
            response = await websocket.recv()
            # Play the received audio
            audio_data = np.frombuffer(response, dtype=np.int16)
            sd.play(audio_data, RATE)
            sd.wait()
    except Exception as e:
        print(f"Error handling audio response: {e}")

async def current_frame_descriptions(image):
    try:
        current_start_time = time.time()
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {openai.api_key}"
        }

        payload = {
            "model": "gpt-4.1-nano-2025-04-14",
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

        async with aiohttp.ClientSession() as session:
            async with session.post("https://api.openai.com/v1/chat/completions", 
                                  headers=headers, 
                                  json=payload,
                                  timeout=30) as response:
                current_api_time = time.time() - current_start_time
                
                if response.status != 200:
                    print(f"API Error: Status code {response.status}")
                    response_text = await response.text()
                    print(f"Response: {response_text}")
                    return None, current_api_time
                    
                response_json = await response.json()
                return response_json['choices'][0]['message']['content'], current_api_time
    except asyncio.TimeoutError:
        print("API request timed out")
        return None, time.time() - current_start_time
    except Exception as e:
        print(f"Unexpected error in current_frame_descriptions: {e}")
        return None, time.time() - current_start_time

async def continous_frame_descriptions(prev_image, curr_image, preview):
    try:
        continous_start_time = time.time()
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {openai.api_key}"
        }

        payload = {
            "model": "gpt-4.1-nano-2025-04-14",
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

        async with aiohttp.ClientSession() as session:
            async with session.post("https://api.openai.com/v1/chat/completions", 
                                  headers=headers, 
                                  json=payload,
                                  timeout=30) as response:
                continous_api_time = time.time() - continous_start_time
                
                if response.status != 200:
                    print(f"API Error: Status code {response.status}")
                    response_text = await response.text()
                    print(f"Response: {response_text}")
                    return None, continous_api_time
                    
                response_json = await response.json()
                return response_json['choices'][0]['message']['content'], continous_api_time
    except asyncio.TimeoutError:
        print("API request timed out")
        return None, time.time() - continous_start_time
    except Exception as e:
        print(f"Unexpected error in continous_frame_descriptions: {e}")
        return None, time.time() - continous_start_time

async def text_to_speech(text):
    audio_start_time = time.time()
    try:
        # Set up WebRTC connection
        pc, audio = await setup_webrtc()
        
        # Create offer
        offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        
        # Here you would typically exchange the offer/answer with the other peer
        # For now, we'll just use the local description
        print("Local description:", pc.localDescription.sdp)
        
        # Set up audio processing
        @pc.on("track")
        def on_track(track):
            if track.kind == "audio":
                # Process incoming audio
                @track.on("ended")
                async def on_ended():
                    await pc.close()
        
        # Keep the connection alive while processing
        await asyncio.sleep(5)  # Adjust as needed
        
        # Clean up
        await pc.close()
        audio.stop()
        
        return time.time() - audio_start_time
    except Exception as e:
        print(f"Error in text_to_speech: {e}")
        return time.time() - audio_start_time

# Initialize video capture - will be set in main function
cap = None

async def process_video(video_path: str, cycle: int = 300):
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
    
    # Statistics tracking
    total_api_time = 0
    total_audio_time = 0
    total_processing_time = 0
    
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
                    frame_start_time = time.time()
                    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                    base64_frame = base64.b64encode(buffer).decode('utf-8')
                    
                    print(f"\nProcessing frame {n}/{total_frames} ({(n/total_frames*100):.1f}%)")
                    print(f"Time since last processed frame: {time_since_last:.2f} seconds")
                    
                    if i == 0:
                        image_description_crnt, api_time = await current_frame_descriptions(base64_frame)
                    else:
                        image_description_crnt, api_time = await continous_frame_descriptions(base64_frame_prev, base64_frame, preview)
                    
                    if image_description_crnt:
                        print(f"Description: {image_description_crnt}")
                        print(f"API processing time: {api_time:.2f} seconds")
                        
                        audio_time = await text_to_speech(text=image_description_crnt)
                        print(f"Audio processing time: {audio_time:.2f} seconds")
                        
                        total_processing_time = time.time() - frame_start_time
                        print(f"Total processing time: {total_processing_time:.2f} seconds")
                        
                        # Update statistics
                        total_api_time += api_time
                        total_audio_time += audio_time
                        
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
        if i > 0:
            print(f"\nAverage processing times:")
            print(f"API: {total_api_time/i:.2f} seconds per frame")
            print(f"Audio: {total_audio_time/i:.2f} seconds per frame")
            print(f"Total: {(total_api_time + total_audio_time)/i:.2f} seconds per frame")
            if fps > 0:
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
            
        asyncio.run(process_video(args.video, cycle=cycle))
    else:
        print("Webcam mode not implemented in this version")
        return

if __name__ == "__main__":
    main()