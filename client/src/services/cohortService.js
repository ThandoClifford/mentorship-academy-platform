import api from './api.js';

async function getData(response) {
  return response.data;
}

export async function listCohorts(params = {}) {
  return getData(await api.get('/admin/cohorts', { params }));
}

export async function createCohort(data) {
  return getData(await api.post('/admin/cohorts', data));
}

export async function getCohort(id) {
  return getData(await api.get(`/admin/cohorts/${id}`));
}

export async function updateCohort(id, data) {
  return getData(await api.patch(`/admin/cohorts/${id}`, data));
}

export async function updateCohortStatus(id, data) {
  return getData(await api.patch(`/admin/cohorts/${id}/status`, data));
}

export async function listCohortMembers(id, params = {}) {
  return getData(await api.get(`/admin/cohorts/${id}/members`, { params }));
}

export async function assignCohortMember(id, data) {
  return getData(await api.post(`/admin/cohorts/${id}/members`, data));
}

export async function updateCohortMemberStatus(id, membershipId, data) {
  return getData(await api.patch(`/admin/cohorts/${id}/members/${membershipId}`, data));
}

export async function getCurrentCohort() {
  return getData(await api.get('/cohorts/current'));
}
