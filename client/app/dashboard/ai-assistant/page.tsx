"use client";

import { useEffect, useRef, useState } from "react";
import {
  FaPaperPlane,
  FaTrash,
  FaRobot,
  FaBars,
  FaPlus,
  FaTimes,
  FaThumbtack,
  FaEllipsisV,
  FaMicrophone,
  FaImage,
  FaPen,
  FaSearch,
} from "react-icons/fa";
import { SkeletonChat } from "@/components/Skeleton";
import Markdown from "@/components/Markdown";
import CopyButton from "@/components/CopyButton";
import {
  sendMessageStream,
  getUsage,
  getConversations,
  getConversationMessages,
  renameConversation,
  pinConversation,
  deleteConversation,
  generateImages,
  ChatMessage as ChatMessageType,
  Conversation,
  Usage,
} from "@/services/aiService";

const IMAGE_DAILY_LIMIT = 5;

// ---------------------------------------------------------------------------
// Web Speech API (voice input) — browser-native, no backend/API key needed.
// Chrome/Edge support it; other browsers fall back gracefully (mic button
// just tells the user it isn't supported there).
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;

function getSpeechRecognition(): SpeechRecognitionInstance | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
  return SR ? new SR() : null;
}

function ChatBubble({ role, content, imageUrls }: { role: "user" | "assistant"; content: string; imageUrls?: string[] }) {
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

          {imageUrls && imageUrls.length > 0 && (
            <div className={`grid gap-2 mt-2 ${imageUrls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {imageUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Generated ${i + 1}`}
                    className="rounded-lg w-full h-auto border dark:border-gray-600"
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
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

export default function AIAssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [imageMode, setImageMode] = useState(false);
  const [imagesRemaining, setImagesRemaining] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    loadConversations();
    loadUsage();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Close the 3-dot menu on any outside click.
  useEffect(() => {
    const close = () => setOpenMenuId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const loadConversations = async () => {
    try {
      setConversationsLoading(true);
      const res = await getConversations();
      setConversations(res);
    } catch {
      setConversations([]);
    } finally {
      setConversationsLoading(false);
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

  // Opens an isolated conversation — this is the actual fix for "clicking a
  // chat mixes it with everything else": each conversation is now its own
  // list of messages, loaded fresh, not a scroll-to inside one giant blob.
  const selectConversation = async (id: number) => {
    setActiveConversationId(id);
    setSidebarOpen(false);
    setMessagesLoading(true);
    try {
      const msgs = await getConversationMessages(id);
      setMessages(msgs);
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };

  // Real "New chat": just clears the current view. The actual Conversation
  // row is created lazily, server-side, the moment the first message is
  // sent — nothing here deletes any past conversation.
  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setInput("");
    setImageMode(false);
    setSidebarOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const prompt = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: prompt }]);
    setLoading(true);
    setStreamingText("");

    try {
      if (imageMode) {
        const result = await generateImages(prompt, activeConversationId ?? undefined);
        setImagesRemaining(result.remaining);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Here's your generated image.", imageUrls: [result.imageUrl] },
        ]);
        if (!activeConversationId) {
          setActiveConversationId(result.conversationId);
          loadConversations();
        }
      } else {
        let accumulated = "";
        const { conversationId } = await sendMessageStream(
          prompt,
          (chunk) => {
            accumulated += chunk;
            setStreamingText(accumulated);
          },
          activeConversationId ?? undefined
        );

        setMessages((prev) => [...prev, { role: "assistant", content: accumulated }]);
        setStreamingText("");
        loadUsage();

        if (!activeConversationId) {
          setActiveConversationId(conversationId);
          loadConversations();
        } else {
          // Bump this conversation to the top of the sidebar (updatedAt changed).
          loadConversations();
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "Sorry, I couldn't get a response. Please try again.",
        },
      ]);
      setStreamingText("");
    } finally {
      setLoading(false);
    }
  };

  const handlePin = async (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(null);
    try {
      await pinConversation(conv.id, !conv.pinned);
      loadConversations();
    } catch {
      // no-op — a failed pin toggle isn't worth interrupting the user for
    }
  };

  const handleRename = async (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(null);
    const title = window.prompt("Rename chat", conv.title);
    if (!title || !title.trim() || title.trim() === conv.title) return;
    try {
      await renameConversation(conv.id, title.trim());
      loadConversations();
    } catch {
      // no-op
    }
  };

  const handleDelete = async (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(null);
    const confirmed = window.confirm(`Delete "${conv.title}"? This can't be undone.`);
    if (!confirmed) return;

    try {
      await deleteConversation(conv.id);
      if (activeConversationId === conv.id) {
        handleNewChat();
      }
      loadConversations();
    } catch {
      // no-op
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = getSpeechRecognition();
    if (!recognition) {
      alert("Voice input isn't supported in this browser. Try Chrome or Edge.");
      return;
    }

    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript)
        .join("");
      setInput(transcript);
    };
    recognition.onend = () => setIsRecording(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      setIsRecording(false);
      if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
        alert("Microphone access was blocked. Please allow it for this site and try again.");
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsRecording(true);
    } catch {
      alert("Couldn't start voice input. Check that this site has microphone permission in your browser.");
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;
  const filteredConversations = searchQuery.trim()
    ? conversations.filter((c) => c.title.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : conversations;
  const pinned = filteredConversations.filter((c) => c.pinned);
  const recent = filteredConversations.filter((c) => !c.pinned);

  const renderConversationItem = (conv: Conversation) => (
    <div
      key={conv.id}
      onClick={() => selectConversation(conv.id)}
      className={`group relative flex items-center gap-1 rounded-lg px-2 py-2 cursor-pointer text-sm truncate ${
        conv.id === activeConversationId
          ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
          : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
      }`}
    >
      {conv.pinned && <FaThumbtack className="text-xs shrink-0 opacity-60" />}
      <span className="flex-1 truncate" title={conv.title}>
        {conv.title}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpenMenuId(openMenuId === conv.id ? null : conv.id);
        }}
        className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
        aria-label="Chat options"
      >
        <FaEllipsisV className="text-xs" />
      </button>

      {openMenuId === conv.id && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-9 z-10 w-40 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg py-1"
        >
          <button
            onClick={(e) => handlePin(conv, e)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <FaThumbtack className="text-xs" /> {conv.pinned ? "Unpin" : "Pin"}
          </button>
          <button
            onClick={(e) => handleRename(conv, e)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <FaPen className="text-xs" /> Rename
          </button>
          <button
            onClick={(e) => handleDelete(conv, e)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <FaTrash className="text-xs" /> Delete
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Left sidebar — real, isolated conversations, ChatGPT-style */}
      <div
        className={`
          ${sidebarOpen ? "block fixed inset-0 z-40 bg-black/40" : "hidden"}
          lg:static lg:block lg:z-auto lg:bg-transparent lg:h-full
        `}
        onClick={() => setSidebarOpen(false)}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="h-full lg:h-full w-72 bg-white dark:bg-gray-900 border-r lg:border dark:border-gray-700 lg:rounded-xl lg:shadow-md flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 shrink-0">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Chat History</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 dark:text-gray-400"
              aria-label="Close sidebar"
            >
              <FaTimes />
            </button>
          </div>

          <div className="p-3 shrink-0 space-y-2">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 border dark:border-gray-700 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <FaPlus className="text-xs" /> New chat
            </button>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full text-sm pl-8 pr-3 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* This is the actual scroll fix: a min-h-0 flex child with its own
              overflow-y-auto, inside a parent whose height is capped
              (lg:h-full instead of lg:h-auto) — so the list scrolls
              internally instead of pushing the whole page down. */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 pt-0 space-y-4">
            {conversationsLoading ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 px-1">Loading...</p>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 px-1">
                Your conversations will show up here once you start chatting.
              </p>
            ) : filteredConversations.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 px-1">No chats match &quot;{searchQuery}&quot;.</p>
            ) : (
              <>
                {pinned.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-1 mb-1">
                      Pinned
                    </p>
                    <div className="space-y-0.5">{pinned.map(renderConversationItem)}</div>
                  </div>
                )}
                <div>
                  {pinned.length > 0 && (
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-1 mb-1">
                      Recent
                    </p>
                  )}
                  <div className="space-y-0.5">{recent.map(renderConversationItem)}</div>
                </div>
              </>
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 truncate max-w-[50vw]">
                {activeConversation?.title || "AI Assistant"}
              </h1>
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
                {usage.plan === "pro" ? "Pro Plan · Unlimited" : `${usage.used}/${usage.limit} requests this month`}
              </span>
            )}
            {activeConversation && (
              <button
                onClick={(e) => handleDelete(activeConversation, e)}
                className="hidden sm:flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium"
              >
                <FaTrash /> Delete Chat
              </button>
            )}
          </div>
        </div>

        {/* Chat Box */}
        <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl shadow-md border dark:border-gray-700 overflow-hidden flex flex-col transition-colors">
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messagesLoading ? (
              <SkeletonChat />
            ) : messages.length === 0 && !streamingText ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                <FaRobot className="text-6xl mb-4 opacity-30" />
                <p className="text-lg">Start a conversation with the AI!</p>
                <p className="text-sm">Type a message, use the mic, or generate images below</p>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => (
                  <ChatBubble key={index} role={msg.role} content={msg.content} imageUrls={msg.imageUrls} />
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
                          <div
                            className="w-2 h-2 bg-gray-400 dark:bg-gray-300 rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          />
                          <div
                            className="w-2 h-2 bg-gray-400 dark:bg-gray-300 rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          />
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
            {imageMode && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1">
                <FaImage /> Image mode — your next message generates 1 image instead of a text reply
                {imagesRemaining !== null && ` (${imagesRemaining}/${IMAGE_DAILY_LIMIT} left today)`}.
                <button type="button" onClick={() => setImageMode(false)} className="underline ml-1">
                  cancel
                </button>
              </p>
            )}
            <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setImageMode((v) => !v)}
                disabled={loading}
                title="Generate images instead of text"
                className={`p-3 rounded-lg border dark:border-gray-600 transition ${
                  imageMode
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <FaImage />
              </button>
              <button
                type="button"
                onClick={toggleRecording}
                disabled={loading}
                title="Voice input"
                className={`p-3 rounded-lg border dark:border-gray-600 transition ${
                  isRecording
                    ? "bg-red-600 text-white border-red-600 animate-pulse"
                    : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <FaMicrophone />
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={imageMode ? "Describe the image you want..." : "Ask me anything..."}
                disabled={loading}
                className="flex-1 border dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="bg-blue-600 text-white px-4 sm:px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center gap-2"
              >
                <FaPaperPlane />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
