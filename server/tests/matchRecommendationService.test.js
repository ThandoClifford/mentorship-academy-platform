import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { after, before, test } from 'node:test';
import '../config/env.js';
import AcademySettings from '../models/AcademySettings.js';
import AuditLog from '../models/AuditLog.js';
import Cohort from '../models/Cohort.js';
import CohortMembership from '../models/CohortMembership.js';
import MatchRecommendation from '../models/MatchRecommendation.js';
import MentorProfile from '../models/MentorProfile.js';
import MentorshipRelationship from '../models/MentorshipRelationship.js';
import User, { USER_ROLES } from '../models/User.js';
import {
  adjustRecommendation,
  approveRecommendation,
  createRecommendation,
  rejectRecommendation,
} from '../services/matchRecommendationService.js';
import {
  acceptMentorshipRequest,
  createMentorshipRequest,
} from '../services/mentorshipService.js';

let connected = false;
let fixture;

function assertApiErrorStatus(statusCode) {
  return (error) => error.statusCode === statusCode;
}

async function createUser(key, role) {
  return User.create({
    firstName: 'Test',
    lastName: key,
    email: `${key}.${Date.now()}.${crypto.randomBytes(3).toString('hex')}@example.test`,
    password: 'LocalTestPassword123!',
    role,
  });
}

async function createMembership(cohort, user, participantRole, assignedBy, status = 'ACTIVE') {
  return CohortMembership.create({
    cohort: cohort._id,
    user: user._id,
    participantRole,
    status,
    assignedBy: assignedBy._id,
    statusChangedBy: assignedBy._id,
    statusChangedAt: new Date(),
  });
}

function recommendationPayload(menteeMembership, mentorMembership, matchingRun) {
  return {
    cohort: String(fixture.cohort._id),
    menteeMembership: String(menteeMembership._id),
    mentorMembership: String(mentorMembership._id),
    matchingRun,
    compatibilityScore: 82,
    scoreBreakdown: { expertise: 90, industry: 75 },
    sharedInterests: ['Product strategy'],
    developmentOpportunities: ['Build leadership experience'],
    reasons: ['Complementary experience and goals.'],
  };
}

async function createCohortMentee(key = 'pairing-mentee') {
  const user = await createUser(key, USER_ROLES.MENTEE);
  const membership = await createMembership(fixture.cohort, user, 'MENTEE', fixture.admin);
  return { user, membership };
}

before(async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI must be configured for recommendation tests.');
  const uri = new URL(process.env.MONGO_URI);
  const host = uri.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error('Recommendation tests are restricted to a loopback MongoDB host.');
  }
  const originalDatabase = decodeURIComponent(uri.pathname.split('/').filter(Boolean)[0] || '');
  if (uri.username && !uri.searchParams.has('authSource')) {
    uri.searchParams.set('authSource', originalDatabase || 'admin');
  }
  uri.pathname = `/tma_match_recommendations_test_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  await mongoose.connect(uri.toString(), { serverSelectionTimeoutMS: 10000 });
  connected = true;
  await Promise.all([
    AcademySettings.init(),
    AuditLog.init(),
    Cohort.init(),
    CohortMembership.init(),
    MatchRecommendation.init(),
    MentorProfile.init(),
    MentorshipRelationship.init(),
    User.init(),
  ]);

  const admin = await createUser('admin', USER_ROLES.ADMIN);
  const reviewer = await createUser('reviewer', USER_ROLES.MENTEE);
  const menteeOne = await createUser('mentee-one', USER_ROLES.MENTEE);
  const menteeTwo = await createUser('mentee-two', USER_ROLES.MENTEE);
  const removedMentee = await createUser('removed-mentee', USER_ROLES.MENTEE);
  const mentorOne = await createUser('mentor-one', USER_ROLES.MENTOR);
  const mentorTwo = await createUser('mentor-two', USER_ROLES.MENTOR);
  const mentorThree = await createUser('mentor-three', USER_ROLES.MENTOR);
  const otherMentee = await createUser('other-mentee', USER_ROLES.MENTEE);
  const otherMentor = await createUser('other-mentor', USER_ROLES.MENTOR);
  const cohort = await Cohort.create({
    name: 'Recommendation test cohort',
    code: 'recommendation-test-cohort',
    status: 'ACTIVE',
    startsAt: new Date(Date.now() - 60_000),
    endsAt: new Date(Date.now() + 86_400_000),
    createdBy: admin._id,
    updatedBy: admin._id,
  });
  const otherCohort = await Cohort.create({
    name: 'Other recommendation test cohort',
    code: 'other-recommendation-test-cohort',
    status: 'ACTIVE',
    startsAt: new Date(Date.now() - 60_000),
    endsAt: new Date(Date.now() + 86_400_000),
    createdBy: admin._id,
    updatedBy: admin._id,
  });
  await AcademySettings.create({
    key: 'academy',
    maxMenteesPerMentor: 10,
    cohortManagementEnabled: true,
  });
  await Promise.all([mentorOne, mentorTwo, mentorThree].map((mentor) => (
    MentorProfile.create({ user: mentor._id, status: 'APPROVED' })
  )));
  const [
    menteeOneMembership,
    menteeTwoMembership,
    removedMenteeMembership,
    mentorOneMembership,
    mentorTwoMembership,
    mentorThreeMembership,
    otherMenteeMembership,
    otherMentorMembership,
  ] = await Promise.all([
    createMembership(cohort, menteeOne, 'MENTEE', admin),
    createMembership(cohort, menteeTwo, 'MENTEE', admin),
    createMembership(cohort, removedMentee, 'MENTEE', admin, 'REMOVED'),
    createMembership(cohort, mentorOne, 'MENTOR', admin),
    createMembership(cohort, mentorTwo, 'MENTOR', admin),
    createMembership(cohort, mentorThree, 'MENTOR', admin),
    createMembership(otherCohort, otherMentee, 'MENTEE', admin),
    createMembership(otherCohort, otherMentor, 'MENTOR', admin),
  ]);
  fixture = {
    admin,
    reviewer,
    cohort,
    menteeOneMembership,
    menteeTwoMembership,
    removedMenteeMembership,
    mentorOneMembership,
    mentorTwoMembership,
    mentorThreeMembership,
    otherMenteeMembership,
    otherMentorMembership,
  };
});

after(async () => {
  if (!connected) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('creates a valid recommendation with membership references and pending status', async () => {
  const recommendation = await createRecommendation(
    recommendationPayload(fixture.menteeOneMembership, fixture.mentorOneMembership, 'valid-run'),
  );
  assert.equal(recommendation.reviewStatus, 'PENDING');
  assert.equal(recommendation.compatibilityScore, 82);
  assert.equal(recommendation.menteeMembership, String(fixture.menteeOneMembership._id));
  assert.equal(recommendation.mentorMembership, String(fixture.mentorOneMembership._id));
});

test('rejects missing, cross-cohort, and inactive membership references', async () => {
  const missingId = new mongoose.Types.ObjectId();
  await assert.rejects(
    createRecommendation(recommendationPayload(fixture.menteeOneMembership, { _id: missingId }, 'missing-member')),
    assertApiErrorStatus(400),
  );
  await assert.rejects(
    createRecommendation(recommendationPayload(fixture.otherMenteeMembership, fixture.mentorOneMembership, 'cross-cohort')),
    assertApiErrorStatus(400),
  );
  await assert.rejects(
    createRecommendation(recommendationPayload(fixture.removedMenteeMembership, fixture.mentorOneMembership, 'inactive-member')),
    assertApiErrorStatus(409),
  );
});

test('rejects membership references with the wrong participant roles', async () => {
  await assert.rejects(
    createRecommendation(recommendationPayload(fixture.mentorOneMembership, fixture.menteeOneMembership, 'wrong-roles')),
    assertApiErrorStatus(400),
  );
});

test('protects against duplicate recommendations within the same matching run', async () => {
  const payload = recommendationPayload(fixture.menteeTwoMembership, fixture.mentorOneMembership, 'duplicate-run');
  await createRecommendation(payload);
  await assert.rejects(createRecommendation(payload), assertApiErrorStatus(409));
});

test('allows an explicit admin adjustment of an approved recommendation', async () => {
  const recommendation = await createRecommendation(
    recommendationPayload(fixture.menteeTwoMembership, fixture.mentorOneMembership, 'approved-adjust-run'),
  );
  await approveRecommendation(fixture.admin._id, fixture.cohort._id, recommendation.id);
  const adjusted = await adjustRecommendation(
    fixture.admin._id,
    fixture.cohort._id,
    recommendation.id,
    {
      reason: 'Administrator intervened to change the proposed pairing.',
      mentorMembership: String(fixture.mentorTwoMembership._id),
    },
  );
  assert.equal(adjusted.reviewStatus, 'ADJUSTED');
  assert.equal(adjusted.adjustmentHistory[0].previous.mentorMembership, String(fixture.mentorOneMembership._id));
  const audit = await AuditLog.findOne({ entityId: recommendation.id, action: 'MATCH_RECOMMENDATION_ADJUSTED' }).sort({ createdAt: -1 }).lean();
  assert.equal(audit.metadata.previousStatus, 'APPROVED');
  assert.equal(audit.metadata.newStatus, 'ADJUSTED');
});

test('approves a recommendation, audits the transition, and blocks an approved duplicate', async () => {
  const recommendation = await createRecommendation(
    recommendationPayload(fixture.menteeOneMembership, fixture.mentorTwoMembership, 'approve-run'),
  );
  const competingRecommendation = await createRecommendation(
    recommendationPayload(fixture.menteeOneMembership, fixture.mentorThreeMembership, 'competing-approve-run'),
  );
  const approved = await approveRecommendation(
    fixture.admin._id,
    fixture.cohort._id,
    recommendation.id,
  );
  assert.equal(approved.reviewStatus, 'APPROVED');
  assert.equal(String(approved.reviewedBy), String(fixture.admin._id));
  const audit = await AuditLog.findOne({ entityId: recommendation.id, action: 'MATCH_RECOMMENDATION_APPROVED' }).lean();
  assert.equal(audit.metadata.previousStatus, 'PENDING');
  assert.equal(audit.metadata.newStatus, 'APPROVED');
  assert.equal(audit.metadata.cohortId, String(fixture.cohort._id));
  await assert.rejects(
    approveRecommendation(fixture.admin._id, fixture.cohort._id, competingRecommendation.id),
    assertApiErrorStatus(409),
  );
  assert.equal(
    await MentorshipRelationship.countDocuments({
      cohort: fixture.cohort._id,
      mentee: fixture.menteeOneMembership.user,
      status: 'ACTIVE',
    }),
    1,
  );
  assert.equal(
    await AuditLog.countDocuments({
      entityId: competingRecommendation.id,
      action: 'COHORT_PAIRING_APPROVAL_REJECTED',
    }),
    1,
  );
  await assert.rejects(
    createRecommendation(
      recommendationPayload(fixture.menteeOneMembership, fixture.mentorTwoMembership, 'approved-duplicate-run'),
    ),
    assertApiErrorStatus(409),
  );
});

test('approval creates an active cohort relationship linked to the recommendation', async () => {
  const { user, membership } = await createCohortMentee('pairing-create');
  const recommendation = await createRecommendation(
    recommendationPayload(membership, fixture.mentorOneMembership, 'pairing-create-run'),
  );
  const approved = await approveRecommendation(fixture.admin._id, fixture.cohort._id, recommendation.id);
  const relationship = await MentorshipRelationship.findOne({
    matchRecommendation: recommendation.id,
  }).lean();

  assert.equal(approved.reviewStatus, 'APPROVED');
  assert.equal(approved.relationship.id, String(relationship._id));
  assert.equal(relationship.status, 'ACTIVE');
  assert.equal(String(relationship.cohort), String(fixture.cohort._id));
  assert.equal(String(relationship.mentee), String(user._id));
  assert.equal(String(relationship.mentor), String(fixture.mentorOneMembership.user));
  assert.equal(String(relationship.menteeMembership), String(membership._id));
  assert.equal(String(relationship.mentorMembership), String(fixture.mentorOneMembership._id));
  assert.equal(String(relationship.matchRecommendation), recommendation.id);
  assert.equal(relationship.adminApprovalStatus, 'NOT_REQUIRED');
  assert.equal(
    await MentorshipRelationship.countDocuments({
      cohort: fixture.cohort._id,
      mentee: user._id,
      status: 'ACTIVE',
    }),
    1,
  );
  assert.equal(
    await AuditLog.countDocuments({
      entityId: relationship._id,
      action: 'COHORT_PAIRING_CREATED',
    }),
    1,
  );
});

test('approving the same recommendation twice returns its existing relationship', async () => {
  const { membership } = await createCohortMentee('pairing-idempotent');
  const recommendation = await createRecommendation(
    recommendationPayload(membership, fixture.mentorOneMembership, 'pairing-idempotent-run'),
  );
  const first = await approveRecommendation(fixture.admin._id, fixture.cohort._id, recommendation.id);
  const second = await approveRecommendation(fixture.admin._id, fixture.cohort._id, recommendation.id);

  assert.equal(first.relationship.id, second.relationship.id);
  assert.equal(second.idempotent, true);
  assert.equal(
    await MentorshipRelationship.countDocuments({ matchRecommendation: recommendation.id }),
    1,
  );
  assert.equal(
    await AuditLog.countDocuments({
      entityId: recommendation.id,
      action: 'COHORT_PAIRING_APPROVAL_IDEMPOTENT',
    }),
    1,
  );
});

test('non-cohort mentorship requests remain available without a fixed cohort pairing', async () => {
  const relationship = await createMentorshipRequest(
    fixture.otherMenteeMembership.user,
    fixture.otherMentorMembership.user,
    'Non-cohort request remains supported.',
  );
  const persisted = await MentorshipRelationship.findById(relationship.id).lean();
  assert.equal(persisted.status, 'PENDING');
  assert.equal(persisted.cohort, null);
});

test('mentees and mentors cannot change an active cohort assignment through requests', async () => {
  const { user, membership } = await createCohortMentee('pairing-request-guard');
  const pendingRequest = await createMentorshipRequest(
    user._id,
    fixture.mentorThreeMembership.user,
    'Submitted before the cohort pairing was approved.',
  );
  const recommendation = await createRecommendation(
    recommendationPayload(membership, fixture.mentorOneMembership, 'pairing-request-guard-run'),
  );
  await approveRecommendation(fixture.admin._id, fixture.cohort._id, recommendation.id);

  await assert.rejects(
    createMentorshipRequest(user._id, fixture.mentorTwoMembership.user, 'Try another mentor.'),
    assertApiErrorStatus(409),
  );
  await assert.rejects(
    acceptMentorshipRequest(fixture.mentorThreeMembership.user, pendingRequest.id),
    assertApiErrorStatus(409),
  );
  assert.equal(
    await MentorshipRelationship.countDocuments({ mentee: user._id, cohort: fixture.cohort._id }),
    1,
  );
});

test('adjusted recommendations establish or change a pairing only after reapproval', async () => {
  const { user, membership } = await createCohortMentee('pairing-adjusted');
  const recommendation = await createRecommendation(
    recommendationPayload(membership, fixture.mentorOneMembership, 'pairing-adjusted-run'),
  );
  const adjusted = await adjustRecommendation(
    fixture.admin._id,
    fixture.cohort._id,
    recommendation.id,
    {
      reason: 'Administrator selected a different mentor.',
      mentorMembership: String(fixture.mentorTwoMembership._id),
    },
  );
  assert.equal(adjusted.reviewStatus, 'ADJUSTED');
  assert.equal(await MentorshipRelationship.countDocuments({ mentee: user._id }), 0);

  await approveRecommendation(fixture.admin._id, fixture.cohort._id, recommendation.id);
  const relationship = await MentorshipRelationship.findOne({
    cohort: fixture.cohort._id,
    mentee: user._id,
  }).lean();
  assert.equal(String(relationship.mentor), String(fixture.mentorTwoMembership.user));
  assert.equal(relationship.status, 'ACTIVE');
});

test('admin adjustment and reapproval reassign an existing fixed pairing', async () => {
  const { user, membership } = await createCohortMentee('pairing-intervention');
  const recommendation = await createRecommendation(
    recommendationPayload(membership, fixture.mentorOneMembership, 'pairing-intervention-run'),
  );
  await approveRecommendation(fixture.admin._id, fixture.cohort._id, recommendation.id);
  const original = await MentorshipRelationship.findOne({
    matchRecommendation: recommendation.id,
  });
  await adjustRecommendation(
    fixture.admin._id,
    fixture.cohort._id,
    recommendation.id,
    {
      reason: 'Administrator intervened to reassign the mentee.',
      mentorMembership: String(fixture.mentorTwoMembership._id),
    },
  );
  assert.equal(original.status, 'ACTIVE');

  await approveRecommendation(fixture.admin._id, fixture.cohort._id, recommendation.id);
  const completedOriginal = await MentorshipRelationship.findById(original._id).lean();
  const current = await MentorshipRelationship.findOne({
    cohort: fixture.cohort._id,
    mentee: user._id,
    status: 'ACTIVE',
  }).lean();
  assert.equal(completedOriginal.status, 'COMPLETED');
  assert.equal(String(current.mentor), String(fixture.mentorTwoMembership.user));
  assert.equal(
    await MentorshipRelationship.countDocuments({
      cohort: fixture.cohort._id,
      mentee: user._id,
      status: 'ACTIVE',
    }),
    1,
  );
  assert.equal(
    await AuditLog.countDocuments({
      entityId: current._id,
      action: 'COHORT_PAIRING_REASSIGNED',
    }),
    1,
  );
});

test('allows approved mentees within capacity and blocks approvals over capacity', async () => {
  await AcademySettings.updateOne({ key: 'academy' }, { $set: { maxMenteesPerMentor: 3 } });
  try {
    await Cohort.updateOne({ _id: fixture.cohort._id }, { $set: { status: 'ACTIVE' } });
    const firstMentee = await createUser('capacity-first-mentee', USER_ROLES.MENTEE);
    const secondMentee = await createUser('capacity-second-mentee', USER_ROLES.MENTEE);
    const firstMenteeMembership = await createMembership(
      fixture.cohort,
      firstMentee,
      'MENTEE',
      fixture.admin,
    );
    const secondMenteeMembership = await createMembership(
      fixture.cohort,
      secondMentee,
      'MENTEE',
      fixture.admin,
    );
    await MentorshipRelationship.create({
      mentee: fixture.removedMenteeMembership.user,
      mentor: fixture.mentorThreeMembership.user,
      requestedBy: fixture.removedMenteeMembership.user,
      status: 'ACTIVE',
    });

    const first = await createRecommendation(
      recommendationPayload(firstMenteeMembership, fixture.mentorThreeMembership, 'capacity-first'),
    );
    const second = await createRecommendation(
      recommendationPayload(secondMenteeMembership, fixture.mentorThreeMembership, 'capacity-second'),
    );
    await approveRecommendation(fixture.admin._id, fixture.cohort._id, first.id);
    await approveRecommendation(fixture.admin._id, fixture.cohort._id, second.id);

    const thirdMentee = await createUser('capacity-third-mentee', USER_ROLES.MENTEE);
    const thirdMenteeMembership = await createMembership(
      fixture.cohort,
      thirdMentee,
      'MENTEE',
      fixture.admin,
    );
    const third = await createRecommendation(
      recommendationPayload(thirdMenteeMembership, fixture.mentorThreeMembership, 'capacity-third'),
    );
    await assert.rejects(
      approveRecommendation(fixture.admin._id, fixture.cohort._id, third.id),
      assertApiErrorStatus(409),
    );
    assert.equal(
      await AuditLog.countDocuments({
        entityId: third.id,
        action: 'COHORT_PAIRING_APPROVAL_REJECTED',
      }),
      1,
    );
  } finally {
    await AcademySettings.updateOne({ key: 'academy' }, { $set: { maxMenteesPerMentor: 10 } });
  }
});

test('rejects with a reason, audits the transition, and does not allow approval afterward', async () => {
  const recommendation = await createRecommendation(
    recommendationPayload(fixture.menteeTwoMembership, fixture.mentorThreeMembership, 'reject-run'),
  );
  const rejected = await rejectRecommendation(
    fixture.admin._id,
    fixture.cohort._id,
    recommendation.id,
    { reason: 'The proposed pairing is not suitable.' },
  );
  assert.equal(rejected.reviewStatus, 'REJECTED');
  assert.equal(rejected.rejectionReason, 'The proposed pairing is not suitable.');
  const audit = await AuditLog.findOne({ entityId: recommendation.id, action: 'MATCH_RECOMMENDATION_REJECTED' }).lean();
  assert.equal(audit.metadata.reason, rejected.rejectionReason);
  assert.equal(await MentorshipRelationship.countDocuments({ matchRecommendation: recommendation.id }), 0);
  await assert.rejects(
    approveRecommendation(fixture.admin._id, fixture.cohort._id, recommendation.id),
    assertApiErrorStatus(409),
  );
});

test('records adjusted pairing details and adjustment history', async () => {
  const recommendation = await createRecommendation(
    recommendationPayload(fixture.menteeTwoMembership, fixture.mentorTwoMembership, 'adjust-run'),
  );
  const adjusted = await adjustRecommendation(
    fixture.admin._id,
    fixture.cohort._id,
    recommendation.id,
    {
      reason: 'A better-fit mentor is available.',
      mentorMembership: String(fixture.mentorThreeMembership._id),
      compatibilityScore: 91,
      reasons: ['The revised pairing better aligns with the mentee goals.'],
    },
  );
  assert.equal(adjusted.reviewStatus, 'ADJUSTED');
  assert.equal(adjusted.mentorMembership, String(fixture.mentorThreeMembership._id));
  assert.equal(adjusted.compatibilityScore, 91);
  assert.equal(adjusted.adjustmentHistory.length, 1);
  assert.equal(
    adjusted.adjustmentHistory[0].previous.mentorMembership,
    String(fixture.mentorTwoMembership._id),
  );
  const audit = await AuditLog.findOne({ entityId: recommendation.id, action: 'MATCH_RECOMMENDATION_ADJUSTED' }).lean();
  assert.equal(audit.metadata.previousStatus, 'PENDING');
  assert.equal(audit.metadata.newStatus, 'ADJUSTED');
  assert.equal(audit.metadata.adjustment.compatibilityScore, 91);
});

test('prevents non-admin users from reviewing recommendations', async () => {
  const recommendation = await createRecommendation(
    recommendationPayload(fixture.menteeTwoMembership, fixture.mentorTwoMembership, 'unauthorized-run'),
  );
  await assert.rejects(
    approveRecommendation(fixture.reviewer._id, fixture.cohort._id, recommendation.id),
    assertApiErrorStatus(403),
  );
  const unchanged = await MatchRecommendation.findById(recommendation.id).lean();
  assert.equal(unchanged.reviewStatus, 'PENDING');
  assert.equal(
    await AuditLog.countDocuments({ entityId: recommendation.id, action: 'MATCH_RECOMMENDATION_APPROVED' }),
    0,
  );
});
