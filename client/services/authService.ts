import apiClient from "./apiClient";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  createdAt: string;
  avatarUrl?: string | null;
}

export const registerUser = async (
  name: string,
  email: string,
  password: string
) => {
  const response = await apiClient.post("/auth/register", {
    name,
    email,
    password,
  });
  return response.data;
};

// Login no longer returns a token in the body — the server sets it as an
// httpOnly cookie directly on this response (withCredentials: true on
// apiClient is what makes the browser actually store it).
export const loginUser = async (email: string, password: string) => {
  const response = await apiClient.post("/auth/login", {
    email,
    password,
  });
  return response.data;
};

export const logoutUser = async () => {
  const response = await apiClient.post("/auth/logout");
  return response.data;
};

// Who-am-I — used by AuthContext to hydrate the logged-in user on load,
// replacing the old localStorage.getItem("user") pattern.
export const getMe = async (): Promise<AuthUser> => {
  const response = await apiClient.get("/auth/me");
  return response.data.data;
};

export const forgotPassword = async (email: string) => {
  const response = await apiClient.post("/auth/forgot-password", { email });
  return response.data;
};

export const resetPassword = async (
  email: string,
  code: string,
  newPassword: string
) => {
  const response = await apiClient.post("/auth/reset-password", {
    email,
    code,
    newPassword,
  });
  return response.data;
};

export const verifyEmail = async (email: string, code: string) => {
  const response = await apiClient.post("/auth/verify-email", {
    email,
    code,
  });
  return response.data;
};

export const resendVerification = async (email: string) => {
  const response = await apiClient.post("/auth/resend-verification", {
    email,
  });
  return response.data;
};
