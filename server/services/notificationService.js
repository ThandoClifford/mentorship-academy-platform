import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';

function toSafeNotification(notification) {
  return {
    id: notification._id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    relatedEntityType: notification.relatedEntityType,
    relatedEntityId: notification.relatedEntityId,
    isRead: notification.isRead,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  };
}

export async function createNotification(data) {
  const { recipient, type, title, message, relatedEntityType, relatedEntityId } = data || {};

  if (!recipient || !mongoose.isValidObjectId(recipient)) {
    throw new ApiError(400, 'Invalid notification recipient.');
  }
  if (!type || !title || !message || !relatedEntityType || !relatedEntityId) {
    throw new ApiError(400, 'Notification payload is incomplete.');
  }
  if (!mongoose.isValidObjectId(relatedEntityId)) {
    throw new ApiError(400, 'Invalid notification related entity.');
  }

  const notification = await Notification.create({
    recipient,
    type,
    title: String(title).trim(),
    message: String(message).trim(),
    relatedEntityType,
    relatedEntityId,
    isRead: false,
  });

  return toSafeNotification(notification);
}

export async function createNotificationsForRecipients(recipients, base) {
  const ids = Array.from(
    new Set((recipients || []).map((id) => String(id)).filter(Boolean)),
  );
  if (!ids.length) return [];
  const docs = ids.map((recipient) => ({
    recipient,
    type: base.type,
    title: String(base.title).trim(),
    message: String(base.message).trim(),
    relatedEntityType: base.relatedEntityType,
    relatedEntityId: base.relatedEntityId,
    isRead: false,
  }));
  const created = await Notification.insertMany(docs, { ordered: false });
  return created.map(toSafeNotification);
}

export async function getNotificationsForUser(userId) {
  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, 'Invalid user ID.');
  }
  const notifications = await Notification.find({ recipient: userId })
    .sort({ createdAt: -1 })
    .lean();
  return notifications.map(toSafeNotification);
}

export async function getUnreadCount(userId) {
  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, 'Invalid user ID.');
  }
  const count = await Notification.countDocuments({ recipient: userId, isRead: false });
  return count;
}

export async function markNotificationAsRead(userId, notificationId) {
  if (!mongoose.isValidObjectId(notificationId)) {
    throw new ApiError(400, 'Invalid notification ID.');
  }
  const notification = await Notification.findOne({ _id: notificationId, recipient: userId });
  if (!notification) {
    throw new ApiError(404, 'Notification not found.');
  }
  if (!notification.isRead) {
    notification.isRead = true;
    await notification.save();
  }
  return toSafeNotification(notification);
}

export async function markAllNotificationsAsRead(userId) {
  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, 'Invalid user ID.');
  }
  const result = await Notification.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true } },
  );
  return { modifiedCount: result.modifiedCount || 0 };
}
