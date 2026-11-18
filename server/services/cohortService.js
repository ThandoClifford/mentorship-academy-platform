import mongoose from 'mongoose';
import AcademySettings from '../models/AcademySettings.js';
import Cohort, { COHORT_STATUSES } from '../models/Cohort.js';
import CohortMembership, {
  COHORT_MEMBERSHIP_ROLES,
  COHORT_MEMBERSHIP_STATUSES,
} from '../models/CohortMembership.js';
import MentorProfile from '../models/MentorProfile.js';
import User, { USER_ROLES } from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { logAdminAction } from './auditService.js';

const COHORT_TRANSITIONS = Object.freeze({
  DRAFT: ['ENROLLING', 'CANCELLED'],
  ENROLLING: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
});

const MEMBERSHIP_TRANSITIONS = Object.freeze({
  ENROLLED: ['ACTIVE', 'REMOVED'],
  ACTIVE: ['PAUSED', 'COMPLETED', 'REMOVED'],
  PAUSED: ['ACTIVE', 'REMOVED'],
  COMPLETED: [],
  REMOVED: [],
});

const CURRENT_MEMBERSHIP_STATUSES = ['ENROLLED', 'ACTIVE', 'PAUSED'];
const MAX_PAGE_SIZE = 100;
let supportsTransactionsCache;

function sessionOptions(session) {
  return session ? { session } : {};
}

async function supportsTransactions() {
  if (supportsTransactionsCache === undefined) {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    supportsTransactionsCache = Boolean(hello.setName || hello.msg === 'isdbgrid');
  }
  return supportsTransactionsCache;
}

function requireValidId(value, field) {
  if (!mongoose.isValidObjectId(value)) {
    throw new ApiError(400, `Invalid ${field}.`);
  }
}

function parsePagination(query = {}) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1) {
    throw new ApiError(400, 'Page and limit must be positive integers.');
  }
  const safeLimit = Math.min(limit, MAX_PAGE_SIZE);
  return { page, limit: safeLimit, skip: (page - 1) * safeLimit };
}

function parseDate(value, field) {
  const date = new Date(value);
  if (value === undefined || value === null || Number.isNaN(date.getTime())) {
    throw new ApiError(400, `${field} must be a valid date.`, {
      [field]: 'Provide a valid date and time.',
    });
  }
  return date;
}

function normalizeText(value, field, { required = false, maxLength }) {
  if (typeof value !== 'string') {
    throw new ApiError(400, `${field} must be text.`, { [field]: 'Provide text.' });
  }
  const normalized = value.trim();
  if ((required && !normalized) || normalized.length > maxLength) {
    throw new ApiError(400, `${field} is invalid.`, {
      [field]: required ? `Provide 1 to ${maxLength} characters.` : `Use no more than ${maxLength} characters.`,
    });
  }
  return normalized;
}

function normalizeCode(value) {
  const code = normalizeText(value, 'code', { required: true, maxLength: 80 }).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(code)) {
    throw new ApiError(400, 'Cohort code may contain lowercase letters, numbers, and single hyphens.');
  }
  return code;
}

function mapDuplicateKey(error, message) {
  if (error?.code === 11000) throw new ApiError(409, message);
  throw error;
}

function toCohort(cohort) {
  if (!cohort) return null;
  return {
    id: String(cohort._id),
    name: cohort.name,
    code: cohort.code,
    description: cohort.description,
    status: cohort.status,
    startsAt: cohort.startsAt,
    endsAt: cohort.endsAt,
    createdBy: cohort.createdBy,
    updatedBy: cohort.updatedBy,
    activatedAt: cohort.activatedAt,
    completedAt: cohort.completedAt,
    cancelledAt: cohort.cancelledAt,
    cancellationReason: cohort.cancellationReason,
    createdAt: cohort.createdAt,
    updatedAt: cohort.updatedAt,
  };
}

function toMembership(membership) {
  if (!membership) return null;
  const user = membership.user?._id
    ? {
      id: String(membership.user._id),
      firstName: membership.user.firstName,
      lastName: membership.user.lastName,
      email: membership.user.email,
      role: membership.user.role,
      isActive: membership.user.isActive,
    }
    : membership.user;
  return {
    id: String(membership._id),
    cohort: String(membership.cohort?._id || membership.cohort),
    user,
    participantRole: membership.participantRole,
    status: membership.status,
    assignedBy: membership.assignedBy,
    statusChangedBy: membership.statusChangedBy,
    statusChangedAt: membership.statusChangedAt,
    reason: membership.reason,
    createdAt: membership.createdAt,
    updatedAt: membership.updatedAt,
  };
}

async function loadCohort(cohortId, session) {
  requireValidId(cohortId, 'cohort ID');
  let query = Cohort.findById(cohortId);
  if (session) query = query.session(session);
  const cohort = await query;
  if (!cohort) throw new ApiError(404, 'Cohort not found.');
  return cohort;
}

async function requireCohortManagementEnabled(session) {
  let query = AcademySettings.findOne({ key: 'academy' }).select('cohortManagementEnabled').lean();
  if (session) query = query.session(session);
  const settings = await query;
  if (!settings?.cohortManagementEnabled) {
    throw new ApiError(403, 'Cohort management is disabled in Academy settings.');
  }
}

async function writeAudit({ actor, action, entityType, entityId, metadata = {}, session }) {
  await logAdminAction({
    actor,
    action,
    entityType,
    entityId,
    metadata,
    required: true,
    session,
  });
}

async function withTransactionIfSupported(work) {
  if (!(await supportsTransactions())) return work(null);

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

async function validateCohortDates(startsAt, endsAt) {
  if (startsAt >= endsAt) {
    throw new ApiError(400, 'Cohort end date must be after its start date.', {
      endsAt: 'Choose a date after the cohort start date.',
    });
  }
}

async function validateAssignableUser(userId, participantRole, session) {
  requireValidId(userId, 'user ID');
  if (!COHORT_MEMBERSHIP_ROLES.includes(participantRole)) {
    throw new ApiError(400, 'Participant role must be MENTEE or MENTOR.');
  }

  let userQuery = User.findById(userId).select('firstName lastName email role isActive');
  if (session) userQuery = userQuery.session(session);
  const user = await userQuery.lean();
  if (!user || !user.isActive) {
    throw new ApiError(400, 'The selected user does not exist or is inactive.');
  }

  const expectedRole = participantRole === 'MENTEE' ? USER_ROLES.MENTEE : USER_ROLES.MENTOR;
  if (user.role !== expectedRole) {
    throw new ApiError(400, `Only active ${participantRole.toLowerCase()} accounts can be assigned.`);
  }

  if (participantRole === 'MENTOR') {
    let profileQuery = MentorProfile.findOne({ user: userId }).select('status');
    if (session) profileQuery = profileQuery.session(session);
    const profile = await profileQuery.lean();
    if (profile?.status !== 'APPROVED') {
      throw new ApiError(400, 'Only mentors with an approved mentor profile can be assigned.');
    }
  }
  return user;
}

async function ensureMenteeHasNoOtherActiveMembership(userId, cohortId, session) {
  let query = CohortMembership.findOne({
    user: userId,
    participantRole: 'MENTEE',
    status: 'ACTIVE',
    cohort: { $ne: cohortId },
  }).select('_id').lean();
  if (session) query = query.session(session);
  if (await query) {
    throw new ApiError(409, 'This mentee already has an active cohort membership.');
  }
}

async function validateEnrolledMembers(cohort, session) {
  let membersQuery = CohortMembership.find({
    cohort: cohort._id,
    status: 'ENROLLED',
  }).select('user participantRole');
  if (session) membersQuery = membersQuery.session(session);
  const members = await membersQuery.lean();

  for (const member of members) {
    await validateAssignableUser(member.user, member.participantRole, session);
    if (member.participantRole === 'MENTEE') {
      await ensureMenteeHasNoOtherActiveMembership(member.user, cohort._id, session);
    }
  }
  return members;
}

export async function listCohorts(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  if (query.status) {
    if (!COHORT_STATUSES.includes(query.status)) throw new ApiError(400, 'Invalid cohort status filter.');
    filter.status = query.status;
  }
  const [cohorts, total] = await Promise.all([
    Cohort.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Cohort.countDocuments(filter),
  ]);
  return {
    cohorts: cohorts.map(toCohort),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

export async function createCohort(actorId, payload = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ApiError(400, 'Cohort data must be provided as an object.');
  }
  const allowedFields = new Set(['name', 'code', 'description', 'startsAt', 'endsAt']);
  const unsupported = Object.keys(payload).filter((field) => !allowedFields.has(field));
  if (unsupported.length) throw new ApiError(400, `Unsupported cohort fields: ${unsupported.join(', ')}.`);

  const data = {
    name: normalizeText(payload.name, 'name', { required: true, maxLength: 160 }),
    code: normalizeCode(payload.code),
    description: payload.description === undefined
      ? ''
      : normalizeText(payload.description, 'description', { maxLength: 2000 }),
    startsAt: parseDate(payload.startsAt, 'startsAt'),
    endsAt: parseDate(payload.endsAt, 'endsAt'),
    createdBy: actorId,
    updatedBy: actorId,
    status: 'DRAFT',
  };
  await validateCohortDates(data.startsAt, data.endsAt);

  try {
    return await withTransactionIfSupported(async (session) => {
      const [cohort] = await Cohort.create([data], sessionOptions(session));
      await writeAudit({
        actor: actorId,
        action: 'COHORT_CREATED',
        entityType: 'COHORT',
        entityId: cohort._id,
        metadata: { code: cohort.code },
        session,
      });
      return toCohort(cohort);
    });
  } catch (error) {
    mapDuplicateKey(error, 'A cohort with this code already exists.');
  }
}

export async function getCohort(cohortId) {
  const cohort = await loadCohort(cohortId);
  const [members, mentors, mentees] = await Promise.all([
    CohortMembership.countDocuments({ cohort: cohort._id, status: { $in: CURRENT_MEMBERSHIP_STATUSES } }),
    CohortMembership.countDocuments({
      cohort: cohort._id,
      participantRole: 'MENTOR',
      status: { $in: CURRENT_MEMBERSHIP_STATUSES },
    }),
    CohortMembership.countDocuments({
      cohort: cohort._id,
      participantRole: 'MENTEE',
      status: { $in: CURRENT_MEMBERSHIP_STATUSES },
    }),
  ]);
  return { cohort: toCohort(cohort), memberCounts: { total: members, mentors, mentees } };
}

export async function updateCohort(actorId, cohortId, payload = {}) {
  const allowedFields = new Set(['name', 'code', 'description', 'startsAt', 'endsAt']);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ApiError(400, 'Cohort updates must be provided as an object.');
  }
  const unsupported = Object.keys(payload).filter((field) => !allowedFields.has(field));
  if (unsupported.length) throw new ApiError(400, `Unsupported cohort fields: ${unsupported.join(', ')}.`);
  if (!Object.keys(payload).length) throw new ApiError(400, 'Provide at least one cohort field to update.');

  try {
    return await withTransactionIfSupported(async (session) => {
      const cohort = await loadCohort(cohortId, session);
      if (!['DRAFT', 'ENROLLING'].includes(cohort.status)) {
        throw new ApiError(409, 'Only draft or enrolling cohorts can be edited.');
      }

      if ('name' in payload) cohort.name = normalizeText(payload.name, 'name', { required: true, maxLength: 160 });
      if ('code' in payload) cohort.code = normalizeCode(payload.code);
      if ('description' in payload) {
        cohort.description = normalizeText(payload.description, 'description', { maxLength: 2000 });
      }
      if ('startsAt' in payload) cohort.startsAt = parseDate(payload.startsAt, 'startsAt');
      if ('endsAt' in payload) cohort.endsAt = parseDate(payload.endsAt, 'endsAt');
      await validateCohortDates(cohort.startsAt, cohort.endsAt);

      cohort.updatedBy = actorId;
      await cohort.save(sessionOptions(session));
      await writeAudit({
        actor: actorId,
        action: 'COHORT_UPDATED',
        entityType: 'COHORT',
        entityId: cohort._id,
        metadata: { updatedFields: Object.keys(payload) },
        session,
      });
      return toCohort(cohort);
    });
  } catch (error) {
    mapDuplicateKey(error, 'A cohort with this code already exists.');
  }
}

export async function updateCohortStatus(actorId, cohortId, payload = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ApiError(400, 'Cohort status data must be provided as an object.');
  }
  const unsupported = Object.keys(payload).filter((field) => !['status', 'reason'].includes(field));
  if (unsupported.length) throw new ApiError(400, `Unsupported cohort status fields: ${unsupported.join(', ')}.`);
  const { status, reason = '' } = payload;
  if (!COHORT_STATUSES.includes(status)) throw new ApiError(400, 'Invalid cohort status.');
  const normalizedReason = normalizeText(reason, 'reason', { maxLength: 500 });

  try {
    return await withTransactionIfSupported(async (session) => {
      const cohort = await loadCohort(cohortId, session);
      if (!COHORT_TRANSITIONS[cohort.status]?.includes(status)) {
        throw new ApiError(409, `Cannot transition a cohort from ${cohort.status} to ${status}.`);
      }

      if (status === 'ACTIVE') {
        await requireCohortManagementEnabled(session);
        const now = new Date();
        if (cohort.startsAt > now || cohort.endsAt <= now) {
          throw new ApiError(409, 'A cohort can only be activated during its scheduled dates.');
        }
        await validateEnrolledMembers(cohort, session);
      }

      if (status === 'CANCELLED' && !normalizedReason) {
        throw new ApiError(400, 'A reason is required to cancel a cohort.');
      }

      const oldStatus = cohort.status;
      const oldUpdatedBy = cohort.updatedBy;
      const oldActivatedAt = cohort.activatedAt;
      const oldCompletedAt = cohort.completedAt;
      const oldCancelledAt = cohort.cancelledAt;
      const oldCancellationReason = cohort.cancellationReason;
      const now = new Date();
      cohort.status = status;
      cohort.updatedBy = actorId;
      if (status === 'ACTIVE') cohort.activatedAt = now;
      if (status === 'COMPLETED') cohort.completedAt = now;
      if (status === 'CANCELLED') {
        cohort.cancelledAt = now;
        cohort.cancellationReason = normalizedReason;
      }

      const updateMembers = async () => {
        if (status === 'ACTIVE') {
          await CohortMembership.updateMany(
            { cohort: cohort._id, status: 'ENROLLED' },
            { $set: { status: 'ACTIVE', statusChangedBy: actorId, statusChangedAt: now } },
            { ...sessionOptions(session), runValidators: true },
          );
          return;
        }

        if (status !== 'COMPLETED' && status !== 'CANCELLED') return;
        const closingStatus = status === 'COMPLETED' ? 'COMPLETED' : 'REMOVED';
        let openMemberships = CohortMembership.find({
          cohort: cohort._id,
          status: { $in: CURRENT_MEMBERSHIP_STATUSES },
        });
        if (session) openMemberships = openMemberships.session(session);
        for (const membership of await openMemberships) {
          const previousStatus = membership.status;
          membership.status = closingStatus;
          membership.statusChangedBy = actorId;
          membership.statusChangedAt = now;
          if (status === 'CANCELLED') membership.reason = normalizedReason;
          await membership.save(sessionOptions(session));
          if (closingStatus === 'REMOVED') {
            await writeAudit({
              actor: actorId,
              action: 'COHORT_MEMBER_REMOVED',
              entityType: 'COHORT_MEMBERSHIP',
              entityId: membership._id,
              metadata: { cohortId: String(cohort._id), previousStatus, reason: normalizedReason },
              session,
            });
          }
        }
      };

      const writeCohortAudit = () => writeAudit({
        actor: actorId,
        action: status === 'CANCELLED' ? 'COHORT_CANCELLED' : 'COHORT_STATUS_CHANGED',
        entityType: 'COHORT',
        entityId: cohort._id,
        metadata: { from: oldStatus, to: status, reason: normalizedReason || undefined },
        session,
      });

      if (!session && status === 'ACTIVE') {
        try {
          await updateMembers();
          await cohort.save();
          await writeCohortAudit();
        } catch (error) {
          try {
            await CohortMembership.updateMany(
              {
                cohort: cohort._id,
                status: 'ACTIVE',
                statusChangedBy: actorId,
                statusChangedAt: now,
              },
              { $set: { status: 'ENROLLED', statusChangedBy: null, statusChangedAt: null } },
            );
            cohort.status = oldStatus;
            cohort.updatedBy = oldUpdatedBy;
            cohort.activatedAt = oldActivatedAt;
            await cohort.save();
          } catch (rollbackError) {
            throw new Error('Cohort activation failed and could not be rolled back.', { cause: rollbackError });
          }
          throw error;
        }
        return toCohort(cohort);
      }

      if (!session && (status === 'COMPLETED' || status === 'CANCELLED')) {
        await updateMembers();
        await cohort.save();
        await writeCohortAudit();
        return toCohort(cohort);
      }

      await cohort.save(sessionOptions(session));
      await updateMembers();
      await writeCohortAudit();
      return toCohort(cohort);
    });
  } catch (error) {
    mapDuplicateKey(error, 'A mentee already has an active cohort membership.');
  }
}

export async function listCohortMembers(cohortId, query = {}) {
  requireValidId(cohortId, 'cohort ID');
  const { page, limit, skip } = parsePagination(query);
  await loadCohort(cohortId);
  const filter = { cohort: cohortId };
  if (query.role) {
    if (!COHORT_MEMBERSHIP_ROLES.includes(query.role)) throw new ApiError(400, 'Invalid membership role filter.');
    filter.participantRole = query.role;
  }
  if (query.status) {
    if (!COHORT_MEMBERSHIP_STATUSES.includes(query.status)) throw new ApiError(400, 'Invalid membership status filter.');
    filter.status = query.status;
  }

  const [memberships, total] = await Promise.all([
    CohortMembership.find(filter)
      .sort({ participantRole: 1, createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'firstName lastName email role isActive')
      .lean(),
    CohortMembership.countDocuments(filter),
  ]);
  return {
    members: memberships.map(toMembership),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

export async function assignCohortMember(actorId, cohortId, payload = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ApiError(400, 'Membership data must be provided as an object.');
  }
  const unsupported = Object.keys(payload).filter((field) => !['userId', 'participantRole'].includes(field));
  if (unsupported.length) throw new ApiError(400, `Unsupported membership fields: ${unsupported.join(', ')}.`);
  const { userId, participantRole } = payload;

  try {
    return await withTransactionIfSupported(async (session) => {
      const cohort = await loadCohort(cohortId, session);
      if (['COMPLETED', 'CANCELLED'].includes(cohort.status)) {
        throw new ApiError(409, 'Members cannot be assigned to a completed or cancelled cohort.');
      }
      if (cohort.status === 'ACTIVE') {
        await requireCohortManagementEnabled(session);
        const now = new Date();
        if (cohort.startsAt > now || cohort.endsAt <= now) {
          throw new ApiError(409, 'Members cannot be assigned outside the active cohort dates.');
        }
      }

      const user = await validateAssignableUser(userId, participantRole, session);
      const status = cohort.status === 'ACTIVE' ? 'ACTIVE' : 'ENROLLED';
      if (participantRole === 'MENTEE' && status === 'ACTIVE') {
        await ensureMenteeHasNoOtherActiveMembership(user._id, cohort._id, session);
      }
      const [membership] = await CohortMembership.create([{
        cohort: cohort._id,
        user: user._id,
        participantRole,
        status,
        assignedBy: actorId,
        statusChangedBy: status === 'ACTIVE' ? actorId : null,
        statusChangedAt: status === 'ACTIVE' ? new Date() : null,
      }], sessionOptions(session));
      await writeAudit({
        actor: actorId,
        action: 'COHORT_MEMBER_ASSIGNED',
        entityType: 'COHORT_MEMBERSHIP',
        entityId: membership._id,
        metadata: {
          cohortId: String(cohort._id),
          userId: String(user._id),
          participantRole,
        },
        session,
      });
      return toMembership({
        ...membership.toObject(),
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
      });
    });
  } catch (error) {
    mapDuplicateKey(error, 'This user already has an active membership in this cohort or another active cohort as a mentee.');
  }
}

export async function updateCohortMemberStatus(actorId, cohortId, membershipId, payload = {}) {
  requireValidId(membershipId, 'membership ID');
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ApiError(400, 'Membership status data must be provided as an object.');
  }
  const unsupported = Object.keys(payload).filter((field) => !['status', 'reason'].includes(field));
  if (unsupported.length) throw new ApiError(400, `Unsupported membership status fields: ${unsupported.join(', ')}.`);
  const { status, reason = '' } = payload;
  if (!COHORT_MEMBERSHIP_STATUSES.includes(status)) throw new ApiError(400, 'Invalid membership status.');
  const normalizedReason = normalizeText(reason, 'reason', { maxLength: 500 });
  if (['REMOVED', 'PAUSED'].includes(status) && !normalizedReason) {
    throw new ApiError(400, 'A reason is required to remove or pause a member.');
  }

  try {
    return await withTransactionIfSupported(async (session) => {
    const cohort = await loadCohort(cohortId, session);
    let membershipQuery = CohortMembership.findOne({ _id: membershipId, cohort: cohort._id });
    if (session) membershipQuery = membershipQuery.session(session);
    const membership = await membershipQuery;
    if (!membership) throw new ApiError(404, 'Cohort membership not found.');
    if (!MEMBERSHIP_TRANSITIONS[membership.status]?.includes(status)) {
      throw new ApiError(409, `Cannot transition membership from ${membership.status} to ${status}.`);
    }
    if (status === 'PAUSED' && membership.participantRole !== 'MENTOR') {
      throw new ApiError(400, 'Only mentor memberships can be paused.');
    }
    if (status === 'ACTIVE') {
      await requireCohortManagementEnabled(session);
      if (cohort.status !== 'ACTIVE' || cohort.startsAt > new Date() || cohort.endsAt <= new Date()) {
        throw new ApiError(409, 'Membership can only be activated during an active cohort.');
      }
      await validateAssignableUser(membership.user, membership.participantRole, session);
      if (membership.participantRole === 'MENTEE') {
        await ensureMenteeHasNoOtherActiveMembership(membership.user, cohort._id, session);
      }
    }

    const previousStatus = membership.status;
    membership.status = status;
    membership.statusChangedBy = actorId;
    membership.statusChangedAt = new Date();
    membership.reason = normalizedReason;
    await membership.save(sessionOptions(session));
    await writeAudit({
      actor: actorId,
      action: status === 'REMOVED' ? 'COHORT_MEMBER_REMOVED' : 'COHORT_MEMBER_STATUS_CHANGED',
      entityType: 'COHORT_MEMBERSHIP',
      entityId: membership._id,
      metadata: {
        cohortId: String(cohort._id),
        from: previousStatus,
        to: status,
        reason: normalizedReason || undefined,
      },
      session,
    });
    await membership.populate({
      path: 'user',
      select: 'firstName lastName email role isActive',
      options: sessionOptions(session),
    });
      return toMembership(membership);
    });
  } catch (error) {
    mapDuplicateKey(error, 'This mentee already has an active cohort membership.');
  }
}

export async function getCurrentCohort(userId, userRole) {
  const settings = await AcademySettings.findOne({ key: 'academy' })
    .select('cohortManagementEnabled')
    .lean();
  if (!settings?.cohortManagementEnabled) return { cohort: null, membership: null };

  const membership = await CohortMembership.findOne({
    user: userId,
    participantRole: userRole,
    status: 'ACTIVE',
  })
    .populate('cohort')
    .lean();
  const now = new Date();
  const cohort = membership?.cohort;
  if (
    !cohort ||
    cohort.status !== 'ACTIVE' ||
    cohort.startsAt > now ||
    cohort.endsAt <= now
  ) {
    return { cohort: null, membership: null };
  }
  return {
    cohort: {
      id: String(cohort._id),
      name: cohort.name,
      code: cohort.code,
      description: cohort.description,
      status: cohort.status,
      startsAt: cohort.startsAt,
      endsAt: cohort.endsAt,
    },
    membership: {
      id: String(membership._id),
      participantRole: membership.participantRole,
      status: membership.status,
    },
  };
}
