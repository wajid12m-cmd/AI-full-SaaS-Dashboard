import apiClient from "./apiClient";

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  avatarUrl: string | null;
  notifyWeeklyReports: boolean;
  notifySecurityAlerts: boolean;
  notifyProductUpdates: boolean;
  twoFactorEnabled: boolean;
}

export const getUsers = async () => {
  const response = await apiClient.get("/users");
  return response.data;
};

export const getUserById = async (id: number): Promise<UserProfile> => {
  const response = await apiClient.get(`/users/${id}`);
  return response.data.data;
};

export const updateUser = async (
  id: number,
  data: { name: string; email: string }
): Promise<UserProfile> => {
  const response = await apiClient.put(`/users/${id}`, data);
  return response.data.data;
};

export const changePassword = async (data: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> => {
  await apiClient.put("/users/me/password", data);
};

export type UserPreferences = Partial<{
  avatarUrl: string | null;
  notifyWeeklyReports: boolean;
  notifySecurityAlerts: boolean;
  notifyProductUpdates: boolean;
  twoFactorEnabled: boolean;
}>;

export const updatePreferences = async (
  data: UserPreferences
): Promise<UserProfile> => {
  const response = await apiClient.put("/users/me/preferences", data);
  return response.data.data;
};

export const deleteOwnAccount = async (): Promise<void> => {
  await apiClient.delete("/users/me/account");
};
