import apiClient from "./apiClient";

export type Project = {
  id: number;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export const getProjects = async (page: number = 1, limit: number = 6) => {
  const response = await apiClient.get("/projects", { params: { page, limit } });
  return response.data;
};

export const createProject = async (name: string, description: string) => {
  const response = await apiClient.post("/projects", { name, description });
  return response.data;
};

export const updateProject = async (
  id: number,
  data: { name?: string; description?: string; status?: string }
) => {
  const response = await apiClient.put(`/projects/${id}`, data);
  return response.data;
};

export const deleteProject = async (id: number) => {
  const response = await apiClient.delete(`/projects/${id}`);
  return response.data;
};
