import mongoose from 'mongoose';

export const GOAL_CATEGORIES = Object.freeze([
  'SKILL',
  'CAREER',
  'PERSONAL',
  'PROJECT',
  'LEARNING',
]);

export const GOAL_STATUSES = Object.freeze([
  'DRAFT',
  'ACTIVE',
  'ON_HOLD',
  'COMPLETED',
  'ARCHIVED',
]);

export const GOAL_PRIORITIES = Object.freeze([
  'LOW',
  'MEDIUM',
  'HIGH',
]);

export const MILESTONE_STATUSES = Object.freeze([
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
]);

export const GOAL_STATUS_TRANSITIONS = Object.freeze({
  DRAFT: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['ON_HOLD', 'COMPLETED', 'ARCHIVED'],
  ON_HOLD: ['ACTIVE', 'ARCHIVED'],
  COMPLETED: ['ARCHIVED'],
  ARCHIVED: [],
});

const milestoneSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    dueDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: MILESTONE_STATUSES,
      default: 'PENDING',
      required: true,
    },
    completedAt: {
      type: Date,
    },
  },
  { _id: true, timestamps: false },
);

milestoneSchema.path('status').validate(function (value) {
  return MILESTONE_STATUSES.includes(value);
}, 'Invalid milestone status.');

const goalSchema = new mongoose.Schema(
  {
    mentorshipRelationship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MentorshipRelationship',
      required: true,
      immutable: true,
    },
    mentee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    category: {
      type: String,
      enum: GOAL_CATEGORIES,
      required: true,
    },
    status: {
      type: String,
      enum: GOAL_STATUSES,
      default: 'DRAFT',
      required: true,
    },
    priority: {
      type: String,
      enum: GOAL_PRIORITIES,
      default: 'MEDIUM',
      required: true,
    },
    targetDate: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    milestones: {
      type: [milestoneSchema],
      default: [],
    },
    mentorFeedback: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    mentorFeedbackAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

goalSchema.index({ mentorshipRelationship: 1, mentee: 1, status: 1 });
goalSchema.index({ mentorshipRelationship: 1, createdAt: -1 });
goalSchema.index({ mentee: 1, status: 1 });

goalSchema.path('status').validate(function (value) {
  return GOAL_STATUSES.includes(value);
}, 'Invalid goal status.');

goalSchema.path('category').validate(function (value) {
  return GOAL_CATEGORIES.includes(value);
}, 'Invalid goal category.');

goalSchema.path('priority').validate(function (value) {
  return GOAL_PRIORITIES.includes(value);
}, 'Invalid goal priority.');

goalSchema.methods.calculateProgress = function () {
  if (!this.milestones || this.milestones.length === 0) {
    this.progress = 0;
    return this.progress;
  }

  const total = this.milestones.length;
  const completed = this.milestones.filter((m) => m.status === 'COMPLETED').length;
  this.progress = Math.round((completed / total) * 100);
  return this.progress;
};

const Goal = mongoose.model('Goal', goalSchema);

export default Goal;