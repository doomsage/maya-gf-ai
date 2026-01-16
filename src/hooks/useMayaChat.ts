import { useState, useCallback } from "react";
import { Message } from "@/components/maya/ChatBubble";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export const useMayaChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hii 💕 Kahan the?",
      sender: "maya",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // Generate Maya's photo
  const generatePhoto = useCallback(async (mood: string = "happy"): Promise<string | null> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/maya-photo`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ mood }),
        }
      );

      if (!response.ok) return null;
      
      const data = await response.json();
      return data.imageUrl;
    } catch (error) {
      console.error("Photo generation error:", error);
      return null;
    }
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Keep last 10 messages for context (memory)
      const recentMessages = messages.slice(-10);
      const chatHistory: ChatMessage[] = recentMessages.map((msg) => ({
        role: msg.sender === "maya" ? "assistant" : "user",
        content: msg.content,
      }));

      chatHistory.push({ role: "user", content });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/maya-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ messages: chatHistory }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let mayaResponse = "";

      const mayaMessageId = (Date.now() + 1).toString();

      // Add empty Maya message that we'll update
      setMessages((prev) => [
        ...prev,
        {
          id: mayaMessageId,
          content: "",
          sender: "maya",
          timestamp: new Date(),
        },
      ]);

      if (reader) {
        let buffer = "";
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);

            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (line.startsWith(":") || line.trim() === "") continue;
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;

            try {
              const parsed = JSON.parse(jsonStr);
              const contentDelta = parsed.choices?.[0]?.delta?.content;
              if (contentDelta) {
                mayaResponse += contentDelta;
                // Remove [SEND_PHOTO] from displayed text
                const displayText = mayaResponse.replace(/\[SEND_PHOTO\]/g, "").trim();
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === mayaMessageId
                      ? { ...msg, content: displayText }
                      : msg
                  )
                );
              }
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }
      }

      // Check if Maya wants to send a photo
      if (mayaResponse.includes("[SEND_PHOTO]")) {
        const cleanText = mayaResponse.replace(/\[SEND_PHOTO\]/g, "").trim();
        
        // Detect mood for photo
        const lowerResponse = mayaResponse.toLowerCase();
        let photoMood = "happy";
        if (lowerResponse.includes("😤") || lowerResponse.includes("angry") || lowerResponse.includes("gussa")) {
          photoMood = "angry";
        } else if (lowerResponse.includes("🙄") || lowerResponse.includes("jealous") || lowerResponse.includes("shaq")) {
          photoMood = "jealous";
        } else if (lowerResponse.includes("nakhre") || lowerResponse.includes("dramatic")) {
          photoMood = "nakhre";
        } else if (lowerResponse.includes("💕") || lowerResponse.includes("love") || lowerResponse.includes("pyaar")) {
          photoMood = "loving";
        } else if (lowerResponse.includes("shy") || lowerResponse.includes("blush")) {
          photoMood = "shy";
        }
        
        // Generate photo with detected mood
        const imageUrl = await generatePhoto(photoMood);
        
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === mayaMessageId
              ? { ...msg, content: cleanText, imageUrl: imageUrl || undefined }
              : msg
          )
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          content: "Network issue hai yaar... Phir se try karo 😔",
          sender: "maya",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, generatePhoto]);

  return { messages, sendMessage, isLoading };
};
