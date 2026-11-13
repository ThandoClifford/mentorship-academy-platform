import {
  listPublishedContent,
  getContentBySlug,
  listAdminContent,
  createContent,
  updateContent,
  deleteContent,
} from '../services/contentService.js';
import { logAdminAction } from '../services/auditService.js';

export async function listPublicContent(_request, response) {
  const content = await listPublishedContent();
  response.status(200).json({ content });
}

export async function getPublicContentBySlug(request, response) {
  const { slug } = request.params;
  const item = await getContentBySlug(slug);
  response.status(200).json({ content: item });
}

export async function listAdminContentHandler(_request, response) {
  const content = await listAdminContent();
  response.status(200).json({ content });
}

export async function createAdminContent(request, response) {
  const content = await createContent(request.user._id, request.body ?? {});
  await logAdminAction({
    actor: request.user._id,
    action: 'CONTENT_CREATED',
    entityType: 'CONTENT',
    entityId: content.id,
    metadata: { title: content.title },
  });
  response.status(201).json({ content });
}

export async function updateAdminContent(request, response) {
  const { id } = request.params;
  const content = await updateContent(request.user._id, id, request.body ?? {});
  await logAdminAction({
    actor: request.user._id,
    action: 'CONTENT_UPDATED',
    entityType: 'CONTENT',
    entityId: content.id,
    metadata: { title: content.title },
  });
  response.status(200).json({ content });
}

export async function deleteAdminContent(request, response) {
  const { id } = request.params;
  const result = await deleteContent(id);
  await logAdminAction({
    actor: request.user._id,
    action: 'CONTENT_DELETED',
    entityType: 'CONTENT',
    entityId: id,
    metadata: { deleted: true },
  });
  response.status(200).json(result);
}
