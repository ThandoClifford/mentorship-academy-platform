import mongoose from 'mongoose';
import User, { USER_ROLES } from '../models/User.js';
import MenteeProfile from '../models/MenteeProfile.js';
import MentorProfile, { MENTOR_PROFILE_STATUSES } from '../models/MentorProfile.js';
import MentorApplication from '../models/MentorApplication.js';
import MentorshipRelationship from '../models/MentorshipRelationship.js';
import Goal from '../models/Goal.js';
import AuditLog from '../models/AuditLog.js';
import ApiError from '../utils/ApiError.js';
import { logAdminAction } from './auditService.js';
import { createNotification } from './notificationService.js';
import { getMatchesForMentee } from './matchingService.js';

const MENTORSHIP_STATUSES = ['PENDING', 'ACCEPTED', 'ACTIVE', 'COMPLETED', 'ARCHIVED', 'DECLINED'];

function toSafeUser(u) {
  if (!u) return null;
  return {
    id: u._id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function isFieldComplete(profile, field) {
  const value = profile?.[field];
  if (field === 'availability') {
    return Boolean(
      value?.days?.length &&
        value.timeZone?.trim?.() &&
        value.timeSlots?.some?.((slot) => slot.start && slot.end),
    );
  }
  if (Array.isArray(value)) return value.some((item) => typeof item === 'string' && item.trim());
  if (typeof value === 'string') return Boolean(value.trim());
  if (typeof value === 'number') return Number.isFinite(value);
  return false;
}

function calcCompletion(profile, fields) {
  if (!profile) return 0;
  const missing = fields.filter((f) => !isFieldComplete(profile, f));
  if (!fields.length) return 0;
  return Math.round(((fields.length - missing.length) / fields.length) * 100);
}

const menteeCompletionFields = [
  'bio','location','institution','qualification','fieldOfStudy','careerStage',
  'careerGoals','mentorshipGoals','interests','preferredMentorExpertise',
  'preferredIndustry','preferredMentorshipStyle','skills','industries','experienceAreas','availability',
];

export async function getAdminDashboard() {
  const [
    totalUsers,
    totalMentees,
    totalMentors,
    pendingMentorApplications,
    approvedMentors,
    rejectedMentors,
    suspendedMentors,
    pendingMentorshipRequests,
    acceptedMentorships,
    activeMentorships,
    completedMentorships,
    archivedMentorships,
    declinedMentorships,
    totalGoals,
    completedGoals,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: USER_ROLES.MENTEE }),
    User.countDocuments({ role: USER_ROLES.MENTOR }),
    MentorProfile.countDocuments({ status: 'PENDING' }),
    MentorProfile.countDocuments({ status: 'APPROVED' }),
    MentorProfile.countDocuments({ status: 'REJECTED' }),
    MentorProfile.countDocuments({ status: 'SUSPENDED' }),
    MentorshipRelationship.countDocuments({ status: 'PENDING' }),
    MentorshipRelationship.countDocuments({ status: 'ACCEPTED' }),
    MentorshipRelationship.countDocuments({ status: 'ACTIVE' }),
    MentorshipRelationship.countDocuments({ status: 'COMPLETED' }),
    MentorshipRelationship.countDocuments({ status: 'ARCHIVED' }),
    MentorshipRelationship.countDocuments({ status: 'DECLINED' }),
    Goal.countDocuments({}),
    Goal.countDocuments({ status: 'COMPLETED' }),
  ]);

  return {
    totalUsers,
    totalMentees,
    totalMentors,
    pendingMentorApplications,
    approvedMentors,
    rejectedMentors,
    suspendedMentors,
    pendingMentorshipRequests,
    acceptedMentorships,
    activeMentorships,
    completedMentorships,
    archivedMentorships,
    declinedMentorships,
    totalGoals,
    completedGoals,
  };
}

export async function listUsers(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  if (query.role && Object.values(USER_ROLES).includes(query.role)) {
    filter.role = query.role;
  }
  if (query.status === 'active') filter.isActive = true;
  if (query.status === 'inactive') filter.isActive = false;
  const search = buildUserSearchFilter(query.search);
  if (search) Object.assign(filter, search);

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    users: users.map(toSafeUser),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

export async function getUserById(id) {
  requireValidObjectId(id, 'user ID');
  const user = await User.findById(id).select('-password').lean();
  if (!user) throw new ApiError(404, 'User not found.');
  return toSafeUser(user);
}

export async function updateUserStatus(actorId, userId, isActive) {
  requireValidObjectId(userId, 'user ID');
  if (typeof isActive !== 'boolean') {
    throw new ApiError(400, 'Status must be a boolean value.', { isActive: 'Provide true or false.' });
  }
  if (String(actorId) === String(userId)) {
    throw new ApiError(400, 'You cannot change your own account status.');
  }
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found.');

  user.isActive = isActive;
  await user.save();

  await logAdminAction({
    actor: actorId,
    action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    entityType: 'USER',
    entityId: user._id,
    metadata: { targetRole: user.role, isActive },
  });

  return toSafeUser(user.toObject());
}

async function listMentorProfiles(query, { statusOverride } = {}) {
  const { page, limit, skip } = parsePagination(query);
  const profileFilter = {};
  const status = statusOverride || query.status;
  if (status && MENTOR_PROFILE_STATUSES.includes(status)) {
    profileFilter.status = status;
  }

  const search = buildUserSearchFilter(query.search);
  let userFilter = { role: USER_ROLES.MENTOR };
  if (search) userFilter = { ...userFilter, ...search };
  if (query.active === 'true') userFilter.isActive = true;
  if (query.active === 'false') userFilter.isActive = false;

  const matchingUsers = await User.find(userFilter).select('_id firstName lastName email isActive createdAt role').lean();
  const userIds = matchingUsers.map((u) => u._id);
  const userMap = new Map(matchingUsers.map((u) => [String(u._id), u]));

  profileFilter.user = { $in: userIds };

  const [profiles, total] = await Promise.all([
    MentorProfile.find(profileFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    MentorProfile.countDocuments(profileFilter),
  ]);

  const items = profiles.map((p) => {
    const u = userMap.get(String(p.user));
    return {
      id: String(p._id),
      user: u ? { id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email, isActive: u.isActive, createdAt: u.createdAt } : null,
      status: p.status,
      jobTitle: p.jobTitle,
      company: p.company,
      industry: p.industry,
      yearsOfExperience: p.yearsOfExperience,
      expertise: p.expertise || [],
      skills: p.skills || [],
      specialisations: p.specialisations || [],
      experienceAreas: p.experienceAreas || [],
      mentorshipAreas: p.mentorshipAreas || [],
      mentorshipStyle: p.mentorshipStyle || '',
      languages: p.languages || [],
      availability: p.availability || {},
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  });

  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

async function getMentorProfileDetail(id) {
  requireValidObjectId(id, 'mentor profile ID');
  const profile = await MentorProfile.findById(id).lean();
  if (!profile) throw new ApiError(404, 'Mentor profile not found.');
  const user = await User.findById(profile.user).select('-password').lean();
  return {
    id: String(profile._id),
    user: user ? { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, isActive: user.isActive, createdAt: user.createdAt } : null,
    status: profile.status,
    jobTitle: profile.jobTitle,
    company: profile.company,
    industry: profile.industry,
    yearsOfExperience: profile.yearsOfExperience,
    bio: profile.bio,
    professionalBackground: profile.professionalBackground,
    expertise: profile.expertise || [],
    skills: profile.skills || [],
    specialisations: profile.specialisations || [],
    experienceAreas: profile.experienceAreas || [],
    mentorshipAreas: profile.mentorshipAreas || [],
    mentorshipStyle: profile.mentorshipStyle || '',
    languages: profile.languages || [],
    availability: profile.availability || {},
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export async function listMentorApplications(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};

  if (query.status && MENTOR_PROFILE_STATUSES.includes(query.status)) {
    filter.status = query.status;
  }

  const search = buildUserSearchFilter(query.search);
  if (search) {
    const matchingUsers = await User.find(search).select('_id').lean();
    filter.user = { $in: matchingUsers.map((u) => u._id) };
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

  const items = applications.map((app) => {
    const u = userMap.get(String(app.user));
    return {
      id: String(app._id),
      user: u
        ? {
            id: u._id,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            role: u.role,
            isActive: u.isActive,
          }
        : null,
      status: app.status,
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
      motivation: app.motivation,
      adminNotes: app.adminNotes,
      reviewedBy: app.reviewedBy,
      reviewedAt: app.reviewedAt,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    };
  });

  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

export async function getMentorApplication(id) {
  requireValidObjectId(id, 'application ID');
  const application = await MentorApplication.findById(id).lean();
  if (!application) throw new ApiError(404, 'Mentor application not found.');
  const user = await User.findById(application.user)
    .select('_id firstName lastName email role isActive')
    .lean();
  return {
    id: String(application._id),
    user: user
      ? {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        }
      : null,
    status: application.status,
    professionalBackground: application.professionalBackground,
    jobTitle: application.jobTitle,
    company: application.company,
    industry: application.industry,
    yearsOfExperience: application.yearsOfExperience,
    expertise: application.expertise || [],
    skills: application.skills || [],
    specialisations: application.specialisations || [],
    experienceAreas: application.experienceAreas || [],
    mentorshipAreas: application.mentorshipAreas || [],
    mentorshipStyle: application.mentorshipStyle || '',
    languages: application.languages || [],
    availability: application.availability || {},
    motivation: application.motivation,
    adminNotes: application.adminNotes,
    reviewedBy: application.reviewedBy,
    reviewedAt: application.reviewedAt,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

async function updateApplicationReviewStatus(
  actorId,
  applicationId,
  newStatus,
  action,
  notification,
  adminNotes,
) {
  requireValidObjectId(applicationId, 'application ID');
  const application = await MentorApplication.findById(applicationId);
  if (!application) throw new ApiError(404, 'Mentor application not found.');
  if (application.status !== 'PENDING') {
    throw new ApiError(400, 'Only pending applications can be reviewed.');
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

  if (notification) {
    await createNotification({
      recipient: application.user,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      relatedEntityType: 'MENTOR_APPLICATION',
      relatedEntityId: application._id,
    });
  }

  return getMentorApplication(application._id);
}

export async function approveMentorApplication(actorId, applicationId, adminNotes) {
  const result = await updateApplicationReviewStatus(
    actorId,
    applicationId,
    'APPROVED',
    'MENTOR_APPLICATION_APPROVED',
    {
      type: 'MENTOR_APPLICATION_APPROVED',
      title: 'Mentor application approved',
      message: 'Your mentor application has been approved. You are now visible to mentees.',
    },
    adminNotes,
  );

  const user = await User.findById(result.user?.id);
  if (!user) throw new ApiError(404, 'User not found.');

  if (user.role !== USER_ROLES.MENTOR) {
    user.role = USER_ROLES.MENTOR;
    await user.save();

    await logAdminAction({
      actor: actorId,
      action: 'ROLE_CHANGED',
      entityType: 'USER',
      entityId: user._id,
      metadata: { newRole: USER_ROLES.MENTOR, applicationId: String(applicationId) },
    });
  }

  const application = await MentorApplication.findById(applicationId);
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

  return getMentorApplication(applicationId);
}

export async function rejectMentorApplication(actorId, applicationId, adminNotes) {
  return updateApplicationReviewStatus(
    actorId,
    applicationId,
    'REJECTED',
    'MENTOR_APPLICATION_REJECTED',
    {
      type: 'MENTOR_APPLICATION_REJECTED',
      title: 'Mentor application rejected',
      message: 'Your mentor application has been reviewed and was not approved at this time.',
    },
    adminNotes,
  );
}

export async function suspendMentorApplication(actorId, applicationId) {
  const result = await updateApplicationReviewStatus(
    actorId,
    applicationId,
    'SUSPENDED',
    'MENTOR_APPLICATION_SUSPENDED',
    {
      type: 'MENTOR_APPLICATION_SUSPENDED',
      title: 'Mentor account suspended',
      message: 'Your mentor profile has been suspended. Contact the academy for more information.',
    },
    '',
  );

  await MentorProfile.findOneAndUpdate(
    { user: result.user?.id },
    { $set: { status: 'SUSPENDED' } },
  );

  return result;
}

export async function listMentors(query) {
  return listMentorProfiles(query);
}

export async function getMentorById(id) {
  return getMentorProfileDetail(id);
}

export async function listMentees(query) {
  const { page, limit, skip } = parsePagination(query);
  const search = buildUserSearchFilter(query.search);
  let userFilter = { role: USER_ROLES.MENTEE };
  if (search) userFilter = { ...userFilter, ...search };
  if (query.status === 'active' || query.active === 'true') userFilter.isActive = true;
  if (query.status === 'inactive' || query.active === 'false') userFilter.isActive = false;

  const matchingUsers = await User.find(userFilter)
    .select('_id firstName lastName email isActive createdAt')
    .lean();
  const userIds = matchingUsers.map((u) => u._id);
  const userMap = new Map(matchingUsers.map((u) => [String(u._id), u]));

  const [profiles, total] = await Promise.all([
    MenteeProfile.find({ user: { $in: userIds } }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    MenteeProfile.countDocuments({ user: { $in: userIds } }),
  ]);

  const profileUserIds = new Set(profiles.map((p) => String(p.user)));
  // include mentees without profiles if searching broadly
  const items = profiles.map((p) => {
    const u = userMap.get(String(p.user));
    return {
      user: u ? { id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email, isActive: u.isActive, createdAt: u.createdAt } : null,
      profile: {
        careerStage: p.careerStage,
        fieldOfStudy: p.fieldOfStudy,
        skills: p.skills || [],
        industries: p.industries || [],
        interests: p.interests || [],
        careerGoals: p.careerGoals || [],
        mentorshipGoals: p.mentorshipGoals || [],
        preferredMentorExpertise: p.preferredMentorExpertise || [],
        preferredIndustry: p.preferredIndustry || [],
        preferredMentorshipStyle: p.preferredMentorshipStyle || [],
        availability: p.availability || {},
        profileCompletion: calcCompletion(p, menteeCompletionFields),
      },
    };
  });

  // add users without profiles (fallback) - only on first page to keep simple
  if (page === 1) {
    for (const u of matchingUsers) {
      if (!profileUserIds.has(String(u._id)) && items.length < limit) {
        items.push({
          user: { id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email, isActive: u.isActive, createdAt: u.createdAt },
          profile: null,
        });
      }
    }
  }

  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

export async function getMenteeById(id) {
  requireValidObjectId(id, 'mentee user ID');
  const user = await User.findOne({ _id: id, role: USER_ROLES.MENTEE }).select('-password').lean();
  if (!user) throw new ApiError(404, 'Mentee not found.');
  const profile = await MenteeProfile.findOne({ user: id }).lean();
  return {
    user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, isActive: user.isActive, createdAt: user.createdAt },
    profile: profile ? {
      careerStage: profile.careerStage,
      fieldOfStudy: profile.fieldOfStudy,
      skills: profile.skills || [],
      industries: profile.industries || [],
      interests: profile.interests || [],
      careerGoals: profile.careerGoals || [],
      mentorshipGoals: profile.mentorshipGoals || [],
      preferredMentorExpertise: profile.preferredMentorExpertise || [],
      preferredIndustry: profile.preferredIndustry || [],
      preferredMentorshipStyle: profile.preferredMentorshipStyle || [],
      availability: profile.availability || {},
      profileCompletion: calcCompletion(profile, menteeCompletionFields),
    } : null,
  };
}

function toSafeUserBrief(u) {
  if (!u) return null;
  return { id: u._id, firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role };
}

export async function listRelationships(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  if (query.status && MENTORSHIP_STATUSES.includes(query.status)) {
    filter.status = query.status;
  }

  if (query.search && String(query.search).trim()) {
    const search = buildUserSearchFilter(query.search);
    const matchingUsers = await User.find(search).select('_id').lean();
    const ids = matchingUsers.map((u) => u._id);
    filter.$or = [{ mentor: { $in: ids } }, { mentee: { $in: ids } }];
  }

  const [relationships, total] = await Promise.all([
    MentorshipRelationship.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('mentee', 'firstName lastName email role')
      .populate('mentor', 'firstName lastName email role')
      .lean(),
    MentorshipRelationship.countDocuments(filter),
  ]);

  const items = relationships.map((r) => ({
    id: r._id,
    mentee: toSafeUserBrief(r.mentee),
    mentor: toSafeUserBrief(r.mentor),
    status: r.status,
    requestMessage: r.requestMessage || '',
    createdAt: r.createdAt,
    acceptedAt: r.respondedAt && ['ACCEPTED','ACTIVE','COMPLETED','ARCHIVED'].includes(r.status) ? r.respondedAt : undefined,
    activatedAt: r.startedAt,
    completedAt: r.completedAt,
    archivedAt: r.archivedAt,
  }));

  return { relationships: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

export async function getRelationshipById(id) {
  requireValidObjectId(id, 'relationship ID');
  const r = await MentorshipRelationship.findById(id)
    .populate('mentee', 'firstName lastName email role')
    .populate('mentor', 'firstName lastName email role')
    .lean();
  if (!r) throw new ApiError(404, 'Mentorship relationship not found.');
  return {
    id: r._id,
    mentee: toSafeUserBrief(r.mentee),
    mentor: toSafeUserBrief(r.mentor),
    status: r.status,
    requestMessage: r.requestMessage || '',
    createdAt: r.createdAt,
    acceptedAt: r.respondedAt && ['ACCEPTED','ACTIVE','COMPLETED','ARCHIVED'].includes(r.status) ? r.respondedAt : undefined,
    activatedAt: r.startedAt,
    completedAt: r.completedAt,
    archivedAt: r.archivedAt,
  };
}

export async function getMatchesForMenteeAdmin(menteeId) {
  requireValidObjectId(menteeId, 'mentee ID');
  const user = await User.findById(menteeId).lean();
  if (!user) throw new ApiError(404, 'Mentee not found.');
  if (user.role !== USER_ROLES.MENTEE) {
    throw new ApiError(400, 'Target user must be a mentee.', { role: 'User is not a mentee.' });
  }
  // reuse existing matching service (no second algorithm)
  const result = await getMatchesForMentee(menteeId);
  return result;
}

export async function listAuditLogs(query) {
  const { page, limit, skip } = parsePagination(query);
  const filter = {};
  if (query.action) filter.action = query.action;
  if (query.entityType) filter.entityType = query.entityType;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actor', 'firstName lastName email role')
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  const items = logs.map((l) => ({
    id: l._id,
    actor: l.actor ? { id: l.actor._id, firstName: l.actor.firstName, lastName: l.actor.lastName, email: l.actor.email, role: l.actor.role } : null,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    metadata: l.metadata || {},
    createdAt: l.createdAt,
  }));

  return { logs: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}
