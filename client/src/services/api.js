import axios from 'axios';

const AUTH_TOKEN_KEY = 'mentorship_academy_token';
const authSubmissionPaths = ['/auth/login', '/auth/register'];

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 5000,
});

export function getStoredAuthToken() {
  return typeof window === 'undefined'
    ? null
    : window.sessionStorage.getItem(AUTH_TOKEN_KEY);
}

export function storeAuthToken(token) {
  window.sessionStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearStoredAuthToken() {
  window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const isAuthSubmission = authSubmissionPaths.includes(config.url);
  const token = isAuthSubmission ? null : getStoredAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthSubmission = authSubmissionPaths.includes(error.config?.url);

    if (
      error.response?.status === 401 &&
      !isAuthSubmission &&
      getStoredAuthToken()
    ) {
      clearStoredAuthToken();
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    return Promise.reject(error);
  },
);

export async function fetchHealth(config) {
  const response = await api.get('/health', config);
  return response.data;
}

export default api;
