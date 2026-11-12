import AuditLog from '../models/AuditLog.js';

export async function logAdminAction({ actor, action, entityType, entityId, metadata = {} }) {
  if (!actor || !action || !entityType || !entityId) return null;
  // Never persist sensitive auth data
  const safeMetadata = { ...(metadata || {}) };
  delete safeMetadata.password;
  delete safeMetadata.token;
  delete safeMetadata.hash;
  try {
    return await AuditLog.create({
      actor,
      action,
      entityType,
      entityId,
      metadata: safeMetadata,
    });
  } catch {
    // audit logging must not break admin actions
    return null;
  }
}
