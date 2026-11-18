import mongoose from 'mongoose';

export const COHORT_STATUSES = Object.freeze([
  'DRAFT',
  'ENROLLING',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
]);

const cohortSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 160,
      required: true,
    },
    code: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 80,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    status: {
      type: String,
      enum: COHORT_STATUSES,
      default: 'DRAFT',
      required: true,
    },
    startsAt: {
      type: Date,
      required: true,
    },
    endsAt: {
      type: Date,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    activatedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
  },
  { timestamps: true },
);

cohortSchema.index({ code: 1 }, { unique: true, name: 'unique_cohort_code' });
cohortSchema.index({ status: 1, createdAt: -1 });

cohortSchema.pre('validate', function validateCohortDates() {
  if (this.startsAt && this.endsAt && this.startsAt >= this.endsAt) {
    this.invalidate('endsAt', 'Cohort end date must be after its start date.');
  }
});

const Cohort = mongoose.model('Cohort', cohortSchema);

export default Cohort;
