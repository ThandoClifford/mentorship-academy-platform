import mongoose from 'mongoose';
import MentorshipRelationship from '../models/MentorshipRelationship.js';
import Message from '../models/Message.js';
import ApiError from '../utils/ApiError.js';

const MESSAGEABLE_STATUSES = ['ACCEPTED', 'ACTIVE', 'COMPLETED'];

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

function toSafeMessage(message) {
  return {
    id: message._id,
    mentorshipRelationship: message.mentorshipRelationship,
    sender: message.sender ? toSafeUser(message.sender) : null,
    content: message.content,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

async function getAuthorizedRelationship(userId, relationshipId, { forWrite = false } = {}) {
  if (!mongoose.isValidObjectId(relationshipId)) {
    throw new ApiError(400, 'Invalid relationship ID.');
  }

  const relationship = await MentorshipRelationship.findById(relationshipId).lean();
  if (!relationship) {
    throw new ApiError(404, 'Mentorship relationship not found.');
  }

  const isParticipant =
    String(relationship.mentee) === String(userId) ||
    String(relationship.mentor) === String(userId);

  if (!isParticipant) {
    throw new ApiError(403, 'You are not authorized to access messages for this relationship.');
  }

  if (!MESSAGEABLE_STATUSES.includes(relationship.status)) {
    throw new ApiError(
      400,
      `Messages are not available for relationships with status ${relationship.status}.`,
      { relationship: 'Messages are available only for accepted, active, or completed relationships.' },
    );
  }

  return relationship;
}

export async function listMessages(userId, relationshipId) {
  await getAuthorizedRelationship(userId, relationshipId);

  const messages = await Message.find({ mentorshipRelationship: relationshipId })
    .sort({ createdAt: 1 })
    .populate('sender', 'firstName lastName email role')
    .lean();

  return messages.map(toSafeMessage);
}

export async function createMessage(userId, relationshipId, payload) {
  await getAuthorizedRelationship(userId, relationshipId, { forWrite: true });

  const content = typeof payload?.content === 'string' ? payload.content.trim() : '';
  if (!content) {
    throw new ApiError(400, 'Message content is required.', {
      content: 'Please enter a message.',
    });
  }
  if (content.length > 2000) {
    throw new ApiError(400, 'Message content must be 2000 characters or fewer.', {
      content: 'Message is too long.',
    });
  }

  const message = await Message.create({
    mentorshipRelationship: relationshipId,
    sender: userId,
    content,
  });

  await message.populate('sender', 'firstName lastName email role');
  return toSafeMessage(message);
}
