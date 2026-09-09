"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FaPaperPlane, FaTrash, FaRobot, FaBars, FaPlus, FaTimes } from "react-icons/fa";
import { SkeletonChat } from "@/components/Skeleton";
import Markdown from "@/components/Markdown";
import CopyButton from "@/components/CopyButton";
import {
  sendMessageStream,
  getChatHistory,
  clearHistory,
  getUsage,
  ChatMessage as ChatMessageType,
  Usage,
} from "@/services/aiService";

function ChatBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div className="group relative max-w-[85%] sm:max-w-[75%]">
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-blue-600 text-white rounded-br-none"
              : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none"
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{content}</p>
          ) : (
            <Markdown content={content} />
          )}
        </div>
        {!isUser && (
          <div className="opacity-0 group-hover:opacity-100 transition mt-1 pl-1">
            <CopyButton
              text={content}
              label="Copy"
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Groups the flat prompt/response history into ChatGPT-style date buckets
// ("Today", "Yesterday", "Previous 7 Days", "Older") for the sidebar.
function groupByDate(messages: ChatMessageType[]) {
  const userTurns = messages.filter((m) => m.role === "user" && m.createdAt);
  const groups: Record<string, ChatMessageType[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    Older: [],
  };

  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  userTurns.forEach((turn) => {
    const d = new Date(turn.createdAt as string);
    const day = startOfDay(d);
    if (day.getTime() === today.getTime()) groups.Today.push(turn);
    else if (day.getTime() === yesterday.getTime()) groups.Yesterday.push(turn);
    else if (day >= weekAgo) groups["Previous 7 Days"].push(turn);
    else groups.Older.push(turn);
  });

  return groups;
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
    loadUsage();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await getChatHistory();
      setMessages(Array.isArray(res) ? res : []);
    } catch (err) {
      setMessages([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadUsage = async () => {
    try {
      const res = await getUsage();
      setUsage(res);
    } catch (err) {
      console.error("Failed to load usage:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);
    setStreamingText("");

    try {
      let accumulated = "";

      await sendMessageStream(userMessage, (chunk) => {
        accumulated += chunk;
        setStreamingText(accumulated);
      });

      // Streaming complete — final message ko normal messages list mein add karo
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: accumulated },
      ]);
      setStreamingText("");
      loadUsage();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err instanceof Error
              ? err.message
              : "Sorry, I couldn't get a response. Please try again.",
        },
      ]);
      setStreamingText("");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    const confirmed = window.confirm("Delete the entire chat history?");
    if (!confirmed) return;

    try {
      await clearHistory();
      setMessages([]);
    } catch (err) {
      console.log("Not cleared");
    }
  };

  const scrollToEntry = (historyId: number | undefined) => {
    if (historyId === undefined) return;
    const el = document.getElementById(`history-${historyId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setSidebarOpen(false);
  };

  const grouped = useMemo(() => groupByDate(messages), [messages]);
  const hasAnyHistory = messages.some((m) => m.createdAt);

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Left sidebar — persistent chat history, ChatGPT-style */}
      <div
        className={`
          ${sidebarOpen ? "block fixed inset-0 z-40 bg-black/40" : "hidden"}
          lg:static lg:block lg:z-auto lg:bg-transparent
        `}
        onClick={() => setSidebarOpen(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="h-full lg:h-auto w-72 bg-white dark:bg-gray-900 border-r lg:border dark:border-gray-700 lg:rounded-xl lg:shadow-md flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Chat History</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 dark:text-gray-400"
              aria-label="Close sidebar"
            >
              <FaTimes />
            </button>
          </div>
          <button
            onClick={() => { handleClear(); setSidebarOpen(false); }}
            className="mx-3 mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 border dark:border-gray-700 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <FaPlus className="text-xs" /> New chat (clears history)
          </button>
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {!hasAnyHistory ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 px-1">
                Your past sessions will show up here once you start chatting.
              </p>
            ) : (
              Object.entries(grouped)
                .filter(([, items]) => items.length > 0)
                .map(([label, items]) => (
                  <div key={label}>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-1 mb-1">
                      {label}
                    </p>
                    <div className="space-y-0.5">
                      {items.map((item) => (
                        <button
                          key={item.historyId}
                          onClick={() => scrollToEntry(item.historyId)}
                          className="w-full text-left text-sm px-2 py-2 rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 truncate"
                          title={item.content}
                        >
                          {item.content}
                        </button>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Main chat column */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden bg-gray-100 dark:bg-gray-800 p-2.5 rounded-lg text-gray-600 dark:text-gray-300"
              aria-label="Open chat history"
            >
              <FaBars />
            </button>
            <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-lg">
              <FaRobot className="text-blue-600 dark:text-blue-400 text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">AI Assistant</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Powered by Groq</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {usage && (
              <span
                className={`text-sm px-3 py-1 rounded-full ${
                  usage.limit !== null && usage.used >= usage.limit
                    ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300"
                    : "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300"
                }`}
              >
                {usage.plan === "pro"
                  ? "Pro Plan · Unlimited"
                  : `${usage.used}/${usage.limit} requests this month`}
              </span>
            )}
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                className="hidden sm:flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium"
              >
                <FaTrash /> Clear Chat
              </button>
            )}
          </div>
        </div>

        {/* Chat Box */}
        <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 overflow-hidden flex flex-col transition-colors">
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {historyLoading ? (
              <SkeletonChat />
            ) : messages.length === 0 && !streamingText ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                <FaRobot className="text-6xl mb-4 opacity-30" />
                <p className="text-lg">Start a conversation with the AI!</p>
                <p className="text-sm">Type a message below and hit Send</p>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => (
                  <div key={index} id={msg.historyId !== undefined ? `history-${msg.historyId}` : undefined}>
                    <ChatBubble role={msg.role} content={msg.content} />
                  </div>
                ))}

                {/* Live streaming message */}
                {loading && (
                  <div className="flex justify-start mb-4">
                    <div className="max-w-[80%] rounded-2xl rounded-bl-none px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100">
                      {streamingText ? (
                        <Markdown content={streamingText} />
                      ) : (
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-300 rounded-full animate-bounce" />
                          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="border-t dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                disabled={loading}
                className="flex-1 border dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                <FaPaperPlane />
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
