import { useState, FormEvent } from "react";
import { Send, Smile, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface ChatInputProps {
  onSend: (message: string) => void;
  onVoiceClick: () => void;
  isLoading?: boolean;
}

export const ChatInput = ({ onSend, onVoiceClick, isLoading }: ChatInputProps) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSend(message.trim());
      setMessage("");
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
        placeholder="Type a message..."
        className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
        disabled={isLoading}
      />

      {message.trim() ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
        >
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
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
        >
          <Button
            type="button"
            size="icon"
            className="rounded-full romantic-gradient shrink-0"
            onClick={onVoiceClick}
          >
            <Mic className="w-4 h-4" />
          </Button>
        </motion.div>
      )}
    </form>
  );
};
