import { listMessages, createMessage } from '../services/messagingService.js';

function getUserId(request) {
  return request.user._id;
}

export async function listRelationshipMessages(request, response) {
  const { relationshipId } = request.params;
  const messages = await listMessages(getUserId(request), relationshipId);
  response.status(200).json({ messages });
}

export async function sendRelationshipMessage(request, response) {
  const { relationshipId } = request.params;
  const message = await createMessage(getUserId(request), relationshipId, request.body ?? {});
  response.status(201).json({ message });
}
