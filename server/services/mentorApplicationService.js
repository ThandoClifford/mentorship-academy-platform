import mongoose from 'mongoose';
import MentorApplication from '../models/MentorApplication.js';
import User, { USER_ROLES } from '../models/User.js';
import MentorProfile from '../models/MentorProfile.js';
import AuditLog from '../models/AuditLog.js';
import ApiError from '../utils/ApiError.js';
import { logAdminAction } from './auditService.js';
import { createNotification } from './notificationService.js';

const MENTORSHIP_STATUSES = ['PENDING', 'ACCEPTED', 'ACTIVE', 'COMPLETED', 'ARCHIVED', 'DECLINED'];

function toSafeApplication(app) {
  if (!app) return null;
  return {
    id: app._id,
    user: app.user,
    status: app.status,
    professionalBackground: app.professionalBackground,
    jobTitle: app.jobTitle,
    company: app.company,
    industry: app.industry,
    yearsOfExperience: app.yearsOfExperience,
    expertise: app.expertise || [],
    skills: app.skills || [],
    specialisations: app.specialisations || [],
    experienceAreas: app.experienceAreas || [],
    mentorshipAreas: app.mentorshipAreas || [],
    mentorshipStyle: app.mentorshipStyle || '',
    languages: app.languages || [],
    availability: app.availability || {},
    motivation: app.motivation,
    adminNotes: app.adminNotes,
    reviewedBy: app.reviewedBy,
    reviewedAt: app.reviewedAt,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  };
}

function toSafeApplicationWithUser(app, user) {
  const base = toSafeApplication(app);
  if (user) {
    base.user = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };
  }
  return base;
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildUserSearchFilter(search) {
  if (!search || !String(search).trim()) return null;
  const term = String(search).trim();
  const regex = new RegExp(escapeRegex(term), 'i');
  const parts = term.split(/\s+/).filter(Boolean);
  const or = [{ firstName: regex }, { lastName: regex }, { email: regex }];
  if (parts.length >= 2) {
    const first = new RegExp(escapeRegex(parts[0]), 'i');
    const last = new RegExp(escapeRegex(parts.slice(1).join(' ')), 'i');
    or.push({ firstName: first, lastName: last });
  }
  return { $or: or };
}

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function requireValidObjectId(id, label = 'ID') {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, `Invalid ${label}.`);
  }
}

const requiredStringFields = [
  'professionalBackground',
  'jobTitle',
  'company',
  'industry',
  'motivation',
];

const arrayFields = [
  'expertise',
  'skills',
  'specialisations',
  'experienceAreas',
  'mentorshipAreas',
  'languages',
];

function validateApplicationInput(data) {
  if (!data || typeof data !== 'object') {
    throw new ApiError(400, 'Application data is required.');
  }

  for (const field of requiredStringFields) {
    if (typeof data[field] !== 'string' || !data[field].trim()) {
      throw new ApiError(400, `${field} is required.`, {
        [field]: `${field} is required.`,
      });
    }
  }

  for (const field of arrayFields) {
    if (
      field in data &&
      (!Array.isArray(data[field]) ||
        data[field].some((value) => typeof value !== 'string' || !value.trim()))
    ) {
      throw new ApiError(400, `${field} must be an array of non-empty strings.`, {
        [field]: `Provide an array of non-empty text values for ${field}.`,
      });
    }
  }

  if ('yearsOfExperience' in data && data.yearsOfExperience !== null && data.yearsOfExperience !== undefined) {
    const years = Number(data.yearsOfExperience);
    if (!Number.isFinite(years) || years < 0 || years > 80) {
      throw new ApiError(400, 'yearsOfExperience must be between 0 and 80.', {
        yearsOfExperience: 'Provide a valid number of years (0-80).',
      });
    }
  }

  if ('mentorshipStyle' in data && data.mentorshipStyle !== undefined && data.mentorshipStyle !== null) {
    const validStyles = ['', ...['STRUCTURED', 'FLEXIBLE', 'GOAL_ORIENTED', 'CONVERSATIONAL', 'MIXED']];
    if (!validStyles.includes(data.mentorshipStyle)) {
      throw new ApiError(400, 'Invalid mentorship style.');
    }
  }

  if ('availability' in data && data.availability !== undefined && data.availability !== null) {
    const availability = data.availability;
    if (typeof availability !== 'object' || Array.isArray(availability)) {
      throw new ApiError(400, 'availability must be an object.');
    }
    const allowedKeys = new Set(['days', 'timeZone', 'timeSlots']);
    const unexpectedKeys = Object.keys(availability).filter((key) => !allowedKeys.has(key));
    if (unexpectedKeys.length) {
      throw new ApiError(400, 'availability contains unsupported fields.', {
        availability: `Unsupported fields: ${unexpectedKeys.join(', ')}.`,
      });
    }
    if ('days' in availability && !Array.isArray(availability.days)) {
      throw new ApiError(400, 'availability.days must be an array.');
    }
    if ('timeZone' in availability && typeof availability.timeZone !== 'string') {
      throw new ApiError(400, 'availability.timeZone must be a string.');
    }
    if ('timeSlots' in availability && !Array.isArray(availability.timeSlots)) {
      throw new ApiError(400, 'availability.timeSlots must be an array.');
    }
  }
}

export async function submitApplication(userId, data) {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, 'Invalid user.');
  }

  const user = await User.findById(userId);
  if (!user || !user.isActive) {
    throw new ApiError(404, 'User not found.');
  }

  validateApplicationInput(data);

  const existing = await MentorApplication.findOne({
    user: userId,
    status: 'PENDING',
  });
  if (existing) {
    throw new ApiError(409, 'You already have a pending mentor application.', {
      status: 'A pending application already exists for your account.',
    });
  }

  const existingApproved = await MentorApplication.findOne({
    user: userId,
    status: 'APPROVED',
  });
  if (existingApproved) {
    throw new ApiError(409, 'You already have an approved mentor application.', {
      status: 'An approved application already exists for your account.',
    });
  }

  if (user.role === USER_ROLES.MENTOR) {
    throw new ApiError(409, 'You are already registered as a mentor.', {
      role: 'Your account is already a mentor.',
    });
  }

  const application = await MentorApplication.create({
    user: userId,
    status: 'PENDING',
    professionalBackground: data.professionalBackground.trim(),
    jobTitle: data.jobTitle.trim(),
    company: data.company.trim(),
    industry: data.industry.trim(),
    yearsOfExperience:
      data.yearsOfExperience === null || data.yearsOfExperience === undefined
        ? null
        : Number(data.yearsOfExperience),
    expertise: Array.isArray(data.expertise) ? data.expertise : [],
    skills: Array.isArray(data.skills) ? data.skills : [],
    specialisations: Array.isArray(data.specialisations) ? data.specialisations : [],
    experienceAreas: Array.isArray(data.experienceAreas) ? data.experienceAreas : [],
    mentorshipAreas: Array.isArray(data.mentorshipAreas) ? data.mentorshipAreas : [],
    mentorshipStyle: data.mentorshipStyle || '',
    languages: Array.isArray(data.languages) ? data.languages : [],
    availability: data.availability || {},
    motivation: data.motivation.trim(),
  });

  await logAdminAction({
    actor: userId,
    action: 'MENTOR_APPLICATION_SUBMITTED',
    entityType: 'MENTOR_APPLICATION',
    entityId: application._id,
    metadata: { userId: String(userId), jobTitle: data.jobTitle },
  });

  try {
    await createNotification({
      recipient: userId,
      type: 'MENTOR_APPLICATION_SUBMITTED',
      title: 'Mentor application submitted',
      message: 'Your mentor application has been received and is under review.',
      relatedEntityType: 'MENTOR_APPLICATION',
      relatedEntityId: application._id,
    });
  } catch {
    // notification must not break submission
  }

  return toSafeApplication(application);
}

export async function getOwnApplication(userId) {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, 'Invalid user.');
  }

  const application = await MentorApplication.findOne({ user: userId })
    .sort({ createdAt: -1 })
    .lean();

  return toSafeApplication(application);
}

export async function listApplications(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (query.status && ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].includes(query.status)) {
    filter.status = query.status;
  }

  const search = buildUserSearchFilter(query.search);
  let userIds = null;
  if (search) {
    const matchingUsers = await User.find(search).select('_id').lean();
    userIds = matchingUsers.map((u) => u._id);
    filter.user = { $in: userIds };
  }

  const [applications, total] = await Promise.all([
    MentorApplication.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    MentorApplication.countDocuments(filter),
  ]);

  let userMap = new Map();
  if (applications.length) {
    const appUserIds = [...new Set(applications.map((a) => String(a.user)))];
    const users = await User.find({ _id: { $in: appUserIds } })
      .select('_id firstName lastName email role isActive')
      .lean();
    userMap = new Map(users.map((u) => [String(u._id), u]));
  }

  const items = applications.map((app) => toSafeApplicationWithUser(app, userMap.get(String(app.user))));

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

export async function getApplication(id) {
  requireValidObjectId(id, 'application ID');
  const application = await MentorApplication.findById(id).lean();
  if (!application) throw new ApiError(404, 'Mentor application not found.');
  const user = await User.findById(application.user)
    .select('_id firstName lastName email role isActive')
    .lean();
  return toSafeApplicationWithUser(application, user);
}

async function updateApplicationStatus(
  actorId,
  id,
  newStatus,
  action,
  notificationType,
  notificationTitle,
  notificationMessage,
  adminNotes,
) {
  requireValidObjectId(id, 'application ID');
  const application = await MentorApplication.findById(id);
  if (!application) throw new ApiError(404, 'Mentor application not found.');
  if (application.status !== 'PENDING') {
    throw new ApiError(400, `Only pending applications can be ${newStatus.toLowerCase()}.`);
  }

  application.status = newStatus;
  application.reviewedBy = actorId;
  application.reviewedAt = new Date();
  if (typeof adminNotes === 'string') {
    application.adminNotes = adminNotes.trim();
  }
  await application.save();

  await logAdminAction({
    actor: actorId,
    action,
    entityType: 'MENTOR_APPLICATION',
    entityId: application._id,
    metadata: {
      status: newStatus,
      applicantUserId: String(application.user),
      adminNotes: application.adminNotes || '',
    },
  });

  try {
    await createNotification({
      recipient: application.user,
      type: notificationType,
      title: notificationTitle,
      message: notificationMessage,
      relatedEntityType: 'MENTOR_APPLICATION',
      relatedEntityId: application._id,
    });
  } catch {
    // notification must not break the review action
  }

  return toSafeApplication(application);
}

export async function approveApplication(actorId, id, adminNotes) {
  const application = await updateApplicationStatus(
    actorId,
    id,
    'APPROVED',
    'MENTOR_APPLICATION_APPROVED',
    'MENTOR_APPLICATION_APPROVED',
    'Mentor application approved',
    'Your mentor application has been approved. You are now visible to mentees.',
    adminNotes,
  );

  const user = await User.findById(application.user);
  if (!user) throw new ApiError(404, 'User not found.');

  if (user.role !== USER_ROLES.MENTOR) {
    user.role = USER_ROLES.MENTOR;
    await user.save();

    await logAdminAction({
      actor: actorId,
      action: 'ROLE_CHANGED',
      entityType: 'USER',
      entityId: user._id,
      metadata: { previousRole: user.role === USER_ROLES.MENTOR ? 'MENTEE' : user.role, newRole: 'MENTOR' },
    });
  }

  const profileData = {
    bio: application.professionalBackground,
    jobTitle: application.jobTitle,
    company: application.company,
    industry: application.industry,
    yearsOfExperience: application.yearsOfExperience,
    professionalBackground: application.professionalBackground,
    expertise: application.expertise || [],
    skills: application.skills || [],
    specialisations: application.specialisations || [],
    experienceAreas: application.experienceAreas || [],
    mentorshipAreas: application.mentorshipAreas || [],
    mentorshipStyle: application.mentorshipStyle || '',
    languages: application.languages || [],
    availability: application.availability || {},
  };

  await MentorProfile.findOneAndUpdate(
    { user: application.user },
    {
      $set: { ...profileData, status: 'APPROVED' },
      $setOnInsert: { user: application.user },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  return getApplication(application._id);
}

export async function rejectApplication(actorId, id, adminNotes) {
  return updateApplicationStatus(
    actorId,
    id,
    'REJECTED',
    'MENTOR_APPLICATION_REJECTED',
    'MENTOR_APPLICATION_REJECTED',
    'Mentor application rejected',
    'Your mentor application has been reviewed and was not approved at this time.',
    adminNotes,
  );
}

export async function suspendApplication(actorId, id) {
  const application = await updateApplicationStatus(
    actorId,
    id,
    'SUSPENDED',
    'MENTOR_APPLICATION_SUSPENDED',
    'MENTOR_APPLICATION_SUSPENDED',
    'Mentor account suspended',
    'Your mentor profile has been suspended. Contact the academy for more information.',
    '',
  );

  await MentorProfile.findOneAndUpdate(
    { user: application.user },
    { $set: { status: 'SUSPENDED' } },
  );

  return getApplication(application._id);
}
