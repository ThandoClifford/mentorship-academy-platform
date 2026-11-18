import Cohort from '../models/Cohort.js';
import CohortMembership from '../models/CohortMembership.js';
import MatchRecommendation from '../models/MatchRecommendation.js';
import MentorProfile from '../models/MentorProfile.js';
import MentorshipRelationship from '../models/MentorshipRelationship.js';
import User, { USER_ROLES } from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { getAcademySettings } from './academySettingsService.js';
import { logAdminAction } from './auditService.js';
import { getMentorCapacityPairs } from './mentorCapacityService.js';

const LIVE_RELATIONSHIP_STATUSES = ['PENDING', 'ACCEPTED', 'ACTIVE'];
const ACTIVE_MEMBERSHIP_STATUSES = ['ENROLLED', 'ACTIVE'];
const FIXED_MEMBERSHIP_STATUSES = ['ENROLLED', 'ACTIVE', 'PAUSED'];
const ONGOING_COHORT_STATUSES = ['ENROLLING', 'ACTIVE'];

function inSession(query, session) {
  return session ? query.session(session) : query;
}

function idOf(reference) {
  return reference ? String(reference._id || reference) : null;
}

function toCohortRelationship(relationship) {
  return {
    id: String(relationship._id),
    cohort: idOf(relationship.cohort),
    mentee: idOf(relationship.mentee),
    mentor: idOf(relationship.mentor),
    menteeMembership: idOf(relationship.menteeMembership),
    mentorMembership: idOf(relationship.mentorMembership),
    matchRecommendation: idOf(relationship.matchRecommendation),
    status: relationship.status,
    startedAt: relationship.startedAt || null,
    completedAt: relationship.completedAt || null,
    archivedAt: relationship.archivedAt || null,
  };
}

function snapshotRelationship(relationship) {
  return {
    cohort: relationship.cohort,
    menteeMembership: relationship.menteeMembership,
    mentorMembership: relationship.mentorMembership,
    matchRecommendation: relationship.matchRecommendation,
    status: relationship.status,
    startedAt: relationship.startedAt,
    completedAt: relationship.completedAt,
    archivedAt: relationship.archivedAt,
  };
}

function restoreRelationship(relationship, snapshot) {
  Object.assign(relationship, snapshot);
}

async function loadEligibleMembership(cohortId, membershipId, role, session) {
  let query = CohortMembership.findById(membershipId).populate('user', 'role isActive');
  const membership = await inSession(query, session);
  if (!membership || String(membership.cohort) !== String(cohortId)) {
    throw new ApiError(409, `The ${role.toLowerCase()} membership is not in this cohort.`);
  }
  if (
    membership.participantRole !== role ||
    !ACTIVE_MEMBERSHIP_STATUSES.includes(membership.status) ||
    !membership.user?.isActive ||
    membership.user.role !== USER_ROLES[role]
  ) {
    throw new ApiError(409, `The ${role.toLowerCase()} membership is not active and valid.`);
  }
  return membership;
}

async function emitPairingAudit({ actorId, action, cohortId, recommendationId, relationshipId, metadata, session }) {
  await logAdminAction({
    actor: actorId,
    action,
    entityType: action === 'COHORT_PAIRING_APPROVAL_IDEMPOTENT'
      ? 'MATCH_RECOMMENDATION'
      : 'MENTORSHIP',
    entityId: action === 'COHORT_PAIRING_APPROVAL_IDEMPOTENT'
      ? recommendationId
      : relationshipId,
    metadata: {
      cohortId: String(cohortId),
      recommendationId: String(recommendationId),
      ...(relationshipId ? { relationshipId: String(relationshipId) } : {}),
      ...metadata,
    },
    required: true,
    session,
  });
}

async function getMembershipPairingIdSet(query, session) {
  const membershipQuery = inSession(query, session);
  return new Set((await membershipQuery).map(({ menteeMembership }) => String(menteeMembership)));
}

export async function getCohortPairingMenteeMembershipIds(cohortId, session) {
  const [approved, relationships] = await Promise.all([
    getMembershipPairingIdSet(
      MatchRecommendation.find({ cohort: cohortId, reviewStatus: 'APPROVED' })
        .select('menteeMembership')
        .lean(),
      session,
    ),
    getMembershipPairingIdSet(
      MentorshipRelationship.find({
        cohort: cohortId,
        status: { $in: LIVE_RELATIONSHIP_STATUSES },
      }).select('menteeMembership').lean(),
      session,
    ),
  ]);
  return new Set([...approved, ...relationships]);
}

export async function hasFixedCohortPairingForMentee(menteeUserId) {
  const memberships = await CohortMembership.find({
    user: menteeUserId,
    participantRole: 'MENTEE',
    status: { $in: FIXED_MEMBERSHIP_STATUSES },
  }).select('_id cohort').lean();
  if (!memberships.length) return false;

  const cohorts = await Cohort.find({
    _id: { $in: memberships.map(({ cohort }) => cohort) },
    status: { $in: ONGOING_COHORT_STATUSES },
  }).select('_id').lean();
  if (!cohorts.length) return false;
  const cohortIds = cohorts.map(({ _id }) => _id);
  const membershipIds = memberships
    .filter(({ cohort }) => cohortIds.some((id) => String(id) === String(cohort)))
    .map(({ _id }) => _id);

  const [approved, relationships] = await Promise.all([
    MatchRecommendation.exists({
      cohort: { $in: cohortIds },
      menteeMembership: { $in: membershipIds },
      reviewStatus: 'APPROVED',
    }),
    MentorshipRelationship.exists({
      cohort: { $in: cohortIds },
      mentee: menteeUserId,
      $or: [
        { status: { $in: LIVE_RELATIONSHIP_STATUSES } },
        { matchRecommendation: { $type: 'objectId' } },
      ],
    }),
  ]);
  return Boolean(approved || relationships);
}

export async function establishCohortPairing(actorId, recommendation, session) {
  if (recommendation.reviewStatus !== 'APPROVED') {
    throw new ApiError(409, 'Only an approved recommendation can establish a cohort pairing.');
  }
  const admin = await inSession(
    User.findOne({ _id: actorId, role: USER_ROLES.ADMIN, isActive: true }).select('_id'),
    session,
  );
  if (!admin) throw new ApiError(403, 'Only active administrators can establish cohort pairings.');

  const settings = await getAcademySettings();
  if (!settings.cohortManagementEnabled) {
    throw new ApiError(403, 'Cohort management is disabled in Academy settings.');
  }
  const cohort = await inSession(
    Cohort.findById(recommendation.cohort),
    session,
  );
  if (!cohort) throw new ApiError(404, 'Cohort not found.');
  if (!ONGOING_COHORT_STATUSES.includes(cohort.status)) {
    throw new ApiError(409, 'A pairing can only be established for an enrolling or active cohort.');
  }

  const menteeMembership = await loadEligibleMembership(
    cohort._id,
    recommendation.menteeMembership,
    'MENTEE',
    session,
  );
  const mentorMembership = await loadEligibleMembership(
    cohort._id,
    recommendation.mentorMembership,
    'MENTOR',
    session,
  );
  const approvedMentorProfile = await inSession(
    MentorProfile.exists({ user: mentorMembership.user._id, status: 'APPROVED' }),
    session,
  );
  if (!approvedMentorProfile) {
    throw new ApiError(409, 'The mentor does not have an approved profile.');
  }

  const cohortMenteeFilter = {
    cohort: cohort._id,
    mentee: menteeMembership.user._id,
    status: { $in: LIVE_RELATIONSHIP_STATUSES },
  };
  const existingAssignment = await inSession(
    MentorshipRelationship.findOne(cohortMenteeFilter),
    session,
  );
  const recommendationId = String(recommendation._id);
  const mentorMembershipId = String(mentorMembership._id);
  const sameRecommendation = existingAssignment &&
    String(existingAssignment.matchRecommendation || '') === recommendationId;
  const sameMentor = existingAssignment &&
    String(existingAssignment.mentorMembership || '') === mentorMembershipId;

  if (existingAssignment && sameMentor && (sameRecommendation || !existingAssignment.matchRecommendation)) {
    const alreadyLinked = Boolean(existingAssignment.matchRecommendation);
    const previousState = snapshotRelationship(existingAssignment);
    try {
      if (!existingAssignment.matchRecommendation) {
        existingAssignment.matchRecommendation = recommendation._id;
      }
      if (existingAssignment.status !== 'ACTIVE') {
        existingAssignment.status = 'ACTIVE';
        existingAssignment.startedAt = existingAssignment.startedAt || new Date();
        await existingAssignment.save(session ? { session } : undefined);
      } else if (!sameRecommendation) {
        await existingAssignment.save(session ? { session } : undefined);
      }
      if (!alreadyLinked) {
        await emitPairingAudit({
          actorId,
          action: 'COHORT_PAIRING_CREATED',
          cohortId: cohort._id,
          recommendationId,
          relationshipId: existingAssignment._id,
          metadata: { reusedExistingRelationship: true },
          session,
        });
      }
    } catch (error) {
      if (!session) {
        restoreRelationship(existingAssignment, previousState);
        await existingAssignment.save();
      }
      throw error;
    }
    return {
      relationship: toCohortRelationship(existingAssignment),
      created: false,
      reassigned: false,
      idempotent: alreadyLinked,
    };
  }

  if (existingAssignment && !sameRecommendation) {
    throw new ApiError(409, 'This mentee already has a fixed pairing in the cohort.');
  }
  if (existingAssignment && !recommendation.adjustmentHistory.length) {
    throw new ApiError(409, 'An administrator must adjust the approved recommendation before reassigning this pairing.');
  }

  const previousRelationshipQuery = MentorshipRelationship.findOne({
    matchRecommendation: recommendation._id,
  }).sort({ createdAt: -1 });
  const previousRecommendationPairing = await inSession(previousRelationshipQuery, session);

  if (!existingAssignment && previousRecommendationPairing && (
    String(previousRecommendationPairing.mentorMembership || '') === mentorMembershipId
  )) {
    return {
      relationship: toCohortRelationship(previousRecommendationPairing),
      created: false,
      reassigned: false,
      idempotent: true,
    };
  }

  const capacityPairs = await getMentorCapacityPairs(
    [mentorMembership.user._id],
    session,
    { excludeRecommendationId: recommendation._id },
  );
  const occupiedMentees = capacityPairs.get(String(mentorMembership.user._id)) || new Set();
  const projectedCapacity = occupiedMentees.size + (
    occupiedMentees.has(String(menteeMembership.user._id)) ? 0 : 1
  );
  if (projectedCapacity > settings.maxMenteesPerMentor) {
    throw new ApiError(409, 'This mentor has reached the maximum number of approved or active mentees.');
  }

  const existingLivePair = await inSession(
    MentorshipRelationship.findOne({
      mentee: menteeMembership.user._id,
      mentor: mentorMembership.user._id,
      status: { $in: LIVE_RELATIONSHIP_STATUSES },
    }),
    session,
  );
  if (existingLivePair && existingLivePair !== existingAssignment) {
    if (existingLivePair.cohort) {
      throw new ApiError(409, 'A live cohort relationship already exists for this participant pair.');
    }
    if (
      existingLivePair.status === 'PENDING' ||
      ['PENDING', 'REJECTED'].includes(existingLivePair.adminApprovalStatus)
    ) {
      throw new ApiError(409, 'The existing mentorship request must be resolved before cohort approval.');
    }
    const reusedState = snapshotRelationship(existingLivePair);
    let previousState;
    try {
      if (existingAssignment) {
        previousState = snapshotRelationship(existingAssignment);
        existingAssignment.status = 'COMPLETED';
        existingAssignment.completedAt = new Date();
        await existingAssignment.save(session ? { session } : undefined);
      }
      existingLivePair.cohort = cohort._id;
      existingLivePair.menteeMembership = menteeMembership._id;
      existingLivePair.mentorMembership = mentorMembership._id;
      existingLivePair.matchRecommendation = recommendation._id;
      existingLivePair.status = 'ACTIVE';
      existingLivePair.startedAt = existingLivePair.startedAt || new Date();
      await existingLivePair.save(session ? { session } : undefined);
      await emitPairingAudit({
        actorId,
        action: existingAssignment ? 'COHORT_PAIRING_REASSIGNED' : 'COHORT_PAIRING_CREATED',
        cohortId: cohort._id,
        recommendationId,
        relationshipId: existingLivePair._id,
        metadata: existingAssignment
          ? {
            previousRelationshipId: String(existingAssignment._id),
            previousMentorMembership: String(existingAssignment.mentorMembership),
            mentorMembership: mentorMembershipId,
            reusedExistingRelationship: true,
          }
          : { menteeMembership: String(menteeMembership._id), mentorMembership: mentorMembershipId, reusedExistingRelationship: true },
        session,
      });
    } catch (error) {
      if (!session) {
        restoreRelationship(existingLivePair, reusedState);
        await existingLivePair.save();
        if (existingAssignment && previousState) {
          restoreRelationship(existingAssignment, previousState);
          await existingAssignment.save();
        }
      }
      throw error;
    }
    return {
      relationship: toCohortRelationship(existingLivePair),
      created: !existingAssignment,
      reassigned: Boolean(existingAssignment),
      idempotent: false,
      relationshipId: String(existingLivePair._id),
      previousRelationshipId: existingAssignment ? String(existingAssignment._id) : null,
      previousState,
      reusedExistingRelationship: true,
      reusedState,
    };
  }

  const now = new Date();
  let previousState;
  let newRelationship;
  try {
    if (existingAssignment) {
      previousState = {
        status: existingAssignment.status,
        completedAt: existingAssignment.completedAt,
      };
      existingAssignment.status = 'COMPLETED';
      existingAssignment.completedAt = now;
      await existingAssignment.save(session ? { session } : undefined);
    }

    [newRelationship] = await MentorshipRelationship.create([{
      mentee: menteeMembership.user._id,
      mentor: mentorMembership.user._id,
      cohort: cohort._id,
      menteeMembership: menteeMembership._id,
      mentorMembership: mentorMembership._id,
      matchRecommendation: recommendation._id,
      requestedBy: actorId,
      status: 'ACTIVE',
      startedAt: now,
    }], session ? { session } : {});

    await emitPairingAudit({
      actorId,
      action: existingAssignment ? 'COHORT_PAIRING_REASSIGNED' : 'COHORT_PAIRING_CREATED',
      cohortId: cohort._id,
      recommendationId,
      relationshipId: newRelationship._id,
      metadata: existingAssignment
        ? {
          previousRelationshipId: String(existingAssignment._id),
          previousMentorMembership: String(existingAssignment.mentorMembership),
          mentorMembership: mentorMembershipId,
        }
        : { menteeMembership: String(menteeMembership._id), mentorMembership: mentorMembershipId },
      session,
    });
  } catch (error) {
    if (!session) {
      if (newRelationship) {
        newRelationship.status = 'COMPLETED';
        newRelationship.completedAt = new Date();
        await newRelationship.save();
      }
      if (existingAssignment && previousState) {
        existingAssignment.status = previousState.status;
        existingAssignment.completedAt = previousState.completedAt;
        await existingAssignment.save();
      }
    }
    throw error;
  }

  return {
    relationship: toCohortRelationship(newRelationship),
    created: !existingAssignment,
    reassigned: Boolean(existingAssignment),
    idempotent: false,
    relationshipId: String(newRelationship._id),
    previousRelationshipId: existingAssignment ? String(existingAssignment._id) : null,
    previousState,
  };
}

export async function rollbackCohortPairing(actorId, outcome, recommendationId, cohortId) {
  if (!outcome || (!outcome.created && !outcome.reassigned)) return;
  const relationship = await MentorshipRelationship.findById(outcome.relationshipId);
  if (relationship && outcome.reusedExistingRelationship) {
    restoreRelationship(relationship, outcome.reusedState);
    await relationship.save();
  } else if (relationship && relationship.status === 'ACTIVE') {
    relationship.status = 'COMPLETED';
    relationship.completedAt = new Date();
    await relationship.save();
  }
  if (outcome.reassigned && outcome.previousRelationshipId) {
    const previous = await MentorshipRelationship.findById(outcome.previousRelationshipId);
    if (previous) {
      previous.status = outcome.previousState.status;
      previous.completedAt = outcome.previousState.completedAt;
      await previous.save();
    }
  }
  await logAdminAction({
    actor: actorId,
    action: 'COHORT_PAIRING_ROLLED_BACK',
    entityType: 'MATCH_RECOMMENDATION',
    entityId: recommendationId,
    metadata: {
      cohortId: String(cohortId),
      recommendationId: String(recommendationId),
      relationshipId: outcome.relationshipId,
    },
    required: true,
  });
}
