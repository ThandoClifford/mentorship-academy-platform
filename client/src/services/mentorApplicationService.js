import api from './api.js';

async function getData(response) {
  return response.data;
}

export async function submitMentorApplication(data) {
  const response = await api.post('/mentor-applications', data);
  return getData(response);
}

export async function getMyMentorApplication() {
  const response = await api.get('/mentor-applications/me');
  return getData(response);
}
