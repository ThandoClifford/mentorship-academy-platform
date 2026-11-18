import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { after, before, test } from 'node:test';
import '../config/env.js';
import AuditLog from '../models/AuditLog.js';
import Cohort from '../models/Cohort.js';
import CohortMembership from '../models/CohortMembership.js';
import MatchRecommendation from '../models/MatchRecommendation.js';
import User, { USER_ROLES } from '../models/User.js';
import {
  adjustRecommendation,
  approveRecommendation,
  createRecommendation,
  rejectRecommendation,
} from '../services/matchRecommendationService.js';

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
    AuditLog.init(),
    Cohort.init(),
    CohortMembership.init(),
    MatchRecommendation.init(),
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
    startsAt: new Date(Date.now() - 60_000),
    endsAt: new Date(Date.now() + 86_400_000),
    createdBy: admin._id,
    updatedBy: admin._id,
  });
  const otherCohort = await Cohort.create({
    name: 'Other recommendation test cohort',
    code: 'other-recommendation-test-cohort',
    startsAt: new Date(Date.now() - 60_000),
    endsAt: new Date(Date.now() + 86_400_000),
    createdBy: admin._id,
    updatedBy: admin._id,
  });
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
    createRecommendation(
      recommendationPayload(fixture.menteeOneMembership, fixture.mentorTwoMembership, 'approved-duplicate-run'),
    ),
    assertApiErrorStatus(409),
  );
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
    recommendationPayload(fixture.menteeOneMembership, fixture.mentorThreeMembership, 'unauthorized-run'),
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
