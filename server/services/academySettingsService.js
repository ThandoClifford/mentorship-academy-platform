import AcademySettings from '../models/AcademySettings.js';
import MentorshipRelationship from '../models/MentorshipRelationship.js';
import ApiError from '../utils/ApiError.js';
import { logAdminAction } from './auditService.js';

export const DEFAULT_ACADEMY_SETTINGS = Object.freeze({
  academyName: 'Mentorship Academy',
  academyDescription: 'A community supporting meaningful mentorship and professional growth.',
  contactEmail: '',
  contactPhone: '',
  websiteUrl: '',
  address: '',
  mentorshipProgramName: 'Mentorship Programme',
  mentorshipProgramDescription: 'A structured programme connecting mentees with experienced mentors.',
  maxMenteesPerMentor: 10,
  allowMentorApplications: true,
  requireAdminApprovalForMentors: true,
  allowMenteeMentorRequests: true,
  requireAdminApprovalForRelationships: false,
  aiMatchmakingEnabled: true,
  minimumMatchScore: 0,
  maximumSuggestedMentors: 50,
  publicMentorProfilesEnabled: true,
  publicEventsEnabled: false,
  maintenanceMode: false,
  maintenanceMessage: 'The Mentorship Academy is temporarily unavailable while maintenance is in progress.',
});

const settingFields = Object.keys(DEFAULT_ACADEMY_SETTINGS);
const booleanFields = [
  'allowMentorApplications',
  'requireAdminApprovalForMentors',
  'allowMenteeMentorRequests',
  'requireAdminApprovalForRelationships',
  'aiMatchmakingEnabled',
  'publicMentorProfilesEnabled',
  'publicEventsEnabled',
  'maintenanceMode',
];
const stringLimits = {
  academyName: 160,
  academyDescription: 2000,
  contactEmail: 254,
  contactPhone: 50,
  websiteUrl: 500,
  address: 1000,
  mentorshipProgramName: 160,
  mentorshipProgramDescription: 2000,
  maintenanceMessage: 1000,
};

function toSafeSettings(settings) {
  return Object.fromEntries(settingFields.map((field) => [field, settings[field]]));
}

function validateSettingsPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ApiError(400, 'Settings must be provided as an object.');
  }

  const unknownFields = Object.keys(payload).filter((field) => !settingFields.includes(field));
  if (unknownFields.length) {
    throw new ApiError(400, 'Settings contain unsupported fields.', {
      fields: `Unsupported fields: ${unknownFields.join(', ')}.`,
    });
  }

  const validated = {};
  for (const [field, value] of Object.entries(payload)) {
    if (booleanFields.includes(field)) {
      if (typeof value !== 'boolean') {
        throw new ApiError(400, `${field} must be a boolean.`, {
          [field]: 'Provide true or false.',
        });
      }
      validated[field] = value;
      continue;
    }

    if (field === 'maxMenteesPerMentor' || field === 'maximumSuggestedMentors' || field === 'minimumMatchScore') {
      const minimum = field === 'minimumMatchScore' ? 0 : 1;
      const maximum = 100;
      if (!Number.isInteger(value) || value < minimum || value > maximum) {
        throw new ApiError(400, `${field} must be an integer between ${minimum} and ${maximum}.`, {
          [field]: `Provide an integer between ${minimum} and ${maximum}.`,
        });
      }
      validated[field] = value;
      continue;
    }

    if (typeof value !== 'string' || value.length > stringLimits[field]) {
      throw new ApiError(400, `${field} must be a string of ${stringLimits[field]} characters or fewer.`, {
        [field]: `Provide a string of ${stringLimits[field]} characters or fewer.`,
      });
    }
    validated[field] = value.trim();
  }

  if (validated.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(validated.contactEmail)) {
    throw new ApiError(400, 'Contact email is invalid.', { contactEmail: 'Provide a valid email address.' });
  }

  if (validated.websiteUrl) {
    let url;
    try {
      url = new URL(validated.websiteUrl);
    } catch {
      throw new ApiError(400, 'Website URL is invalid.', { websiteUrl: 'Provide a valid http or https URL.' });
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new ApiError(400, 'Website URL is invalid.', { websiteUrl: 'Use an http or https URL without credentials.' });
    }
  }

  for (const field of ['academyName', 'academyDescription', 'mentorshipProgramName', 'mentorshipProgramDescription']) {
    if (field in validated && !validated[field]) {
      throw new ApiError(400, `${field} is required.`, { [field]: 'This field is required.' });
    }
  }

  if (validated.maintenanceMode && 'maintenanceMessage' in validated && !validated.maintenanceMessage) {
    throw new ApiError(400, 'A maintenance message is required when maintenance mode is enabled.', {
      maintenanceMessage: 'Provide a message to display during maintenance.',
    });
  }

  return validated;
}

export async function getAcademySettings() {
  const settings = await AcademySettings.findOneAndUpdate(
    { key: 'academy' },
    { $setOnInsert: { key: 'academy', ...DEFAULT_ACADEMY_SETTINGS } },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  ).lean();

  return toSafeSettings(settings);
}

export async function updateAcademySettings(payload, { replace = false, actor } = {}) {
  const validated = validateSettingsPayload(payload);
  const current = await getAcademySettings();

  if (replace) {
    const missingFields = settingFields.filter((field) => !(field in validated));
    if (missingFields.length) {
      throw new ApiError(400, 'All settings fields are required for replacement.', {
        fields: `Missing fields: ${missingFields.join(', ')}.`,
      });
    }
  }

  const updated = { ...current, ...validated };
  if (updated.maintenanceMode && !updated.maintenanceMessage) {
    throw new ApiError(400, 'A maintenance message is required when maintenance mode is enabled.', {
      maintenanceMessage: 'Provide a message to display during maintenance.',
    });
  }
  if (!updated.academyName || !updated.academyDescription || !updated.mentorshipProgramName || !updated.mentorshipProgramDescription) {
    throw new ApiError(400, 'Academy name and programme name and descriptions are required.');
  }

  const settings = await AcademySettings.findOneAndUpdate(
    { key: 'academy' },
    { $set: updated },
    { new: true, upsert: true, runValidators: true },
  );

  if (
    current.requireAdminApprovalForRelationships &&
    !updated.requireAdminApprovalForRelationships
  ) {
    await MentorshipRelationship.updateMany(
      { status: 'PENDING', adminApprovalStatus: 'PENDING' },
      { $set: { adminApprovalStatus: 'NOT_REQUIRED' } },
    );
  }

  if (actor) {
    await logAdminAction({
      actor,
      action: 'ACADEMY_SETTINGS_UPDATED',
      entityType: 'ACADEMY_SETTINGS',
      entityId: settings._id,
      metadata: { updatedFields: Object.keys(validated) },
    });
  }

  return toSafeSettings(settings.toObject());
}
