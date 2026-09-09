"use client";

import { useEffect, useRef, useState } from "react";
import { FaTimes, FaPaperPlane, FaRobot, FaUser } from "react-icons/fa";
import Markdown from "./Markdown";
import CopyButton from "./CopyButton";
import { chatWithAgent, Agent } from "@/services/agentService";
import { getErrorMessage } from "@/lib/errors";

type LocalMessage = {
  role: "user" | "assistant";
  content: string;
};

type AgentChatDrawerProps = {
  agent: Agent | null;
  onClose: () => void;
  onMessageSent?: () => void; // lets the parent refresh stats after a real call
};

// Replaces the old small popup modal with a spacious, industry-standard
// chat surface: a large side drawer on desktop that expands to fully
// cover the screen on mobile. Holds a real multi-turn conversation
// client-side (each turn still hits the real /agents/:id/chat endpoint).
export default function AgentChatDrawer({ agent, onClose, onMessageSent }: AgentChatDrawerProps) {
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset the conversation whenever a different agent is opened.
  useEffect(() => {
    setMessages([]);
    setInput("");
    setError("");
    if (agent) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [agent?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Escape key closes the drawer.
  useEffect(() => {
    if (!agent) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [agent, onClose]);

  if (!agent) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setError("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setSending(true);

    try {
      const response = await chatWithAgent(agent.id, text);
      setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      onMessageSent?.();
    } catch (err) {
      setError(getErrorMessage(err, `${agent.name} couldn't respond. Try again.`));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer / full-screen panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Chat with ${agent.name}`}
        className="relative h-full w-full sm:w-[85vw] md:w-[640px] lg:w-[720px] bg-white dark:bg-gray-900 shadow-2xl flex flex-col animate-[slideIn_.25s_ease-out]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-blue-100 dark:bg-blue-900/40 p-2.5 rounded-lg shrink-0">
              <FaRobot className="text-blue-600 dark:text-blue-400 text-lg" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-gray-900 dark:text-gray-50 truncate">{agent.name}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{agent.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close chat"
            className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 p-2 shrink-0"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && !sending && (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500 gap-2">
              <FaRobot className="text-5xl opacity-30" />
              <p className="text-sm max-w-xs">
                Send a test message to <strong>{agent.name}</strong> — it&apos;ll reply using its
                configured system prompt.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                }`}
              >
                {msg.role === "user" ? <FaUser /> : <FaRobot />}
              </div>
              <div className="group relative max-w-[80%]">
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-none"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <Markdown content={msg.content} />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === "assistant" && (
                  <div className="opacity-0 group-hover:opacity-100 transition mt-1">
                    <CopyButton
                      text={msg.content}
                      label="Copy"
                      className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs">
                <FaRobot />
              </div>
              <div className="rounded-2xl rounded-bl-none px-4 py-3 bg-gray-100 dark:bg-gray-800">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-300 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 text-sm p-3 rounded-lg">
              {error}
            </p>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="border-t dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800 flex gap-3"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message ${agent.name}...`}
            disabled={sending}
            className="flex-1 border dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center gap-2 shrink-0"
          >
            <FaPaperPlane />
          </button>
        </form>
      </div>
    </div>
  );
}
