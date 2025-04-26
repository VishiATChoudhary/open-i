import asyncio
import time
import sounddevice as sd
from webrtc import RTCPeerConnection, MediaPlayer

# Constants
RATE = 44100  # Sample rate
CHANNELS = 1  # Number of channels
CHUNK = 1024  # Frame size

async def setup_webrtc():
    """Set up WebRTC connection to OpenAI's Realtime API."""
    pc = RTCPeerConnection()
    
    # Set up to play remote audio from the model
    @pc.on("track")
    def on_track(track):
        print(f"Track received: {track.kind}")
        if track.kind == "audio":
            # Play the audio
            audio_data = track.audio.getData()
            sd.play(audio_data, RATE)
            sd.wait()
    
    # Add local audio track for microphone input
    audio = MediaPlayer(
        "default",  # Use default audio input
        format="avfoundation",  # Use AVFoundation for macOS
        options={
            "channels": CHANNELS,
            "rate": RATE,
            "sample_rate": RATE,
            "frame_size": CHUNK
        }
    )
    
    # Add audio track to peer connection
    track = audio.audio
    pc.addTrack(track)
    
    return pc, audio

async def text_to_speech(text):
    audio_start_time = time.time()
    try:
        # Set up WebRTC connection
        pc, audio = await setup_webrtc()
        
        # Create and set local description
        offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        
        # Exchange signaling with OpenAI's Realtime API
        # This is where you would typically send the offer to OpenAI's signaling server
        # and receive the answer
        
        # For now, we'll simulate the connection
        print("Local description:", pc.localDescription.sdp)
        
        # Send text through data channel
        channel = pc.createDataChannel("text")
        await channel.send(text)
        
        # Keep the connection alive while processing
        await asyncio.sleep(5)  # Adjust as needed
        
        # Clean up
        await pc.close()
        audio.stop()
        
        return time.time() - audio_start_time
    except Exception as e:
        print(f"Error in text_to_speech: {e}")
        return time.time() - audio_start_time 