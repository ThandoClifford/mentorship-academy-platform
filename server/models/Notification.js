import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = Object.freeze([
  'MENTORSHIP_REQUESTED',
  'MENTORSHIP_ACCEPTED',
  'MENTORSHIP_DECLINED',
  'MENTORSHIP_ACTIVATED',
  'MENTORSHIP_COMPLETED',
  'NEW_MESSAGE',
  'GOAL_FEEDBACK',
  'GOAL_MILESTONE_UPDATED',
]);

export const NOTIFICATION_ENTITY_TYPES = Object.freeze([
  'MENTORSHIP',
  'MESSAGE',
  'GOAL',
]);

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    relatedEntityType: {
      type: String,
      enum: NOTIFICATION_ENTITY_TYPES,
      required: true,
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
