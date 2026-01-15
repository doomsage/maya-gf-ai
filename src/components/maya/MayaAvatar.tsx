import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type MayaMood = "loving" | "angry" | "jealous" | "childish";

interface MayaAvatarProps {
  size?: "sm" | "md" | "lg" | "xl";
  mood?: MayaMood;
  isOnCall?: boolean;
  isSpeaking?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "w-10 h-10",
  md: "w-12 h-12",
  lg: "w-24 h-24",
  xl: "w-40 h-40",
};

const moodGlowClasses: Record<MayaMood, string> = {
  loving: "mood-glow-loving",
  angry: "mood-glow-angry",
  jealous: "mood-glow-jealous",
  childish: "mood-glow-childish",
};

export const MayaAvatar = ({
  size = "md",
  mood = "loving",
  isOnCall = false,
  isSpeaking = false,
  className,
}: MayaAvatarProps) => {
  return (
    <div className={cn("relative", className)}>
      {/* Outer glow ring when on call */}
      {isOnCall && (
        <motion.div
          className={cn(
            "absolute inset-0 rounded-full",
            moodGlowClasses[mood]
          )}
          animate={
            isSpeaking
              ? {
                  scale: [1, 1.3, 1],
                  opacity: [0.6, 1, 0.6],
                }
              : {
                  scale: [1, 1.1, 1],
                  opacity: [0.4, 0.6, 0.4],
                }
          }
          transition={{
            duration: isSpeaking ? 0.3 : 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Audio visualizer rings */}
      {isOnCall && isSpeaking && (
        <>
          {[1, 2, 3].map((ring) => (
            <motion.div
              key={ring}
              className="absolute inset-0 rounded-full border-2 border-primary/30"
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{
                scale: [1, 1.5 + ring * 0.2],
                opacity: [0.5, 0],
              }}
              transition={{
                duration: 1,
                delay: ring * 0.15,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          ))}
        </>
      )}

      {/* Avatar image */}
      <motion.div
        className={cn(
          "relative rounded-full overflow-hidden border-2 border-primary/50",
          "bg-gradient-to-br from-primary/20 to-accent/20",
          sizeClasses[size],
          isOnCall && "animate-pulse-glow"
        )}
        animate={isSpeaking ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.3, repeat: isSpeaking ? Infinity : 0 }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn(
            "font-romantic font-bold text-primary",
            size === "xl" ? "text-5xl" : size === "lg" ? "text-3xl" : size === "md" ? "text-lg" : "text-sm"
          )}>
            M
          </span>
        </div>

        {/* Mood indicator overlay */}
        <motion.div
          className={cn(
            "absolute inset-0 opacity-20",
            mood === "loving" && "bg-mood-loving",
            mood === "angry" && "bg-mood-angry",
            mood === "jealous" && "bg-mood-jealous",
            mood === "childish" && "bg-mood-childish"
          )}
          animate={{ opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>
    </div>
  );
};
