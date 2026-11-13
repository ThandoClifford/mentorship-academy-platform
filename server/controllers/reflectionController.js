import {
  getRelationshipReflections,
  createReflectionForRelationship,
  getReflectionById,
  updateReflection,
  deleteReflection,
  listAdminReflections,
} from '../services/reflectionService.js';

export async function listReflections(request, response) {
  const { relationshipId } = request.params;
  const reflections = await getRelationshipReflections(request.user._id, relationshipId, request.user.role);
  response.status(200).json({ reflections });
}

export async function createReflection(request, response) {
  const { relationshipId } = request.params;
  const reflection = await createReflectionForRelationship(request.user._id, relationshipId, request.body ?? {});
  response.status(201).json({ reflection });
}

export async function getReflection(request, response) {
  const { relationshipId, id } = request.params;
  const reflection = await getReflectionById(request.user._id, relationshipId, id, request.user.role);
  response.status(200).json({ reflection });
}

export async function updateReflectionHandler(request, response) {
  const { relationshipId, id } = request.params;
  const reflection = await updateReflection(request.user._id, relationshipId, id, request.body ?? {});
  response.status(200).json({ reflection });
}

export async function deleteReflectionHandler(request, response) {
  const { relationshipId, id } = request.params;
  const result = await deleteReflection(request.user._id, relationshipId, id);
  response.status(200).json(result);
}

export async function listAdminReflectionsHandler(request, response) {
  const result = await listAdminReflections(request.query);
  response.status(200).json(result);
}
