import mongoose from 'mongoose';

export const MATCH_RECOMMENDATION_REVIEW_STATUSES = Object.freeze([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'ADJUSTED',
]);

const adjustmentHistorySchema = new mongoose.Schema(
  {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewedAt: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 1000,
      required: true,
    },
    previous: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { _id: false },
);

const matchRecommendationSchema = new mongoose.Schema(
  {
    cohort: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cohort',
      required: true,
      immutable: true,
    },
    menteeMembership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CohortMembership',
      required: true,
    },
    mentorMembership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CohortMembership',
      required: true,
    },
    matchingRun: {
      type: String,
      trim: true,
      maxlength: 120,
      required: true,
      immutable: true,
    },
    compatibilityScore: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    scoreBreakdown: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    sharedInterests: {
      type: [{ type: String, trim: true, maxlength: 300 }],
      default: [],
    },
    developmentOpportunities: {
      type: [{ type: String, trim: true, maxlength: 1000 }],
      default: [],
    },
    reasons: {
      type: [{ type: String, trim: true, maxlength: 1000 }],
      default: [],
    },
    reviewStatus: {
      type: String,
      enum: MATCH_RECOMMENDATION_REVIEW_STATUSES,
      default: 'PENDING',
      required: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
    adjustmentHistory: {
      type: [adjustmentHistorySchema],
      default: [],
    },
  },
  { timestamps: true, optimisticConcurrency: true },
);

matchRecommendationSchema.index(
  { cohort: 1, matchingRun: 1, menteeMembership: 1, mentorMembership: 1 },
  { unique: true, name: 'unique_match_recommendation_per_run' },
);
matchRecommendationSchema.index(
  { cohort: 1, menteeMembership: 1, mentorMembership: 1 },
  {
    unique: true,
    name: 'unique_approved_cohort_pair',
    partialFilterExpression: { reviewStatus: 'APPROVED' },
  },
);
matchRecommendationSchema.index(
  { cohort: 1, menteeMembership: 1 },
  {
    unique: true,
    name: 'unique_approved_cohort_mentee',
    partialFilterExpression: { reviewStatus: 'APPROVED' },
  },
);
matchRecommendationSchema.index({ cohort: 1, reviewStatus: 1, createdAt: -1 });

const MatchRecommendation = mongoose.model('MatchRecommendation', matchRecommendationSchema);

export default MatchRecommendation;
