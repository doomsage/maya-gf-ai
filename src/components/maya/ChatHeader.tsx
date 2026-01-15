import { Phone, MoreVertical } from "lucide-react";
import { MayaAvatar, MayaMood } from "./MayaAvatar";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface ChatHeaderProps {
  mood: MayaMood;
  status: "online" | "typing" | "in-call";
  onCallClick: () => void;
}

const statusText: Record<string, string> = {
  online: "Online",
  typing: "Typing...",
  "in-call": "In a call",
};

export const ChatHeader = ({ mood, status, onCallClick }: ChatHeaderProps) => {
  return (
    <header className="glass-card px-4 py-3 flex items-center justify-between border-b border-border/50 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <MayaAvatar size="sm" mood={mood} />
        <div>
          <h1 className="font-semibold text-foreground">
            Maya{" "}
            <span className="text-primary font-romantic text-lg">💕</span>
          </h1>
          <motion.p
            className="text-xs text-muted-foreground flex items-center gap-1.5"
            key={status}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                status === "in-call"
                  ? "bg-mood-angry animate-pulse"
                  : status === "typing"
                  ? "bg-mood-childish animate-pulse"
                  : "bg-green-500"
              }`}
            />
            {statusText[status]}
          </motion.p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-primary hover:bg-primary/10 hover:text-primary"
          onClick={onCallClick}
        >
          <Phone className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-muted-foreground hover:bg-muted"
        >
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};
