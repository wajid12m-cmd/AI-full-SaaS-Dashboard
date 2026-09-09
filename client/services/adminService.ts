import apiClient from "./apiClient";

const API_URL = "/admin";

export interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  totalAiRequests: number;
  totalActiveSubscriptions: number;
  totalRevenue: number;
  recentPayments: {
    plan: string;
    status: string;
    amount: number | null;
    currency: string | null;
    date: string;
  }[];
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  subscription: {
    plan: string;
    status: string;
  } | null;
}

export interface AdminProject {
  id: number;
  name: string;
  status: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const res = await apiClient.get(`${API_URL}/stats`);
  return res.data.data;
}

export async function getAllUsers(
  page: number = 1,
  limit: number = 20
): Promise<{ users: AdminUser[]; pagination: Pagination }> {
  const res = await apiClient.get(`${API_URL}/users`, { params: { page, limit } });
  return res.data.data;
}

export async function getAllProjects(
  page: number = 1,
  limit: number = 20
): Promise<{ projects: AdminProject[]; pagination: Pagination }> {
  const res = await apiClient.get(`${API_URL}/projects`, { params: { page, limit } });
  return res.data.data;
}
