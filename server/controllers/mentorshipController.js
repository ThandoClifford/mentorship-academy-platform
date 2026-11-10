import {
  createMentorshipRequest,
  getMenteeRequests,
  getMenteeRelationships,
  getMentorRequests,
  getMentorRelationships,
  getRelationshipById,
  acceptMentorshipRequest,
  declineMentorshipRequest,
  activateMentorship,
  completeMentorship,
  archiveMentorship,
} from '../services/mentorshipService.js';
import ApiError from '../utils/ApiError.js';

function getUserId(request) {
  return request.user._id;
}

function getUserRole(request) {
  return request.user.role;
}

export async function createRequest(request, response) {
  const { mentorId, requestMessage } = request.body ?? {};
  const menteeId = getUserId(request);

  if (getUserRole(request) !== 'MENTEE') {
    throw new ApiError(403, 'Only mentees can submit mentorship requests.');
  }

  const relationship = await createMentorshipRequest(menteeId, mentorId, requestMessage);
  response.status(201).json({ relationship });
}

export async function listMyRequests(request, response) {
  const menteeId = getUserId(request);
  const relationships = await getMenteeRequests(menteeId);
  response.status(200).json({ relationships });
}

export async function listMyRelationshipsMentee(request, response) {
  const menteeId = getUserId(request);
  const relationships = await getMenteeRelationships(menteeId);
  response.status(200).json({ relationships });
}

export async function listMentorRequests(request, response) {
  const mentorId = getUserId(request);
  const relationships = await getMentorRequests(mentorId);
  response.status(200).json({ relationships });
}

export async function listMentorRelationships(request, response) {
  const mentorId = getUserId(request);
  const relationships = await getMentorRelationships(mentorId);
  response.status(200).json({ relationships });
}

export async function getRelationship(request, response) {
  const { id } = request.params;
  const userId = getUserId(request);
  const relationship = await getRelationshipById(id);

  const isParticipant =
    relationship.mentee?.id === String(userId) ||
    relationship.mentor?.id === String(userId);

  if (!isParticipant && getUserRole(request) !== 'ADMIN') {
    throw new ApiError(403, 'You are not authorized to view this relationship.');
  }

  response.status(200).json({ relationship });
}

export async function acceptRequest(request, response) {
  const { id } = request.params;
  const mentorId = getUserId(request);

  if (getUserRole(request) !== 'MENTOR') {
    throw new ApiError(403, 'Only mentors can accept mentorship requests.');
  }

  const relationship = await acceptMentorshipRequest(mentorId, id);
  response.status(200).json({ relationship });
}

export async function declineRequest(request, response) {
  const { id } = request.params;
  const mentorId = getUserId(request);

  if (getUserRole(request) !== 'MENTOR') {
    throw new ApiError(403, 'Only mentors can decline mentorship requests.');
  }

  const relationship = await declineMentorshipRequest(mentorId, id);
  response.status(200).json({ relationship });
}

export async function activateRelationship(request, response) {
  const { id } = request.params;
  const mentorId = getUserId(request);

  if (getUserRole(request) !== 'MENTOR') {
    throw new ApiError(403, 'Only mentors can activate mentorship relationships.');
  }

  const relationship = await activateMentorship(mentorId, id);
  response.status(200).json({ relationship });
}

export async function completeRelationship(request, response) {
  const { id } = request.params;
  const userId = getUserId(request);

  const relationship = await completeMentorship(userId, id);
  response.status(200).json({ relationship });
}

export async function archiveRelationship(request, response) {
  const { id } = request.params;
  const userId = getUserId(request);

  const relationship = await archiveMentorship(userId, id);
  response.status(200).json({ relationship });
}