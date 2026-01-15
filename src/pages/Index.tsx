import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FloatingHearts } from "@/components/maya/FloatingHearts";
import { ChatHeader } from "@/components/maya/ChatHeader";
import { ChatBubble } from "@/components/maya/ChatBubble";
import { ChatInput } from "@/components/maya/ChatInput";
import { VoiceCallOverlay } from "@/components/maya/VoiceCallOverlay";
import { TypingIndicator } from "@/components/maya/TypingIndicator";
import { useMayaMood } from "@/hooks/useMayaMood";
import { useMayaChat } from "@/hooks/useMayaChat";

const Index = () => {
  const [isCallOpen, setIsCallOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { mood, updateMoodFromMessage } = useMayaMood();
  const { messages, sendMessage, isLoading } = useMayaChat();

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update mood based on Maya's latest message
  useEffect(() => {
    const latestMayaMessage = [...messages]
      .reverse()
      .find((m) => m.sender === "maya");
    if (latestMayaMessage) {
      updateMoodFromMessage(latestMayaMessage.content);
    }
  }, [messages, updateMoodFromMessage]);

  const handleSendMessage = (content: string) => {
    sendMessage(content);
  };

  const handleVoiceClick = () => {
    setIsCallOpen(true);
  };

  const status = isLoading ? "typing" : isCallOpen ? "in-call" : "online";

  return (
    <div className="min-h-screen dreamy-gradient flex flex-col relative overflow-hidden">
      {/* Floating hearts background */}
      <FloatingHearts />

      {/* Main chat container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col h-screen max-w-lg mx-auto w-full relative z-10"
      >
        {/* Header */}
        <ChatHeader
          mood={mood}
          status={status}
          onCallClick={handleVoiceClick}
        />

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSendMessage}
          onVoiceClick={handleVoiceClick}
          isLoading={isLoading}
        />
      </motion.div>

      {/* Voice call overlay */}
      <VoiceCallOverlay
        isOpen={isCallOpen}
        onClose={() => setIsCallOpen(false)}
        mood={mood}
      />
    </div>
  );
};

export default Index;
