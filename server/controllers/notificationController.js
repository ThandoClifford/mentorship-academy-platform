import {
  getNotificationsForUser,
  getUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  broadcastNotification,
} from '../services/notificationService.js';
import { logAdminAction } from '../services/auditService.js';

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

export async function broadcastAdminNotifications(request, response) {
  const { target, recipients, title, message } = request.body ?? {};
  const result = await broadcastNotification({
    target,
    recipients,
    title,
    message,
    type: 'ADMIN_ANNOUNCEMENT',
  });

  await logAdminAction({
    actor: request.user._id,
    action: 'ADMIN_ANNOUNCEMENT',
    entityType: 'NOTIFICATION',
    entityId: request.user._id,
    metadata: {
      target: target || 'ALL_USERS',
      recipientCount: result.sentCount || 0,
    },
  });

  response.status(200).json(result);
}
