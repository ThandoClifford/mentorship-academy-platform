import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import Cohort from '../models/Cohort.js';
import CohortMembership from '../models/CohortMembership.js';
import MatchRecommendation from '../models/MatchRecommendation.js';
import MentorProfile from '../models/MentorProfile.js';
import MenteeProfile from '../models/MenteeProfile.js';
import User, { USER_ROLES } from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { logAdminAction } from './auditService.js';
import { getAcademySettings } from './academySettingsService.js';
import { scoreMenteeMentorProfiles } from './matchingService.js';
import {
  createRecommendation,
  getMentorCapacityPairs,
} from './matchRecommendationService.js';

const GENERATION_COHORT_STATUSES = ['ENROLLING', 'ACTIVE'];
const ELIGIBLE_MEMBERSHIP_STATUSES = ['ENROLLED', 'ACTIVE'];
const GENERIC_EXPLANATION = 'General compatibility based on available profile information.';

function normalizedValue(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizedItems(values = []) {
  return values
    .filter((value) => typeof value === 'string' && value.trim())
    .map((value) => ({ key: normalizedValue(value), value: value.trim() }));
}

function findSharedItems(leftValues, rightValues) {
  const rightKeys = new Set(normalizedItems(rightValues).map(({ key }) => key));
  return [...new Map(
    normalizedItems(leftValues)
      .filter(({ key }) => rightKeys.has(key))
      .map(({ key, value }) => [key, value]),
  ).values()];
}

function locationCompatibility(menteeProfile, mentorProfile) {
  const menteeLocation = normalizedValue(menteeProfile.location);
  const mentorLocation = normalizedValue(mentorProfile.location);
  if (!menteeLocation || !mentorLocation) return 50;
  return menteeLocation === mentorLocation ? 100 : 0;
}

function availabilitySlotCompatibility(menteeProfile, mentorProfile) {
  const menteeAvailability = menteeProfile.availability || {};
  const mentorAvailability = mentorProfile.availability || {};
  const menteeTimeZone = normalizedValue(menteeAvailability.timeZone);
  const mentorTimeZone = normalizedValue(mentorAvailability.timeZone);
  const menteeSlots = menteeAvailability.timeSlots || [];
  const mentorSlots = mentorAvailability.timeSlots || [];
  const sharedDays = findSharedItems(menteeAvailability.days, mentorAvailability.days);
  if (
    !menteeTimeZone ||
    menteeTimeZone !== mentorTimeZone ||
    !menteeSlots.length ||
    !mentorSlots.length ||
    !sharedDays.length
  ) {
    return { score: 50, overlaps: [] };
  }

  const overlaps = [];
  for (const day of sharedDays) {
    for (const menteeSlot of menteeSlots) {
      for (const mentorSlot of mentorSlots) {
        const start = menteeSlot.start > mentorSlot.start ? menteeSlot.start : mentorSlot.start;
        const end = menteeSlot.end < mentorSlot.end ? menteeSlot.end : mentorSlot.end;
        if (start < end) overlaps.push(`${day.toUpperCase()} ${start}-${end}`);
      }
    }
  }
  return { score: overlaps.length ? 100 : 0, overlaps: [...new Set(overlaps)] };
}

function scoreCandidate(menteeProfile, mentorProfile, minimumScore) {
  const legacyScore = scoreMenteeMentorProfiles(menteeProfile, mentorProfile);
  if (legacyScore.compatibilityScore < minimumScore) return null;

  const sharedInterests = findSharedItems(
    menteeProfile.interests,
    [
      ...(mentorProfile.skills || []),
      ...(mentorProfile.specialisations || []),
      ...(mentorProfile.mentorshipAreas || []),
    ],
  );
  const developmentGoals = findSharedItems(
    [...(menteeProfile.careerGoals || []), ...(menteeProfile.mentorshipGoals || [])],
    [...(mentorProfile.mentorshipAreas || []), ...(mentorProfile.experienceAreas || [])],
  );
  const locationScore = locationCompatibility(menteeProfile, mentorProfile);
  const availabilitySlots = availabilitySlotCompatibility(menteeProfile, mentorProfile);
  const reasons = legacyScore.explanations.filter((reason) => reason !== GENERIC_EXPLANATION);

  if (sharedInterests.length) {
    reasons.push(`Shared interests: ${sharedInterests.slice(0, 3).join(', ')}.`);
  }
  if (!reasons.length && locationScore !== 100 && !availabilitySlots.overlaps.length) return null;
  if (locationScore === 100) {
    reasons.push(`Location compatibility: both profiles list ${menteeProfile.location.trim()}.`);
  } else if (locationScore === 0) {
    reasons.push('The profiles list different locations; location should be considered during review.');
  }
  if (availabilitySlots.overlaps.length) {
    reasons.push(`Availability overlap: ${availabilitySlots.overlaps.slice(0, 3).join(', ')}.`);
  }

  return {
    compatibilityScore: legacyScore.compatibilityScore,
    scoreBreakdown: {
      ...legacyScore.scoreBreakdown,
      location: locationScore,
      availabilitySlots: availabilitySlots.score,
    },
    locationScore,
    availabilitySlotsScore: availabilitySlots.score,
    sharedInterests,
    developmentOpportunities: developmentGoals.map(
      (goal) => `Potential development focus: ${goal}.`,
    ),
    reasons,
  };
}

function compareCandidates(left, right) {
  return right.score.compatibilityScore - left.score.compatibilityScore ||
    right.score.availabilitySlotsScore - left.score.availabilitySlotsScore ||
    right.score.locationScore - left.score.locationScore ||
    String(left.mentor.membership._id).localeCompare(String(right.mentor.membership._id));
}

async function requireActiveAdmin(adminUserId) {
  if (!mongoose.isValidObjectId(adminUserId)) {
    throw new ApiError(403, 'Only active administrators can generate cohort recommendations.');
  }
  const admin = await User.findOne({
    _id: adminUserId,
    role: USER_ROLES.ADMIN,
    isActive: true,
  }).select('_id').lean();
  if (!admin) throw new ApiError(403, 'Only active administrators can generate cohort recommendations.');
  return admin;
}

async function getFixedMenteeMembershipIds(cohortId) {
  const approvedRecommendations = await MatchRecommendation.find({
    cohort: cohortId,
    reviewStatus: 'APPROVED',
  }).select('menteeMembership').lean();
  return new Set(approvedRecommendations.map(({ menteeMembership }) => String(menteeMembership)));
}

export async function generateRecommendationsForCohort(cohortId, adminUserId) {
  await requireActiveAdmin(adminUserId);
  if (!mongoose.isValidObjectId(cohortId)) throw new ApiError(400, 'Invalid cohort ID.');
  const cohort = await Cohort.findById(cohortId);
  if (!cohort) throw new ApiError(404, 'Cohort not found.');
  if (!GENERATION_COHORT_STATUSES.includes(cohort.status)) {
    throw new ApiError(409, 'Recommendations can only be generated for enrolling or active cohorts.');
  }

  const settings = await getAcademySettings();
  if (!settings?.cohortManagementEnabled) {
    throw new ApiError(403, 'Cohort management is disabled in Academy settings.');
  }
  if (!settings.aiMatchmakingEnabled) {
    throw new ApiError(403, 'AI matchmaking is currently disabled.');
  }

  const matchingRun = randomUUID();
  const generationTimestamp = new Date();
  const cohortMemberships = await CohortMembership.find({ cohort: cohort._id })
    .populate('user', 'firstName lastName email role isActive')
    .lean();
  const memberships = cohortMemberships.filter(
    ({ status }) => ELIGIBLE_MEMBERSHIP_STATUSES.includes(status),
  );

  const allMenteeMemberships = cohortMemberships.filter(({ participantRole }) => participantRole === 'MENTEE');
  const allMentorMemberships = cohortMemberships.filter(({ participantRole }) => participantRole === 'MENTOR');
  const menteeMemberships = memberships.filter(({ participantRole }) => participantRole === 'MENTEE');
  const mentorMemberships = memberships.filter(({ participantRole }) => participantRole === 'MENTOR');
  const activeMenteeMemberships = menteeMemberships.filter(
    ({ user }) => user?.isActive && user.role === USER_ROLES.MENTEE,
  );
  const activeMentorMemberships = mentorMemberships.filter(
    ({ user }) => user?.isActive && user.role === USER_ROLES.MENTOR,
  );
  const [menteeProfiles, approvedMentorProfiles] = await Promise.all([
    MenteeProfile.find({
      user: { $in: activeMenteeMemberships.map(({ user }) => user._id) },
    }).lean(),
    MentorProfile.find({
      user: { $in: activeMentorMemberships.map(({ user }) => user._id) },
      status: 'APPROVED',
    }).lean(),
  ]);

  const menteeProfileByUser = new Map(menteeProfiles.map((profile) => [String(profile.user), profile]));
  const mentorProfileByUser = new Map(
    approvedMentorProfiles.map((profile) => [String(profile.user), profile]),
  );
  const eligibleMentees = activeMenteeMemberships
    .filter(({ user }) => menteeProfileByUser.has(String(user._id)))
    .map((membership) => ({
      membership,
      profile: menteeProfileByUser.get(String(membership.user._id)),
    }));
  const eligibleMentors = activeMentorMemberships
    .filter(({ user }) => mentorProfileByUser.has(String(user._id)))
    .map((membership) => ({
      membership,
      profile: mentorProfileByUser.get(String(membership.user._id)),
    }));

  const [fixedMenteeMembershipIds, capacityUsage] = await Promise.all([
    getFixedMenteeMembershipIds(cohort._id),
    getMentorCapacityPairs(eligibleMentors.map(({ membership }) => membership.user._id)),
  ]);
  const maxMenteesPerMentor = settings.maxMenteesPerMentor;
  const availableMentors = eligibleMentors
    .map((mentor) => {
      const mentorId = String(mentor.membership.user._id);
      const remainingCapacity = Math.max(
        0,
        maxMenteesPerMentor - (capacityUsage.get(mentorId)?.size || 0),
      );
      return { ...mentor, remainingCapacity };
    })
    .filter(({ remainingCapacity }) => remainingCapacity > 0);

  const unresolvedMentees = eligibleMentees.filter(
    ({ membership }) => !fixedMenteeMembershipIds.has(String(membership._id)),
  );
  const candidateLists = [];
  for (const mentee of unresolvedMentees) {
    const candidates = [];
    for (const mentor of availableMentors) {
      const score = scoreCandidate(mentee.profile, mentor.profile, settings.minimumMatchScore || 0);
      if (!score) continue;
      candidates.push({ mentee, mentor, score });
    }
    candidates.sort(compareCandidates);
    if (candidates.length) candidateLists.push({ mentee, candidates });
  }
  // Match least-flexible mentees first. Supplemental dimensions only break legacy-score ties.
  candidateLists.sort((left, right) => (
    left.candidates.length - right.candidates.length ||
    compareCandidates(left.candidates[0], right.candidates[0]) ||
    String(left.mentee.membership._id).localeCompare(String(right.mentee.membership._id))
  ));

  const recommendationsCreated = [];
  const usedMentorMembershipIds = new Set();
  let duplicateRecommendationsSkipped = 0;
  for (const { candidates } of candidateLists) {
    for (const candidate of candidates) {
      if (candidate.mentor.remainingCapacity <= 0) continue;
      try {
        const recommendation = await createRecommendation({
          cohort: cohort._id,
          menteeMembership: candidate.mentee.membership._id,
          mentorMembership: candidate.mentor.membership._id,
          matchingRun,
          compatibilityScore: candidate.score.compatibilityScore,
          scoreBreakdown: candidate.score.scoreBreakdown,
          sharedInterests: candidate.score.sharedInterests,
          developmentOpportunities: candidate.score.developmentOpportunities,
          reasons: candidate.score.reasons,
        });
        candidate.mentor.remainingCapacity -= 1;
        usedMentorMembershipIds.add(String(candidate.mentor.membership._id));
        recommendationsCreated.push(recommendation);
        break;
      } catch (error) {
        if (error.statusCode === 409 || error.code === 11000) {
          duplicateRecommendationsSkipped += 1;
          continue;
        }
        throw error;
      }
    }
  }

  const summary = {
    matchingRun,
    cohort: String(cohort._id),
    eligibleMentees: eligibleMentees.length,
    eligibleMentors: eligibleMentors.length,
    recommendationsCreated: recommendationsCreated.length,
    skippedMentees: allMenteeMemberships.length - recommendationsCreated.length,
    skippedMentors: allMentorMemberships.length - usedMentorMembershipIds.size,
    duplicateRecommendationsSkipped,
    generationTimestamp: generationTimestamp.toISOString(),
  };
  await logAdminAction({
    actor: adminUserId,
    action: 'COHORT_MATCHING_GENERATED',
    entityType: 'COHORT',
    entityId: cohort._id,
    metadata: summary,
    required: true,
  });
  return summary;
}
