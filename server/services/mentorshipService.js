import mongoose from 'mongoose';
import User from '../models/User.js';
import MentorshipRelationship, {
  MENTORSHIP_STATUSES,
  MENTORSHIP_STATUS_TRANSITIONS,
} from '../models/MentorshipRelationship.js';
import ApiError from '../utils/ApiError.js';
import { createNotification, createNotificationsForRecipients } from './notificationService.js';

function toSafeUser(user) {
  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
  };
}

function toSafeRelationship(rel) {
  return {
    id: rel._id,
    mentee: rel.mentee ? toSafeUser(rel.mentee) : null,
    mentor: rel.mentor ? toSafeUser(rel.mentor) : null,
    requestedBy: rel.requestedBy ? toSafeUser(rel.requestedBy) : null,
    requestMessage: rel.requestMessage,
    status: rel.status,
    requestedAt: rel.requestedAt,
    respondedAt: rel.respondedAt,
    startedAt: rel.startedAt,
    completedAt: rel.completedAt,
    archivedAt: rel.archivedAt,
    createdAt: rel.createdAt,
    updatedAt: rel.updatedAt,
  };
}

function validateStatusTransition(currentStatus, newStatus) {
  const allowed = MENTORSHIP_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new ApiError(
      400,
      `Cannot transition from ${currentStatus} to ${newStatus}.`,
      { status: `Invalid status transition from ${currentStatus} to ${newStatus}.` },
    );
  }
}

function validateUserRole(user, expectedRole, action) {
  if (user.role !== expectedRole) {
    throw new ApiError(
      403,
      `Only ${expectedRole}s can ${action}.`,
      { role: `This action requires ${expectedRole} role.` },
    );
  }
}

export async function createMentorshipRequest(menteeId, mentorId, requestMessage) {
  if (!mongoose.isValidObjectId(menteeId) || !mongoose.isValidObjectId(mentorId)) {
    throw new ApiError(400, 'Invalid user ID provided.');
  }

  if (menteeId.equals(mentorId)) {
    throw new ApiError(400, 'You cannot request mentorship from yourself.');
  }

  const mentee = await User.findById(menteeId);
  const mentor = await User.findById(mentorId);

  if (!mentee || !mentor) {
    throw new ApiError(404, 'Mentee or mentor not found.');
  }

  if (!mentee.isActive || !mentor.isActive) {
    throw new ApiError(400, 'Mentee or mentor account is not active.');
  }

  validateUserRole(mentee, 'MENTEE', 'submit a mentorship request');
  validateUserRole(mentor, 'MENTOR', 'receive a mentorship request');

  const existingPending = await MentorshipRelationship.findOne({
    mentee: menteeId,
    mentor: mentorId,
    status: { $in: ['PENDING', 'ACCEPTED', 'ACTIVE'] },
  });

  if (existingPending) {
    const statusMessages = {
      PENDING: 'You already have a pending request with this mentor.',
      ACCEPTED: 'You already have an accepted request with this mentor.',
      ACTIVE: 'You already have an active mentorship with this mentor.',
    };
    throw new ApiError(409, statusMessages[existingPending.status] || 'A relationship already exists.');
  }

  const relationship = await MentorshipRelationship.create({
    mentee: menteeId,
    mentor: mentorId,
    requestedBy: menteeId,
    requestMessage: requestMessage?.trim() || '',
    status: 'PENDING',
    requestedAt: new Date(),
  });

  await relationship.populate([
    { path: 'mentee', select: 'firstName lastName email role' },
    { path: 'mentor', select: 'firstName lastName email role' },
    { path: 'requestedBy', select: 'firstName lastName email role' },
  ]);

  return toSafeRelationship(relationship);
}

export async function getMenteeRequests(menteeId) {
  const relationships = await MentorshipRelationship.find({
    mentee: menteeId,
    requestedBy: menteeId,
  })
    .sort({ createdAt: -1 })
    .populate([
      { path: 'mentee', select: 'firstName lastName email role' },
      { path: 'mentor', select: 'firstName lastName email role' },
      { path: 'requestedBy', select: 'firstName lastName email role' },
    ])
    .lean();

  return relationships.map(toSafeRelationship);
}

export async function getMenteeRelationships(menteeId) {
  const relationships = await MentorshipRelationship.find({
    mentee: menteeId,
    status: { $in: ['ACCEPTED', 'ACTIVE', 'COMPLETED', 'ARCHIVED'] },
  })
    .sort({ createdAt: -1 })
    .populate([
      { path: 'mentee', select: 'firstName lastName email role' },
      { path: 'mentor', select: 'firstName lastName email role' },
      { path: 'requestedBy', select: 'firstName lastName email role' },
    ])
    .lean();

  return relationships.map(toSafeRelationship);
}

export async function getMentorRequests(mentorId) {
  const relationships = await MentorshipRelationship.find({
    mentor: mentorId,
    status: 'PENDING',
  })
    .sort({ createdAt: -1 })
    .populate([
      { path: 'mentee', select: 'firstName lastName email role' },
      { path: 'mentor', select: 'firstName lastName email role' },
      { path: 'requestedBy', select: 'firstName lastName email role' },
    ])
    .lean();

  return relationships.map(toSafeRelationship);
}

export async function getMentorRelationships(mentorId) {
  const relationships = await MentorshipRelationship.find({
    mentor: mentorId,
    status: { $in: ['ACCEPTED', 'ACTIVE', 'COMPLETED', 'ARCHIVED'] },
  })
    .sort({ createdAt: -1 })
    .populate([
      { path: 'mentee', select: 'firstName lastName email role' },
      { path: 'mentor', select: 'firstName lastName email role' },
      { path: 'requestedBy', select: 'firstName lastName email role' },
    ])
    .lean();

  return relationships.map(toSafeRelationship);
}

export async function getRelationshipById(relationshipId) {
  if (!mongoose.isValidObjectId(relationshipId)) {
    throw new ApiError(400, 'Invalid relationship ID.');
  }

  const relationship = await MentorshipRelationship.findById(relationshipId)
    .populate([
      { path: 'mentee', select: 'firstName lastName email role' },
      { path: 'mentor', select: 'firstName lastName email role' },
      { path: 'requestedBy', select: 'firstName lastName email role' },
    ])
    .lean();

  if (!relationship) {
    throw new ApiError(404, 'Mentorship relationship not found.');
  }

  return toSafeRelationship(relationship);
}

export async function acceptMentorshipRequest(mentorId, relationshipId) {
  if (!mongoose.isValidObjectId(relationshipId)) {
    throw new ApiError(400, 'Invalid relationship ID.');
  }

  const relationship = await MentorshipRelationship.findById(relationshipId);
  if (!relationship) {
    throw new ApiError(404, 'Mentorship request not found.');
  }

  if (!relationship.mentor.equals(mentorId)) {
    throw new ApiError(403, 'You are not authorized to respond to this request.');
  }

  if (relationship.status !== 'PENDING') {
    throw new ApiError(400, `Cannot accept a request with status ${relationship.status}.`);
  }

  validateStatusTransition(relationship.status, 'ACCEPTED');

  relationship.status = 'ACCEPTED';
  relationship.respondedAt = new Date();
  await relationship.save();

  await relationship.populate([
    { path: 'mentee', select: 'firstName lastName email role' },
    { path: 'mentor', select: 'firstName lastName email role' },
    { path: 'requestedBy', select: 'firstName lastName email role' },
  ]);

  const mentorName = `${relationship.mentor?.firstName || ''} ${relationship.mentor?.lastName || ''}`.trim() || 'Your mentor';
  await createNotification({
    recipient: relationship.mentee._id,
    type: 'MENTORSHIP_ACCEPTED',
    title: 'Mentorship request accepted',
    message: `${mentorName} accepted your mentorship request.`,
    relatedEntityType: 'MENTORSHIP',
    relatedEntityId: relationship._id,
  });

  return toSafeRelationship(relationship);
}

export async function declineMentorshipRequest(mentorId, relationshipId) {
  if (!mongoose.isValidObjectId(relationshipId)) {
    throw new ApiError(400, 'Invalid relationship ID.');
  }

  const relationship = await MentorshipRelationship.findById(relationshipId);
  if (!relationship) {
    throw new ApiError(404, 'Mentorship request not found.');
  }

  if (!relationship.mentor.equals(mentorId)) {
    throw new ApiError(403, 'You are not authorized to respond to this request.');
  }

  if (relationship.status !== 'PENDING') {
    throw new ApiError(400, `Cannot decline a request with status ${relationship.status}.`);
  }

  validateStatusTransition(relationship.status, 'DECLINED');

  relationship.status = 'DECLINED';
  relationship.respondedAt = new Date();
  await relationship.save();

  await relationship.populate([
    { path: 'mentee', select: 'firstName lastName email role' },
    { path: 'mentor', select: 'firstName lastName email role' },
    { path: 'requestedBy', select: 'firstName lastName email role' },
  ]);

  const mentorName = `${relationship.mentor?.firstName || ''} ${relationship.mentor?.lastName || ''}`.trim() || 'Your mentor';
  await createNotification({
    recipient: relationship.mentee._id,
    type: 'MENTORSHIP_DECLINED',
    title: 'Mentorship request declined',
    message: `${mentorName} declined your mentorship request.`,
    relatedEntityType: 'MENTORSHIP',
    relatedEntityId: relationship._id,
  });

  return toSafeRelationship(relationship);
}

export async function activateMentorship(mentorId, relationshipId) {
  if (!mongoose.isValidObjectId(relationshipId)) {
    throw new ApiError(400, 'Invalid relationship ID.');
  }

  const relationship = await MentorshipRelationship.findById(relationshipId);
  if (!relationship) {
    throw new ApiError(404, 'Mentorship relationship not found.');
  }

  if (!relationship.mentor.equals(mentorId)) {
    throw new ApiError(403, 'You are not authorized to activate this relationship.');
  }

  if (relationship.status !== 'ACCEPTED') {
    throw new ApiError(400, `Cannot activate a relationship with status ${relationship.status}.`);
  }

  validateStatusTransition(relationship.status, 'ACTIVE');

  relationship.status = 'ACTIVE';
  relationship.startedAt = new Date();
  await relationship.save();

  await relationship.populate([
    { path: 'mentee', select: 'firstName lastName email role' },
    { path: 'mentor', select: 'firstName lastName email role' },
    { path: 'requestedBy', select: 'firstName lastName email role' },
  ]);

  const mentorName = `${relationship.mentor?.firstName || ''} ${relationship.mentor?.lastName || ''}`.trim() || 'Your mentor';
  await createNotification({
    recipient: relationship.mentee._id,
    type: 'MENTORSHIP_ACTIVATED',
    title: 'Mentorship activated',
    message: `${mentorName} activated your mentorship relationship.`,
    relatedEntityType: 'MENTORSHIP',
    relatedEntityId: relationship._id,
  });

  return toSafeRelationship(relationship);
}

export async function completeMentorship(userId, relationshipId) {
  if (!mongoose.isValidObjectId(relationshipId)) {
    throw new ApiError(400, 'Invalid relationship ID.');
  }

  const relationship = await MentorshipRelationship.findById(relationshipId);
  if (!relationship) {
    throw new ApiError(404, 'Mentorship relationship not found.');
  }

  const isParticipant =
    relationship.mentee.equals(userId) || relationship.mentor.equals(userId);
  if (!isParticipant) {
    throw new ApiError(403, 'You are not a participant in this relationship.');
  }

  if (relationship.status !== 'ACTIVE') {
    throw new ApiError(400, `Cannot complete a relationship with status ${relationship.status}.`);
  }

  validateStatusTransition(relationship.status, 'COMPLETED');

  relationship.status = 'COMPLETED';
  relationship.completedAt = new Date();
  await relationship.save();

  await relationship.populate([
    { path: 'mentee', select: 'firstName lastName email role' },
    { path: 'mentor', select: 'firstName lastName email role' },
    { path: 'requestedBy', select: 'firstName lastName email role' },
  ]);

  await createNotificationsForRecipients(
    [relationship.mentee._id, relationship.mentor._id],
    {
      type: 'MENTORSHIP_COMPLETED',
      title: 'Mentorship completed',
      message: 'Your mentorship relationship has been marked as completed.',
      relatedEntityType: 'MENTORSHIP',
      relatedEntityId: relationship._id,
    },
  );

  return toSafeRelationship(relationship);
}

export async function archiveMentorship(userId, relationshipId) {
  if (!mongoose.isValidObjectId(relationshipId)) {
    throw new ApiError(400, 'Invalid relationship ID.');
  }

  const relationship = await MentorshipRelationship.findById(relationshipId);
  if (!relationship) {
    throw new ApiError(404, 'Mentorship relationship not found.');
  }

  const isParticipant =
    relationship.mentee.equals(userId) || relationship.mentor.equals(userId);
  if (!isParticipant) {
    throw new ApiError(403, 'You are not a participant in this relationship.');
  }

  if (!['COMPLETED'].includes(relationship.status)) {
    throw new ApiError(400, `Cannot archive a relationship with status ${relationship.status}.`);
  }

  validateStatusTransition(relationship.status, 'ARCHIVED');

  relationship.status = 'ARCHIVED';
  relationship.archivedAt = new Date();
  await relationship.save();

  await relationship.populate([
    { path: 'mentee', select: 'firstName lastName email role' },
    { path: 'mentor', select: 'firstName lastName email role' },
    { path: 'requestedBy', select: 'firstName lastName email role' },
  ]);

  return toSafeRelationship(relationship);
}