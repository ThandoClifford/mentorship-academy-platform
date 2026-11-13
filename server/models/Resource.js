import mongoose from 'mongoose';

export const RESOURCE_TYPES = Object.freeze([
  'ARTICLE',
  'VIDEO',
  'TOOL',
  'GUIDE',
  'CHECKLIST',
  'WORKBOOK',
]);

export const RESOURCE_CATEGORIES = Object.freeze([
  'CAREER',
  'MENTORSHIP',
  'SKILLS',
  'WELLBEING',
  'FINANCE',
  'PROGRAMME',
  'GENERAL',
]);

export const RESOURCE_AUDIENCES = Object.freeze([
  'ALL',
  'MENTEE',
  'MENTOR',
  'ADMIN',
]);

const resourceSchema = new mongoose.Schema(
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
      maxlength: 4000,
      default: '',
    },
    type: {
      type: String,
      enum: RESOURCE_TYPES,
      default: 'ARTICLE',
      required: true,
    },
    category: {
      type: String,
      enum: RESOURCE_CATEGORIES,
      default: 'GENERAL',
      required: true,
    },
    url: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    image: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    audience: {
      type: [String],
      enum: RESOURCE_AUDIENCES,
      default: ['ALL'],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: 'At least one audience must be selected.',
      },
    },
    published: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true },
);

resourceSchema.index({ published: 1, createdAt: -1 });
resourceSchema.index({ audience: 1, published: 1 });
resourceSchema.index({ createdBy: 1, createdAt: -1 });

const Resource = mongoose.model('Resource', resourceSchema);

export default Resource;
