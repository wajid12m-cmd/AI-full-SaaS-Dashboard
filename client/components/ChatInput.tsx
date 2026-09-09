"use client";

import { useState } from "react";
import { FaPaperPlane } from "react-icons/fa";

type ChatInputProps = {
  onSend: (message: string) => void;
  loading: boolean;
};

export default function ChatInput({ onSend, loading }: ChatInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || loading) return;
    onSend(text);
    setText("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-t p-4 bg-white">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Apna sawal likhein..."
        className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
      >
        <FaPaperPlane />
      </button>
    </form>
  );
}