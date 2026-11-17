import api from './api.js';

export async function listResources() {
  const response = await api.get('/resources');
  return response.data;
}
