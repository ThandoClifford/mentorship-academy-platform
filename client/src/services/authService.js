import api from './api.js';

export async function register({ firstName, lastName, email, password }) {
  const response = await api.post('/auth/register', {
    firstName,
    lastName,
    email,
    password,
  });
  return response.data;
}

export async function login({ email, password }) {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
}

export async function getCurrentUser() {
  const response = await api.get('/auth/me');
  return response.data.user;
}
