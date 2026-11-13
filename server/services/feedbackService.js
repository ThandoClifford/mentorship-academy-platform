import mongoose from 'mongoose';
import MentorshipFeedback from '../models/MentorshipFeedback.js';
import MentorshipRelationship from '../models/MentorshipRelationship.js';
import ApiError from '../utils/ApiError.js';
import { createNotification } from './notificationService.js';

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

function normalizeScore(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const score = Number(value);
  if (!Number.isFinite(score) || score < 1 || score > 5) {
    throw new ApiError(400, `${fieldName} must be a number between 1 and 5.`, {
      [fieldName]: 'Provide a value between 1 and 5.',
    });
  }
  return score;
}

function toSafeFeedback(document) {
  if (!document) return null;
  return {
    id: document._id,
    relationship: document.relationship,
    submittedBy: document.submittedBy ? toSafeUser(document.submittedBy) : null,
    submittedFor: document.submittedFor ? toSafeUser(document.submittedFor) : null,
    rating: document.rating,
    communicationRating: document.communicationRating,
    supportRating: document.supportRating,
    progressRating: document.progressRating,
    comments: document.comments || '',
    feedbackType: document.feedbackType,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

async function getRelationshipForUser(userId, relationshipId) {
  if (!mongoose.isValidObjectId(relationshipId)) {
    throw new ApiError(400, 'Invalid relationship ID.');
  }

  const relationship = await MentorshipRelationship.findById(relationshipId).lean();
  if (!relationship) {
    throw new ApiError(404, 'Mentorship relationship not found.');
  }

  const isParticipant = String(relationship.mentee) === String(userId) || String(relationship.mentor) === String(userId);
  if (!isParticipant) {
    throw new ApiError(403, 'You are not authorized to access feedback for this relationship.');
  }

  return relationship;
}

export async function submitFeedbackForRelationship(userId, relationshipId, payload) {
  const relationship = await getRelationshipForUser(userId, relationshipId);
  const userRole = String(relationship.mentee) === String(userId) ? 'MENTEE' : 'MENTOR';
  const targetUserId = userRole === 'MENTEE' ? relationship.mentor : relationship.mentee;

  const data = payload ?? {};
  const submittedFor = data.submittedFor ? String(data.submittedFor) : String(targetUserId);
  if (!mongoose.isValidObjectId(submittedFor)) {
    throw new ApiError(400, 'Invalid feedback recipient ID.');
  }
  if (String(submittedFor) !== String(targetUserId)) {
    throw new ApiError(403, 'You may only submit feedback for your mentorship partner.');
  }

  const existing = await MentorshipFeedback.findOne({ relationship: relationshipId, submittedBy: userId }).lean();
  if (existing) {
    throw new ApiError(409, 'You have already submitted feedback for this mentorship relationship.');
  }

  const feedback = await MentorshipFeedback.create({
    relationship: relationshipId,
    submittedBy: userId,
    submittedFor: targetUserId,
    rating: normalizeScore(data.rating, 'rating'),
    communicationRating: normalizeScore(data.communicationRating, 'communicationRating'),
    supportRating: normalizeScore(data.supportRating, 'supportRating'),
    progressRating: normalizeScore(data.progressRating, 'progressRating'),
    comments: typeof data.comments === 'string' ? data.comments.trim() : '',
    feedbackType: typeof data.feedbackType === 'string' ? data.feedbackType.toUpperCase() : 'OVERALL',
  });

  await feedback.populate([
    { path: 'submittedBy', select: 'firstName lastName email role' },
    { path: 'submittedFor', select: 'firstName lastName email role' },
  ]);

  await createNotification({
    recipient: targetUserId,
    type: 'FEEDBACK_RECEIVED',
    title: 'Feedback received',
    message: `${userRole === 'MENTEE' ? 'A mentee' : 'A mentor'} submitted feedback for this mentorship relationship.`,
    relatedEntityType: 'FEEDBACK',
    relatedEntityId: feedback._id,
  });

  return toSafeFeedback(feedback.toObject ? feedback.toObject() : feedback);
}

export async function listFeedbackForRelationship(userId, relationshipId) {
  await getRelationshipForUser(userId, relationshipId);

  const feedback = await MentorshipFeedback.find({ relationship: relationshipId })
    .sort({ createdAt: -1 })
    .populate([
      { path: 'submittedBy', select: 'firstName lastName email role' },
      { path: 'submittedFor', select: 'firstName lastName email role' },
    ])
    .lean();

  return feedback.map(toSafeFeedback);
}

export async function listAllFeedback() {
  const feedback = await MentorshipFeedback.find({})
    .sort({ createdAt: -1 })
    .populate([
      { path: 'submittedBy', select: 'firstName lastName email role' },
      { path: 'submittedFor', select: 'firstName lastName email role' },
    ])
    .lean();

  return feedback.map(toSafeFeedback);
}
