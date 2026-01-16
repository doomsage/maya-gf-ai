import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface Message {
  id: string;
  content: string;
  sender: "user" | "maya";
  timestamp: Date;
  imageUrl?: string;
}

interface ChatBubbleProps {
  message: Message;
}

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
        {/* Image if present */}
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
        
        {message.content && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
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

        {/* Bubble tail */}
        <div
          className={cn(
            "absolute bottom-0 w-3 h-3",
            isUser
              ? "-right-1.5 bg-chat-user"
              : "-left-1.5 bg-chat-maya",
            isUser
              ? "[clip-path:polygon(0_0,100%_0,100%_100%)]"
              : "[clip-path:polygon(0_0,100%_0,0_100%)]"
          )}
        />
      </div>
    </motion.div>
  );
};
