import { motion } from "framer-motion";
import { MayaMood } from "./MayaAvatar";
import { cn } from "@/lib/utils";

interface AudioVisualizerProps {
  audioLevel: number;
  isSpeaking: boolean;
  mood: MayaMood;
}

const moodColors: Record<MayaMood, string> = {
  loving: "from-primary via-pink-400 to-rose-300",
  angry: "from-red-500 via-orange-400 to-red-300",
  jealous: "from-purple-500 via-violet-400 to-purple-300",
  childish: "from-yellow-400 via-amber-300 to-orange-300",
};

export const AudioVisualizer = ({ audioLevel, isSpeaking, mood }: AudioVisualizerProps) => {
  const bars = 24;
  const baseLevel = isSpeaking ? 0.3 : 0.1;
  
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Circular bars around avatar */}
      <div className="absolute w-56 h-56">
        {Array.from({ length: bars }).map((_, i) => {
          const angle = (i / bars) * 360;
          const delay = i * 0.02;
          const randomHeight = Math.random() * 0.5 + 0.5;
          const level = isSpeaking ? audioLevel * randomHeight + baseLevel : baseLevel;
          
          return (
            <motion.div
              key={i}
              className={cn(
                "absolute w-1 origin-bottom rounded-full bg-gradient-to-t",
                moodColors[mood]
              )}
              style={{
                left: "50%",
                bottom: "50%",
                transform: `translateX(-50%) rotate(${angle}deg)`,
                transformOrigin: "bottom center",
              }}
              animate={{
                height: `${20 + level * 40}px`,
                opacity: 0.4 + level * 0.6,
              }}
              transition={{
                duration: 0.1,
                delay: delay,
                ease: "easeOut",
              }}
            />
          );
        })}
      </div>

      {/* Pulsing rings */}
      {isSpeaking && (
        <>
          {[1, 2, 3].map((ring) => (
            <motion.div
              key={ring}
              className={cn(
                "absolute rounded-full border-2",
                mood === "loving" && "border-primary/40",
                mood === "angry" && "border-red-400/40",
                mood === "jealous" && "border-purple-400/40",
                mood === "childish" && "border-yellow-400/40"
              )}
              initial={{ width: 160, height: 160, opacity: 0.6 }}
              animate={{
                width: [160, 200 + ring * 40],
                height: [160, 200 + ring * 40],
                opacity: [0.6, 0],
              }}
              transition={{
                duration: 1.5,
                delay: ring * 0.3,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          ))}
        </>
      )}

      {/* Glow effect */}
      <motion.div
        className={cn(
          "absolute w-48 h-48 rounded-full blur-3xl",
          mood === "loving" && "bg-primary/20",
          mood === "angry" && "bg-red-500/20",
          mood === "jealous" && "bg-purple-500/20",
          mood === "childish" && "bg-yellow-400/20"
        )}
        animate={{
          scale: isSpeaking ? [1, 1.2 + audioLevel * 0.3, 1] : 1,
          opacity: isSpeaking ? [0.3, 0.6, 0.3] : 0.2,
        }}
        transition={{
          duration: 0.5,
          repeat: isSpeaking ? Infinity : 0,
          ease: "easeInOut",
        }}
      />
    </div>
  );
};
