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
import MenteeProfile from '../models/MenteeProfile.js';
import MentorProfile from '../models/MentorProfile.js';
import MentorshipRelationship from '../models/MentorshipRelationship.js';
import User, { USER_ROLES } from '../models/User.js';
import { generateRecommendationsForCohort } from '../services/cohortMatchingService.js';
import {
  approveRecommendation,
  createRecommendation,
  rejectRecommendation,
} from '../services/matchRecommendationService.js';

let connected = false;
let fixture;

function assertApiErrorStatus(statusCode) {
  return (error) => error.statusCode === statusCode;
}

async function createUser(key, role, isActive = true) {
  return User.create({
    firstName: 'Cohort',
    lastName: `Test ${key}`,
    email: `${key}.${Date.now()}.${crypto.randomBytes(3).toString('hex')}@example.test`,
    password: 'LocalTestPassword123!',
    role,
    isActive,
  });
}

async function createCohort(admin, status = 'ENROLLING') {
  return Cohort.create({
    name: `Matching test ${crypto.randomBytes(3).toString('hex')}`,
    code: `matching-${crypto.randomBytes(8).toString('hex')}`,
    status,
    startsAt: new Date(Date.now() - 60_000),
    endsAt: new Date(Date.now() + 86_400_000),
    createdBy: admin._id,
    updatedBy: admin._id,
  });
}

async function addMembership(cohort, user, participantRole, admin, status = 'ENROLLED') {
  return CohortMembership.create({
    cohort: cohort._id,
    user: user._id,
    participantRole,
    status,
    assignedBy: admin._id,
  });
}

async function createScenario({
  status = 'ENROLLING',
  mentees = [fixture.mentee],
  mentors = [fixture.mentor],
  membershipStatus = 'ENROLLED',
} = {}) {
  const cohort = await createCohort(fixture.admin, status);
  const memberships = [];
  for (const mentee of mentees) {
    memberships.push(await addMembership(cohort, mentee, 'MENTEE', fixture.admin, membershipStatus));
  }
  for (const mentor of mentors) {
    memberships.push(await addMembership(cohort, mentor.user, 'MENTOR', fixture.admin, mentor.membershipStatus || membershipStatus));
  }
  return { cohort, memberships };
}

async function run(cohort) {
  return generateRecommendationsForCohort(cohort._id, fixture.admin._id);
}

before(async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI must be configured for cohort matching tests.');
  const uri = new URL(process.env.MONGO_URI);
  const host = uri.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error('Cohort matching tests are restricted to a loopback MongoDB host.');
  }
  const originalDatabase = decodeURIComponent(uri.pathname.split('/').filter(Boolean)[0] || '');
  if (uri.username && !uri.searchParams.has('authSource')) {
    uri.searchParams.set('authSource', originalDatabase || 'admin');
  }
  uri.pathname = `/tma_cohort_matching_test_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  await mongoose.connect(uri.toString(), { serverSelectionTimeoutMS: 10000 });
  connected = true;
  await Promise.all([
    AcademySettings.init(),
    AuditLog.init(),
    Cohort.init(),
    CohortMembership.init(),
    MatchRecommendation.init(),
    MenteeProfile.init(),
    MentorProfile.init(),
    MentorshipRelationship.init(),
    User.init(),
  ]);

  const admin = await createUser('admin', USER_ROLES.ADMIN);
  const mentee = await createUser('mentee', USER_ROLES.MENTEE);
  const otherMentee = await createUser('other-mentee', USER_ROLES.MENTEE);
  const inactiveMentee = await createUser('inactive-mentee', USER_ROLES.MENTEE, false);
  const mentorUser = await createUser('mentor', USER_ROLES.MENTOR);
  const otherMentorUser = await createUser('other-mentor', USER_ROLES.MENTOR);
  const unapprovedMentorUser = await createUser('unapproved-mentor', USER_ROLES.MENTOR);
  const inactiveMentorUser = await createUser('inactive-mentor', USER_ROLES.MENTOR, false);
  const [
    mentor,
    otherMentor,
  ] = await Promise.all([
    MentorProfile.create({
      user: mentorUser._id,
      status: 'APPROVED',
      jobTitle: 'Product Director',
      company: 'Northstar',
      industry: 'Technology',
      location: 'Johannesburg',
      yearsOfExperience: 12,
      expertise: ['Product strategy'],
      skills: ['Product strategy', 'Leadership'],
      specialisations: ['Product'],
      experienceAreas: ['Leadership'],
      mentorshipAreas: ['Leadership', 'Product'],
      availability: {
        days: ['MONDAY'],
        timeZone: 'Africa/Johannesburg',
        timeSlots: [{ start: '09:00', end: '12:00' }],
      },
    }),
    MentorProfile.create({
      user: otherMentorUser._id,
      status: 'APPROVED',
      jobTitle: 'Analytics Lead',
      company: 'Northstar',
      industry: 'Technology',
      location: 'Cape Town',
      yearsOfExperience: 9,
      expertise: ['Data analysis'],
      skills: ['Data analysis', 'Leadership'],
      specialisations: ['Analytics'],
      experienceAreas: ['Leadership'],
      mentorshipAreas: ['Leadership'],
      availability: {
        days: ['MONDAY'],
        timeZone: 'Africa/Johannesburg',
        timeSlots: [{ start: '11:00', end: '14:00' }],
      },
    }),
  ]);
  await Promise.all([
    MentorProfile.create({ user: unapprovedMentorUser._id, status: 'PENDING', skills: ['Product strategy'] }),
    MentorProfile.create({ user: inactiveMentorUser._id, status: 'APPROVED', skills: ['Product strategy'] }),
    MenteeProfile.create({
      user: mentee._id,
      location: 'Johannesburg',
      careerStage: 'MID_CAREER',
      skills: ['Product strategy'],
      preferredMentorExpertise: ['Product strategy'],
      careerGoals: ['Leadership'],
      mentorshipGoals: ['Product'],
      interests: ['Product strategy'],
      industries: ['Technology'],
      preferredIndustry: ['Technology'],
      availability: {
        days: ['MONDAY'],
        timeZone: 'Africa/Johannesburg',
        timeSlots: [{ start: '09:00', end: '12:00' }],
      },
    }),
    MenteeProfile.create({
      user: otherMentee._id,
      location: 'Johannesburg',
      careerStage: 'EARLY_CAREER',
      skills: ['Product strategy'],
      careerGoals: ['Leadership'],
      mentorshipGoals: ['Product'],
      interests: ['Product strategy'],
      industries: ['Technology'],
      availability: { days: ['MONDAY'], timeZone: 'Africa/Johannesburg' },
    }),
    MenteeProfile.create({ user: inactiveMentee._id, skills: ['Product strategy'] }),
    AcademySettings.create({
      key: 'academy',
      cohortManagementEnabled: true,
      aiMatchmakingEnabled: true,
      minimumMatchScore: 0,
      maxMenteesPerMentor: 10,
    }),
  ]);
  fixture = {
    admin,
    mentee,
    otherMentee,
    inactiveMentee,
    mentor: { user: mentorUser, profile: mentor },
    otherMentor: { user: otherMentorUser, profile: otherMentor },
    unapprovedMentor: { user: unapprovedMentorUser },
    inactiveMentor: { user: inactiveMentorUser },
  };
});

after(async () => {
  if (!connected) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('rejects invalid cohort IDs and cohorts outside ENROLLING/ACTIVE', async () => {
  await assert.rejects(
    generateRecommendationsForCohort('not-an-object-id', fixture.admin._id),
    assertApiErrorStatus(400),
  );
  await assert.rejects(
    generateRecommendationsForCohort(new mongoose.Types.ObjectId(), fixture.admin._id),
    assertApiErrorStatus(404),
  );
  for (const status of ['DRAFT', 'COMPLETED', 'CANCELLED']) {
    const { cohort } = await createScenario({ status });
    await assert.rejects(run(cohort), assertApiErrorStatus(409));
  }
});

test('returns a run summary when the cohort has no eligible mentees', async () => {
  const { cohort } = await createScenario({ mentees: [], mentors: [fixture.mentor] });
  const summary = await run(cohort);
  assert.equal(summary.eligibleMentees, 0);
  assert.equal(summary.recommendationsCreated, 0);
});

test('returns a run summary when the cohort has no eligible mentors', async () => {
  const { cohort } = await createScenario({ mentees: [fixture.mentee], mentors: [] });
  const summary = await run(cohort);
  assert.equal(summary.eligibleMentors, 0);
  assert.equal(summary.recommendationsCreated, 0);
});

test('excludes unapproved, removed, and inactive mentors', async () => {
  const { cohort } = await createScenario({
    mentees: [fixture.mentee],
    mentors: [
      fixture.unapprovedMentor,
      { ...fixture.mentor, membershipStatus: 'REMOVED' },
      fixture.inactiveMentor,
    ],
  });
  const summary = await run(cohort);
  assert.equal(summary.eligibleMentors, 0);
  assert.equal(summary.recommendationsCreated, 0);
  assert.equal(summary.skippedMentors, 3);
});

test('excludes removed memberships and inactive mentee accounts', async () => {
  const { cohort } = await createScenario({
    mentees: [fixture.inactiveMentee],
    mentors: [{ ...fixture.mentor, membershipStatus: 'REMOVED' }],
  });
  const summary = await run(cohort);
  assert.equal(summary.eligibleMentees, 0);
  assert.equal(summary.eligibleMentors, 0);
  assert.equal(summary.recommendationsCreated, 0);
});

test('uses mentor capacity and existing availability data', async () => {
  await AcademySettings.updateOne({ key: 'academy' }, { $set: { maxMenteesPerMentor: 1 } });
  const { cohort, memberships } = await createScenario({
    mentees: [fixture.mentee],
    mentors: [fixture.mentor, fixture.otherMentor],
  });
  const menteeMembership = memberships.find(({ participantRole }) => participantRole === 'MENTEE');
  await MentorshipRelationship.create({
    mentee: fixture.otherMentee._id,
    mentor: fixture.mentor.user._id,
    requestedBy: fixture.otherMentee._id,
    status: 'ACTIVE',
  });
  const summary = await run(cohort);
  const recommendation = await MatchRecommendation.findOne({ cohort: cohort._id }).lean();
  assert.equal(summary.recommendationsCreated, 1);
  assert.equal(String(recommendation.menteeMembership), String(menteeMembership._id));
  assert.equal(String(recommendation.mentorMembership), String(
    memberships.find(({ participantRole, user }) => participantRole === 'MENTOR' && String(user) === String(fixture.otherMentor.user._id))._id,
  ));
  assert.equal(recommendation.scoreBreakdown.availability, 100);
  assert.equal(recommendation.scoreBreakdown.availabilitySlots, 100);
});

test('reserves capacity for approved recommendations in ongoing cohorts', async () => {
  await AcademySettings.updateOne({ key: 'academy' }, { $set: { maxMenteesPerMentor: 1 } });
  const reservedScenario = await createScenario({
    mentees: [fixture.otherMentee],
    mentors: [fixture.otherMentor],
    status: 'ACTIVE',
  });
  const reservedMenteeMembership = reservedScenario.memberships.find(
    ({ participantRole }) => participantRole === 'MENTEE',
  );
  const reservedMentorMembership = reservedScenario.memberships.find(
    ({ participantRole }) => participantRole === 'MENTOR',
  );
  const reserved = await createRecommendation({
    cohort: reservedScenario.cohort._id,
    menteeMembership: reservedMenteeMembership._id,
    mentorMembership: reservedMentorMembership._id,
    matchingRun: crypto.randomUUID(),
    compatibilityScore: 90,
    reasons: ['Approved capacity reservation test.'],
  });
  await approveRecommendation(fixture.admin._id, reservedScenario.cohort._id, reserved.id);

  const currentScenario = await createScenario({
    mentees: [fixture.mentee],
    mentors: [fixture.otherMentor],
  });
  const summary = await run(currentScenario.cohort);
  assert.equal(summary.eligibleMentors, 1);
  assert.equal(summary.skippedMentors, 1);
  assert.equal(summary.recommendationsCreated, 0);
});

test('creates persisted recommendations sharing a unique matchingRun and audits the generation', async () => {
  await AcademySettings.updateOne({ key: 'academy' }, { $set: { maxMenteesPerMentor: 10 } });
  const { cohort } = await createScenario({
    mentees: [fixture.mentee, fixture.otherMentee],
    mentors: [fixture.mentor, fixture.otherMentor],
    status: 'ACTIVE',
  });
  const firstRun = await run(cohort);
  const persisted = await MatchRecommendation.find({ cohort: cohort._id }).lean();
  assert.equal(firstRun.recommendationsCreated, 2);
  assert.ok(persisted.every(({ matchingRun }) => matchingRun === firstRun.matchingRun));
  assert.ok(persisted.every(({ reasons }) => reasons.length > 0));
  assert.ok(persisted.every(({ reasons }) => !reasons.includes('General compatibility based on available profile information.')));
  assert.ok(firstRun.matchingRun);
  const audit = await AuditLog.findOne({ entityId: cohort._id, action: 'COHORT_MATCHING_GENERATED' }).lean();
  assert.equal(audit.metadata.matchingRun, firstRun.matchingRun);
  assert.equal(audit.metadata.recommendationsCreated, 2);

  const secondRun = await run(cohort);
  assert.notEqual(secondRun.matchingRun, firstRun.matchingRun);
});

test('preserves approved pairings and generates a later run only for unresolved mentees', async () => {
  const { cohort } = await createScenario({
    mentees: [fixture.mentee, fixture.otherMentee],
    mentors: [fixture.mentor, fixture.otherMentor],
  });
  await run(cohort);
  const firstRunRecommendations = await MatchRecommendation.find({ cohort: cohort._id }).sort({ createdAt: 1 }).lean();
  const fixedRecommendation = firstRunRecommendations[0];
  await approveRecommendation(fixture.admin._id, cohort._id, fixedRecommendation._id);

  const secondSummary = await run(cohort);
  const secondRunRecommendations = await MatchRecommendation.find({
    cohort: cohort._id,
    matchingRun: secondSummary.matchingRun,
  }).lean();
  assert.equal(secondSummary.recommendationsCreated, 1);
  assert.equal(
    String(secondRunRecommendations[0].menteeMembership),
    String(firstRunRecommendations[1].menteeMembership),
  );
  const stillApproved = await MatchRecommendation.findById(fixedRecommendation._id).lean();
  assert.equal(stillApproved.reviewStatus, 'APPROVED');
  assert.equal(String(stillApproved.mentorMembership), String(fixedRecommendation.mentorMembership));
});

test('allows a later run to create a pending recommendation after rejection', async () => {
  const { cohort } = await createScenario();
  const firstRun = await run(cohort);
  const rejected = await MatchRecommendation.findOne({
    cohort: cohort._id,
    matchingRun: firstRun.matchingRun,
  }).lean();
  await rejectRecommendation(fixture.admin._id, cohort._id, rejected._id, {
    reason: 'Rejected for the next-run scenario.',
  });

  const secondRun = await run(cohort);
  const laterRecommendation = await MatchRecommendation.findOne({
    cohort: cohort._id,
    matchingRun: secondRun.matchingRun,
  }).lean();
  assert.ok(laterRecommendation);
  assert.equal(laterRecommendation.reviewStatus, 'PENDING');
  assert.equal(String(laterRecommendation.menteeMembership), String(rejected.menteeMembership));
});

test('repeated generation creates separate historical runs without corrupting recommendations', async () => {
  const { cohort } = await createScenario();
  const first = await run(cohort);
  const second = await run(cohort);
  assert.notEqual(first.matchingRun, second.matchingRun);
  assert.equal(
    await MatchRecommendation.countDocuments({ cohort: cohort._id }),
    first.recommendationsCreated + second.recommendationsCreated,
  );
  assert.equal(
    await MatchRecommendation.countDocuments({ cohort: cohort._id, reviewStatus: 'APPROVED' }),
    0,
  );
});

test('generation does not create mentorship relationships', async () => {
  const { cohort } = await createScenario();
  await run(cohort);
  assert.equal(await MentorshipRelationship.countDocuments({ cohort: cohort._id }), 0);
});
