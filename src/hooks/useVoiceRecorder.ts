import { useCallback, useRef, useState } from "react";

export interface VoiceRecordingResult {
  audioUrl: string;
  audioBlob: Blob;
  transcript: string;
  durationMs: number;
}

export const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);

  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");

  const isSupported =
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  const start = useCallback(async () => {
    if (!isSupported || isRecording) return false;

    transcriptRef.current = "";
    chunksRef.current = [];
    startedAtRef.current = Date.now();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.start();

    // Optional live transcript (best-effort)
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      const rec = new SpeechRecognitionAPI();
      recognitionRef.current = rec;
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "hi-IN";

      rec.onresult = (event: any) => {
        let appended = false;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0]?.transcript;
          if (!t) continue;
          if (event.results[i].isFinal) {
            transcriptRef.current = `${transcriptRef.current} ${t}`.trim();
            appended = true;
          }
        }

        // If no final yet, keep the latest interim as fallback
        if (!appended) {
          const last = event.results[event.results.length - 1];
          if (last && last[0]?.transcript) {
            transcriptRef.current = last[0].transcript.trim();
          }
        }
      };

      try {
        rec.start();
      } catch {
        // ignore
      }
    }

    setIsRecording(true);
    return true;
  }, [isRecording, isSupported]);

  const stop = useCallback(async (): Promise<VoiceRecordingResult | null> => {
    if (!isRecording) return null;

    const recorder = mediaRecorderRef.current;
    const stream = streamRef.current;
    const recognition = recognitionRef.current;

    setIsRecording(false);

    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    const durationMs = Math.max(0, Date.now() - startedAtRef.current);

    const blob = await new Promise<Blob>((resolve) => {
      if (!recorder) {
        resolve(new Blob());
        return;
      }

      recorder.onstop = () => {
        const out = new Blob(chunksRef.current, { type: recorder.mimeType });
        resolve(out);
      };

      try {
        recorder.stop();
      } catch {
        // If already stopped
        const out = new Blob(chunksRef.current);
        resolve(out);
      }
    });

    // Cleanup stream
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;

    const audioUrl = URL.createObjectURL(blob);

    return {
      audioUrl,
      audioBlob: blob,
      transcript: transcriptRef.current.trim(),
      durationMs,
    };
  }, [isRecording]);

  return { isSupported, isRecording, start, stop };
};
