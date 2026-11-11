import mongoose from 'mongoose';
import User from '../models/User.js';
import MentorshipRelationship from '../models/MentorshipRelationship.js';
import Goal, {
  GOAL_CATEGORIES,
  GOAL_STATUSES,
  GOAL_PRIORITIES,
  GOAL_STATUS_TRANSITIONS,
  MILESTONE_STATUSES,
} from '../models/Goal.js';
import ApiError from '../utils/ApiError.js';
import { createNotification } from './notificationService.js';

function toSafeUser(user) {
  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
  };
}

function toSafeGoal(goal) {
  return {
    id: goal._id,
    mentorshipRelationship: goal.mentorshipRelationship,
    mentee: goal.mentee ? toSafeUser(goal.mentee) : null,
    title: goal.title,
    description: goal.description,
    category: goal.category,
    status: goal.status,
    priority: goal.priority,
    targetDate: goal.targetDate,
    completedAt: goal.completedAt,
    progress: goal.progress,
    milestones: goal.milestones?.map((m) => ({
      id: m._id,
      title: m.title,
      description: m.description,
      dueDate: m.dueDate,
      status: m.status,
      completedAt: m.completedAt,
    })) || [],
    mentorFeedback: goal.mentorFeedback,
    mentorFeedbackAt: goal.mentorFeedbackAt,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}

function validateStatusTransition(currentStatus, newStatus) {
  const allowed = GOAL_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new ApiError(
      400,
      `Cannot transition goal from ${currentStatus} to ${newStatus}.`,
      { status: `Invalid goal status transition from ${currentStatus} to ${newStatus}.` },
    );
  }
}

function validateRelationshipStatusForGoals(relationship) {
  const allowedStatuses = ['ACCEPTED', 'ACTIVE'];
  if (!allowedStatuses.includes(relationship.status)) {
    throw new ApiError(
      400,
      `Cannot manage goals for a relationship with status ${relationship.status}.`,
      { relationship: `Goals can only be managed when the relationship is ACCEPTED or ACTIVE.` },
    );
  }
}

export async function createGoal(menteeId, relationshipId, payload) {
  if (!mongoose.isValidObjectId(relationshipId)) {
    throw new ApiError(400, 'Invalid relationship ID.');
  }

  const relationship = await MentorshipRelationship.findById(relationshipId);
  if (!relationship) {
    throw new ApiError(404, 'Mentorship relationship not found.');
  }

  if (!relationship.mentee.equals(menteeId)) {
    throw new ApiError(403, 'You are not the mentee in this relationship.');
  }

  validateRelationshipStatusForGoals(relationship);

  const { title, description, category, priority, targetDate, milestones } = payload;

  if (!title || !title.trim()) {
    throw new ApiError(400, 'Goal title is required.', { title: 'Title is required.' });
  }

  if (title.length > 200) {
    throw new ApiError(400, 'Title must be 200 characters or fewer.', { title: 'Title too long.' });
  }

  if (description && description.length > 2000) {
    throw new ApiError(400, 'Description must be 2000 characters or fewer.', { description: 'Description too long.' });
  }

  if (!GOAL_CATEGORIES.includes(category)) {
    throw new ApiError(400, 'Invalid category.', { category: 'Provide a valid category.' });
  }

  if (!GOAL_PRIORITIES.includes(priority)) {
    throw new ApiError(400, 'Invalid priority.', { priority: 'Provide a valid priority.' });
  }

  if (targetDate && isNaN(Date.parse(targetDate))) {
    throw new ApiError(400, 'Invalid target date.', { targetDate: 'Provide a valid date.' });
  }

  const goal = await Goal.create({
    mentorshipRelationship: relationshipId,
    mentee: menteeId,
    title: title.trim(),
    description: description?.trim() || '',
    category,
    status: 'DRAFT',
    priority,
    targetDate: targetDate ? new Date(targetDate) : undefined,
    milestones: milestones?.map((m) => ({
      title: m.title.trim(),
      description: m.description?.trim() || '',
      dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
      status: 'PENDING',
    })) || [],
    progress: 0,
  });

  await goal.populate('mentee', 'firstName lastName email role');
  return toSafeGoal(goal);
}

export async function getGoalsForRelationship(menteeId, relationshipId) {
  if (!mongoose.isValidObjectId(relationshipId)) {
    throw new ApiError(400, 'Invalid relationship ID.');
  }

  const relationship = await MentorshipRelationship.findById(relationshipId);
  if (!relationship) {
    throw new ApiError(404, 'Mentorship relationship not found.');
  }

  if (!relationship.mentee.equals(menteeId)) {
    throw new ApiError(403, 'You are not the mentee in this relationship.');
  }

  const goals = await Goal.find({
    mentorshipRelationship: relationshipId,
    mentee: menteeId,
  })
    .sort({ createdAt: -1 })
    .populate('mentee', 'firstName lastName email role')
    .lean();

  return goals.map(toSafeGoal);
}

export async function getGoalById(menteeId, relationshipId, goalId) {
  if (!mongoose.isValidObjectId(relationshipId) || !mongoose.isValidObjectId(goalId)) {
    throw new ApiError(400, 'Invalid relationship or goal ID.');
  }

  const goal = await Goal.findOne({
    _id: goalId,
    mentorshipRelationship: relationshipId,
    mentee: menteeId,
  })
    .populate('mentee', 'firstName lastName email role')
    .lean();

  if (!goal) {
    throw new ApiError(404, 'Goal not found.');
  }

  return toSafeGoal(goal);
}

export async function updateGoal(menteeId, relationshipId, goalId, payload) {
  if (!mongoose.isValidObjectId(relationshipId) || !mongoose.isValidObjectId(goalId)) {
    throw new ApiError(400, 'Invalid relationship or goal ID.');
  }

  const goal = await Goal.findOne({
    _id: goalId,
    mentorshipRelationship: relationshipId,
    mentee: menteeId,
  });

  if (!goal) {
    throw new ApiError(404, 'Goal not found.');
  }

  if (['COMPLETED', 'ARCHIVED'].includes(goal.status)) {
    throw new ApiError(400, `Cannot update a goal with status ${goal.status}.`);
  }

  const allowedFields = ['title', 'description', 'category', 'priority', 'targetDate', 'status'];
  const unexpectedKeys = Object.keys(payload).filter((key) => !allowedFields.includes(key));
  if (unexpectedKeys.length) {
    throw new ApiError(400, 'Goal update contains unsupported fields.', {
      goal: `Unsupported fields: ${unexpectedKeys.join(', ')}.`,
    });
  }

  if ('title' in payload) {
    if (!payload.title || !payload.title.trim()) {
      throw new ApiError(400, 'Goal title is required.', { title: 'Title is required.' });
    }
    if (payload.title.length > 200) {
      throw new ApiError(400, 'Title must be 200 characters or fewer.', { title: 'Title too long.' });
    }
    goal.title = payload.title.trim();
  }

  if ('description' in payload) {
    if (payload.description && payload.description.length > 2000) {
      throw new ApiError(400, 'Description must be 2000 characters or fewer.', { description: 'Description too long.' });
    }
    goal.description = payload.description?.trim() || '';
  }

  if ('category' in payload) {
    if (!GOAL_CATEGORIES.includes(payload.category)) {
      throw new ApiError(400, 'Invalid category.', { category: 'Provide a valid category.' });
    }
    goal.category = payload.category;
  }

  if ('priority' in payload) {
    if (!GOAL_PRIORITIES.includes(payload.priority)) {
      throw new ApiError(400, 'Invalid priority.', { priority: 'Provide a valid priority.' });
    }
    goal.priority = payload.priority;
  }

  if ('targetDate' in payload) {
    if (payload.targetDate && isNaN(Date.parse(payload.targetDate))) {
      throw new ApiError(400, 'Invalid target date.', { targetDate: 'Provide a valid date.' });
    }
    goal.targetDate = payload.targetDate ? new Date(payload.targetDate) : undefined;
  }

  if ('status' in payload) {
    const newStatus = payload.status;
    if (!GOAL_STATUSES.includes(newStatus)) {
      throw new ApiError(400, 'Invalid status.', { status: 'Provide a valid status.' });
    }
    validateStatusTransition(goal.status, newStatus);
    goal.status = newStatus;
    if (newStatus === 'COMPLETED' && !goal.completedAt) {
      goal.completedAt = new Date();
    } else if (newStatus !== 'COMPLETED' && goal.completedAt) {
      goal.completedAt = null;
    }
  }

  const statusChanged = 'status' in payload;
  await goal.save();
  await goal.populate('mentee', 'firstName lastName email role');

  if (statusChanged) {
    const rel = await MentorshipRelationship.findById(goal.mentorshipRelationship).select('mentor').lean();
    if (rel?.mentor) {
      await createNotification({
        recipient: rel.mentor,
        type: 'GOAL_MILESTONE_UPDATED',
        title: 'Goal updated',
        message: `Goal "${goal.title}" status changed to ${goal.status}.`,
        relatedEntityType: 'GOAL',
        relatedEntityId: goal._id,
      });
    }
  }

  return toSafeGoal(goal);
}

export async function addMilestone(menteeId, relationshipId, goalId, payload) {
  if (!mongoose.isValidObjectId(relationshipId) || !mongoose.isValidObjectId(goalId)) {
    throw new ApiError(400, 'Invalid relationship or goal ID.');
  }

  const goal = await Goal.findOne({
    _id: goalId,
    mentorshipRelationship: relationshipId,
    mentee: menteeId,
  });

  if (!goal) {
    throw new ApiError(404, 'Goal not found.');
  }

  if (['COMPLETED', 'ARCHIVED'].includes(goal.status)) {
    throw new ApiError(400, `Cannot add milestones to a goal with status ${goal.status}.`);
  }

  const { title, description, dueDate } = payload;

  if (!title || !title.trim()) {
    throw new ApiError(400, 'Milestone title is required.', { title: 'Title is required.' });
  }

  if (title.length > 200) {
    throw new ApiError(400, 'Milestone title must be 200 characters or fewer.', { title: 'Title too long.' });
  }

  if (description && description.length > 2000) {
    throw new ApiError(400, 'Milestone description must be 2000 characters or fewer.', { description: 'Description too long.' });
  }

  if (dueDate && isNaN(Date.parse(dueDate))) {
    throw new ApiError(400, 'Invalid milestone due date.', { dueDate: 'Provide a valid date.' });
  }

  goal.milestones.push({
    title: title.trim(),
    description: description?.trim() || '',
    dueDate: dueDate ? new Date(dueDate) : undefined,
    status: 'PENDING',
  });

  goal.calculateProgress();
  await goal.save();
  await goal.populate('mentee', 'firstName lastName email role');
  return toSafeGoal(goal);
}

export async function updateMilestone(menteeId, relationshipId, goalId, milestoneId, payload) {
  if (!mongoose.isValidObjectId(relationshipId) || !mongoose.isValidObjectId(goalId) || !mongoose.isValidObjectId(milestoneId)) {
    throw new ApiError(400, 'Invalid relationship, goal, or milestone ID.');
  }

  const goal = await Goal.findOne({
    _id: goalId,
    mentorshipRelationship: relationshipId,
    mentee: menteeId,
  });

  if (!goal) {
    throw new ApiError(404, 'Goal not found.');
  }

  if (['COMPLETED', 'ARCHIVED'].includes(goal.status)) {
    throw new ApiError(400, `Cannot update milestones for a goal with status ${goal.status}.`);
  }

  const milestone = goal.milestones.id(milestoneId);
  if (!milestone) {
    throw new ApiError(404, 'Milestone not found.');
  }

  const allowedFields = ['title', 'description', 'dueDate', 'status'];
  const unexpectedKeys = Object.keys(payload).filter((key) => !allowedFields.includes(key));
  if (unexpectedKeys.length) {
    throw new ApiError(400, 'Milestone update contains unsupported fields.', {
      milestone: `Unsupported fields: ${unexpectedKeys.join(', ')}.`,
    });
  }

  if ('title' in payload) {
    if (!payload.title || !payload.title.trim()) {
      throw new ApiError(400, 'Milestone title is required.', { title: 'Title is required.' });
    }
    if (payload.title.length > 200) {
      throw new ApiError(400, 'Milestone title must be 200 characters or fewer.', { title: 'Title too long.' });
    }
    milestone.title = payload.title.trim();
  }

  if ('description' in payload) {
    if (payload.description && payload.description.length > 2000) {
      throw new ApiError(400, 'Milestone description must be 2000 characters or fewer.', { description: 'Description too long.' });
    }
    milestone.description = payload.description?.trim() || '';
  }

  if ('dueDate' in payload) {
    if (payload.dueDate && isNaN(Date.parse(payload.dueDate))) {
      throw new ApiError(400, 'Invalid milestone due date.', { dueDate: 'Provide a valid date.' });
    }
    milestone.dueDate = payload.dueDate ? new Date(payload.dueDate) : undefined;
  }

  if ('status' in payload) {
    const newStatus = payload.status;
    if (!MILESTONE_STATUSES.includes(newStatus)) {
      throw new ApiError(400, 'Invalid milestone status.', { status: 'Provide a valid milestone status.' });
    }
    milestone.status = newStatus;
    if (newStatus === 'COMPLETED' && !milestone.completedAt) {
      milestone.completedAt = new Date();
    } else if (newStatus !== 'COMPLETED' && milestone.completedAt) {
      milestone.completedAt = null;
    }
  }

  const milestoneStatusChanged = 'status' in payload;
  goal.calculateProgress();
  await goal.save();
  await goal.populate('mentee', 'firstName lastName email role');

  if (milestoneStatusChanged) {
    const rel = await MentorshipRelationship.findById(goal.mentorshipRelationship).select('mentor').lean();
    if (rel?.mentor) {
      await createNotification({
        recipient: rel.mentor,
        type: 'GOAL_MILESTONE_UPDATED',
        title: 'Milestone updated',
        message: `Milestone "${milestone.title}" in goal "${goal.title}" is now ${milestone.status.replace('_', ' ').toLowerCase()}.`,
        relatedEntityType: 'GOAL',
        relatedEntityId: goal._id,
      });
    }
  }

  return toSafeGoal(goal);
}

export async function addMentorFeedback(mentorId, relationshipId, goalId, feedback) {
  if (!mongoose.isValidObjectId(relationshipId) || !mongoose.isValidObjectId(goalId)) {
    throw new ApiError(400, 'Invalid relationship or goal ID.');
  }

  const relationship = await MentorshipRelationship.findById(relationshipId);
  if (!relationship) {
    throw new ApiError(404, 'Mentorship relationship not found.');
  }

  if (!relationship.mentor.equals(mentorId)) {
    throw new ApiError(403, 'You are not the mentor in this relationship.');
  }

  const goal = await Goal.findOne({
    _id: goalId,
    mentorshipRelationship: relationshipId,
  });

  if (!goal) {
    throw new ApiError(404, 'Goal not found.');
  }

  if (!feedback || !feedback.trim()) {
    throw new ApiError(400, 'Feedback is required.', { mentorFeedback: 'Feedback cannot be empty.' });
  }

  if (feedback.length > 2000) {
    throw new ApiError(400, 'Feedback must be 2000 characters or fewer.', { mentorFeedback: 'Feedback too long.' });
  }

  goal.mentorFeedback = feedback.trim();
  goal.mentorFeedbackAt = new Date();
  await goal.save();
  await goal.populate('mentee', 'firstName lastName email role');

  await createNotification({
    recipient: goal.mentee?._id || goal.mentee,
    type: 'GOAL_FEEDBACK',
    title: 'Goal feedback received',
    message: `Your mentor left feedback on goal "${goal.title}".`,
    relatedEntityType: 'GOAL',
    relatedEntityId: goal._id,
  });

  return toSafeGoal(goal);
}

export async function getMentorGoalsForRelationship(mentorId, relationshipId) {
  if (!mongoose.isValidObjectId(relationshipId)) {
    throw new ApiError(400, 'Invalid relationship ID.');
  }

  const relationship = await MentorshipRelationship.findById(relationshipId);
  if (!relationship) {
    throw new ApiError(404, 'Mentorship relationship not found.');
  }

  if (!relationship.mentor.equals(mentorId)) {
    throw new ApiError(403, 'You are not the mentor in this relationship.');
  }

  const goals = await Goal.find({
    mentorshipRelationship: relationshipId,
  })
    .sort({ createdAt: -1 })
    .populate('mentee', 'firstName lastName email role')
    .lean();

  return goals.map(toSafeGoal);
}

export async function getMentorGoalById(mentorId, relationshipId, goalId) {
  if (!mongoose.isValidObjectId(relationshipId) || !mongoose.isValidObjectId(goalId)) {
    throw new ApiError(400, 'Invalid relationship or goal ID.');
  }

  const relationship = await MentorshipRelationship.findById(relationshipId);
  if (!relationship) {
    throw new ApiError(404, 'Mentorship relationship not found.');
  }

  if (!relationship.mentor.equals(mentorId)) {
    throw new ApiError(403, 'You are not the mentor in this relationship.');
  }

  const goal = await Goal.findOne({
    _id: goalId,
    mentorshipRelationship: relationshipId,
  })
    .populate('mentee', 'firstName lastName email role')
    .lean();

  if (!goal) {
    throw new ApiError(404, 'Goal not found.');
  }

  return toSafeGoal(goal);
}