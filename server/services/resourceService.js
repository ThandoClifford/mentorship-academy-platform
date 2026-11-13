import mongoose from 'mongoose';
import Resource, { RESOURCE_AUDIENCES, RESOURCE_CATEGORIES, RESOURCE_TYPES } from '../models/Resource.js';
import ApiError from '../utils/ApiError.js';

function toSafeUser(user) {
  if (!user) return null;
  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
  };
}

function validatePublished(value) {
  if (typeof value !== 'boolean') {
    throw new ApiError(400, 'published must be a boolean.', {
      published: 'Provide true or false as a boolean value.',
    });
  }
  return value;
}

function normalizeAudience(value) {
  if (Array.isArray(value)) {
    const audience = [...new Set(value.map((entry) => String(entry).trim().toUpperCase()).filter(Boolean))];
    if (!audience.length) {
      throw new ApiError(400, 'Resource audience cannot be empty.', {
        audience: 'Select at least one audience.',
      });
    }
    const invalid = audience.filter((entry) => !RESOURCE_AUDIENCES.includes(entry));
    if (invalid.length) {
      throw new ApiError(400, 'Resource audience contains unsupported values.', {
        audience: `Unsupported audience values: ${invalid.join(', ')}.`,
      });
    }
    return audience;
  }

  if (typeof value !== 'string') {
    throw new ApiError(400, 'Resource audience is invalid.', {
      audience: 'Audience must be ALL, MENTEE, MENTOR, or ADMIN.',
    });
  }
  const audience = value.trim().toUpperCase();
  if (!audience) {
    throw new ApiError(400, 'Resource audience cannot be empty.', {
      audience: 'Select an audience.',
    });
  }
  if (!RESOURCE_AUDIENCES.includes(audience)) {
    throw new ApiError(400, 'Resource audience is invalid.', {
      audience: 'Audience must be ALL, MENTEE, MENTOR, or ADMIN.',
    });
  }
  return [audience];
}

function toSafeResource(resource) {
  if (!resource) return null;
  return {
    id: resource._id,
    title: resource.title,
    description: resource.description || '',
    type: resource.type,
    category: resource.category,
    url: resource.url || '',
    image: resource.image || '',
    audience: resource.audience || ['ALL'],
    published: Boolean(resource.published),
    createdBy: resource.createdBy ? toSafeUser(resource.createdBy) : null,
    createdAt: resource.createdAt,
    updatedAt: resource.updatedAt,
  };
}

function buildAudienceFilter(user) {
  if (!user) {
    return { published: true, audience: { $in: ['ALL'] } };
  }

  if (user.role === 'MENTEE') {
    return { published: true, audience: { $in: ['ALL', 'MENTEE'] } };
  }

  if (user.role === 'MENTOR') {
    return { published: true, audience: { $in: ['ALL', 'MENTOR'] } };
  }

  return { published: true };
}

export async function listResourcesForPublic(user) {
  const filter = buildAudienceFilter(user);
  const resources = await Resource.find(filter)
    .sort({ publishedAt: -1, createdAt: -1 })
    .populate('createdBy', 'firstName lastName email role')
    .lean();

  return resources.map(toSafeResource);
}

export async function getResourceById(resourceId, user) {
  if (!mongoose.isValidObjectId(resourceId)) {
    throw new ApiError(400, 'Invalid resource ID.');
  }

  const resource = await Resource.findById(resourceId)
    .populate('createdBy', 'firstName lastName email role')
    .lean();

  if (!resource) {
    throw new ApiError(404, 'Resource not found.');
  }

  const canView = resource.published &&
    (resource.audience.includes('ALL') || (user && resource.audience.includes(user.role)));

  if (!canView) {
    throw new ApiError(403, 'You are not authorized to view this resource.');
  }

  return toSafeResource(resource);
}

export async function listAdminResources() {
  const resources = await Resource.find({})
    .sort({ createdAt: -1 })
    .populate('createdBy', 'firstName lastName email role')
    .lean();

  return resources.map(toSafeResource);
}

export async function createResource(adminId, payload) {
  if (!mongoose.isValidObjectId(adminId)) {
    throw new ApiError(400, 'Invalid admin ID.');
  }

  const data = payload ?? {};
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const description = typeof data.description === 'string' ? data.description.trim() : '';
  const type = typeof data.type === 'string' ? data.type.toUpperCase() : 'ARTICLE';
  const category = typeof data.category === 'string' ? data.category.toUpperCase() : 'GENERAL';
  const url = typeof data.url === 'string' ? data.url.trim() : '';
  const image = typeof data.image === 'string' ? data.image.trim() : '';
  const published = 'published' in data ? validatePublished(data.published) : false;

  if (!title) {
    throw new ApiError(400, 'Resource title is required.', { title: 'Provide a title.' });
  }
  if (!RESOURCE_TYPES.includes(type)) {
    throw new ApiError(400, 'Resource type is invalid.', { type: 'Unsupported resource type.' });
  }
  if (!RESOURCE_CATEGORIES.includes(category)) {
    throw new ApiError(400, 'Resource category is invalid.', { category: 'Unsupported resource category.' });
  }

  const resource = await Resource.create({
    title,
    description,
    type,
    category,
    url,
    image,
    audience: 'audience' in data ? normalizeAudience(data.audience) : ['ALL'],
    published,
    createdBy: adminId,
  });

  await resource.populate('createdBy', 'firstName lastName email role');
  return toSafeResource(resource.toObject ? resource.toObject() : resource);
}

export async function updateResource(adminId, resourceId, payload) {
  if (!mongoose.isValidObjectId(resourceId)) {
    throw new ApiError(400, 'Invalid resource ID.');
  }

  const update = payload ?? {};
  const published = 'published' in update ? validatePublished(update.published) : undefined;
  const resource = await Resource.findById(resourceId);
  if (!resource) {
    throw new ApiError(404, 'Resource not found.');
  }

  if (typeof update.title === 'string') resource.title = update.title.trim();
  if (typeof update.description === 'string') resource.description = update.description.trim();
  if (typeof update.type === 'string') {
    const type = update.type.toUpperCase();
    if (!RESOURCE_TYPES.includes(type)) {
      throw new ApiError(400, 'Resource type is invalid.', { type: 'Unsupported resource type.' });
    }
    resource.type = type;
  }
  if (typeof update.category === 'string') {
    const category = update.category.toUpperCase();
    if (!RESOURCE_CATEGORIES.includes(category)) {
      throw new ApiError(400, 'Resource category is invalid.', { category: 'Unsupported resource category.' });
    }
    resource.category = category;
  }
  if ('url' in update) resource.url = typeof update.url === 'string' ? update.url.trim() : '';
  if ('image' in update) resource.image = typeof update.image === 'string' ? update.image.trim() : '';
  if ('audience' in update) resource.audience = normalizeAudience(update.audience);
  if ('published' in update) resource.published = published;

  if (!resource.title?.trim()) {
    throw new ApiError(400, 'Resource title is required.', { title: 'Provide a title.' });
  }

  await resource.save();
  await resource.populate('createdBy', 'firstName lastName email role');
  return toSafeResource(resource.toObject ? resource.toObject() : resource);
}

export async function publishResource(resourceId) {
  if (!mongoose.isValidObjectId(resourceId)) {
    throw new ApiError(400, 'Invalid resource ID.');
  }

  const resource = await Resource.findById(resourceId);
  if (!resource) {
    throw new ApiError(404, 'Resource not found.');
  }
  resource.published = true;
  await resource.save();
  await resource.populate('createdBy', 'firstName lastName email role');
  return toSafeResource(resource.toObject ? resource.toObject() : resource);
}

export async function unpublishResource(resourceId) {
  if (!mongoose.isValidObjectId(resourceId)) {
    throw new ApiError(400, 'Invalid resource ID.');
  }

  const resource = await Resource.findById(resourceId);
  if (!resource) {
    throw new ApiError(404, 'Resource not found.');
  }
  resource.published = false;
  await resource.save();
  await resource.populate('createdBy', 'firstName lastName email role');
  return toSafeResource(resource.toObject ? resource.toObject() : resource);
}

export async function deleteResource(resourceId) {
  if (!mongoose.isValidObjectId(resourceId)) {
    throw new ApiError(400, 'Invalid resource ID.');
  }

  const resource = await Resource.findById(resourceId);
  if (!resource) {
    throw new ApiError(404, 'Resource not found.');
  }

  await resource.deleteOne();
  return { deleted: true, id: resourceId };
}
