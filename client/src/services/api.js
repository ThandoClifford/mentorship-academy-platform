import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 5000,
});

export async function fetchHealth(config) {
  const response = await api.get('/health', config);
  return response.data;
}
