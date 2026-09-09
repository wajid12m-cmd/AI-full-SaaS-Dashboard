import apiClient from "./apiClient";
import { API_BASE_URL } from "./apiConfig";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  // Present on messages loaded from history (undefined for messages sent
  // in the current live session) — used to group the sidebar by date and
  // to give each turn a stable anchor id.
  createdAt?: string;
  historyId?: number;
};

export type Usage = {
  plan: "free" | "pro";
  used: number;
  limit: number | null;
};

export const sendMessage = async (prompt: string) => {
  const response = await apiClient.post("/ai/chat", { prompt });
  return response.data;
};

// Streaming version — onChunk har naye text piece ke liye call hota hai.
// Uses raw fetch() (SSE-style streaming isn't a great fit for axios), so it
// needs `credentials: "include"` to send the httpOnly cookies itself —
// apiClient's withCredentials only applies to axios requests.
export const sendMessageStream = async (
  prompt: string,
  onChunk: (chunk: string) => void
): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/ai/chat/stream`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok || !response.body) {
    const errData = await response.json().catch(() => null);
    throw new Error(errData?.message || "Failed to get AI response");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunkText = decoder.decode(value, { stream: true });
    onChunk(chunkText);
  }
};

export const getChatHistory = async (): Promise<ChatMessage[]> => {
  const response = await apiClient.get("/ai/history", { params: { limit: 100 } });
  const history = response.data?.data?.history || [];

  const sorted = [...history].reverse();

  const messages: ChatMessage[] = [];
  sorted.forEach((item: { id: number; prompt: string; response: string; createdAt: string }) => {
    messages.push({ role: "user", content: item.prompt, createdAt: item.createdAt, historyId: item.id });
    messages.push({ role: "assistant", content: item.response, createdAt: item.createdAt, historyId: item.id });
  });

  return messages;
};

export const clearHistory = async () => {
  const response = await apiClient.delete("/ai/history");
  return response.data;
};

export const getUsage = async (): Promise<Usage> => {
  const response = await apiClient.get("/ai/usage");
  return response.data.data;
};
