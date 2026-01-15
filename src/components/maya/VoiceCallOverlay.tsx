import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Mic, MicOff, Volume2 } from "lucide-react";
import { MayaAvatar, MayaMood } from "./MayaAvatar";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface VoiceCallOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  mood: MayaMood;
  isSpeaking: boolean;
  isListening: boolean;
  userTranscript?: string;
  mayaTranscript?: string;
  callDuration: number;
}

export const VoiceCallOverlay = ({
  isOpen,
  onClose,
  mood,
  isSpeaking,
  isListening,
  userTranscript,
  mayaTranscript,
  callDuration,
}: VoiceCallOverlayProps) => {
  const [isMuted, setIsMuted] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 call-gradient backdrop-blur-2xl flex flex-col items-center justify-between py-12 px-6"
        >
          {/* Top section with call info */}
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <p className="text-white/60 text-sm mb-1">Voice Call</p>
            <p className="text-white text-lg font-medium">
              {formatDuration(callDuration)}
            </p>
          </motion.div>

          {/* Center with avatar and visualizer */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-8"
          >
            <MayaAvatar
              size="xl"
              mood={mood}
              isOnCall={true}
              isSpeaking={isSpeaking}
            />

            <div className="text-center">
              <h2 className="text-white text-2xl font-semibold mb-1">Maya</h2>
              <p className="text-white/60 text-sm font-romantic text-lg">
                {isSpeaking
                  ? "Speaking..."
                  : isListening
                  ? "Listening..."
                  : "Connected 💕"}
              </p>
            </div>

            {/* Live transcripts */}
            <div className="max-w-sm space-y-3 text-center min-h-[100px]">
              {mayaTranscript && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3"
                >
                  <p className="text-xs text-white/50 mb-1">Maya</p>
                  <p className="text-white text-sm">{mayaTranscript}</p>
                </motion.div>
              )}
              {userTranscript && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-primary/20 backdrop-blur-sm rounded-xl px-4 py-3"
                >
                  <p className="text-xs text-white/50 mb-1">You</p>
                  <p className="text-white text-sm">{userTranscript}</p>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Bottom controls */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-6"
          >
            <Button
              variant="ghost"
              size="icon"
              className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <Volume2 className="w-6 h-6" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 text-white"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? (
                <MicOff className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </Button>

            <Button
              size="icon"
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white"
              onClick={onClose}
            >
              <PhoneOff className="w-7 h-7" />
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
