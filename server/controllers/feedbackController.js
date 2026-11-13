import {
  submitFeedbackForRelationship,
  listFeedbackForRelationship,
  listAllFeedback,
} from '../services/feedbackService.js';

export async function submitFeedback(request, response) {
  const { relationshipId } = request.params;
  const feedback = await submitFeedbackForRelationship(request.user._id, relationshipId, request.body ?? {});
  response.status(201).json({ feedback });
}

export async function listRelationshipFeedback(request, response) {
  const { relationshipId } = request.params;
  const feedback = await listFeedbackForRelationship(request.user._id, relationshipId);
  response.status(200).json({ feedback });
}

export async function listAdminFeedback(_request, response) {
  const feedback = await listAllFeedback();
  response.status(200).json({ feedback });
}
