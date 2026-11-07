import mongoose from 'mongoose';
import {
  CAREER_STAGES,
  createAvailabilitySchema,
  createEnumArrayField,
  createStringArrayField,
  MENTORSHIP_STYLES,
} from './profileFields.js';

const menteeProfileSchema = new mongoose.Schema(
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
    institution: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    qualification: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    fieldOfStudy: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },
    careerStage: {
      type: String,
      enum: ['', ...CAREER_STAGES],
      default: '',
    },
    careerGoals: createStringArrayField({ maxItems: 20, maxLength: 300 }),
    mentorshipGoals: createStringArrayField({ maxItems: 20, maxLength: 300 }),
    interests: createStringArrayField({ maxItems: 40 }),
    preferredMentorExpertise: createStringArrayField({ maxItems: 40 }),
    preferredIndustry: createStringArrayField({ maxItems: 30 }),
    preferredMentorshipStyle: createEnumArrayField(MENTORSHIP_STYLES),
    skills: createStringArrayField({ maxItems: 60 }),
    industries: createStringArrayField({ maxItems: 30 }),
    experienceAreas: createStringArrayField({ maxItems: 40 }),
    availability: {
      type: new mongoose.Schema(createAvailabilitySchema(), { _id: false }),
      default: () => ({}),
    },
  },
  { timestamps: true },
);

menteeProfileSchema.index({ user: 1 }, { unique: true });

const MenteeProfile = mongoose.model('MenteeProfile', menteeProfileSchema);

export default MenteeProfile;
