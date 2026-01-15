import { useState, useCallback } from "react";
import { Message } from "@/components/maya/ChatBubble";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export const useMayaChat = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Miss me? 💕 Kahan gayab the itni der?",
      sender: "maya",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

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
      // Convert messages to API format
      const chatHistory: ChatMessage[] = messages.map((msg) => ({
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
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                mayaResponse += content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === mayaMessageId
                      ? { ...msg, content: mayaResponse }
                      : msg
                  )
                );
              }
            } catch {
              // Incomplete JSON, put back and wait
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          content: "Yaar network issue hai lagta hai... Phir se try karo na? 😔",
          sender: "maya",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  return { messages, sendMessage, isLoading };
};
