"use client";

import { useState } from "react";
import { sendMessage } from "@/services/aiService";

export type Message = {
  role: "user" | "ai";
  content: string;
};

export function useAI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const ask = async (prompt: string) => {
    if (!prompt.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: prompt }]);
    setLoading(true);

    try {
      const res = await sendMessage(prompt);
      const aiText = res?.data?.response || "Koi response nahi mila.";

      setMessages((prev) => [...prev, { role: "ai", content: aiText }]);
    } catch (err) {
      const axiosError = err as {
        response?: { data?: { message?: string } };
      };
      const errorMessage =
        axiosError?.response?.data?.message ||
        "AI se jawab nahi mil saka. Dobara try karein.";

      setMessages((prev) => [...prev, { role: "ai", content: errorMessage }]);
    } finally {
      setLoading(false);
    }
  };

  return { messages, loading, ask };
}