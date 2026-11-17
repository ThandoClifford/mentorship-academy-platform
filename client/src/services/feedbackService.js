import api from './api.js';

export async function listRelationshipFeedback(relationshipId) {
  const response = await api.get(`/mentorship/${relationshipId}/feedback`);
  return response.data;
}

export async function submitRelationshipFeedback(relationshipId, feedback) {
  const response = await api.post(`/mentorship/${relationshipId}/feedback`, feedback);
  return response.data;
}
