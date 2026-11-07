export const AVAILABILITY_DAYS = Object.freeze([
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]);

export const MENTORSHIP_STYLES = Object.freeze([
  'STRUCTURED',
  'FLEXIBLE',
  'GOAL_ORIENTED',
  'CONVERSATIONAL',
  'MIXED',
]);

export const CAREER_STAGES = Object.freeze([
  'STUDENT',
  'EARLY_CAREER',
  'MID_CAREER',
  'SENIOR',
  'CAREER_CHANGE',
]);

export function createStringArrayField({ maxItems = 40, maxLength = 100 } = {}) {
  return {
    type: [
      {
        type: String,
        trim: true,
        maxlength: maxLength,
      },
    ],
    default: [],
    validate: {
      validator: (values) =>
        values.length <= maxItems &&
        values.every((value) => value.trim().length > 0),
      message: `Provide non-empty values, up to a maximum of ${maxItems}.`,
    },
  };
}

export function createEnumArrayField(values) {
  return {
    type: [
      {
        type: String,
        enum: values,
        trim: true,
      },
    ],
    default: [],
    validate: {
      validator: (items) => items.length <= values.length,
      message: `A maximum of ${values.length} values is allowed.`,
    },
  };
}

export function createAvailabilitySchema() {
  return {
    days: createEnumArrayField(AVAILABILITY_DAYS),
    timeZone: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    timeSlots: {
      type: [
        new mongoose.Schema(
          {
            start: {
              type: String,
              trim: true,
              match: /^([01]\d|2[0-3]):[0-5]\d$/,
              required: true,
            },
            end: {
              type: String,
              trim: true,
              match: /^([01]\d|2[0-3]):[0-5]\d$/,
              required: true,
              validate: {
                validator(value) {
                  return !this.start || value > this.start;
                },
                message: 'End time must be after start time.',
              },
            },
          },
          { _id: false },
        ),
      ],
      default: [],
      validate: {
        validator: (values) => values.length <= 8,
        message: 'A maximum of 8 availability time slots is allowed.',
      },
    },
  };
}
import mongoose from 'mongoose';
