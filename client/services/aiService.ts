import apiClient from "./apiClient";
import { API_BASE_URL } from "./apiConfig";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  historyId?: number;
  createdAt?: string;
  imageUrls?: string[];
};

export type Conversation = {
  id: number;
  title: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Usage = {
  plan: "free" | "pro";
  used: number;
  limit: number | null;
};

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export const getConversations = async (): Promise<Conversation[]> => {
  const response = await apiClient.get("/ai/conversations");
  return response.data?.data || [];
};

export const createConversation = async (title?: string): Promise<Conversation> => {
  const response = await apiClient.post("/ai/conversations", { title });
  return response.data.data;
};

export const getConversationMessages = async (conversationId: number): Promise<ChatMessage[]> => {
  const response = await apiClient.get(`/ai/conversations/${conversationId}/messages`);
  const rows = response.data?.data || [];

  const messages: ChatMessage[] = [];
  rows.forEach((item: { id: number; prompt: string; response: string; createdAt: string; imageUrls?: string | null }) => {
    messages.push({ role: "user", content: item.prompt, createdAt: item.createdAt, historyId: item.id });
    const imageUrls = item.imageUrls ? (JSON.parse(item.imageUrls) as string[]) : undefined;
    messages.push({
      role: "assistant",
      content: item.response,
      createdAt: item.createdAt,
      historyId: item.id,
      imageUrls,
    });
  });

  return messages;
};

export const renameConversation = async (conversationId: number, title: string): Promise<Conversation> => {
  const response = await apiClient.patch(`/ai/conversations/${conversationId}`, { title });
  return response.data.data;
};

export const pinConversation = async (conversationId: number, pinned: boolean): Promise<Conversation> => {
  const response = await apiClient.patch(`/ai/conversations/${conversationId}`, { pinned });
  return response.data.data;
};

export const deleteConversation = async (conversationId: number): Promise<void> => {
  await apiClient.delete(`/ai/conversations/${conversationId}`);
};

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export const sendMessage = async (prompt: string, conversationId?: number) => {
  const response = await apiClient.post("/ai/chat", { prompt, conversationId });
  return response.data.data as { response: string; conversationId: number };
};

// Streaming version — onChunk har naye text piece ke liye call hota hai.
// Uses raw fetch() (SSE-style streaming isn't a great fit for axios), so it
// needs `credentials: "include"` to send the httpOnly cookies itself —
// apiClient's withCredentials only applies to axios requests.
// Returns the conversationId the turn was saved under (a brand-new one if
// none was passed in), read from the response's X-Conversation-Id header.
export const sendMessageStream = async (
  prompt: string,
  onChunk: (chunk: string) => void,
  conversationId?: number
): Promise<{ conversationId: number }> => {
  const response = await fetch(`${API_BASE_URL}/ai/chat/stream`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, conversationId }),
  });

  if (!response.ok || !response.body) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.message || "Failed to get AI response");
  }

  const returnedConversationId = parseInt(response.headers.get("X-Conversation-Id") || "", 10);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunkText = decoder.decode(value, { stream: true });
    onChunk(chunkText);
  }

  return { conversationId: returnedConversationId || conversationId || 0 };
};

// ---------------------------------------------------------------------------
// Image generation
// ---------------------------------------------------------------------------

export const generateImages = async (
  prompt: string,
  conversationId?: number
): Promise<{ imageUrl: string; conversationId: number; remaining: number }> => {
  const response = await apiClient.post("/ai/image", { prompt, conversationId });
  return response.data.data;
};

// ---------------------------------------------------------------------------
// Legacy flat history (kept for backwards compatibility elsewhere)
// ---------------------------------------------------------------------------

export const clearHistory = async () => {
  const response = await apiClient.delete("/ai/history");
  return response.data;
};

export const getUsage = async (): Promise<Usage> => {
  const response = await apiClient.get("/ai/usage");
  return response.data.data;
};
