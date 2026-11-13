import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
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

export async function broadcastNotification({
  target,
  recipients = [],
  title,
  message,
  type = 'ADMIN_ANNOUNCEMENT',
}) {
  if (!title || !String(title).trim()) {
    throw new ApiError(400, 'Notification title is required.');
  }
  if (!message || !String(message).trim()) {
    throw new ApiError(400, 'Notification message is required.');
  }

  if (typeof target !== 'string') {
    throw new ApiError(400, 'A notification broadcast target is required.');
  }

  const normalizedTarget = target.trim().toUpperCase();
  const supportedTargets = new Set([
    'ALL',
    'MENTEES',
    'MENTORS',
    'USERS',
    'ALL_USERS',
    'ALL_MENTEES',
    'ALL_MENTORS',
    'SELECTED_USERS',
  ]);
  if (!supportedTargets.has(normalizedTarget)) {
    throw new ApiError(400, 'Notification broadcast target is invalid.', {
      target: 'Choose ALL, MENTEES, MENTORS, or USERS with selected user IDs.',
    });
  }

  let recipientIds = [];

  if (['USERS', 'SELECTED_USERS'].includes(normalizedTarget)) {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new ApiError(400, 'At least one selected user is required.', {
        recipients: 'Provide a non-empty array of user IDs.',
      });
    }
    if (recipients.some((recipient) => !mongoose.isObjectIdOrHexString(recipient))) {
      throw new ApiError(400, 'Selected user IDs must all be valid ObjectIds.', {
        recipients: 'Remove invalid user IDs and try again.',
      });
    }
    recipientIds = Array.from(new Set(recipients.map(String)));
    const existingUsers = await User.countDocuments({ _id: { $in: recipientIds } });
    if (existingUsers !== recipientIds.length) {
      throw new ApiError(400, 'One or more selected users do not exist.', {
        recipients: 'Provide IDs for existing users only.',
      });
    }
  } else if (['MENTEES', 'ALL_MENTEES'].includes(normalizedTarget)) {
    const users = await User.find({ role: 'MENTEE' }, '_id').lean();
    recipientIds = users.map((user) => String(user._id));
  } else if (['MENTORS', 'ALL_MENTORS'].includes(normalizedTarget)) {
    const users = await User.find({ role: 'MENTOR' }, '_id').lean();
    recipientIds = users.map((user) => String(user._id));
  } else if (['ALL', 'ALL_USERS'].includes(normalizedTarget)) {
    const users = await User.find({}, '_id').lean();
    recipientIds = users.map((user) => String(user._id));
  }

  if (!recipientIds.length) {
    if (['USERS', 'SELECTED_USERS'].includes(normalizedTarget)) {
      throw new ApiError(400, 'At least one valid notification recipient is required.');
    }
    return { sentCount: 0 };
  }

  const created = await createNotificationsForRecipients(recipientIds, {
    type,
    title: String(title).trim(),
    message: String(message).trim(),
    relatedEntityType: 'CONTENT',
    relatedEntityId: new mongoose.Types.ObjectId(),
  });

  return { sentCount: created.length };
}
