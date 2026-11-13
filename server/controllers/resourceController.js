import {
  listResourcesForPublic,
  getResourceById,
  listAdminResources,
  createResource,
  updateResource,
  publishResource,
  unpublishResource,
  deleteResource,
} from '../services/resourceService.js';
import { logAdminAction } from '../services/auditService.js';

export async function listResources(request, response) {
  const resources = await listResourcesForPublic(request.user);
  response.status(200).json({ resources });
}

export async function getResource(request, response) {
  const { id } = request.params;
  const resource = await getResourceById(id, request.user);
  response.status(200).json({ resource });
}

export async function listAdminResourcesHandler(_request, response) {
  const resources = await listAdminResources();
  response.status(200).json({ resources });
}

export async function createAdminResource(request, response) {
  const resource = await createResource(request.user._id, request.body ?? {});
  await logAdminAction({
    actor: request.user._id,
    action: 'RESOURCE_CREATED',
    entityType: 'RESOURCE',
    entityId: resource.id,
    metadata: { title: resource.title },
  });
  response.status(201).json({ resource });
}

export async function updateAdminResource(request, response) {
  const { id } = request.params;
  const resource = await updateResource(request.user._id, id, request.body ?? {});
  await logAdminAction({
    actor: request.user._id,
    action: 'RESOURCE_UPDATED',
    entityType: 'RESOURCE',
    entityId: resource.id,
    metadata: { title: resource.title },
  });
  response.status(200).json({ resource });
}

export async function publishAdminResource(request, response) {
  const { id } = request.params;
  const resource = await publishResource(id);
  await logAdminAction({
    actor: request.user._id,
    action: 'RESOURCE_PUBLISHED',
    entityType: 'RESOURCE',
    entityId: resource.id,
    metadata: { title: resource.title },
  });
  response.status(200).json({ resource });
}

export async function unpublishAdminResource(request, response) {
  const { id } = request.params;
  const resource = await unpublishResource(id);
  await logAdminAction({
    actor: request.user._id,
    action: 'RESOURCE_UNPUBLISHED',
    entityType: 'RESOURCE',
    entityId: resource.id,
    metadata: { title: resource.title },
  });
  response.status(200).json({ resource });
}

export async function deleteAdminResource(request, response) {
  const { id } = request.params;
  const result = await deleteResource(id);
  await logAdminAction({
    actor: request.user._id,
    action: 'RESOURCE_DELETED',
    entityType: 'RESOURCE',
    entityId: id,
    metadata: { deleted: true },
  });
  response.status(200).json(result);
}
