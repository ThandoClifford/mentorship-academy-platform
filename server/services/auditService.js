import AuditLog from '../models/AuditLog.js';

export async function logAdminAction({
  actor,
  action,
  entityType,
  entityId,
  metadata = {},
  required = false,
  session,
}) {
  if (!actor || !action || !entityType || !entityId) {
    if (required) throw new Error('Required audit fields are missing.');
    return null;
  }
  // Never persist sensitive auth data
  const safeMetadata = { ...(metadata || {}) };
  delete safeMetadata.password;
  delete safeMetadata.token;
  delete safeMetadata.hash;
  try {
    const auditEntry = {
      actor,
      action,
      entityType,
      entityId,
      metadata: safeMetadata,
    };
    const created = session
      ? (await AuditLog.create([auditEntry], { session }))[0]
      : await AuditLog.create(auditEntry);
    return created;
  } catch (error) {
    if (required) throw error;
    // audit logging must not break admin actions
    return null;
  }
}
