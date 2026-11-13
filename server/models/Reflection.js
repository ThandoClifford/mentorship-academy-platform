import mongoose from 'mongoose';

export const REFLECTION_VISIBILITY = Object.freeze([
  'PRIVATE',
  'MENTOR',
  'MENTOR_AND_ADMIN',
  'ADMIN',
]);

export const REFLECTION_MOODS = Object.freeze([
  'EXCITED',
  'MOTIVATED',
  'CALM',
  'CONFUSED',
  'STRESSED',
  'OVERWHELMED',
  'PROUD',
  'INSPIRED',
]);

const reflectionSchema = new mongoose.Schema(
  {
    mentorshipRelationship: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MentorshipRelationship',
      required: true,
      index: true,
    },
    mentee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    mood: {
      type: String,
      enum: REFLECTION_MOODS,
      default: 'MOTIVATED',
    },
    visibility: {
      type: String,
      enum: REFLECTION_VISIBILITY,
      default: 'PRIVATE',
      required: true,
    },
  },
  { timestamps: true },
);

reflectionSchema.index({ mentorshipRelationship: 1, mentee: 1, createdAt: -1 });
reflectionSchema.index({ visibility: 1, createdAt: -1 });

const Reflection = mongoose.model('Reflection', reflectionSchema);

export default Reflection;
