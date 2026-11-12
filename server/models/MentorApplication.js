import mongoose from 'mongoose';
import {
  createAvailabilitySchema,
  createStringArrayField,
  MENTORSHIP_STYLES,
} from './profileFields.js';

export const MENTOR_APPLICATION_STATUSES = Object.freeze([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'SUSPENDED',
]);

const mentorApplicationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: MENTOR_APPLICATION_STATUSES,
      default: 'PENDING',
      required: true,
      index: true,
    },
    professionalBackground: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: '',
    },
    jobTitle: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    company: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    industry: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
    },
    yearsOfExperience: {
      type: Number,
      min: 0,
      max: 80,
      default: null,
    },
    expertise: createStringArrayField({ maxItems: 60 }),
    skills: createStringArrayField({ maxItems: 60 }),
    specialisations: createStringArrayField({ maxItems: 40 }),
    experienceAreas: createStringArrayField({ maxItems: 40 }),
    mentorshipAreas: createStringArrayField({ maxItems: 40 }),
    mentorshipStyle: {
      type: String,
      enum: ['', ...MENTORSHIP_STYLES],
      default: '',
    },
    languages: createStringArrayField({ maxItems: 30, maxLength: 80 }),
    availability: {
      type: new mongoose.Schema(createAvailabilitySchema(), { _id: false }),
      default: () => ({}),
    },
    motivation: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: '',
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
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
  },
  { timestamps: true },
);

mentorApplicationSchema.index({ user: 1, status: 1 });
mentorApplicationSchema.index({ status: 1, createdAt: -1 });

const MentorApplication = mongoose.model(
  'MentorApplication',
  mentorApplicationSchema,
);

export default MentorApplication;
