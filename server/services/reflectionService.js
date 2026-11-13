import mongoose from 'mongoose';
import Reflection, { REFLECTION_VISIBILITY } from '../models/Reflection.js';
import MentorshipRelationship from '../models/MentorshipRelationship.js';
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

function toSafeReflection(document) {
  if (!document) return null;
  return {
    id: document._id,
    mentorshipRelationship: document.mentorshipRelationship,
    mentee: document.mentee ? toSafeUser(document.mentee) : null,
    title: document.title,
    content: document.content,
    mood: document.mood,
    visibility: document.visibility,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

async function getAuthorizedRelationship(userId, relationshipId) {
  if (!mongoose.isValidObjectId(relationshipId)) {
    throw new ApiError(400, 'Invalid relationship ID.');
  }

  const relationship = await MentorshipRelationship.findById(relationshipId).lean();
  if (!relationship) {
    throw new ApiError(404, 'Mentorship relationship not found.');
  }

  const isParticipant = String(relationship.mentee) === String(userId) || String(relationship.mentor) === String(userId);
  if (!isParticipant) {
    throw new ApiError(403, 'You are not authorized to access reflections for this relationship.');
  }

  return relationship;
}

export async function getRelationshipReflections(userId, relationshipId, viewerRole) {
  const relationship = await getAuthorizedRelationship(userId, relationshipId);
  const baseFilter = { mentorshipRelationship: relationshipId };

  if (viewerRole === 'MENTEE' && String(relationship.mentee) === String(userId)) {
    const reflections = await Reflection.find({ ...baseFilter, mentee: userId })
      .sort({ createdAt: -1 })
      .populate('mentee', 'firstName lastName email role')
      .lean();
    return reflections.map(toSafeReflection);
  }

  if (viewerRole !== 'MENTOR' || String(relationship.mentor) !== String(userId)) {
    throw new ApiError(403, 'You are not authorized to access reflections for this relationship.');
  }

  const reflections = await Reflection.find({
    ...baseFilter,
    $or: [{ visibility: 'MENTOR' }, { visibility: 'MENTOR_AND_ADMIN' }],
  })
    .sort({ createdAt: -1 })
    .populate('mentee', 'firstName lastName email role')
    .lean();

  return reflections.map(toSafeReflection);
}

export async function createReflectionForRelationship(userId, relationshipId, payload) {
  const relationship = await getAuthorizedRelationship(userId, relationshipId);
  if (String(relationship.mentee) !== String(userId)) {
    throw new ApiError(403, 'Only the mentee can create reflections for this relationship.');
  }

  const data = payload ?? {};
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const content = typeof data.content === 'string' ? data.content.trim() : '';
  const visibility = typeof data.visibility === 'string' ? data.visibility.toUpperCase() : 'PRIVATE';

  if (!title) {
    throw new ApiError(400, 'Reflection title is required.', { title: 'Provide a title.' });
  }
  if (!content) {
    throw new ApiError(400, 'Reflection content is required.', { content: 'Provide some content.' });
  }
  if (!REFLECTION_VISIBILITY.includes(visibility)) {
    throw new ApiError(400, 'Reflection visibility is invalid.', { visibility: 'Unsupported visibility value.' });
  }

  const reflection = await Reflection.create({
    mentorshipRelationship: relationshipId,
    mentee: userId,
    title,
    content,
    mood: typeof data.mood === 'string' ? data.mood.toUpperCase() : 'MOTIVATED',
    visibility,
  });

  await reflection.populate('mentee', 'firstName lastName email role');
  return toSafeReflection(reflection.toObject ? reflection.toObject() : reflection);
}

export async function getReflectionById(userId, relationshipId, reflectionId, viewerRole) {
  if (!mongoose.isValidObjectId(reflectionId)) {
    throw new ApiError(400, 'Invalid reflection ID.');
  }

  const relationship = await getAuthorizedRelationship(userId, relationshipId);
  const reflection = await Reflection.findById(reflectionId).populate('mentee', 'firstName lastName email role').lean();
  if (!reflection) {
    throw new ApiError(404, 'Reflection not found.');
  }

  if (String(reflection.mentorshipRelationship) !== String(relationshipId)) {
    throw new ApiError(404, 'Reflection not found for this relationship.');
  }

  if (
    viewerRole === 'MENTEE' &&
    String(relationship.mentee) === String(userId) &&
    String(reflection.mentee?._id) === String(userId)
  ) {
    return toSafeReflection(reflection);
  }

  if (
    viewerRole === 'MENTOR' &&
    String(relationship.mentor) === String(userId) &&
    ['MENTOR', 'MENTOR_AND_ADMIN'].includes(reflection.visibility)
  ) {
    return toSafeReflection(reflection);
  }

  throw new ApiError(403, 'You are not authorized to view this reflection.');
}

export async function updateReflection(userId, relationshipId, reflectionId, payload) {
  if (!mongoose.isValidObjectId(reflectionId)) {
    throw new ApiError(400, 'Invalid reflection ID.');
  }

  const relationship = await getAuthorizedRelationship(userId, relationshipId);
  if (String(relationship.mentee) !== String(userId)) {
    throw new ApiError(403, 'Only the mentee can edit reflections for this relationship.');
  }

  const reflection = await Reflection.findById(reflectionId);
  if (!reflection) {
    throw new ApiError(404, 'Reflection not found.');
  }
  if (String(reflection.mentee) !== String(userId) || String(reflection.mentorshipRelationship) !== String(relationshipId)) {
    throw new ApiError(403, 'You can only edit your own reflections.');
  }

  const data = payload ?? {};
  if (typeof data.title === 'string') reflection.title = data.title.trim();
  if (typeof data.content === 'string') reflection.content = data.content.trim();
  if (typeof data.mood === 'string') reflection.mood = data.mood.toUpperCase();
  if (typeof data.visibility === 'string') {
    const visibility = data.visibility.toUpperCase();
    if (!REFLECTION_VISIBILITY.includes(visibility)) {
      throw new ApiError(400, 'Reflection visibility is invalid.', { visibility: 'Unsupported visibility value.' });
    }
    reflection.visibility = visibility;
  }

  if (!reflection.title?.trim()) {
    throw new ApiError(400, 'Reflection title is required.', { title: 'Provide a title.' });
  }
  if (!reflection.content?.trim()) {
    throw new ApiError(400, 'Reflection content is required.', { content: 'Provide some content.' });
  }

  await reflection.save();
  await reflection.populate('mentee', 'firstName lastName email role');
  return toSafeReflection(reflection.toObject ? reflection.toObject() : reflection);
}

export async function deleteReflection(userId, relationshipId, reflectionId) {
  if (!mongoose.isValidObjectId(reflectionId)) {
    throw new ApiError(400, 'Invalid reflection ID.');
  }

  const relationship = await getAuthorizedRelationship(userId, relationshipId);
  if (String(relationship.mentee) !== String(userId)) {
    throw new ApiError(403, 'Only the mentee can delete reflections for this relationship.');
  }

  const reflection = await Reflection.findById(reflectionId);
  if (!reflection) {
    throw new ApiError(404, 'Reflection not found.');
  }
  if (String(reflection.mentee) !== String(userId) || String(reflection.mentorshipRelationship) !== String(relationshipId)) {
    throw new ApiError(403, 'You can only delete your own reflections.');
  }

  await reflection.deleteOne();
  return { deleted: true, id: reflectionId };
}

export async function listAdminReflections(query = {}) {
  const parsedPage = Number.parseInt(query.page, 10);
  const parsedLimit = Number.parseInt(query.limit, 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, 100)
    : 20;
  const skip = (page - 1) * limit;
  const filter = { visibility: { $in: ['MENTOR_AND_ADMIN', 'ADMIN'] } };

  const [documents, total] = await Promise.all([
    Reflection.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('mentee', 'firstName lastName email role')
      .lean(),
    Reflection.countDocuments(filter),
  ]);

  return {
    reflections: documents.map(toSafeReflection),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}
