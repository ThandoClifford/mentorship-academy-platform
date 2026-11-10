import mongoose from 'mongoose';

export const MENTORSHIP_STATUSES = Object.freeze([
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'ACTIVE',
  'COMPLETED',
  'ARCHIVED',
]);

export const MENTORSHIP_STATUS_TRANSITIONS = Object.freeze({
  PENDING: ['ACCEPTED', 'DECLINED'],
  ACCEPTED: ['ACTIVE'],
  ACTIVE: ['COMPLETED', 'ARCHIVED'],
  COMPLETED: ['ARCHIVED'],
  DECLINED: [],
  ARCHIVED: [],
});

const mentorshipRelationshipSchema = new mongoose.Schema(
  {
    mentee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    requestMessage: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    status: {
      type: String,
      enum: MENTORSHIP_STATUSES,
      default: 'PENDING',
      required: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    respondedAt: {
      type: Date,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    archivedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

mentorshipRelationshipSchema.index({ mentee: 1, mentor: 1, status: 1 });
mentorshipRelationshipSchema.index({ mentee: 1, status: 1 });
mentorshipRelationshipSchema.index({ mentor: 1, status: 1 });
mentorshipRelationshipSchema.index({ requestedBy: 1, status: 1 });
mentorshipRelationshipSchema.index({ createdAt: -1 });

mentorshipRelationshipSchema.path('status').validate(function (value) {
  return MENTORSHIP_STATUSES.includes(value);
}, 'Invalid mentorship status.');

const MentorshipRelationship = mongoose.model(
  'MentorshipRelationship',
  mentorshipRelationshipSchema,
);

export default MentorshipRelationship;