import { useState, FormEvent } from "react";
import { Send, Smile, Mic, Phone, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { toast } from "sonner";

export interface VoiceMessagePayload {
  transcript: string;
  audioUrl: string;
  durationMs: number;
}

interface ChatInputProps {
  onSend: (message: string) => void;
  onVoiceClick: () => void; // call
  onVoiceMessage: (payload: VoiceMessagePayload) => void; // in-chat voice message
  isLoading?: boolean;
}

export const ChatInput = ({
  onSend,
  onVoiceClick,
  onVoiceMessage,
  isLoading,
}: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const { isSupported, isRecording, start, stop } = useVoiceRecorder();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleVoiceMessageToggle = async () => {
    if (isLoading) return;

    if (!isSupported) {
      toast.error("Voice message not supported on this device/browser.");
      return;
    }

    try {
      if (!isRecording) {
        await start();
      } else {
        const res = await stop();
        if (!res) return;

        const transcript = res.transcript || "(voice message)";
        onVoiceMessage({ transcript, audioUrl: res.audioUrl, durationMs: res.durationMs });
      }
    } catch (err) {
      console.error(err);
      toast.error("Voice message failed. Please try again.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-card px-3 py-2 flex items-center gap-2 border-t border-border/50"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="rounded-full text-muted-foreground hover:text-primary shrink-0"
      >
        <Smile className="w-5 h-5" />
      </Button>

      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={isRecording ? "Recording voice message…" : "Type a message…"}
        className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
        disabled={isLoading || isRecording}
      />

      {message.trim() ? (
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Button
            type="submit"
            size="icon"
            className="rounded-full romantic-gradient shrink-0"
            disabled={isLoading}
          >
            <Send className="w-4 h-4" />
          </Button>
        </motion.div>
      ) : (
        <div className="flex items-center gap-2">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Button
              type="button"
              size="icon"
              className="rounded-full romantic-gradient shrink-0"
              onClick={handleVoiceMessageToggle}
              disabled={isLoading}
              aria-label={isRecording ? "Stop recording" : "Record voice message"}
            >
              {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          </motion.div>

          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Button
              type="button"
              size="icon"
              className="rounded-full romantic-gradient shrink-0"
              onClick={onVoiceClick}
              disabled={isLoading}
              aria-label="Start call"
            >
              <Phone className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      )}
    </form>
  );
};
