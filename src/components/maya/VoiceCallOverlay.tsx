import { motion, AnimatePresence } from "framer-motion";
import { PhoneOff, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { MayaAvatar, MayaMood } from "./MayaAvatar";
import { AudioVisualizer } from "./AudioVisualizer";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useVoiceCall } from "@/hooks/useVoiceCall";
import { toast } from "sonner";

interface VoiceCallOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  mood: MayaMood;
}

export const VoiceCallOverlay = ({
  isOpen,
  onClose,
  mood,
}: VoiceCallOverlayProps) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [userTranscript, setUserTranscript] = useState("");
  const [mayaTranscript, setMayaTranscript] = useState("");
  const [isMayaSpeaking, setIsMayaSpeaking] = useState(false);

  const {
    isConnected,
    isListening,
    audioLevel,
    startCall,
    endCall,
    interruptMaya,
  } = useVoiceCall({
    onUserTranscript: (text) => {
      setUserTranscript(text);
      // Interrupt Maya if she's speaking when user talks
      if (isMayaSpeaking) {
        interruptMaya();
      }
    },
    onMayaResponse: (text) => {
      setMayaTranscript(text);
    },
    onMayaSpeakingChange: (speaking) => {
      setIsMayaSpeaking(speaking);
    },
    onError: (error) => {
      toast.error(error);
    },
  });

  // Start call when overlay opens
  useEffect(() => {
    if (isOpen && !isConnected) {
      startCall();
    }
  }, [isOpen, isConnected, startCall]);

  // Call duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen && isConnected) {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, isConnected]);

  // Handle close
  const handleClose = () => {
    endCall();
    setCallDuration(0);
    setUserTranscript("");
    setMayaTranscript("");
    onClose();
  };

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
            <p className="text-white/60 text-sm mb-1">
              {isConnected ? "Voice Call" : "Connecting..."}
            </p>
            <p className="text-white text-lg font-medium">
              {formatDuration(callDuration)}
            </p>
          </motion.div>

          {/* Center with avatar and visualizer */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center gap-8 relative"
          >
            {/* Audio Visualizer */}
            <div className="relative">
              <AudioVisualizer
                audioLevel={audioLevel}
                isSpeaking={isMayaSpeaking}
                mood={mood}
              />
              <MayaAvatar
                size="xl"
                mood={mood}
                isOnCall={true}
                isSpeaking={isMayaSpeaking}
              />
            </div>

            <div className="text-center">
              <h2 className="text-white text-2xl font-semibold mb-1">Maya</h2>
              <p className="text-white/60 text-sm font-romantic text-lg">
                {isMayaSpeaking
                  ? "Speaking..."
                  : isListening
                  ? "Listening... 💕"
                  : isConnected
                  ? "Connected"
                  : "Connecting..."}
              </p>
            </div>

            {/* Live transcripts */}
            <div className="max-w-sm w-full space-y-3 text-center min-h-[120px]">
              <AnimatePresence mode="popLayout">
                {mayaTranscript && (
                  <motion.div
                    key={`maya-${mayaTranscript.slice(0, 20)}`}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3"
                  >
                    <p className="text-xs text-white/50 mb-1">Maya</p>
                    <p className="text-white text-sm">{mayaTranscript}</p>
                  </motion.div>
                )}
                {userTranscript && (
                  <motion.div
                    key={`user-${userTranscript.slice(0, 20)}`}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-primary/20 backdrop-blur-sm rounded-xl px-4 py-3"
                  >
                    <p className="text-xs text-white/50 mb-1">You</p>
                    <p className="text-white text-sm">{userTranscript}</p>
                  </motion.div>
                )}
              </AnimatePresence>
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
              className={`w-14 h-14 rounded-full ${
                isSpeakerOff
                  ? "bg-white/30 text-white"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
              onClick={() => setIsSpeakerOff(!isSpeakerOff)}
            >
              {isSpeakerOff ? (
                <VolumeX className="w-6 h-6" />
              ) : (
                <Volume2 className="w-6 h-6" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={`w-14 h-14 rounded-full ${
                isMuted
                  ? "bg-white/30 text-white"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
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
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30"
              onClick={handleClose}
            >
              <PhoneOff className="w-7 h-7" />
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
