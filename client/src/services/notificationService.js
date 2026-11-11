import api from './api.js';

async function getData(response) {
  return response.data;
}

export async function getNotifications() {
  const response = await api.get('/notifications');
  return getData(response);
}

export async function getUnreadNotificationCount() {
  const response = await api.get('/notifications/unread-count');
  return getData(response);
}

export async function markNotificationRead(id) {
  const response = await api.patch(`/notifications/${id}/read`);
  return getData(response);
}

export async function markAllNotificationsRead() {
  const response = await api.patch('/notifications/read-all');
  return getData(response);
}
