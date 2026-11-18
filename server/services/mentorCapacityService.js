import Cohort from '../models/Cohort.js';
import CohortMembership from '../models/CohortMembership.js';
import MatchRecommendation from '../models/MatchRecommendation.js';
import MentorshipRelationship from '../models/MentorshipRelationship.js';

const CAPACITY_MEMBERSHIP_STATUSES = ['ENROLLED', 'ACTIVE', 'PAUSED'];
const CAPACITY_RELATIONSHIP_STATUSES = ['ACCEPTED', 'ACTIVE'];
const ONGOING_COHORT_STATUSES = ['ENROLLING', 'ACTIVE'];

export async function getMentorCapacityPairs(
  mentorUserIds,
  session,
  { excludeRecommendationId } = {},
) {
  const capacityPairs = new Map(mentorUserIds.map((id) => [String(id), new Set()]));
  if (!mentorUserIds.length) return capacityPairs;

  let relationshipQuery = MentorshipRelationship.find({
    mentor: { $in: mentorUserIds },
    status: { $in: CAPACITY_RELATIONSHIP_STATUSES },
  }).select('mentor mentee').lean();
  if (session) relationshipQuery = relationshipQuery.session(session);
  const relationships = await relationshipQuery;
  for (const relationship of relationships) {
    capacityPairs.get(String(relationship.mentor))?.add(String(relationship.mentee));
  }

  let cohortQuery = Cohort.find({ status: { $in: ONGOING_COHORT_STATUSES } }).select('_id').lean();
  if (session) cohortQuery = cohortQuery.session(session);
  const ongoingCohorts = await cohortQuery;
  if (!ongoingCohorts.length) return capacityPairs;

  let membershipQuery = CohortMembership.find({
    user: { $in: mentorUserIds },
    participantRole: 'MENTOR',
    status: { $in: CAPACITY_MEMBERSHIP_STATUSES },
  }).select('_id').lean();
  if (session) membershipQuery = membershipQuery.session(session);
  const mentorMemberships = await membershipQuery;
  if (!mentorMemberships.length) return capacityPairs;

  const recommendationFilter = {
    cohort: { $in: ongoingCohorts.map(({ _id }) => _id) },
    mentorMembership: { $in: mentorMemberships.map(({ _id }) => _id) },
    reviewStatus: 'APPROVED',
  };
  if (excludeRecommendationId) recommendationFilter._id = { $ne: excludeRecommendationId };
  let recommendationQuery = MatchRecommendation.find(recommendationFilter)
    .populate({ path: 'mentorMembership', select: 'user' })
    .populate({ path: 'menteeMembership', select: 'user' })
    .lean();
  if (session) recommendationQuery = recommendationQuery.session(session);
  const recommendations = await recommendationQuery;
  for (const recommendation of recommendations) {
    const mentorUserId = recommendation.mentorMembership?.user
      ? String(recommendation.mentorMembership.user)
      : '';
    const menteeUserId = recommendation.menteeMembership?.user
      ? String(recommendation.menteeMembership.user)
      : '';
    if (menteeUserId) capacityPairs.get(mentorUserId)?.add(menteeUserId);
  }
  return capacityPairs;
}
