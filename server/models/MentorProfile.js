import mongoose from 'mongoose';
import {
  createAvailabilitySchema,
  createStringArrayField,
  MENTORSHIP_STYLES,
} from './profileFields.js';

export const MENTOR_PROFILE_STATUSES = Object.freeze([
  'PENDING',
  'APPROVED',
  'REJECTED',
  'SUSPENDED',
]);

const mentorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      immutable: true,
    },
    profilePhoto: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: '',
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 40,
      default: '',
    },
    location: {
      type: String,
      trim: true,
      maxlength: 150,
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
    professionalBackground: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: '',
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
    status: {
      type: String,
      enum: MENTOR_PROFILE_STATUSES,
      default: 'PENDING',
      required: true,
    },
  },
  { timestamps: true },
);

mentorProfileSchema.index({ user: 1 }, { unique: true });

const MentorProfile = mongoose.model('MentorProfile', mentorProfileSchema);

export default MentorProfile;
