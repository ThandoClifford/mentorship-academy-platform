import mongoose from 'mongoose';

export const COHORT_MEMBERSHIP_ROLES = Object.freeze(['MENTEE', 'MENTOR']);
export const COHORT_MEMBERSHIP_STATUSES = Object.freeze([
  'ENROLLED',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'REMOVED',
]);

const cohortMembershipSchema = new mongoose.Schema(
  {
    cohort: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cohort',
      required: true,
      immutable: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    participantRole: {
      type: String,
      enum: COHORT_MEMBERSHIP_ROLES,
      required: true,
      immutable: true,
    },
    status: {
      type: String,
      enum: COHORT_MEMBERSHIP_STATUSES,
      default: 'ENROLLED',
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    statusChangedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    statusChangedAt: {
      type: Date,
      default: null,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  { timestamps: true },
);

cohortMembershipSchema.index(
  { cohort: 1, user: 1 },
  {
    unique: true,
    name: 'unique_current_cohort_membership',
    partialFilterExpression: { status: { $in: ['ENROLLED', 'ACTIVE', 'PAUSED'] } },
  },
);
cohortMembershipSchema.index(
  { user: 1 },
  {
    unique: true,
    name: 'unique_active_mentee_cohort_membership',
    partialFilterExpression: { participantRole: 'MENTEE', status: 'ACTIVE' },
  },
);
cohortMembershipSchema.index({ cohort: 1, status: 1, participantRole: 1 });
cohortMembershipSchema.index({ user: 1, status: 1 });

const CohortMembership = mongoose.model('CohortMembership', cohortMembershipSchema);

export default CohortMembership;
