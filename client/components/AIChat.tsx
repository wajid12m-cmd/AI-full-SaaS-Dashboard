"use client";

import { useEffect, useRef } from "react";
import { useAI } from "@/hooks/useAI";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";

export default function AIChat() {
  const { messages, loading, ask } = useAI();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-[75vh] bg-gray-50 rounded-xl border overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-gray-400 text-sm text-center mt-10">
            Koi bhi sawal poochein — AI Assistant jawab dega.
          </p>
        )}

        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} />
        ))}

        {loading && (
          <p className="text-gray-400 text-sm">AI likh raha hai...</p>
        )}

        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={ask} loading={loading} />
    </div>
  );
}