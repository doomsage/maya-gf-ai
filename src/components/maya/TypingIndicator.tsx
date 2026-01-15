import { motion } from "framer-motion";

export const TypingIndicator = () => {
  return (
    <div className="flex justify-start">
      <div className="chat-bubble-maya flex items-center gap-1 px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full bg-primary/60"
            animate={{
              y: [0, -6, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
};
