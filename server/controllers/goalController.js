import {
  createGoal,
  getGoalsForRelationship,
  getGoalById,
  updateGoal,
  addMilestone,
  updateMilestone,
} from '../services/goalService.js';
import {
  getMentorGoalsForRelationship,
  getMentorGoalById,
  addMentorFeedback,
} from '../services/goalService.js';
import ApiError from '../utils/ApiError.js';

function getUserId(request) {
  return request.user._id;
}

export async function createGoalHandler(request, response) {
  const { relationshipId } = request.params;
  const menteeId = getUserId(request);

  const goal = await createGoal(menteeId, relationshipId, request.body);
  response.status(201).json({ goal });
}

export async function listGoalsHandler(request, response) {
  const { relationshipId } = request.params;
  const menteeId = getUserId(request);

  const goals = await getGoalsForRelationship(menteeId, relationshipId);
  response.status(200).json({ goals });
}

export async function getGoalHandler(request, response) {
  const { relationshipId, id } = request.params;
  const menteeId = getUserId(request);

  const goal = await getGoalById(menteeId, relationshipId, id);
  response.status(200).json({ goal });
}

export async function updateGoalHandler(request, response) {
  const { relationshipId, id } = request.params;
  const menteeId = getUserId(request);

  const goal = await updateGoal(menteeId, relationshipId, id, request.body);
  response.status(200).json({ goal });
}

export async function addMilestoneHandler(request, response) {
  const { relationshipId, id } = request.params;
  const menteeId = getUserId(request);

  const goal = await addMilestone(menteeId, relationshipId, id, request.body);
  response.status(201).json({ goal });
}

export async function updateMilestoneHandler(request, response) {
  const { relationshipId, id, milestoneId } = request.params;
  const menteeId = getUserId(request);

  const goal = await updateMilestone(menteeId, relationshipId, id, milestoneId, request.body);
  response.status(200).json({ goal });
}

export async function listMentorGoalsHandler(request, response) {
  const { relationshipId } = request.params;
  const mentorId = getUserId(request);

  const goals = await getMentorGoalsForRelationship(mentorId, relationshipId);
  response.status(200).json({ goals });
}

export async function getMentorGoalHandler(request, response) {
  const { relationshipId, id } = request.params;
  const mentorId = getUserId(request);

  const goal = await getMentorGoalById(mentorId, relationshipId, id);
  response.status(200).json({ goal });
}

export async function addMentorFeedbackHandler(request, response) {
  const { relationshipId, id } = request.params;
  const mentorId = getUserId(request);
  const { mentorFeedback } = request.body;

  const goal = await addMentorFeedback(mentorId, relationshipId, id, mentorFeedback);
  response.status(200).json({ goal });
}