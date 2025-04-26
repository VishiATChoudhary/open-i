/**
 * Running a local relay server will allow you to hide your API key
 * and run custom logic on the server
 *
 * Set the local relay server address to:
 * REACT_APP_LOCAL_RELAY_SERVER_URL=http://localhost:8081
 *
 * This will also require you to set OPENAI_API_KEY= in a `.env` file
 * You can run it with `npm run relay`, in parallel with `npm start`
 */
const LOCAL_RELAY_SERVER_URL: string =
  process.env.REACT_APP_LOCAL_RELAY_SERVER_URL || '';

import { useEffect, useRef, useCallback, useState } from 'react';

import { RealtimeClient } from '@openai/realtime-api-beta';
import { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js';
import { WavRecorder, WavStreamPlayer } from '../lib/wavtools/index.js';
import { instructions } from '../utils/conversation_config.js';
import { WavRenderer } from '../utils/wav_renderer';
import { GoogleGenerativeAI } from '@google/generative-ai';

import { X, Edit, Zap, ArrowUp, ArrowDown } from 'react-feather';
import { Button } from '../components/button/Button';
import { Toggle } from '../components/toggle/Toggle';

import './ConsolePage.scss';

/**
 * Type for all event logs
 */
interface RealtimeEvent {
  time: string;
  source: 'client' | 'server';
  count?: number;
  event: { [key: string]: any };
}

export function ConsolePage() {
  /**
   * Ask user for API Key
   * If we're using the local relay server, we don't need this
   */
  const apiKey = LOCAL_RELAY_SERVER_URL
    ? ''
    : localStorage.getItem('tmp::voice_api_key') ||
      prompt('OpenAI API Key') ||
      '';
  if (apiKey !== '') {
    localStorage.setItem('tmp::voice_api_key', apiKey);
  }

  const [queryResults, setQueryResults] = useState<string[]>([]);  // Add this state for storing results
  const [lastQueryTime, setLastQueryTime] = useState<number>(Date.now());  // Add this state for tracking last query time
  
  /**
   * Instantiate:
   * - WavRecorder (speech input)
   * - WavStreamPlayer (speech output)
   * - RealtimeClient (API client)
   */
  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 })
  );
  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );
  const clientRef = useRef<RealtimeClient>(
    new RealtimeClient(
      LOCAL_RELAY_SERVER_URL
        ? { url: LOCAL_RELAY_SERVER_URL }
        : {
            apiKey: apiKey,
            dangerouslyAllowAPIKeyInBrowser: true,
          }
    )
  );

  /**
   * References for
   * - Rendering audio visualization (canvas)
   * - Autoscrolling event logs
   * - Timing delta for event log displays
   */
  const clientCanvasRef = useRef<HTMLCanvasElement>(null);
  const serverCanvasRef = useRef<HTMLCanvasElement>(null);
  const eventsScrollHeightRef = useRef(0);
  const eventsScrollRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<string>(new Date().toISOString());

  /**
   * All of our variables for displaying application state
   * - items are all conversation items (dialog)
   * - realtimeEvents are event logs, which can be expanded
   * - memoryKv is for set_memory() function
   * - coords, marker are for get_weather() function
   */
  const [items, setItems] = useState<ItemType[]>([]);
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<{
    [key: string]: boolean;
  }>({});
  const [isConnected, setIsConnected] = useState(false);
  const [canPushToTalk, setCanPushToTalk] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [imageDescription, setImageDescription] = useState<string>('');
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize Gemini
  const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  /**
   * Utility for formatting the timing of logs
   */
  const formatTime = useCallback((timestamp: string) => {
    const startTime = startTimeRef.current;
    const t0 = new Date(startTime).valueOf();
    const t1 = new Date(timestamp).valueOf();
    const delta = t1 - t0;
    const hs = Math.floor(delta / 10) % 100;
    const s = Math.floor(delta / 1000) % 60;
    const m = Math.floor(delta / 60_000) % 60;
    const pad = (n: number) => {
      let s = n + '';
      while (s.length < 2) {
        s = '0' + s;
      }
      return s;
    };
    return `${pad(m)}:${pad(s)}.${pad(hs)}`;
  }, []);

  /**
   * When you click the API key
   */
  const resetAPIKey = useCallback(() => {
    const apiKey = prompt('OpenAI API Key');
    if (apiKey !== null) {
      localStorage.clear();
      localStorage.setItem('tmp::voice_api_key', apiKey);
      window.location.reload();
    }
  }, []);

  /**
   * Connect to conversation:
   * WavRecorder taks speech input, WavStreamPlayer output, client is API client
   */
  const connectConversation = useCallback(async () => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    // Set state variables
    startTimeRef.current = new Date().toISOString();
    setIsConnected(true);
    setRealtimeEvents([]);
    setItems(client.conversation.getItems());

    // Connect to microphone
    await wavRecorder.begin();

    // Connect to audio output
    await wavStreamPlayer.connect();

    // Connect to realtime API
    await client.connect();
    client.sendUserMessageContent([
      {
        type: `input_text`,
        text: `Hello!`,
        // text: `For testing purposes, I want you to list ten car brands. Number each item, e.g. "one (or whatever number you are one): the item name".`
      },
    ]);

    if (client.getTurnDetectionType() === 'server_vad') {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    }
  }, []);

  /**
   * Disconnect and reset conversation state
   */
  const disconnectConversation = useCallback(async () => {
    setIsConnected(false);
    setRealtimeEvents([]);
    setItems([]);

    const client = clientRef.current;
    client.disconnect();

    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.end();

    const wavStreamPlayer = wavStreamPlayerRef.current;
    await wavStreamPlayer.interrupt();
  }, []);

  const deleteConversationItem = useCallback(async (id: string) => {
    const client = clientRef.current;
    client.deleteItem(id);
  }, []);

  /**
   * In push-to-talk mode, start recording
   * .appendInputAudio() for each sample
   */
  const startRecording = async () => {
    setIsRecording(true);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const trackSampleOffset = await wavStreamPlayer.interrupt();
    if (trackSampleOffset?.trackId && client.isConnected()) {
      const { trackId, offset } = trackSampleOffset;
      try {
        await client.cancelResponse(trackId, offset);
      } catch (error) {
        console.warn('Failed to cancel response:', error);
      }
    }
    await wavRecorder.record((data) => client.appendInputAudio(data.mono));
  };

  /**
   * In push-to-talk mode, stop recording
   */
  const stopRecording = async () => {
    setIsRecording(false);
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.pause();
    client.createResponse();
  };

  /**
   * Switch between Manual <> VAD mode for communication
   */
  const changeTurnEndType = async (value: string) => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    if (value === 'none' && wavRecorder.getStatus() === 'recording') {
      await wavRecorder.pause();
    }
    client.updateSession({
      turn_detection: value === 'none' ? null : { type: 'server_vad' },
    });
    if (value === 'server_vad' && client.isConnected()) {
      await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    }
    setCanPushToTalk(value === 'none');
  };

  /**
   * Auto-scroll the event logs
   */
  useEffect(() => {
    if (eventsScrollRef.current) {
      const eventsEl = eventsScrollRef.current;
      const scrollHeight = eventsEl.scrollHeight;
      // Only scroll if height has just changed
      if (scrollHeight !== eventsScrollHeightRef.current) {
        eventsEl.scrollTop = scrollHeight;
        eventsScrollHeightRef.current = scrollHeight;
      }
    }
  }, [realtimeEvents]);

  /**
   * Auto-scroll the conversation logs
   */
  useEffect(() => {
    const conversationEls = [].slice.call(
      document.body.querySelectorAll('[data-conversation-content]')
    );
    for (const el of conversationEls) {
      const conversationEl = el as HTMLDivElement;
      conversationEl.scrollTop = conversationEl.scrollHeight;
    }
  }, [items]);

  useEffect(() => {
    // This effect will run whenever queryResults changes
    console.log('Query results updated:', queryResults);
  }, [queryResults]);

  /**
   * Set up render loops for the visualization canvas
   */
  useEffect(() => {
    let isLoaded = true;

    const wavRecorder = wavRecorderRef.current;
    const clientCanvas = clientCanvasRef.current;
    let clientCtx: CanvasRenderingContext2D | null = null;

    const wavStreamPlayer = wavStreamPlayerRef.current;
    const serverCanvas = serverCanvasRef.current;
    let serverCtx: CanvasRenderingContext2D | null = null;

    const render = () => {
      if (isLoaded) {
        if (clientCanvas) {
          if (!clientCanvas.width || !clientCanvas.height) {
            clientCanvas.width = clientCanvas.offsetWidth;
            clientCanvas.height = clientCanvas.offsetHeight;
          }
          clientCtx = clientCtx || clientCanvas.getContext('2d');
          if (clientCtx) {
            clientCtx.clearRect(0, 0, clientCanvas.width, clientCanvas.height);
            const result = wavRecorder.recording
              ? wavRecorder.getFrequencies('voice')
              : { values: new Float32Array([0]) };
            WavRenderer.drawBars(
              clientCanvas,
              clientCtx,
              result.values,
              '#0099ff',
              10,
              0,
              8
            );
          }
        }
        if (serverCanvas) {
          if (!serverCanvas.width || !serverCanvas.height) {
            serverCanvas.width = serverCanvas.offsetWidth;
            serverCanvas.height = serverCanvas.offsetHeight;
          }
          serverCtx = serverCtx || serverCanvas.getContext('2d');
          if (serverCtx) {
            serverCtx.clearRect(0, 0, serverCanvas.width, serverCanvas.height);
            const result = wavStreamPlayer.analyser
              ? wavStreamPlayer.getFrequencies('voice')
              : { values: new Float32Array([0]) };
            WavRenderer.drawBars(
              serverCanvas,
              serverCtx,
              result.values,
              '#009900',
              10,
              0,
              8
            );
          }
        }
        window.requestAnimationFrame(render);
      }
    };
    render();

    return () => {
      isLoaded = false;
    };
  }, []);

  /**
   * Core RealtimeClient and audio capture setup
   * Set all of our instructions, tools, events and more
   */
  useEffect(() => {
    // Get refs
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const client = clientRef.current;

    // Set instructions
    client.updateSession({ instructions: instructions });
    client.updateSession({ voice: 'echo'})
    // Set transcription, otherwise we don't get user transcriptions back
    client.updateSession({ input_audio_transcription: { model: 'whisper-1' } });

    // Add tools
    client.addTool(
      {
        name: 'query_db',
        description: 'Queries the knowledgebase stored in the vector DB to retrieve relevant and specific context.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The query string to search the knowledgebase',
            },
          },
          required: ['query'],
        },
      },
      async ({ query }: { query: string }) => {
        try {
          const response = await fetch('http://localhost:8000/query', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
          });
    
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || 'Failed to query database');
          }
    
          const data = await response.json();
          setQueryResults(data.results);  // Update the state with query results
          return data.results;
        } catch (error) {
          console.error('Error querying database:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to query database';
          setQueryResults([errorMessage]);
          return [errorMessage];
        }
      }
    );

    // handle realtime events from client + server for event logging
    client.on('realtime.event', (realtimeEvent: RealtimeEvent) => {
      setRealtimeEvents((realtimeEvents) => {
        const lastEvent = realtimeEvents[realtimeEvents.length - 1];
        if (lastEvent?.event.type === realtimeEvent.event.type) {
          // if we receive multiple events in a row, aggregate them for display purposes
          lastEvent.count = (lastEvent.count || 0) + 1;
          return realtimeEvents.slice(0, -1).concat(lastEvent);
        } else {
          return realtimeEvents.concat(realtimeEvent);
        }
      });
    });
    client.on('error', (event: any) => console.error(event));
    client.on('conversation.interrupted', async () => {
      const trackSampleOffset = await wavStreamPlayer.interrupt();
      if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset;
        await client.cancelResponse(trackId, offset);
      }
    });
    client.on('conversation.updated', async ({ item, delta }: any) => {
      const items = client.conversation.getItems();
      if (delta?.audio) {
        wavStreamPlayer.add16BitPCM(delta.audio, item.id);
      }
      if (item.status === 'completed' && item.formatted.audio?.length) {
        const wavFile = await WavRecorder.decode(
          item.formatted.audio,
          24000,
          24000
        );
        item.formatted.file = wavFile;
      }
      setItems(items);
    });

    setItems(client.conversation.getItems());

    return () => {
      // cleanup; resets to defaults
      client.reset();
    };
  }, []);

  // Add polling effect for refreshing documents
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:8000/query', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: "latest gemini analysis" }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch latest documents');
        }

        const data = await response.json();
        setQueryResults(data.results);
        setLastQueryTime(Date.now());
      } catch (error) {
        console.error('Error polling for latest documents:', error);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, []);

  // Add timestamp display to the documents section
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Add webcam functionality
  useEffect(() => {
    let stream: MediaStream | null = null;

    const captureFrame = async () => {
      if (!videoRef.current || !canvasRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to base64
      const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];
      
      try {
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
        setImageDescription(text);

        // Store the Gemini response in ChromaDB
        try {
          const storeResponse = await fetch('http://localhost:8000/store', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ document: text }),
          });

          if (!storeResponse.ok) {
            console.error('Failed to store document in ChromaDB');
          }
        } catch (error) {
          console.error('Error storing document in ChromaDB:', error);
        }
      } catch (error) {
        console.error('Error analyzing image:', error);
      }
    };

    const startWebcam = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: true,
          audio: false 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsWebcamActive(true);
          
          // Start capturing frames every 2 seconds
          frameIntervalRef.current = setInterval(captureFrame, 2000);
        }
      } catch (err) {
        console.error('Error accessing webcam:', err);
        setIsWebcamActive(false);
      }
    };

    const stopWebcam = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        setIsWebcamActive(false);
        
        // Clear frame capture interval
        if (frameIntervalRef.current) {
          clearInterval(frameIntervalRef.current);
          frameIntervalRef.current = null;
        }
      }
    };

    // Start webcam when component mounts
    startWebcam();

    // Cleanup when component unmounts
    return () => {
      stopWebcam();
    };
  }, []);

  /**
   * Render the application
   */
  return (
    <div data-component="ConsolePage">
      <div className="content-top">
        <div className="content-title">
          <img src="/openai-logomark.svg" />
          <span>Realtime RAG Assistant - Prepared By Adam Lucek</span>
        </div>
        <div className="content-api-key">
          {!LOCAL_RELAY_SERVER_URL && (
            <Button
              icon={Edit}
              iconPosition="end"
              buttonStyle="flush"
              label={`api key: ${apiKey.slice(0, 3)}...`}
              onClick={() => resetAPIKey()}
            />
          )}
        </div>
      </div>
      <div className="content-main">
        <div className="content-logs">
          <div className="content-block events">
            <div className="visualization">
              <div className="visualization-entry client">
                <canvas ref={clientCanvasRef} />
              </div>
              <div className="visualization-entry server">
                <canvas ref={serverCanvasRef} />
              </div>
            </div>
            <div className="content-block-title">events</div>
            <div className="content-block-body" ref={eventsScrollRef}>
              {!realtimeEvents.length && `awaiting connection...`}
              {realtimeEvents.map((realtimeEvent, i) => {
                const count = realtimeEvent.count;
                const event = { ...realtimeEvent.event };
                if (event.type === 'input_audio_buffer.append') {
                  event.audio = `[trimmed: ${event.audio.length} bytes]`;
                } else if (event.type === 'response.audio.delta') {
                  event.delta = `[trimmed: ${event.delta.length} bytes]`;
                }
                return (
                  <div className="event" key={event.event_id}>
                    <div className="event-timestamp">
                      {formatTime(realtimeEvent.time)}
                    </div>
                    <div className="event-details">
                      <div
                        className="event-summary"
                        onClick={() => {
                          // toggle event details
                          const id = event.event_id;
                          const expanded = { ...expandedEvents };
                          if (expanded[id]) {
                            delete expanded[id];
                          } else {
                            expanded[id] = true;
                          }
                          setExpandedEvents(expanded);
                        }}
                      >
                        <div
                          className={`event-source ${
                            event.type === 'error'
                              ? 'error'
                              : realtimeEvent.source
                          }`}
                        >
                          {realtimeEvent.source === 'client' ? (
                            <ArrowUp />
                          ) : (
                            <ArrowDown />
                          )}
                          <span>
                            {event.type === 'error'
                              ? 'error!'
                              : realtimeEvent.source}
                          </span>
                        </div>
                        <div className="event-type">
                          {event.type}
                          {count && ` (${count})`}
                        </div>
                      </div>
                      {!!expandedEvents[event.event_id] && (
                        <div className="event-payload">
                          {JSON.stringify(event, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="content-block conversation">
            <div className="content-block-title">conversation</div>
            <div className="content-block-body" data-conversation-content>
              {!items.length && `awaiting connection...`}
              {items.map((conversationItem, i) => {
                return (
                  <div className="conversation-item" key={conversationItem.id}>
                    <div className={`speaker ${conversationItem.role || ''}`}>
                      <div>
                        {(
                          conversationItem.role || conversationItem.type
                        ).replaceAll('_', ' ')}
                      </div>
                      <div
                        className="close"
                        onClick={() =>
                          deleteConversationItem(conversationItem.id)
                        }
                      >
                        <X />
                      </div>
                    </div>
                    <div className={`speaker-content`}>
                      {/* tool response */}
                      {conversationItem.type === 'function_call_output' && (
                        <div>{conversationItem.formatted.output}</div>
                      )}
                      {/* tool call */}
                      {!!conversationItem.formatted.tool && (
                        <div>
                          {conversationItem.formatted.tool.name}(
                          {conversationItem.formatted.tool.arguments})
                        </div>
                      )}
                      {!conversationItem.formatted.tool &&
                        conversationItem.role === 'user' && (
                          <div>
                            {conversationItem.formatted.transcript ||
                              (conversationItem.formatted.audio?.length
                                ? '(awaiting transcript)'
                                : conversationItem.formatted.text ||
                                  '(item sent)')}
                          </div>
                        )}
                      {!conversationItem.formatted.tool &&
                        conversationItem.role === 'assistant' && (
                          <div>
                            {conversationItem.formatted.transcript ||
                              conversationItem.formatted.text ||
                              '(truncated)'}
                          </div>
                        )}
                      {conversationItem.formatted.file && (
                        <audio
                          src={conversationItem.formatted.file.url}
                          controls
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="content-actions">
            <Toggle
              defaultValue={false}
              labels={['manual', 'vad']}
              values={['none', 'server_vad']}
              onChange={(_, value) => changeTurnEndType(value)}
            />
            <div className="spacer" />
            {isConnected && canPushToTalk && (
              <Button
                label={isRecording ? 'release to send' : 'push to talk'}
                buttonStyle={isRecording ? 'alert' : 'regular'}
                disabled={!isConnected || !canPushToTalk}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
              />
            )}
            <div className="spacer" />
            <Button
              label={isConnected ? 'disconnect' : 'connect'}
              iconPosition={isConnected ? 'end' : 'start'}
              icon={isConnected ? X : Zap}
              buttonStyle={isConnected ? 'regular' : 'action'}
              onClick={
                isConnected ? disconnectConversation : connectConversation
              }
            />
          </div>
        </div>
        <div className="content-right">
          <div className="content-block map">
            <div className="content-block-body full">
              <div className="sidebar">
                <div className="webcam-section">
                  <h3>Webcam Feed</h3>
                  <div className="webcam-container">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ width: '100%', height: '200px', backgroundColor: '#f0f0f0' }}
                    />
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                    {!isWebcamActive && (
                      <div style={{ 
                        position: 'absolute', 
                        top: '50%', 
                        left: '50%', 
                        transform: 'translate(-50%, -50%)',
                        color: '#666',
                        textAlign: 'center'
                      }}>
                        Webcam not available
                      </div>
                    )}
                  </div>
                  <div className="gemini-results" style={{ 
                    marginTop: '20px', 
                    padding: '15px', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '8px',
                    border: '1px solid #e9ecef',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}>
                    <h4 style={{ 
                      margin: '0 0 10px 0', 
                      color: '#2c3e50',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}>Gemini Image Analysis</h4>
                    {imageDescription ? (
                      <p style={{ 
                        margin: '0',
                        color: '#495057',
                        fontSize: '14px',
                        lineHeight: '1.5'
                      }}>{imageDescription}</p>
                    ) : (
                      <p style={{ 
                        margin: '0',
                        color: '#6c757d',
                        fontSize: '14px',
                        fontStyle: 'italic'
                      }}>Waiting for image analysis...</p>
                    )}
                  </div>
                  <button 
                    onClick={async () => {
                      try {
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
                        setImageDescription(text);
                      } catch (error) {
                        console.error('Error testing Gemini:', error);
                        setImageDescription('Error testing Gemini: ' + (error as Error).message);
                      }
                    }}
                    style={{
                      marginTop: '10px',
                      padding: '8px 16px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Test Gemini
                  </button>
                </div>
                <div className="documents-section">
                  <h3>Retrieved Documents</h3>
                  <div className="sidebar-content" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#666', 
                      marginBottom: '8px' 
                    }}>
                      Last updated: {formatTimestamp(lastQueryTime)}
                    </div>
                    {queryResults.length > 0 ? (
                      <ul>
                        {queryResults.map((result, index) => (
                          <li key={index}>{result}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>No results yet. Results retrieved from Voice Assistant will show up here.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
