import mongoose from 'mongoose';

export const AUDIT_ACTIONS = Object.freeze([
  'USER_ACTIVATED',
  'USER_DEACTIVATED',
  'ROLE_CHANGED',
  'MENTOR_APPROVED',
  'MENTOR_REJECTED',
  'MENTOR_SUSPENDED',
  'MENTOR_APPLICATION_SUBMITTED',
  'MENTOR_APPLICATION_APPROVED',
  'MENTOR_APPLICATION_REJECTED',
  'MENTOR_APPLICATION_SUSPENDED',
  'RELATIONSHIP_ADMIN_APPROVED',
  'RELATIONSHIP_ADMIN_REJECTED',
  'COHORT_CREATED',
  'COHORT_UPDATED',
  'COHORT_STATUS_CHANGED',
  'COHORT_CANCELLED',
  'COHORT_MEMBER_ASSIGNED',
  'COHORT_MEMBER_STATUS_CHANGED',
  'COHORT_MEMBER_REMOVED',
  'MATCH_RECOMMENDATION_APPROVED',
  'MATCH_RECOMMENDATION_REJECTED',
  'MATCH_RECOMMENDATION_ADJUSTED',
  'COHORT_MATCHING_GENERATED',
  'ACADEMY_SETTINGS_UPDATED',
  'RESOURCE_CREATED',
  'RESOURCE_UPDATED',
  'RESOURCE_PUBLISHED',
  'RESOURCE_UNPUBLISHED',
  'RESOURCE_DELETED',
  'CONTENT_CREATED',
  'CONTENT_UPDATED',
  'CONTENT_PUBLISHED',
  'CONTENT_UNPUBLISHED',
  'CONTENT_DELETED',
  'ADMIN_ANNOUNCEMENT',
]);

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: AUDIT_ACTIONS,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
