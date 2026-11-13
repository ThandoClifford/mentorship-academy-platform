import '../config/env.js';
import mongoose from 'mongoose';
import { connectDatabase, isDatabaseConfigured } from '../config/database.js';
import User, { USER_ROLES } from '../models/User.js';
import * as mentorApplicationService from '../services/mentorApplicationService.js';

const accounts = [
  { key: 'ADMIN', role: USER_ROLES.ADMIN, firstName: 'Development', lastName: 'Test Admin' },
  { key: 'MENTOR', role: USER_ROLES.MENTEE, firstName: 'Development', lastName: 'Test Mentor Applicant' },
  { key: 'MENTEE', role: USER_ROLES.MENTEE, firstName: 'Development', lastName: 'Test Mentee' },
];

const mentorApplication = {
  professionalBackground: 'Development-only integration test mentor applicant.',
  jobTitle: 'Software Engineering Mentor',
  company: 'Local Test Academy',
  industry: 'Technology',
  yearsOfExperience: 8,
  expertise: ['Software engineering'],
  skills: ['JavaScript'],
  specialisations: [],
  experienceAreas: ['Software development'],
  mentorshipAreas: ['Career development'],
  mentorshipStyle: 'STRUCTURED',
  languages: ['English'],
  motivation: 'Development-only account for verifying the mentor application workflow.',
};

function readAccountConfiguration() {
  return accounts.map((account) => {
    const email = process.env[`TEST_${account.key}_EMAIL`]?.trim().toLowerCase();
    const password = process.env[`TEST_${account.key}_PASSWORD`];

    if (!email || !password) {
      throw new Error(`TEST_${account.key}_EMAIL and TEST_${account.key}_PASSWORD are required.`);
    }

    const emailParts = email.split('@');
    if (emailParts.length !== 2 || !emailParts[0] || !emailParts[1].endsWith('.test')) {
      throw new Error(`TEST_${account.key}_EMAIL must use the reserved .test domain.`);
    }

    const passwordBytes = Buffer.byteLength(password, 'utf8');
    if (passwordBytes < 8 || passwordBytes > 72) {
      throw new Error(`TEST_${account.key}_PASSWORD must be 8–72 UTF-8 bytes.`);
    }

    return { ...account, email, password };
  });
}

function assertSafeEnvironment() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Test account provisioning requires NODE_ENV=development.');
  }
  if (process.env.SEED_TEST_ACCOUNTS !== 'true') {
    throw new Error('Set SEED_TEST_ACCOUNTS=true to explicitly enable provisioning.');
  }
  if (!isDatabaseConfigured()) {
    throw new Error('MONGO_URI must be configured for test account provisioning.');
  }

  let mongoUrl;
  try {
    mongoUrl = new URL(process.env.MONGO_URI);
  } catch {
    throw new Error('MONGO_URI must be a valid local MongoDB URI.');
  }

  const hostname = mongoUrl.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!['localhost', '127.0.0.1', '::1'].includes(hostname)) {
    throw new Error('Test account provisioning is restricted to a loopback MongoDB host.');
  }
}

async function ensureAccount({ email, password, role, firstName, lastName }) {
  const existingUser = await User.findOne({ email }).select('+password');
  if (existingUser) {
    if (existingUser.role !== role) {
      throw new Error(`Existing test account ${email} has an unexpected role; no changes were made.`);
    }
    if (!existingUser.isActive) {
      throw new Error(`Existing test account ${email} is inactive; no changes were made.`);
    }
    if (!(await existingUser.comparePassword(password))) {
      throw new Error(`Configured password does not match existing test account ${email}; no changes were made.`);
    }
    return { user: existingUser, created: false };
  }

  const user = await User.create({ email, password, role, firstName, lastName });
  if (user.password === password || !(await user.comparePassword(password))) {
    throw new Error(`Password hashing verification failed for ${email}.`);
  }
  return { user, created: true };
}

async function ensurePendingMentorApplication(mentorUserId) {
  const existingApplication = await mentorApplicationService.getOwnApplication(mentorUserId);
  if (existingApplication?.status === 'PENDING') {
    return { application: existingApplication, created: false };
  }
  if (existingApplication?.status === 'APPROVED') {
    throw new Error('The configured mentor applicant already has an approved application; no changes were made.');
  }

  const application = await mentorApplicationService.submitApplication(
    mentorUserId,
    mentorApplication,
  );
  return { application, created: true };
}

async function main() {
  assertSafeEnvironment();
  const configuredAccounts = readAccountConfiguration();
  const emails = configuredAccounts.map(({ email }) => email);
  if (new Set(emails).size !== emails.length) {
    throw new Error('Each test account must use a different email address.');
  }

  await connectDatabase();

  const results = [];
  for (const account of configuredAccounts) {
    const { user, created } = await ensureAccount(account);
    results.push({ key: account.key, email: account.email, user, created });
  }

  const mentor = results.find(({ key }) => key === 'MENTOR');
  const applicationResult = await ensurePendingMentorApplication(mentor.user._id);

  console.info('Development test accounts are ready:');
  for (const { key, email, created } of results) {
    console.info(`- ${key}: ${email} (${created ? 'created' : 'already exists'})`);
  }
  console.info(
    `- MENTOR application: ${applicationResult.application.status} ` +
      `(${applicationResult.created ? 'created' : 'already exists'})`,
  );
  console.info('No mentor approval, mentorship relationship, message, or goal was created.');
}

main()
  .catch((error) => {
    console.error(`Test account provisioning failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
