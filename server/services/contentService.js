import mongoose from 'mongoose';
import Content, { CONTENT_TYPES } from '../models/Content.js';
import ApiError from '../utils/ApiError.js';

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 220);
}

function validatePublished(value) {
  if (typeof value !== 'boolean') {
    throw new ApiError(400, 'published must be a boolean.', {
      published: 'Provide true or false as a boolean value.',
    });
  }
  return value;
}

async function generateUniqueSlug(title, excludeId = null) {
  const base = normalizeSlug(title);
  if (!base) {
    throw new ApiError(400, 'Content title is required.', { title: 'Provide a title.' });
  }

  let candidate = base;
  let counter = 1;
  while (true) {
    const existing = await Content.findOne({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }).lean();
    if (!existing) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
}

function toSafeContent(document) {
  if (!document) return null;
  return {
    id: document._id,
    type: document.type,
    title: document.title,
    slug: document.slug,
    excerpt: document.excerpt || '',
    body: document.body || '',
    image: document.image || '',
    published: Boolean(document.published),
    publishedAt: document.publishedAt,
    createdBy: document.createdBy,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

export async function listPublishedContent() {
  const content = await Content.find({ published: true }).sort({ publishedAt: -1, createdAt: -1 }).lean();
  return content.map(toSafeContent);
}

export async function getContentBySlug(slug) {
  const content = await Content.findOne({ slug, published: true }).lean();
  if (!content) {
    throw new ApiError(404, 'Content not found.');
  }
  return toSafeContent(content);
}

export async function listAdminContent() {
  const content = await Content.find({}).sort({ createdAt: -1 }).lean();
  return content.map(toSafeContent);
}

export async function createContent(adminId, payload) {
  if (!mongoose.isValidObjectId(adminId)) {
    throw new ApiError(400, 'Invalid admin ID.');
  }

  const data = payload ?? {};
  const type = typeof data.type === 'string' ? data.type.toUpperCase() : '';
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const excerpt = typeof data.excerpt === 'string' ? data.excerpt.trim() : '';
  const body = typeof data.body === 'string' ? data.body.trim() : '';
  const image = typeof data.image === 'string' ? data.image.trim() : '';
  const published = 'published' in data ? validatePublished(data.published) : false;

  if (!CONTENT_TYPES.includes(type)) {
    throw new ApiError(400, 'Content type is invalid.', { type: 'Unsupported content type.' });
  }
  if (!title) {
    throw new ApiError(400, 'Content title is required.', { title: 'Provide a title.' });
  }
  if (!body) {
    throw new ApiError(400, 'Content body is required.', { body: 'Provide the article/story body.' });
  }

  const slug = await generateUniqueSlug(title);
  const item = await Content.create({
    type,
    title,
    slug,
    excerpt,
    body,
    image,
    published,
    publishedAt: published ? new Date() : null,
    createdBy: adminId,
  });

  return toSafeContent(item.toObject ? item.toObject() : item);
}

export async function updateContent(adminId, contentId, payload) {
  if (!mongoose.isValidObjectId(contentId)) {
    throw new ApiError(400, 'Invalid content ID.');
  }

  const data = payload ?? {};
  const published = 'published' in data ? validatePublished(data.published) : undefined;
  const item = await Content.findById(contentId);
  if (!item) {
    throw new ApiError(404, 'Content not found.');
  }

  if (typeof data.type === 'string') {
    const type = data.type.toUpperCase();
    if (!CONTENT_TYPES.includes(type)) {
      throw new ApiError(400, 'Content type is invalid.', { type: 'Unsupported content type.' });
    }
    item.type = type;
  }
  if (typeof data.title === 'string') {
    item.title = data.title.trim();
    if (item.title) {
      item.slug = await generateUniqueSlug(item.title, item._id);
    }
  }
  if ('excerpt' in data) item.excerpt = typeof data.excerpt === 'string' ? data.excerpt.trim() : '';
  if ('body' in data) item.body = typeof data.body === 'string' ? data.body.trim() : '';
  if ('image' in data) item.image = typeof data.image === 'string' ? data.image.trim() : '';
  if ('published' in data) {
    item.published = published;
    item.publishedAt = item.published ? item.publishedAt || new Date() : null;
  }

  if (!item.title?.trim()) {
    throw new ApiError(400, 'Content title is required.', { title: 'Provide a title.' });
  }
  if (!item.body?.trim()) {
    throw new ApiError(400, 'Content body is required.', { body: 'Provide the article/story body.' });
  }

  await item.save();
  return toSafeContent(item.toObject ? item.toObject() : item);
}

export async function deleteContent(contentId) {
  if (!mongoose.isValidObjectId(contentId)) {
    throw new ApiError(400, 'Invalid content ID.');
  }

  const item = await Content.findById(contentId);
  if (!item) {
    throw new ApiError(404, 'Content not found.');
  }

  await item.deleteOne();
  return { deleted: true, id: contentId };
}
