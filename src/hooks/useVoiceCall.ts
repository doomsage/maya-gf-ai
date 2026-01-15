import { useState, useRef, useCallback, useEffect } from "react";

interface UseVoiceCallOptions {
  onUserTranscript: (text: string) => void;
  onMayaResponse: (text: string) => void;
  onMayaSpeakingChange: (isSpeaking: boolean) => void;
  onError: (error: string) => void;
}

export const useVoiceCall = ({
  onUserTranscript,
  onMayaResponse,
  onMayaSpeakingChange,
  onError,
}: UseVoiceCallOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Use any for recognition since types are defined globally
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize audio context and analyser for visualizer
  const initAudioContext = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      // Start monitoring audio levels
      const updateLevel = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average / 255);
        }
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
      
      return true;
    } catch (error) {
      console.error("Microphone access error:", error);
      onError("Microphone access denied. Please allow microphone access.");
      return false;
    }
  }, [onError]);

  // Initialize speech recognition
  const initSpeechRecognition = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      onError("Speech recognition not supported in this browser.");
      return null;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "hi-IN"; // Hindi for Hinglish support

    recognition.onresult = (event) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0].transcript;
      
      if (lastResult.isFinal) {
        onUserTranscript(transcript);
        // Send to Maya
        sendToMaya(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "no-speech") {
        onError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // Restart if still connected
      if (isConnected && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Already started
        }
      }
    };

    return recognition;
  }, [onUserTranscript, onError, isConnected]);

  // Send message to Maya and speak response
  const sendToMaya = useCallback(async (text: string) => {
    try {
      setIsListening(false);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/maya-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: text }],
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullResponse += content;
              }
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }
      }

      if (fullResponse) {
        onMayaResponse(fullResponse);
        await speakMayaResponse(fullResponse);
      }
      
      setIsListening(true);
    } catch (error) {
      console.error("Maya call error:", error);
      onError("Connection error. Maya couldn't respond.");
      setIsListening(true);
    }
  }, [onMayaResponse, onError]);

  // Speak Maya's response using TTS
  const speakMayaResponse = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "hi-IN";
      utterance.rate = 1.0;
      utterance.pitch = 1.1; // Slightly higher for feminine voice
      
      // Try to find a Hindi female voice
      const voices = window.speechSynthesis.getVoices();
      const hindiVoice = voices.find(
        (v) => v.lang.includes("hi") && v.name.toLowerCase().includes("female")
      );
      const femaleVoice = voices.find(
        (v) => v.name.toLowerCase().includes("female") || v.name.includes("Samantha")
      );
      
      if (hindiVoice) {
        utterance.voice = hindiVoice;
      } else if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      utterance.onstart = () => {
        onMayaSpeakingChange(true);
      };

      utterance.onend = () => {
        onMayaSpeakingChange(false);
        resolve();
      };

      utterance.onerror = () => {
        onMayaSpeakingChange(false);
        resolve();
      };

      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    });
  }, [onMayaSpeakingChange]);

  // Start the call
  const startCall = useCallback(async () => {
    const audioReady = await initAudioContext();
    if (!audioReady) return;

    const recognition = initSpeechRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
      setIsConnected(true);
      setIsListening(true);
      
      // Maya greets on call start
      const greeting = "Hello janu! Achha laga call karke. Bolo, kya chal raha hai? 💕";
      onMayaResponse(greeting);
      await speakMayaResponse(greeting);
    } catch (error) {
      console.error("Failed to start call:", error);
      onError("Failed to start the call.");
    }
  }, [initAudioContext, initSpeechRecognition, onMayaResponse, speakMayaResponse, onError]);

  // End the call
  const endCall = useCallback(() => {
    // Stop speech recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    // Stop speech synthesis
    window.speechSynthesis.cancel();

    // Stop audio context
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setIsConnected(false);
    setIsListening(false);
    setAudioLevel(0);
  }, []);

  // Interrupt Maya's speech
  const interruptMaya = useCallback(() => {
    window.speechSynthesis.cancel();
    onMayaSpeakingChange(false);
  }, [onMayaSpeakingChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  // Load voices
  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.getVoices();
    };
  }, []);

  return {
    isConnected,
    isListening,
    audioLevel,
    startCall,
    endCall,
    interruptMaya,
  };
};
