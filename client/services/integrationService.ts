import apiClient from "./apiClient";

export type Integration = {
  id: number;
  name: string;
  description: string;
  status: "connected" | "disconnected";
  connectedOn: string | null;
};

export const getIntegrations = async (): Promise<Integration[]> => {
  const res = await apiClient.get("/integrations");
  return res.data.data;
};

export const updateIntegrationStatus = async (
  id: number,
  status: "connected" | "disconnected"
): Promise<Integration> => {
  const res = await apiClient.put(`/integrations/${id}`, { status });
  return res.data.data;
};
