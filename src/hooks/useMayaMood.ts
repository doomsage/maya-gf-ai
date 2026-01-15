import { useState, useCallback } from "react";
import { MayaMood } from "@/components/maya/MayaAvatar";

// Keywords that indicate different moods
const moodKeywords: Record<MayaMood, string[]> = {
  angry: [
    "gussa",
    "angry",
    "naraz",
    "ignore",
    "late",
    "kyu nahi",
    "bhool gaye",
    "change ho gaye",
    "hmph",
    "irritated",
  ],
  jealous: [
    "kaun thi",
    "who is she",
    "ladki",
    "girl",
    "friend ki",
    "usse baat",
    "flirt",
    "ex",
  ],
  childish: [
    "nahi",
    "bas",
    "please",
    "sorry",
    "miss you",
    "baat nahi",
    "attention",
    "bore",
  ],
  loving: [
    "janu",
    "babu",
    "love",
    "pyaar",
    "miss",
    "cute",
    "achi",
    "sweet",
    "pagal",
    "💕",
    "❤️",
  ],
};

export const useMayaMood = () => {
  const [mood, setMood] = useState<MayaMood>("loving");

  const detectMood = useCallback((text: string): MayaMood => {
    const lowerText = text.toLowerCase();

    // Check for mood keywords in priority order
    for (const moodType of ["angry", "jealous", "childish", "loving"] as MayaMood[]) {
      if (moodKeywords[moodType].some((keyword) => lowerText.includes(keyword))) {
        return moodType;
      }
    }

    return "loving"; // Default mood
  }, []);

  const updateMoodFromMessage = useCallback(
    (message: string) => {
      const detectedMood = detectMood(message);
      setMood(detectedMood);
    },
    [detectMood]
  );

  return { mood, setMood, updateMoodFromMessage, detectMood };
};
