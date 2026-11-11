import { getMatchesForMentee } from '../services/matchingService.js';
import ApiError from '../utils/ApiError.js';

function getUserId(request) {
  return request.user._id;
}

export async function getMatches(request, response) {
  const menteeId = getUserId(request);

  if (request.user.role !== 'MENTEE') {
    throw new ApiError(403, 'Only mentees can access mentor matching.');
  }

  const result = await getMatchesForMentee(menteeId);
  response.status(200).json(result);
}