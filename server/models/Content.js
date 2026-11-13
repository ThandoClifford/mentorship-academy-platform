import mongoose from 'mongoose';

export const CONTENT_TYPES = Object.freeze([
  'STORY',
  'ARTICLE',
  'FAQ',
  'PROGRAMME',
  'ANNOUNCEMENT',
]);

const contentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: CONTENT_TYPES,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 220,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 220,
    },
    excerpt: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 15000,
    },
    image: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    published: {
      type: Boolean,
      default: false,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

contentSchema.index({ published: 1, publishedAt: -1 });
contentSchema.index({ type: 1, published: 1 });

const Content = mongoose.model('Content', contentSchema);

export default Content;
