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
