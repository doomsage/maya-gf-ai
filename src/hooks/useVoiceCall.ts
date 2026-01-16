import { useState, useRef, useCallback, useEffect } from "react";

interface UseVoiceCallOptions {
  onUserTranscript: (text: string) => void;
  onMayaResponse: (text: string) => void;
  onMayaSpeakingChange: (isSpeaking: boolean) => void;
  onError: (error: string) => void;
}

// Get last 5 messages for voice context
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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
  const [isMayaSpeaking, setIsMayaSpeaking] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const conversationRef = useRef<ChatMessage[]>([]);
  const isSpeakingRef = useRef(false);

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

  // Find a good female voice
  const findFemaleVoice = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    
    // Priority order for natural female voices
    const preferredVoices = [
      "Google हिन्दी", // Hindi
      "Lekha", // Indian English
      "Veena", // Indian
      "Samantha", // Natural sounding
      "Karen", // Australian, soft
      "Moira", // Irish, pleasant
      "Tessa", // South African
      "Victoria", // Natural US
    ];
    
    for (const name of preferredVoices) {
      const voice = voices.find(v => v.name.includes(name));
      if (voice) return voice;
    }
    
    // Fallback: any female voice or first available
    const femaleVoice = voices.find(v => 
      v.name.toLowerCase().includes("female") || 
      v.name.toLowerCase().includes("woman")
    );
    
    return femaleVoice || voices.find(v => v.lang.includes("en")) || voices[0];
  }, []);

  // Speak Maya's response
  const speakMayaResponse = useCallback((text: string): Promise<void> => {
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      
      // Clean text for speaking
      const cleanText = text
        .replace(/\[SEND_PHOTO\]/g, "")
        .replace(/💕|😊|🙄|😤|😔|❤️|😏|🥺/g, "")
        .trim();
      
      if (!cleanText) {
        resolve();
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "hi-IN";
      utterance.rate = 1.05; // Slightly faster, more natural
      utterance.pitch = 1.15; // Higher for feminine
      utterance.volume = 1;
      
      const voice = findFemaleVoice();
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        isSpeakingRef.current = true;
        setIsMayaSpeaking(true);
        onMayaSpeakingChange(true);
      };

      utterance.onend = () => {
        isSpeakingRef.current = false;
        setIsMayaSpeaking(false);
        onMayaSpeakingChange(false);
        resolve();
      };

      utterance.onerror = () => {
        isSpeakingRef.current = false;
        setIsMayaSpeaking(false);
        onMayaSpeakingChange(false);
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }, [onMayaSpeakingChange, findFemaleVoice]);

  // Send to Maya
  const sendToMaya = useCallback(async (text: string) => {
    try {
      setIsListening(false);
      
      // Add to conversation history
      conversationRef.current.push({ role: "user", content: text });
      
      // Keep last 5 exchanges for context
      if (conversationRef.current.length > 10) {
        conversationRef.current = conversationRef.current.slice(-10);
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/maya-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: conversationRef.current,
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
        // Add to conversation
        conversationRef.current.push({ role: "assistant", content: fullResponse });
        
        onMayaResponse(fullResponse.replace(/\[SEND_PHOTO\]/g, "").trim());
        await speakMayaResponse(fullResponse);
      }
      
      setIsListening(true);
    } catch (error) {
      console.error("Maya call error:", error);
      onError("Connection issue. Try again.");
      setIsListening(true);
    }
  }, [onMayaResponse, onError, speakMayaResponse]);

  // Initialize speech recognition
  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      onError("Speech recognition not supported.");
      return null;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "hi-IN";

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript = transcript;
          
          // Interrupt Maya if speaking
          if (isSpeakingRef.current) {
            window.speechSynthesis.cancel();
            isSpeakingRef.current = false;
            setIsMayaSpeaking(false);
            onMayaSpeakingChange(false);
          }
          
          onUserTranscript(finalTranscript);
          sendToMaya(finalTranscript);
          finalTranscript = "";
        } else {
          interimTranscript += transcript;
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error:", event.error);
      if (event.error !== "no-speech" && event.error !== "aborted") {
        onError(`Speech error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (isConnected && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Already running
        }
      }
    };

    return recognition;
  }, [onUserTranscript, onError, isConnected, onMayaSpeakingChange, sendToMaya]);

  // Start call
  const startCall = useCallback(async () => {
    // Load voices first
    window.speechSynthesis.getVoices();
    
    const audioReady = await initAudioContext();
    if (!audioReady) return;

    const recognition = initSpeechRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    conversationRef.current = [];
    
    try {
      recognition.start();
      setIsConnected(true);
      setIsListening(true);
      
      // Short greeting
      const greeting = "Haan bolo janu! 💕";
      onMayaResponse(greeting);
      await speakMayaResponse(greeting);
    } catch (error) {
      console.error("Failed to start:", error);
      onError("Failed to start call.");
    }
  }, [initAudioContext, initSpeechRecognition, onMayaResponse, speakMayaResponse, onError]);

  // End call
  const endCall = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    window.speechSynthesis.cancel();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    conversationRef.current = [];
    setIsConnected(false);
    setIsListening(false);
    setIsMayaSpeaking(false);
    setAudioLevel(0);
  }, []);

  // Interrupt Maya
  const interruptMaya = useCallback(() => {
    window.speechSynthesis.cancel();
    isSpeakingRef.current = false;
    setIsMayaSpeaking(false);
    onMayaSpeakingChange(false);
  }, [onMayaSpeakingChange]);

  // Cleanup
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  // Load voices on mount
  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  return {
    isConnected,
    isListening,
    isMayaSpeaking,
    audioLevel,
    startCall,
    endCall,
    interruptMaya,
  };
};
