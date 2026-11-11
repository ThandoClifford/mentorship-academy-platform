import {
  getNotificationsForUser,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notificationService.js';

function getUserId(request) {
  return request.user._id;
}

export async function listNotifications(request, response) {
  const notifications = await getNotificationsForUser(getUserId(request));
  response.status(200).json({ notifications });
}

export async function unreadCount(request, response) {
  const count = await getUnreadCount(getUserId(request));
  response.status(200).json({ count });
}

export async function markAsRead(request, response) {
  const { id } = request.params;
  const notification = await markNotificationAsRead(getUserId(request), id);
  response.status(200).json({ notification });
}

export async function markAllAsRead(request, response) {
  const result = await markAllNotificationsAsRead(getUserId(request));
  response.status(200).json(result);
}
