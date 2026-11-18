import mongoose from 'mongoose';
import Cohort from '../models/Cohort.js';
import CohortMembership from '../models/CohortMembership.js';
import MatchRecommendation, {
  MATCH_RECOMMENDATION_REVIEW_STATUSES,
} from '../models/MatchRecommendation.js';
import User, { USER_ROLES } from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { logAdminAction } from './auditService.js';

const ACTIVE_MEMBERSHIP_STATUSES = ['ENROLLED', 'ACTIVE'];
const REVIEWABLE_STATUSES = ['PENDING', 'ADJUSTED', 'APPROVED'];
const REVIEW_TRANSITIONS = Object.freeze({
  PENDING: ['APPROVED', 'REJECTED', 'ADJUSTED'],
  ADJUSTED: ['APPROVED', 'REJECTED', 'ADJUSTED'],
  APPROVED: ['ADJUSTED'],
  REJECTED: [],
});
const MAX_PAGE_SIZE = 100;
let supportsTransactionsCache;

const REVIEW_ACTIONS = Object.freeze({
  APPROVED: 'MATCH_RECOMMENDATION_APPROVED',
  REJECTED: 'MATCH_RECOMMENDATION_REJECTED',
  ADJUSTED: 'MATCH_RECOMMENDATION_ADJUSTED',
});

function sessionOptions(session) {
  return session ? { session } : {};
}

function requireValidId(value, field) {
  if (!mongoose.isValidObjectId(value)) throw new ApiError(400, `Invalid ${field}.`);
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

function normalizeText(value, field, { required = false, maxLength }) {
  if (typeof value !== 'string') throw new ApiError(400, `${field} must be text.`);
  const normalized = value.trim();
  if ((required && !normalized) || normalized.length > maxLength) {
    throw new ApiError(400, `${field} is invalid.`);
  }
  return normalized;
}

function normalizeTextArray(value, field, { maxItems = 100, maxItemLength = 1000 } = {}) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maxItems) {
    throw new ApiError(400, `${field} must be an array of text values.`);
  }
  return value.map((item) => normalizeText(item, field, { maxLength: maxItemLength })).filter(Boolean);
}

function normalizeScoreBreakdown(value) {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value) || value instanceof Date) {
    throw new ApiError(400, 'scoreBreakdown must be an object of scores.');
  }
  const entries = Object.entries(value);
  if (entries.length > 50 || entries.some(([key, score]) => (
    !key.trim() || key.length > 80 || typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100
  ))) {
    throw new ApiError(400, 'scoreBreakdown contains an invalid score.');
  }
  return Object.fromEntries(entries);
}

function normalizeScore(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new ApiError(400, 'compatibilityScore must be a number from 0 to 100.');
  }
  return value;
}

function idOf(reference) {
  if (!reference) return null;
  return String(reference?._id || reference);
}

function serializeMembership(membership) {
  if (!membership) return null;
  if (!membership.participantRole) return idOf(membership);
  const user = membership.user?._id
    ? {
      id: String(membership.user._id),
      firstName: membership.user.firstName,
      lastName: membership.user.lastName,
      email: membership.user.email,
    }
    : membership.user;
  return {
    id: String(membership._id),
    participantRole: membership.participantRole,
    status: membership.status,
    user,
  };
}

function toRecommendation(recommendation) {
  if (!recommendation) return null;
  return {
    id: String(recommendation._id),
    cohort: idOf(recommendation.cohort),
    menteeMembership: serializeMembership(recommendation.menteeMembership),
    mentorMembership: serializeMembership(recommendation.mentorMembership),
    matchingRun: recommendation.matchingRun,
    compatibilityScore: recommendation.compatibilityScore,
    scoreBreakdown: recommendation.scoreBreakdown || {},
    sharedInterests: recommendation.sharedInterests || [],
    developmentOpportunities: recommendation.developmentOpportunities || [],
    reasons: recommendation.reasons || [],
    reviewStatus: recommendation.reviewStatus,
    reviewedBy: recommendation.reviewedBy,
    reviewedAt: recommendation.reviewedAt,
    rejectionReason: recommendation.rejectionReason || '',
    adjustmentHistory: recommendation.adjustmentHistory || [],
    createdAt: recommendation.createdAt,
    updatedAt: recommendation.updatedAt,
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

async function loadRecommendation(cohortId, recommendationId, session) {
  requireValidId(recommendationId, 'recommendation ID');
  let query = MatchRecommendation.findOne({ _id: recommendationId, cohort: cohortId });
  if (session) query = query.session(session);
  const recommendation = await query;
  if (!recommendation) throw new ApiError(404, 'Match recommendation not found.');
  return recommendation;
}

async function validateMembership(cohortId, membershipId, role, session) {
  requireValidId(membershipId, `${role.toLowerCase()} membership ID`);
  let query = CohortMembership.findById(membershipId);
  if (session) query = query.session(session);
  const membership = await query;
  if (!membership) throw new ApiError(400, 'A referenced cohort membership does not exist.');
  if (String(membership.cohort) !== String(cohortId)) {
    throw new ApiError(400, 'Both cohort memberships must belong to the requested cohort.');
  }
  if (membership.participantRole !== role) {
    throw new ApiError(400, `The ${role.toLowerCase()} membership has the wrong participant role.`);
  }
  if (!ACTIVE_MEMBERSHIP_STATUSES.includes(membership.status)) {
    throw new ApiError(409, 'Removed or inactive memberships cannot be recommended.');
  }
  return membership;
}

async function validateMembershipPair(cohortId, menteeMembershipId, mentorMembershipId, session) {
  const menteeMembership = await validateMembership(cohortId, menteeMembershipId, 'MENTEE', session);
  const mentorMembership = await validateMembership(cohortId, mentorMembershipId, 'MENTOR', session);
  return { menteeMembership, mentorMembership };
}

async function requireActiveAdmin(actorId, session) {
  if (!mongoose.isValidObjectId(actorId)) throw new ApiError(403, 'Only administrators can review recommendations.');
  let query = User.findById(actorId).select('role isActive');
  if (session) query = query.session(session);
  const actor = await query.lean();
  if (!actor || !actor.isActive || actor.role !== USER_ROLES.ADMIN) {
    throw new ApiError(403, 'Only administrators can review recommendations.');
  }
  return actor;
}

function snapshotRecommendation(recommendation) {
  return {
    menteeMembership: idOf(recommendation.menteeMembership),
    mentorMembership: idOf(recommendation.mentorMembership),
    compatibilityScore: recommendation.compatibilityScore,
    scoreBreakdown: recommendation.scoreBreakdown || {},
    sharedInterests: [...(recommendation.sharedInterests || [])],
    developmentOpportunities: [...(recommendation.developmentOpportunities || [])],
    reasons: [...(recommendation.reasons || [])],
  };
}

async function supportsTransactions() {
  if (supportsTransactionsCache === undefined) {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    supportsTransactionsCache = Boolean(hello.setName || hello.msg === 'isdbgrid');
  }
  return supportsTransactionsCache;
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

function mapDuplicateKey(error, message) {
  if (error?.code === 11000) throw new ApiError(409, message);
  throw error;
}

export async function createRecommendation(payload = {}) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ApiError(400, 'Recommendation data must be an object.');
  }
  const allowedFields = new Set([
    'cohort',
    'menteeMembership',
    'mentorMembership',
    'matchingRun',
    'compatibilityScore',
    'scoreBreakdown',
    'sharedInterests',
    'developmentOpportunities',
    'reasons',
  ]);
  const unsupported = Object.keys(payload).filter((field) => !allowedFields.has(field));
  if (unsupported.length) throw new ApiError(400, `Unsupported recommendation fields: ${unsupported.join(', ')}.`);

  requireValidId(payload.cohort, 'cohort ID');
  const matchingRun = normalizeText(payload.matchingRun, 'matchingRun', { required: true, maxLength: 120 });
  const compatibilityScore = normalizeScore(payload.compatibilityScore);
  const scoreBreakdown = normalizeScoreBreakdown(payload.scoreBreakdown);
  const sharedInterests = normalizeTextArray(payload.sharedInterests, 'sharedInterests', { maxItemLength: 300 });
  const developmentOpportunities = normalizeTextArray(payload.developmentOpportunities, 'developmentOpportunities');
  const reasons = normalizeTextArray(payload.reasons, 'reasons');

  try {
    return await withTransactionIfSupported(async (session) => {
      await loadCohort(payload.cohort, session);
      await validateMembershipPair(
        payload.cohort,
        payload.menteeMembership,
        payload.mentorMembership,
        session,
      );
      let approvedQuery = MatchRecommendation.exists({
        cohort: payload.cohort,
        menteeMembership: payload.menteeMembership,
        mentorMembership: payload.mentorMembership,
        reviewStatus: 'APPROVED',
      });
      if (session) approvedQuery = approvedQuery.session(session);
      if (await approvedQuery) {
        throw new ApiError(409, 'This cohort pairing already has an approved recommendation.');
      }

      const [recommendation] = await MatchRecommendation.create([{
        cohort: payload.cohort,
        menteeMembership: payload.menteeMembership,
        mentorMembership: payload.mentorMembership,
        matchingRun,
        compatibilityScore,
        scoreBreakdown,
        sharedInterests,
        developmentOpportunities,
        reasons,
        reviewStatus: 'PENDING',
      }], sessionOptions(session));
      return toRecommendation(recommendation);
    });
  } catch (error) {
    mapDuplicateKey(error, 'A recommendation for this pairing and matching run already exists or the pairing is approved.');
  }
}

export async function listRecommendationsForCohort(cohortId, query = {}) {
  const { page, limit, skip } = parsePagination(query);
  await loadCohort(cohortId);
  const filter = { cohort: cohortId };
  if (query.reviewStatus) {
    if (!MATCH_RECOMMENDATION_REVIEW_STATUSES.includes(query.reviewStatus)) {
      throw new ApiError(400, 'Invalid recommendation review status filter.');
    }
    filter.reviewStatus = query.reviewStatus;
  }
  const [recommendations, total] = await Promise.all([
    MatchRecommendation.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: 'menteeMembership', populate: { path: 'user', select: 'firstName lastName email' } })
      .populate({ path: 'mentorMembership', populate: { path: 'user', select: 'firstName lastName email' } })
      .lean(),
    MatchRecommendation.countDocuments(filter),
  ]);
  return {
    recommendations: recommendations.map(toRecommendation),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

export async function getRecommendation(cohortId, recommendationId) {
  await loadCohort(cohortId);
  requireValidId(recommendationId, 'recommendation ID');
  const recommendation = await MatchRecommendation.findOne({ _id: recommendationId, cohort: cohortId })
    .populate({ path: 'menteeMembership', populate: { path: 'user', select: 'firstName lastName email' } })
    .populate({ path: 'mentorMembership', populate: { path: 'user', select: 'firstName lastName email' } })
    .lean();
  if (!recommendation) throw new ApiError(404, 'Match recommendation not found.');
  return toRecommendation(recommendation);
}

async function writeReviewAudit({ actorId, action, cohortId, recommendationId, previousStatus, newStatus, reason, changes, session }) {
  await logAdminAction({
    actor: actorId,
    action,
    entityType: 'MATCH_RECOMMENDATION',
    entityId: recommendationId,
    metadata: {
      cohortId: String(cohortId),
      recommendationId: String(recommendationId),
      previousStatus,
      newStatus,
      reason,
      ...(changes ? { adjustment: changes } : {}),
    },
    required: true,
    session,
  });
}

function previousReviewState(recommendation) {
  return {
    reviewStatus: recommendation.reviewStatus,
    reviewedBy: recommendation.reviewedBy,
    reviewedAt: recommendation.reviewedAt,
    rejectionReason: recommendation.rejectionReason,
    menteeMembership: recommendation.menteeMembership,
    mentorMembership: recommendation.mentorMembership,
    compatibilityScore: recommendation.compatibilityScore,
    scoreBreakdown: { ...(recommendation.scoreBreakdown || {}) },
    sharedInterests: [...(recommendation.sharedInterests || [])],
    developmentOpportunities: [...(recommendation.developmentOpportunities || [])],
    reasons: [...(recommendation.reasons || [])],
    adjustmentHistory: recommendation.adjustmentHistory.map((entry) => (
      typeof entry.toObject === 'function' ? entry.toObject() : entry
    )),
  };
}

async function updateRecommendationReviewStatus(actorId, cohortId, recommendationId, nextStatus, payload = {}) {
  if (!['APPROVED', 'REJECTED', 'ADJUSTED'].includes(nextStatus)) {
    throw new ApiError(400, 'Invalid recommendation review status transition.');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ApiError(400, 'Review data must be an object.');
  }

  const reason = nextStatus === 'APPROVED'
    ? ''
    : normalizeText(payload.reason, 'reason', { required: true, maxLength: 1000 });
  let changes;
  if (nextStatus === 'ADJUSTED') {
    const allowedFields = new Set([
      'reason',
      'menteeMembership',
      'mentorMembership',
      'compatibilityScore',
      'scoreBreakdown',
      'sharedInterests',
      'developmentOpportunities',
      'reasons',
    ]);
    const unsupported = Object.keys(payload).filter((field) => !allowedFields.has(field));
    if (unsupported.length) throw new ApiError(400, `Unsupported adjustment fields: ${unsupported.join(', ')}.`);
    const changeFields = Object.keys(payload).filter((field) => field !== 'reason');
    if (!changeFields.length) throw new ApiError(400, 'Provide at least one recommendation field to adjust.');
    changes = {};
    for (const field of changeFields) {
      if (field === 'menteeMembership' || field === 'mentorMembership') {
        requireValidId(payload[field], `${field} ID`);
        changes[field] = payload[field];
      } else if (field === 'compatibilityScore') {
        changes[field] = normalizeScore(payload[field]);
      } else if (field === 'scoreBreakdown') {
        changes[field] = normalizeScoreBreakdown(payload[field]);
      } else {
        changes[field] = normalizeTextArray(
          payload[field],
          field,
          field === 'sharedInterests' ? { maxItemLength: 300 } : undefined,
        );
      }
    }
  } else {
    const allowedFields = nextStatus === 'REJECTED' ? new Set(['reason']) : new Set();
    const unsupported = Object.keys(payload).filter((field) => !allowedFields.has(field));
    if (unsupported.length) throw new ApiError(400, `Unsupported review fields: ${unsupported.join(', ')}.`);
  }

  try {
    return await withTransactionIfSupported(async (session) => {
      await requireActiveAdmin(actorId, session);
      await loadCohort(cohortId, session);
      const recommendation = await loadRecommendation(cohortId, recommendationId, session);
      if (!REVIEWABLE_STATUSES.includes(recommendation.reviewStatus)) {
        throw new ApiError(409, `A ${recommendation.reviewStatus.toLowerCase()} recommendation cannot be reviewed again.`);
      }
      if (!REVIEW_TRANSITIONS[recommendation.reviewStatus]?.includes(nextStatus)) {
        throw new ApiError(409, `Cannot transition a recommendation from ${recommendation.reviewStatus} to ${nextStatus}.`);
      }
      if (nextStatus === 'APPROVED') {
        await validateMembershipPair(
          cohortId,
          recommendation.menteeMembership,
          recommendation.mentorMembership,
          session,
        );
        let approvedQuery = MatchRecommendation.exists({
          _id: { $ne: recommendation._id },
          cohort: cohortId,
          menteeMembership: recommendation.menteeMembership,
          mentorMembership: recommendation.mentorMembership,
          reviewStatus: 'APPROVED',
        });
        if (session) approvedQuery = approvedQuery.session(session);
        if (await approvedQuery) {
          throw new ApiError(409, 'This cohort pairing already has an approved recommendation.');
        }
      }
      if (nextStatus === 'ADJUSTED') {
        const menteeMembership = changes.menteeMembership || recommendation.menteeMembership;
        const mentorMembership = changes.mentorMembership || recommendation.mentorMembership;
        await validateMembershipPair(cohortId, menteeMembership, mentorMembership, session);
      }

      const previousStatus = recommendation.reviewStatus;
      const previousState = previousReviewState(recommendation);
      const previousContent = snapshotRecommendation(recommendation);
      const reviewedAt = new Date();
      recommendation.reviewStatus = nextStatus;
      recommendation.reviewedBy = actorId;
      recommendation.reviewedAt = reviewedAt;
      if (nextStatus === 'REJECTED') recommendation.rejectionReason = reason;
      if (nextStatus === 'ADJUSTED') {
        Object.assign(recommendation, changes);
        recommendation.adjustmentHistory.push({
          reviewedBy: actorId,
          reviewedAt,
          reason,
          previous: previousContent,
          changes: Object.fromEntries(Object.entries(changes).map(([field, value]) => [
            field,
            field === 'menteeMembership' || field === 'mentorMembership' ? String(value) : value,
          ])),
        });
      }

      let saved = false;
      try {
        await recommendation.save(sessionOptions(session));
        saved = true;
        await writeReviewAudit({
          actorId,
          action: REVIEW_ACTIONS[nextStatus],
          cohortId,
          recommendationId: recommendation._id,
          previousStatus,
          newStatus: nextStatus,
          reason,
          changes,
          session,
        });
      } catch (error) {
        if (!session && saved) {
          const rollback = await MatchRecommendation.updateOne(
            {
              _id: recommendation._id,
              reviewStatus: nextStatus,
              reviewedBy: actorId,
              updatedAt: recommendation.updatedAt,
            },
            { $set: previousState },
          );
          if (rollback.matchedCount !== 1) {
            throw new Error('Recommendation review failed and could not be rolled back.', { cause: error });
          }
        }
        throw error;
      }
      return toRecommendation(recommendation);
    });
  } catch (error) {
    mapDuplicateKey(error, 'This cohort pairing already has an approved recommendation.');
  }
}

export async function approveRecommendation(actorId, cohortId, recommendationId) {
  return updateRecommendationReviewStatus(actorId, cohortId, recommendationId, 'APPROVED');
}

export async function rejectRecommendation(actorId, cohortId, recommendationId, payload) {
  return updateRecommendationReviewStatus(actorId, cohortId, recommendationId, 'REJECTED', payload);
}

export async function adjustRecommendation(actorId, cohortId, recommendationId, payload) {
  return updateRecommendationReviewStatus(actorId, cohortId, recommendationId, 'ADJUSTED', payload);
}

export { updateRecommendationReviewStatus };
