import MenteeProfile from '../models/MenteeProfile.js';
import MentorProfile from '../models/MentorProfile.js';
import ApiError from '../utils/ApiError.js';

const menteeCompletionFields = [
  'bio',
  'location',
  'institution',
  'qualification',
  'fieldOfStudy',
  'careerStage',
  'careerGoals',
  'mentorshipGoals',
  'interests',
  'preferredMentorExpertise',
  'preferredIndustry',
  'preferredMentorshipStyle',
  'skills',
  'industries',
  'experienceAreas',
  'availability',
];

const mentorCompletionFields = [
  'bio',
  'location',
  'jobTitle',
  'company',
  'industry',
  'yearsOfExperience',
  'professionalBackground',
  'expertise',
  'skills',
  'specialisations',
  'experienceAreas',
  'mentorshipAreas',
  'mentorshipStyle',
  'languages',
  'availability',
];

const menteeStringFields = new Set([
  'profilePhoto',
  'bio',
  'phone',
  'location',
  'institution',
  'qualification',
  'fieldOfStudy',
  'careerStage',
]);

const menteeArrayFields = new Set([
  'careerGoals',
  'mentorshipGoals',
  'interests',
  'preferredMentorExpertise',
  'preferredIndustry',
  'preferredMentorshipStyle',
  'skills',
  'industries',
  'experienceAreas',
]);

const mentorStringFields = new Set([
  'profilePhoto',
  'bio',
  'phone',
  'location',
  'jobTitle',
  'company',
  'industry',
  'professionalBackground',
  'mentorshipStyle',
]);

const mentorArrayFields = new Set([
  'expertise',
  'skills',
  'specialisations',
  'experienceAreas',
  'mentorshipAreas',
  'languages',
]);

const availabilityKeys = new Set(['days', 'timeZone', 'timeSlots']);

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validateStringArrays(update, fields) {
  for (const field of fields) {
    if (
      field in update &&
      (!Array.isArray(update[field]) ||
        update[field].some((value) => typeof value !== 'string'))
    ) {
      throw new ApiError(400, `${field} must be an array of strings.`, {
        [field]: 'Provide an array of text values.',
      });
    }
  }
}

function validateAvailability(update) {
  if (!('availability' in update)) return;
  const availability = update.availability;

  if (!isPlainObject(availability)) {
    throw new ApiError(400, 'availability must be an object.');
  }

  const unexpectedKeys = Object.keys(availability).filter(
    (key) => !availabilityKeys.has(key),
  );
  if (unexpectedKeys.length) {
    throw new ApiError(400, 'availability contains unsupported fields.', {
      availability: `Unsupported fields: ${unexpectedKeys.join(', ')}.`,
    });
  }

  if ('days' in availability && !Array.isArray(availability.days)) {
    throw new ApiError(400, 'availability.days must be an array.');
  }

  if (
    'days' in availability &&
    availability.days.some((day) => typeof day !== 'string')
  ) {
    throw new ApiError(400, 'availability.days must contain text values.');
  }

  if ('timeZone' in availability && typeof availability.timeZone !== 'string') {
    throw new ApiError(400, 'availability.timeZone must be a string.');
  }

  if ('timeSlots' in availability) {
    if (!Array.isArray(availability.timeSlots)) {
      throw new ApiError(400, 'availability.timeSlots must be an array.');
    }

    for (const slot of availability.timeSlots) {
      if (
        !isPlainObject(slot) ||
        Object.keys(slot).some((key) => !['start', 'end'].includes(key)) ||
        typeof slot.start !== 'string' ||
        typeof slot.end !== 'string'
      ) {
        throw new ApiError(
          400,
          'Each availability time slot must contain start and end times.',
        );
      }
      if (
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.start) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.end) ||
        slot.end <= slot.start
      ) {
        throw new ApiError(
          400,
          'Availability times must be valid and the end time must follow the start time.',
          { availability: 'Check the start and end times.' },
        );
      }
    }
  }
}

function sanitizeUpdate(payload, allowedFields, stringFields, arrayFields) {
  if (!isPlainObject(payload)) {
    throw new ApiError(400, 'Profile information must be a JSON object.');
  }

  const unexpectedKeys = Object.keys(payload).filter(
    (key) => !allowedFields.has(key),
  );
  if (unexpectedKeys.length) {
    throw new ApiError(400, 'Profile contains unsupported fields.', {
      profile: `Unsupported fields: ${unexpectedKeys.join(', ')}.`,
    });
  }

  for (const field of stringFields) {
    if (field in payload && typeof payload[field] !== 'string') {
      throw new ApiError(400, `${field} must be a string.`, {
        [field]: 'Provide a text value.',
      });
    }
  }

  validateStringArrays(payload, arrayFields);
  validateAvailability(payload);

  return { ...payload };
}

function getAvailabilityCompletion(value) {
  return Boolean(
    value?.days?.length &&
      value.timeZone?.trim() &&
      value.timeSlots?.some((slot) => slot.start && slot.end),
  );
}

function isFieldComplete(profile, field) {
  const value = profile?.[field];

  if (field === 'availability') return getAvailabilityCompletion(value);
  if (Array.isArray(value)) {
    return value.some((item) => typeof item === 'string' && item.trim());
  }
  if (typeof value === 'string') return Boolean(value.trim());
  if (typeof value === 'number') return Number.isFinite(value);
  return false;
}

function calculateCompletion(profile, fields) {
  const missingFields = fields.filter((field) => !isFieldComplete(profile, field));
  const totalFields = fields.length;
  const completedFields = totalFields - missingFields.length;

  return {
    percentage: Math.round((completedFields / totalFields) * 100),
    completedFields,
    totalFields,
    missingFields,
    isComplete: missingFields.length === 0,
  };
}

const menteeEditableFields = new Set([
  ...menteeStringFields,
  ...menteeArrayFields,
  'availability',
]);

const mentorEditableFields = new Set([
  ...mentorStringFields,
  ...mentorArrayFields,
  'yearsOfExperience',
  'availability',
]);

export async function getMenteeProfile(userId) {
  return MenteeProfile.findOne({ user: userId }).lean();
}

export async function saveMenteeProfile(userId, payload) {
  const update = sanitizeUpdate(
    payload,
    menteeEditableFields,
    menteeStringFields,
    menteeArrayFields,
  );

  return MenteeProfile.findOneAndUpdate(
    { user: userId },
    { $set: update, $setOnInsert: { user: userId } },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  ).lean();
}

export async function getMenteeCompletion(userId) {
  const profile = await getMenteeProfile(userId);
  return calculateCompletion(profile, menteeCompletionFields);
}

export async function getMentorProfile(userId) {
  return MentorProfile.findOne({ user: userId }).lean();
}

export async function saveMentorProfile(userId, payload) {
  const update = sanitizeUpdate(
    payload,
    mentorEditableFields,
    mentorStringFields,
    mentorArrayFields,
  );

  if (
    'yearsOfExperience' in update &&
    update.yearsOfExperience !== null &&
    (typeof update.yearsOfExperience !== 'number' ||
      !Number.isFinite(update.yearsOfExperience))
  ) {
    throw new ApiError(400, 'yearsOfExperience must be a number or null.', {
      yearsOfExperience: 'Provide a valid number of years.',
    });
  }

  return MentorProfile.findOneAndUpdate(
    { user: userId },
    { $set: update, $setOnInsert: { user: userId } },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  ).lean();
}

export async function getMentorCompletion(userId) {
  const profile = await getMentorProfile(userId);
  return calculateCompletion(profile, mentorCompletionFields);
}
