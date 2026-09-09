import apiClient from "./apiClient";

export type Workflow = {
  id: number;
  name: string;
  description: string;
  status: "active" | "paused" | "draft" | "failed";
  trigger: string;
  runCount: number;
  successCount: number;
  successRate: number | null;
  lastRunAt: string | null;
  createdAt: string;
};

export const getWorkflows = async (): Promise<Workflow[]> => {
  const res = await apiClient.get("/workflows");
  return res.data.data;
};

export const createWorkflow = async (data: {
  name: string;
  description: string;
  trigger: string;
}): Promise<Workflow> => {
  const res = await apiClient.post("/workflows", data);
  return res.data.data;
};

export const updateWorkflow = async (
  id: number,
  data: Partial<Pick<Workflow, "name" | "description" | "trigger" | "status">>
): Promise<Workflow> => {
  const res = await apiClient.put(`/workflows/${id}`, data);
  return res.data.data;
};

export const deleteWorkflow = async (id: number) => {
  const res = await apiClient.delete(`/workflows/${id}`);
  return res.data;
};

export const runWorkflow = async (id: number): Promise<Workflow> => {
  const res = await apiClient.post(`/workflows/${id}/run`);
  return res.data.data;
};
