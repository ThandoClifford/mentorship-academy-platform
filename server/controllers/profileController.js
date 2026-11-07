import {
  getMenteeCompletion,
  getMenteeProfile,
  getMentorCompletion,
  getMentorProfile,
  saveMenteeProfile,
  saveMentorProfile,
} from '../services/profileService.js';
import ApiError from '../utils/ApiError.js';

function getUserId(request) {
  return request.user._id;
}

export async function readMenteeProfile(request, response) {
  const profile = await getMenteeProfile(getUserId(request));
  if (!profile) {
    throw new ApiError(404, 'Mentee profile has not been created yet.');
  }
  response.status(200).json({ profile });
}

export async function writeMenteeProfile(request, response) {
  const profile = await saveMenteeProfile(getUserId(request), request.body);
  response.status(200).json({ profile });
}

export async function readMenteeProfileCompletion(request, response) {
  const completion = await getMenteeCompletion(getUserId(request));
  response.status(200).json(completion);
}

export async function readMentorProfile(request, response) {
  const profile = await getMentorProfile(getUserId(request));
  if (!profile) {
    throw new ApiError(404, 'Mentor profile has not been created yet.');
  }
  response.status(200).json({ profile });
}

export async function writeMentorProfile(request, response) {
  const profile = await saveMentorProfile(getUserId(request), request.body);
  response.status(200).json({ profile });
}

export async function readMentorProfileCompletion(request, response) {
  const completion = await getMentorCompletion(getUserId(request));
  response.status(200).json(completion);
}
