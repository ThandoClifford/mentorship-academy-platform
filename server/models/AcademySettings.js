import mongoose from 'mongoose';

const academySettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      enum: ['academy'],
      default: 'academy',
      unique: true,
      immutable: true,
    },
    academyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
      default: 'Mentorship Academy',
    },
    academyDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
      default: 'A community supporting meaningful mentorship and professional growth.',
    },
    contactEmail: { type: String, trim: true, lowercase: true, maxlength: 254, default: '' },
    contactPhone: { type: String, trim: true, maxlength: 50, default: '' },
    websiteUrl: { type: String, trim: true, maxlength: 500, default: '' },
    address: { type: String, trim: true, maxlength: 1000, default: '' },
    mentorshipProgramName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
      default: 'Mentorship Programme',
    },
    mentorshipProgramDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
      default: 'A structured programme connecting mentees with experienced mentors.',
    },
    maxMenteesPerMentor: { type: Number, min: 1, max: 100, default: 10 },
    allowMentorApplications: { type: Boolean, default: true },
    requireAdminApprovalForMentors: { type: Boolean, default: true },
    allowMenteeMentorRequests: { type: Boolean, default: true },
    requireAdminApprovalForRelationships: { type: Boolean, default: false },
    aiMatchmakingEnabled: { type: Boolean, default: true },
    minimumMatchScore: { type: Number, min: 0, max: 100, default: 0 },
    maximumSuggestedMentors: { type: Number, min: 1, max: 100, default: 50 },
    publicMentorProfilesEnabled: { type: Boolean, default: true },
    publicEventsEnabled: { type: Boolean, default: false },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: 'The Mentorship Academy is temporarily unavailable while maintenance is in progress.',
    },
  },
  { timestamps: true },
);

const AcademySettings = mongoose.model('AcademySettings', academySettingsSchema);

export default AcademySettings;
