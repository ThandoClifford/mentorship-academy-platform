import api from './api.js';

async function getData(response) {
  return response.data;
}

export async function getAdminDashboard() {
  return getData(await api.get('/admin/dashboard'));
}

export async function listAdminUsers(params = {}) {
  return getData(await api.get('/admin/users', { params }));
}

export async function getAdminUser(id) {
  return getData(await api.get(`/admin/users/${id}`));
}

export async function updateAdminUserStatus(id, isActive) {
  return getData(await api.patch(`/admin/users/${id}/status`, { isActive }));
}

export async function listAdminMentors(params = {}) {
  return getData(await api.get('/admin/mentors', { params }));
}

export async function getAdminMentor(id) {
  return getData(await api.get(`/admin/mentors/${id}`));
}

export async function listAdminMentees(params = {}) {
  return getData(await api.get('/admin/mentees', { params }));
}

export async function getAdminMentee(id) {
  return getData(await api.get(`/admin/mentees/${id}`));
}

export async function listMentorApplications(params = {}) {
  return getData(await api.get('/admin/mentor-applications', { params }));
}

export async function getMentorApplication(id) {
  return getData(await api.get(`/admin/mentor-applications/${id}`));
}

export async function approveMentorApplication(id, adminNotes = '') {
  return getData(await api.patch(`/admin/mentor-applications/${id}/approve`, { adminNotes }));
}

export async function rejectMentorApplication(id, adminNotes = '') {
  return getData(await api.patch(`/admin/mentor-applications/${id}/reject`, { adminNotes }));
}

export async function suspendMentorApplication(id) {
  return getData(await api.patch(`/admin/mentor-applications/${id}/suspend`));
}

export async function listAdminRelationships(params = {}) {
  return getData(await api.get('/admin/relationships', { params }));
}

export async function getAdminRelationship(id) {
  return getData(await api.get(`/admin/relationships/${id}`));
}

export async function approveAdminRelationship(id) {
  return getData(await api.patch(`/admin/relationships/${id}/approve`));
}

export async function rejectAdminRelationship(id) {
  return getData(await api.patch(`/admin/relationships/${id}/reject`));
}

export async function getAdminMenteeMatches(menteeId) {
  return getData(await api.get(`/admin/matches/${menteeId}`));
}

export async function listAdminFeedback() {
  return getData(await api.get('/admin/feedback'));
}

export async function broadcastAdminNotification(data) {
  return getData(await api.post('/admin/notifications/broadcast', data));
}

export async function getAdminSettings() {
  return getData(await api.get('/admin/settings'));
}

export async function updateAdminSettings(data) {
  return getData(await api.put('/admin/settings', data));
}

export async function getPlatformStatus() {
  return getData(await api.get('/platform/status'));
}

export async function listAdminAuditLogs(params = {}) {
  return getData(await api.get('/admin/audit', { params }));
}

export async function listAdminResources() {
  return getData(await api.get('/admin/resources'));
}

export async function createAdminResource(data) {
  return getData(await api.post('/admin/resources', data));
}

export async function updateAdminResource(id, data) {
  return getData(await api.patch(`/admin/resources/${id}`, data));
}

export async function publishAdminResource(id) {
  return getData(await api.patch(`/admin/resources/${id}/publish`));
}

export async function unpublishAdminResource(id) {
  return getData(await api.patch(`/admin/resources/${id}/unpublish`));
}

export async function deleteAdminResource(id) {
  return getData(await api.delete(`/admin/resources/${id}`));
}

export async function listAdminContent() {
  return getData(await api.get('/admin/content'));
}

export async function createAdminContent(data) {
  return getData(await api.post('/admin/content', data));
}

export async function updateAdminContent(id, data) {
  return getData(await api.patch(`/admin/content/${id}`, data));
}

export async function deleteAdminContent(id) {
  return getData(await api.delete(`/admin/content/${id}`));
}
