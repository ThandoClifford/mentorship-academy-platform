import mongoose from 'mongoose';

export const FEEDBACK_TYPES = Object.freeze([
  'OVERALL',
  'MENTORSHIP',
  'PROGRESS',
  'COMMUNICATION',
]);

const mentorshipFeedbackSchema = new mongoose.Schema(
  {
    relationship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MentorshipRelationship',
      required: true,
      index: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    submittedFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    communicationRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    supportRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    progressRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    comments: {
      type: String,
      trim: true,
      maxlength: 4000,
      default: '',
    },
    feedbackType: {
      type: String,
      enum: FEEDBACK_TYPES,
      default: 'OVERALL',
      required: true,
    },
  },
  { timestamps: true },
);

mentorshipFeedbackSchema.index({ relationship: 1, submittedBy: 1 }, { unique: true });
mentorshipFeedbackSchema.index({ relationship: 1, createdAt: -1 });

const MentorshipFeedback = mongoose.model('MentorshipFeedback', mentorshipFeedbackSchema);

export default MentorshipFeedback;
