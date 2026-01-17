import { useCallback, useEffect, useRef, useState } from "react";

interface UseVoiceCallOptions {
  onUserTranscript: (text: string) => void;
  onMayaResponse: (text: string) => void;
  onMayaSpeakingChange: (isSpeaking: boolean) => void;
  onError: (error: string) => void;
}

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

  // Important: speech recognition callbacks often capture stale state.
  const isConnectedRef = useRef(false);
  const shouldListenRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const isSendingRef = useRef(false);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  const safeStartRecognition = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (!isConnectedRef.current) return;
    if (!shouldListenRef.current) return;
    if (isSendingRef.current) return;
    if (isSpeakingRef.current) return;

    try {
      rec.start();
      setIsListening(true);
    } catch {
      // Already started or not allowed to start yet
    }
  }, []);

  const safeStopRecognition = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {
      // ignore
    }
    setIsListening(false);
  }, []);

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

  const findFemaleVoice = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();

    const preferredVoices = [
      "Google हिन्दी",
      "Lekha",
      "Veena",
      "Samantha",
      "Karen",
      "Moira",
      "Tessa",
      "Victoria",
    ];

    for (const name of preferredVoices) {
      const voice = voices.find((v) => v.name.includes(name));
      if (voice) return voice;
    }

    const femaleVoice = voices.find(
      (v) => v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("woman")
    );

    return femaleVoice || voices.find((v) => v.lang.includes("hi")) || voices[0];
  }, []);

  const speakMayaResponse = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        window.speechSynthesis.cancel();

        const cleanText = text
          .replace(/\[SEND_PHOTO\]/g, "")
          .replace(/💕|😊|🙄|😤|😔|❤️|😏|🥺|😒|💔|🤔|😢/g, "")
          .trim();

        if (!cleanText) {
          resolve();
          return;
        }

        // Avoid Maya's TTS being picked up by recognition
        safeStopRecognition();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "hi-IN";
        utterance.rate = 1.05;
        utterance.pitch = 1.1;
        utterance.volume = 1;

        const voice = findFemaleVoice();
        if (voice) utterance.voice = voice;

        utterance.onstart = () => {
          isSpeakingRef.current = true;
          setIsMayaSpeaking(true);
          onMayaSpeakingChange(true);
        };

        const finish = () => {
          isSpeakingRef.current = false;
          setIsMayaSpeaking(false);
          onMayaSpeakingChange(false);
          // Resume listening once she finishes speaking
          setTimeout(() => safeStartRecognition(), 250);
          resolve();
        };

        utterance.onend = finish;
        utterance.onerror = finish;

        window.speechSynthesis.speak(utterance);
      });
    },
    [findFemaleVoice, onMayaSpeakingChange, safeStartRecognition, safeStopRecognition]
  );

  const sendToMaya = useCallback(
    async (text: string) => {
      try {
        isSendingRef.current = true;
        shouldListenRef.current = false;
        safeStopRecognition();

        conversationRef.current.push({ role: "user", content: text });
        if (conversationRef.current.length > 10) {
          conversationRef.current = conversationRef.current.slice(-10);
        }

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/maya-chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: conversationRef.current }),
        });

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
              if (line.startsWith(":")) continue;
              if (line.trim() === "") continue;
              if (!line.startsWith("data: ")) continue;

              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") break;

              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) fullResponse += content;
              } catch {
                buffer = line + "\n" + buffer;
                break;
              }
            }
          }
        }

        if (fullResponse) {
          conversationRef.current.push({ role: "assistant", content: fullResponse });
          const display = fullResponse.replace(/\[SEND_PHOTO\]/g, "").trim();
          onMayaResponse(display);
          await speakMayaResponse(fullResponse);
        }
      } catch (error) {
        console.error("Maya call error:", error);
        onError("Connection issue. Try again.");
      } finally {
        isSendingRef.current = false;
        shouldListenRef.current = true;
        setTimeout(() => safeStartRecognition(), 250);
      }
    },
    [onError, onMayaResponse, safeStartRecognition, safeStopRecognition, speakMayaResponse]
  );

  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      onError("Speech recognition not supported.");
      return null;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "hi-IN";

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0]?.transcript;
        if (!transcript) continue;

        if (event.results[i].isFinal) {
          // User spoke a final phrase
          const finalText = transcript.trim();
          if (!finalText) continue;

          onUserTranscript(finalText);
          sendToMaya(finalText);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error:", event.error);

      // Common transient errors: keep trying
      const transient = new Set(["no-speech", "aborted", "audio-capture", "network"]);
      if (!transient.has(event.error)) {
        onError(`Speech error: ${event.error}`);
      }

      setTimeout(() => safeStartRecognition(), 400);
    };

    recognition.onend = () => {
      // Critical fix: restart based on refs (not stale closure state)
      setTimeout(() => safeStartRecognition(), 350);
    };

    return recognition;
  }, [onError, onUserTranscript, safeStartRecognition, sendToMaya]);

  const startCall = useCallback(async () => {
    // Ensure voices are available
    window.speechSynthesis.getVoices();

    const audioReady = await initAudioContext();
    if (!audioReady) return;

    const recognition = initSpeechRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    conversationRef.current = [];

    setIsConnected(true);
    isConnectedRef.current = true;

    shouldListenRef.current = true;

    try {
      safeStartRecognition();

      // Greeting
      const greeting = "Haan bolo jaanu. 💕";
      onMayaResponse(greeting);
      await speakMayaResponse(greeting);
    } catch (error) {
      console.error("Failed to start:", error);
      onError("Failed to start call.");
    }
  }, [initAudioContext, initSpeechRecognition, onError, onMayaResponse, safeStartRecognition, speakMayaResponse]);

  const endCall = useCallback(() => {
    shouldListenRef.current = false;
    isConnectedRef.current = false;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    window.speechSynthesis.cancel();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    conversationRef.current = [];
    setIsConnected(false);
    setIsListening(false);
    setIsMayaSpeaking(false);
    setAudioLevel(0);
  }, []);

  const interruptMaya = useCallback(() => {
    window.speechSynthesis.cancel();
    isSpeakingRef.current = false;
    setIsMayaSpeaking(false);
    onMayaSpeakingChange(false);
    setTimeout(() => safeStartRecognition(), 200);
  }, [onMayaSpeakingChange, safeStartRecognition]);

  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

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
