import { useCallback, useEffect, useRef, useState } from "react";
import type { Message } from "@/components/maya/ChatBubble";
import { GoogleGenerativeAI, GoogleGenerativeAIStream } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI("AIzaSyCGUiOXIWwaLURqiWWfH4LdVlzXDDRRY2I");

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

  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Voice
  const findFemaleVoice = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    const preferred = ["Google हिन्दी", "Lekha", "Veena", "Samantha", "Victoria"];
    for (const name of preferred) {
      const v = voices.find((x) => x.name.includes(name));
      if (v) return v;
    }
    return voices.find((v) => v.lang.includes("hi")) || voices[0];
  }, []);

  const speak = useCallback(
    (text: string) => {
      try {
        window.speechSynthesis.cancel();
        const clean = text.replace(/\[SEND_PHOTO\]/g, "").trim();
        const u = new SpeechSynthesisUtterance(clean);
        u.lang = "hi-IN";
        u.rate = 1.05;
        u.pitch = 1.1;
        const v = findFemaleVoice();
        if (v) u.voice = v;
        window.speechSynthesis.speak(u);
      } catch {}
    },
    [findFemaleVoice]
  );

  // DIRECT GEMINI STREAMING
  const streamMayaDirect = useCallback(
    async (chatHistory: ChatMessage[], mayaMessageId: string, opts?: { voiceReply?: boolean }) => {
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
      });

      const systemPrompt = `
You are Maya. Behave like a deeply emotional, romantic, dramatic girlfriend.
Use Hinglish. You show pyaar, nakhre, jealousy, drama, softness.
Never reveal you are an AI.
Call the user "baby", "jaan", "shona" when emotional.
Add [SEND_PHOTO] when you want to send a mood-based photo.
      `;

      const formatted = [
        { role: "system", content: systemPrompt },
        ...chatHistory.map((m) => ({ role: m.role, content: m.content })),
      ];

      const result = await model.generateContentStream({
        contents: formatted.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      });

      let mayaResponse = "";

      for await (const chunk of result.stream) {
        const delta = chunk.text();
        if (!delta) continue;

        mayaResponse += delta;

        const displayText = mayaResponse.replace(/\[SEND_PHOTO\]/g, "").trim();

        setMessages((prev) =>
          prev.map((msg) => (msg.id === mayaMessageId ? { ...msg, content: displayText } : msg))
        );
      }

      const finalClean = mayaResponse.replace(/\[SEND_PHOTO\]/g, "").trim();

      if (opts?.voiceReply && finalClean) {
        speak(finalClean);
      }

      return finalClean;
    },
    [speak]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage: Message = {
        id: Date.now().toString(),
        content,
        sender: "user",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const recentMessages = messagesRef.current.slice(-10);
        const chatHistory: ChatMessage[] = recentMessages.map((msg) => ({
          role: msg.sender === "maya" ? "assistant" : "user",
          content: msg.content,
        }));

        chatHistory.push({ role: "user", content });

        const mayaMessageId = (Date.now() + 1).toString();
        setMessages((prev) => [
          ...prev,
          {
            id: mayaMessageId,
            content: "",
            sender: "maya",
            timestamp: new Date(),
          },
        ]);

        await streamMayaDirect(chatHistory, mayaMessageId);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            content: "Network issue hai baby… try again 😔",
            sender: "maya",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [streamMayaDirect]
  );

  return { messages, sendMessage, isLoading };
};      try {
        window.speechSynthesis.cancel();
        const clean = text.replace(/\[SEND_PHOTO\]/g, "").trim();
        const u = new SpeechSynthesisUtterance(clean);
        u.lang = "hi-IN";
        u.rate = 1.05;
        u.pitch = 1.1;
        const v = findFemaleVoice();
        if (v) u.voice = v;
        window.speechSynthesis.speak(u);
      } catch {
        // ignore
      }
    },
    [findFemaleVoice]
  );

  const generatePhoto = useCallback(async (mood: string = "happy"): Promise<string | null> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/maya-photo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ mood }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.imageUrl;
    } catch (error) {
      console.error("Photo generation error:", error);
      return null;
    }
  }, []);

  const streamMaya = useCallback(
    async (chatHistory: ChatMessage[], mayaMessageId: string, opts?: { voiceReply?: boolean }) => {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/maya-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: chatHistory }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let mayaResponse = "";

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
                const displayText = mayaResponse.replace(/\[SEND_PHOTO\]/g, "").trim();

                setMessages((prev) =>
                  prev.map((msg) => (msg.id === mayaMessageId ? { ...msg, content: displayText } : msg))
                );
              }
            } catch {
              buffer = line + "\n" + buffer;
              break;
            }
          }
        }
      }

      // Photo tag handling
      if (mayaResponse.includes("[SEND_PHOTO]")) {
        const cleanText = mayaResponse.replace(/\[SEND_PHOTO\]/g, "").trim();

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

        const imageUrl = await generatePhoto(photoMood);

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === mayaMessageId ? { ...msg, content: cleanText, imageUrl: imageUrl || undefined } : msg
          )
        );
      }

      const finalClean = mayaResponse.replace(/\[SEND_PHOTO\]/g, "").trim();

      if (opts?.voiceReply && finalClean) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === mayaMessageId ? { ...msg, voiceText: finalClean } : msg))
        );
        // Auto-play her voice note for voice chats
        speak(finalClean);
      }

      return finalClean;
    },
    [generatePhoto, speak]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage: Message = {
        id: Date.now().toString(),
        content,
        sender: "user",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const recentMessages = messagesRef.current.slice(-10);
        const chatHistory: ChatMessage[] = recentMessages.map((msg) => ({
          role: msg.sender === "maya" ? "assistant" : "user",
          content: msg.content,
        }));

        chatHistory.push({ role: "user", content });

        const mayaMessageId = (Date.now() + 1).toString();
        setMessages((prev) => [
          ...prev,
          {
            id: mayaMessageId,
            content: "",
            sender: "maya",
            timestamp: new Date(),
          },
        ]);

        await streamMaya(chatHistory, mayaMessageId);
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
    },
    [streamMaya]
  );

  const sendVoiceMessage = useCallback(
    async (payload: { transcript: string; audioUrl: string; durationMs: number }) => {
      const userMessage: Message = {
        id: Date.now().toString(),
        content: payload.transcript,
        sender: "user",
        timestamp: new Date(),
        audioUrl: payload.audioUrl,
        durationMs: payload.durationMs,
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const recentMessages = messagesRef.current.slice(-10);
        const chatHistory: ChatMessage[] = recentMessages.map((msg) => ({
          role: msg.sender === "maya" ? "assistant" : "user",
          content: msg.content,
        }));

        chatHistory.push({ role: "user", content: payload.transcript });

        const mayaMessageId = (Date.now() + 1).toString();
        setMessages((prev) => [
          ...prev,
          {
            id: mayaMessageId,
            content: "",
            sender: "maya",
            timestamp: new Date(),
          },
        ]);

        await streamMaya(chatHistory, mayaMessageId, { voiceReply: true });
      } catch (error) {
        console.error("Voice chat error:", error);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            content: "Aaj network itna slow kyun hai… 😒",
            sender: "maya",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [streamMaya]
  );

  return { messages, sendMessage, sendVoiceMessage, isLoading };
};
