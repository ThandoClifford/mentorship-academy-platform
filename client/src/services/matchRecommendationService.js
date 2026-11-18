import api from './api.js';

async function getData(response) {
  return response.data;
}

export async function listCohortRecommendations(cohortId, params = {}) {
  return getData(await api.get(`/admin/cohorts/${cohortId}/recommendations`, { params }));
}

export async function getCohortRecommendation(cohortId, recommendationId) {
  return getData(await api.get(
    `/admin/cohorts/${cohortId}/recommendations/${recommendationId}`,
  ));
}

export async function generateCohortRecommendations(cohortId) {
  return getData(await api.post(
    `/admin/cohorts/${cohortId}/recommendations/generate`,
  ));
}

export async function approveCohortRecommendation(cohortId, recommendationId) {
  return getData(await api.patch(
    `/admin/cohorts/${cohortId}/recommendations/${recommendationId}/approve`,
  ));
}

export async function rejectCohortRecommendation(cohortId, recommendationId, reason) {
  return getData(await api.patch(
    `/admin/cohorts/${cohortId}/recommendations/${recommendationId}/reject`,
    { reason },
  ));
}

export async function adjustCohortRecommendation(cohortId, recommendationId, adjustment) {
  return getData(await api.patch(
    `/admin/cohorts/${cohortId}/recommendations/${recommendationId}/adjust`,
    adjustment,
  ));
}
