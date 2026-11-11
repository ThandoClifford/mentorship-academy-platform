import api from './api.js';

async function getData(response) {
  return response.data;
}

export async function getMenteeMessages(relationshipId) {
  const response = await api.get(`/mentee/mentorship/${relationshipId}/messages`);
  return getData(response);
}

export async function sendMenteeMessage(relationshipId, data) {
  const response = await api.post(`/mentee/mentorship/${relationshipId}/messages`, data);
  return getData(response);
}

export async function getMentorMessages(relationshipId) {
  const response = await api.get(`/mentor/mentorship/${relationshipId}/messages`);
  return getData(response);
}

export async function sendMentorMessage(relationshipId, data) {
  const response = await api.post(`/mentor/mentorship/${relationshipId}/messages`, data);
  return getData(response);
}
