import api from './api.js';

async function getData(response) {
  return response.data;
}

export async function createMentorshipRequest({ mentorId, requestMessage }) {
  const response = await api.post('/mentee/mentorship/requests', {
    mentorId,
    requestMessage,
  });
  return getData(response);
}

export async function getMyMentorshipRequests() {
  const response = await api.get('/mentee/mentorship/requests');
  return getData(response);
}

export async function getMyMentorshipRelationships() {
  const response = await api.get('/mentee/mentorship/relationships');
  return getData(response);
}

export async function getMentorMentorshipRequests() {
  const response = await api.get('/mentor/mentorship/requests');
  return getData(response);
}

export async function getMentorMentorshipRelationships() {
  const response = await api.get('/mentor/mentorship/relationships');
  return getData(response);
}

export async function getMentorshipRelationship(id) {
  const response = await api.get(`/mentee/mentorship/${id}`);
  return getData(response);
}

export async function getMentorMentorshipRelationship(id) {
  const response = await api.get(`/mentor/mentorship/${id}`);
  return getData(response);
}

export async function acceptMentorshipRequest(id) {
  const response = await api.patch(`/mentor/mentorship/${id}/accept`);
  return getData(response);
}

export async function declineMentorshipRequest(id) {
  const response = await api.patch(`/mentor/mentorship/${id}/decline`);
  return getData(response);
}

export async function activateMentorshipRelationship(id) {
  const response = await api.patch(`/mentor/mentorship/${id}/activate`);
  return getData(response);
}

export async function completeMentorshipRelationship(id) {
  const response = await api.patch(`/mentee/mentorship/${id}/complete`);
  return getData(response);
}

export async function archiveMentorshipRelationship(id) {
  const response = await api.patch(`/mentee/mentorship/${id}/archive`);
  return getData(response);
}

export async function mentorCompleteMentorshipRelationship(id) {
  const response = await api.patch(`/mentor/mentorship/${id}/complete`);
  return getData(response);
}

export async function mentorArchiveMentorshipRelationship(id) {
  const response = await api.patch(`/mentor/mentorship/${id}/archive`);
  return getData(response);
}