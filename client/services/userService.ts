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

// Local-file profile picture upload (Settings → Profile → pencil icon).
// Separate from updatePreferences({avatarUrl}) which just stores a URL —
// this actually uploads bytes and gets a URL back.
export const uploadAvatar = async (file: File): Promise<UserProfile> => {
  const formData = new FormData();
  formData.append("file", file);
  // No manual Content-Type header here — axios/the browser needs to set
  // its own "multipart/form-data; boundary=..." for FormData bodies.
  // Setting it by hand (without a boundary) would send a header that
  // doesn't match the actual body framing and the upload would fail to
  // parse server-side.
  const response = await apiClient.post("/users/me/avatar", formData);
  return response.data.data;
};
