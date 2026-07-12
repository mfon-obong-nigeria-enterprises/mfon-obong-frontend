import axios, {
  type AxiosInstance,
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import { useAuthStore } from "@/stores/useAuthStore";

// Resolve API base URL with a safe production fallback.
const resolvedApiUrl = (() => {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  // If building for production and envUrl is missing or points to a relative /api,
  // fall back to the Render deployment URL so staged frontend can reach the backend.
  if (import.meta.env.PROD) {
    if (!envUrl || envUrl === "/api" || envUrl === "/api/") {
      return "https://mfon-obong-enterprise-project-8otx.onrender.com/api";
    }
    return envUrl;
  }
  // In dev, allow local relative API proxy
  return envUrl ?? "/api";
})();

const api: AxiosInstance = axios.create({
  baseURL: resolvedApiUrl,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// If tokens are persisted locally (for browsers that block cross-site cookies), use them as Authorization fallback
try {
  const localAccess = localStorage.getItem("__mfon_access_token");
  if (localAccess) {
    api.defaults.headers.common["Authorization"] = `Bearer ${localAccess}`;
  }
} catch (e) {
  // ignore localStorage errors
}

type FailedRequest = {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
};

// prevent multiple refresh calls at once
let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Attach staff branchId
api.interceptors.request.use((config) => {
  const { user } = useAuthStore.getState();

  if ((user?.role === "STAFF" || user?.role === "ADMIN") && user.branchId) {
    const branchId = user.branchId;
    const userId = user.id;

    // Skip these endpoints
    const excludedEndpoints = ["/categories", "/clients"];

    // Check if excluded
    const isExcluded = excludedEndpoints.some((endpoint) =>
      config.url?.includes(endpoint)
    );

    if (isExcluded) {
      return config;
    }

    // 1️⃣ If URL has `/branch/:id` → replace it
    if (config.url?.includes("/branch/")) {
      // e.g. /transactions/branch/ → /transactions/branch/{branchId}
      config.url = config.url.replace(/\/branch(\/)?$/, `/branch/${branchId}`);
    }

    // exclude branchid for staff for /user endpoint
    if (config.url?.includes("/user/")) {
      // e.g. /transactions/branch/ → /transactions/branch/{branchId}
      config.url = config.url.replace(/\/user(\/)?$/, `/user/${userId}`);
    }
  }

  return config;
});

//  Response interceptor for 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // const originalRequest: any = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Never try to refresh auth endpoints — refresh would cause a deadlock,
      // and logout 401s should clear the session locally without a redirect
      if (
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/auth/logout')
      ) {
        return Promise.reject(error);
      }

      // 👇 check auth state before trying refresh
      const { isAuthenticated } = useAuthStore.getState();
      if (!isAuthenticated) {
        // If user not logged in, don't try refresh → just reject
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // queue up requests until refresh finishes
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call refresh endpoint; this will use cookie-based refresh when possible,
        // or body-based refresh if the client provided tokens in localStorage.
        // Use the authService refresh helper to persist tokens correctly.
        await (await import("./authService")).refreshToken();

        // ensure axios default Authorization header is up-to-date
        const access = localStorage.getItem("__mfon_access_token");
        if (access)
          api.defaults.headers.common["Authorization"] = `Bearer ${access}`;

        processQueue(null);
        return api(originalRequest); // retry original request
      } catch (refreshError) {
        processQueue(refreshError, null);

        // Show user-friendly session expired message
        if (process.env.NODE_ENV === "development") {
          console.warn("Session expired - redirecting to login");
        }

        // clear local auth state and any stored tokens
        useAuthStore.getState().logout(); // this will clear localStorage via authService.logout
        window.location.href = "/";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
