import api from './api.js';

async function getData(response) {
  return response.data;
}

export async function getMenteeGoals(relationshipId) {
  const response = await api.get(`/mentee/mentorship/${relationshipId}/goals`);
  return getData(response);
}

export async function getMenteeGoal(relationshipId, goalId) {
  const response = await api.get(`/mentee/mentorship/${relationshipId}/goals/${goalId}`);
  return getData(response);
}

export async function createGoal(relationshipId, data) {
  const response = await api.post(`/mentee/mentorship/${relationshipId}/goals`, data);
  return getData(response);
}

export async function updateGoal(relationshipId, goalId, data) {
  const response = await api.patch(`/mentee/mentorship/${relationshipId}/goals/${goalId}`, data);
  return getData(response);
}

export async function addMilestone(relationshipId, goalId, data) {
  const response = await api.post(`/mentee/mentorship/${relationshipId}/goals/${goalId}/milestones`, data);
  return getData(response);
}

export async function updateMilestone(relationshipId, goalId, milestoneId, data) {
  const response = await api.patch(`/mentee/mentorship/${relationshipId}/goals/${goalId}/milestones/${milestoneId}`, data);
  return getData(response);
}

export async function getMentorGoals(relationshipId) {
  const response = await api.get(`/mentor/mentorship/${relationshipId}/goals`);
  return getData(response);
}

export async function getMentorGoal(relationshipId, goalId) {
  const response = await api.get(`/mentor/mentorship/${relationshipId}/goals/${goalId}`);
  return getData(response);
}

export async function updateMentorFeedback(relationshipId, goalId, data) {
  const response = await api.patch(`/mentor/mentorship/${relationshipId}/goals/${goalId}/feedback`, data);
  return getData(response);
}