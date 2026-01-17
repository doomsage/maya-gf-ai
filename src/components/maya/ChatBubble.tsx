import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

export interface Message {
  id: string;
  content: string;
  sender: "user" | "maya";
  timestamp: Date;
  imageUrl?: string;
  audioUrl?: string;
  durationMs?: number;
  voiceText?: string; // Maya voice note (played via TTS)
}

interface ChatBubbleProps {
  message: Message;
}

const speak = (text: string) => {
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "hi-IN";
    utterance.rate = 1.05;
    utterance.pitch = 1.1;
    window.speechSynthesis.speak(utterance);
  } catch {
    // ignore
  }
};

export const ChatBubble = ({ message }: ChatBubbleProps) => {
  const isUser = message.sender === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[80%] relative",
          isUser ? "chat-bubble-user" : "chat-bubble-maya"
        )}
      >
        {message.imageUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-2 rounded-lg overflow-hidden"
          >
            <img
              src={message.imageUrl}
              alt="Maya's selfie"
              className="w-full max-w-[200px] rounded-lg"
              loading="lazy"
            />
          </motion.div>
        )}

        {message.audioUrl && (
          <div className="mb-2">
            <audio controls src={message.audioUrl} className="w-full" />
          </div>
        )}

        {message.voiceText && !isUser && (
          <div className="mb-2 flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => speak(message.voiceText || message.content)}
            >
              <Play className="w-4 h-4 mr-1" />
              Play
            </Button>
          </div>
        )}

        {message.content && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        )}

        <span
          className={cn(
            "text-[10px] mt-1 block text-right opacity-60",
            isUser ? "text-white/70" : "text-muted-foreground"
          )}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>

        <div
          className={cn(
            "absolute bottom-0 w-3 h-3",
            isUser ? "-right-1.5 bg-chat-user" : "-left-1.5 bg-chat-maya",
            isUser
              ? "[clip-path:polygon(0_0,100%_0,100%_100%)]"
              : "[clip-path:polygon(0_0,100%_0,0_100%)]"
          )}
        />
      </div>
    </motion.div>
  );
};
