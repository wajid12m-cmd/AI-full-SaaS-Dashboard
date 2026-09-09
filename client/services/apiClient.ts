import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "./apiConfig";

// Single shared axios instance used by every service file.
//
// `withCredentials: true` makes the browser send the httpOnly auth cookies
// automatically on every request — no service needs to read a token out of
// localStorage (and read/write it into an Authorization header) anymore.
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// If several requests 401 at roughly the same time (e.g. a page fires 3
// API calls on mount right as the access token expires), we only want to
// call /auth/refresh ONCE and let the others wait for it, not race.
let refreshPromise: Promise<void> | null = null;

const isAuthEndpoint = (url?: string) =>
  !!url && /\/auth\/(refresh|login|register)$/.test(url);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableConfig | undefined;

    const shouldAttemptRefresh =
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url);

    if (!shouldAttemptRefresh) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = apiClient
          .post("/auth/refresh")
          .then(() => undefined)
          .finally(() => {
            refreshPromise = null;
          });
      }
      await refreshPromise;

      return apiClient(originalRequest);
    } catch (refreshError) {
      // Refresh token is gone/expired too — the session is really over.
      // This runs inside an axios interceptor, outside any React
      // component, so useRouter() isn't available — a hard navigation is
      // the correct tool here (it also fully resets any in-memory app
      // state, which we want on a forced logout).
      if (typeof window !== "undefined") {
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- no router available outside React tree
        window.location.href = "/login";
      }
      return Promise.reject(refreshError);
    }
  }
);

export default apiClient;
