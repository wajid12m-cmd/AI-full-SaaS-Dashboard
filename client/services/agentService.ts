import apiClient from "./apiClient";

export type Agent = {
  id: number;
  name: string;
  description: string;
  systemPrompt: string;
  modelLabel: string;
  status: "active" | "idle";
  requestCount: number;
  successCount: number;
  totalResponseMs: number;
  lastActivityAt: string | null;
  successRate: number | null; // percentage, e.g. 98.2
  avgResponseMs: number | null;
  createdAt: string;
};

export const getAgents = async (): Promise<Agent[]> => {
  const res = await apiClient.get("/agents");
  return res.data.data;
};

export const createAgent = async (data: {
  name: string;
  description: string;
  systemPrompt: string;
  modelLabel?: string;
}): Promise<Agent> => {
  const res = await apiClient.post("/agents", data);
  return res.data.data;
};

export const updateAgent = async (
  id: number,
  data: Partial<Pick<Agent, "name" | "description" | "systemPrompt" | "modelLabel" | "status">>
): Promise<Agent> => {
  const res = await apiClient.put(`/agents/${id}`, data);
  return res.data.data;
};

export const deleteAgent = async (id: number) => {
  const res = await apiClient.delete(`/agents/${id}`);
  return res.data;
};

export const chatWithAgent = async (id: number, message: string): Promise<string> => {
  const res = await apiClient.post(`/agents/${id}/chat`, { message });
  return res.data.data.response;
};
