import { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import * as goalService from '../../../services/goalService.js';

const statusLabels = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

const statusColors = {
  DRAFT: 'status-draft',
  ACTIVE: 'status-active',
  ON_HOLD: 'status-on-hold',
  COMPLETED: 'status-completed',
  ARCHIVED: 'status-archived',
};

const priorityLabels = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

const categoryLabels = {
  SKILL: 'Skill',
  CAREER: 'Career',
  PERSONAL: 'Personal',
  PROJECT: 'Project',
  LEARNING: 'Learning',
};

function MilestoneItem({ milestone }) {
  return (
    <div className="milestone-item">
      <div className="milestone-content">
        <h4 className="milestone-title">{milestone.title}</h4>
        {milestone.description && (
          <p className="milestone-description">{milestone.description}</p>
        )}
        <div className="milestone-meta">
          {milestone.dueDate && (
            <span className="milestone-due-date">
              Due: {new Date(milestone.dueDate).toLocaleDateString()}
            </span>
          )}
          <span className={`milestone-status status-${milestone.status.toLowerCase().replace('_', '-')}`}>
            {milestone.status.replace('_', ' ')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function MentorGoalDetailPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { relationshipId, id } = useParams();
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const loadGoal = useCallback(async () => {
    try {
      const data = await goalService.getMentorGoal(relationshipId, id);
      setGoal(data.goal);
      if (data.goal?.mentorFeedback) {
        setFeedbackText(data.goal.mentorFeedback);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Goal not found.');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to view this goal.');
      } else {
        setError('Could not load goal details.');
      }
    } finally {
      setLoading(false);
    }
  }, [relationshipId, id]);

  useEffect(() => {
    loadGoal();
  }, [loadGoal]);

  async function handleSubmitFeedback(e) {
    e.preventDefault();
    if (!feedbackText.trim() || submittingFeedback) return;
    setSubmittingFeedback(true);
    setError('');
    setSuccess('');
    try {
      await goalService.updateMentorFeedback(relationshipId, id, { mentorFeedback: feedbackText.trim() });
      setSuccess('Feedback saved.');
      await loadGoal();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  }

  if (loading) {
    return (
      <section className="mentorship-page" role="status">
        <p className="mentorship-loading">Loading goal…</p>
      </section>
    );
  }

  if (error && !goal) {
    return (
      <section className="mentorship-page">
        <p className="mentorship-message mentorship-error" role="alert">
          {error}
        </p>
        <Link className="button button-primary" to="/mentor/goals">
          Back to Goals
        </Link>
      </section>
    );
  }

  if (!goal) {
    return (
      <section className="mentorship-page">
        <p className="mentorship-message mentorship-error" role="alert">
          Goal not found.
        </p>
        <Link className="button button-primary" to="/mentor/goals">
          Back to Goals
        </Link>
      </section>
    );
  }

  const status = goal.status;
  const mentee = goal.mentee;
  const completedMilestones = goal.milestones?.filter((m) => m.status === 'COMPLETED').length ?? 0;
  const totalMilestones = goal.milestones?.length ?? 0;

  return (
    <section className="mentorship-page">
      <header className="mentorship-page-header">
        <div>
          <span className="eyebrow">The Mentorship Academy</span>
          <h1>{goal.title}</h1>
          <p>Goal details and progress tracking</p>
        </div>
        <Link className="button button-secondary" to="/mentor/goals">
          ← Back to Goals
        </Link>
      </header>

      {error && (
        <p className="mentorship-message mentorship-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="mentorship-message mentorship-success" role="status">
          {success}
        </p>
      )}

      <div className="goal-detail-grid">
        <article className="goal-detail-card">
          <div className="goal-detail-header">
            <div>
              <span className={`goal-status ${statusColors[status] || ''}`}>
                {statusLabels[status] || status}
              </span>
              <span className="goal-priority priority-{goal.priority.toLowerCase()}">
                {priorityLabels[goal.priority] || goal.priority}
              </span>
              <span className="goal-category-tag">
                {categoryLabels[goal.category] || goal.category}
              </span>
            </div>
          </div>

          <div className="goal-detail-fields">
            <div className="goal-field">
              <label className="goal-field-label">Mentee</label>
              <p className="goal-field-value">
                {mentee?.firstName} {mentee?.lastName} ({mentee?.email})
              </p>
            </div>

            <div className="goal-field">
              <label className="goal-field-label">Description</label>
              <p className="goal-field-value">{goal.description || '—'}</p>
            </div>

            <div className="goal-field">
              <label className="goal-field-label">Target Date</label>
              <p className="goal-field-value">
                {goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'Not set'}
              </p>
            </div>

            <div className="goal-field">
              <label className="goal-field-label">Progress</label>
              <div className="progress-display">
                <div className="progress-track-large">
                  <div
                    className="progress-track-fill"
                    style={{ width: `${goal.progress ?? 0}%` }}
                  ></div>
                </div>
                <span className="progress-percentage">{goal.progress ?? 0}%</span>
              </div>
            </div>

            <div className="goal-field">
              <label className="goal-field-label">Milestones</label>
              <p className="goal-field-value">
                {completedMilestones} of {totalMilestones} completed
              </p>
            </div>

            <div className="goal-field">
              <label className="goal-field-label">Created</label>
              <p className="goal-field-value">
                {goal.createdAt ? new Date(goal.createdAt).toLocaleDateString() : '—'}
              </p>
            </div>

            {goal.completedAt && (
              <div className="goal-field">
                <label className="goal-field-label">Completed</label>
                <p className="goal-field-value">
                  {new Date(goal.completedAt).toLocaleDateString()}
                </p>
              </div>
            )}

            <div className="goal-field">
              <label className="goal-field-label">Last Updated</label>
              <p className="goal-field-value">
                {goal.updatedAt ? new Date(goal.updatedAt).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>

          <div className="milestones-section">
            <h3>Milestones</h3>
            {!goal.milestones?.length && (
              <p className="milestones-empty">No milestones yet.</p>
            )}
            <div className="milestones-list">
              {goal.milestones?.map((milestone) => (
                <MilestoneItem key={milestone.id} milestone={milestone} />
              ))}
            </div>
          </div>

          <div className="mentor-feedback-section">
            <h3>Mentor Feedback</h3>
            <form className="feedback-form" onSubmit={handleSubmitFeedback}>
              <div className="form-field">
                <label htmlFor="mentor-feedback" className="form-label">Your Feedback</label>
                <textarea
                  id="mentor-feedback"
                  className="form-textarea"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Add your feedback for the mentee…"
                  rows={4}
                  disabled={submittingFeedback}
                  maxLength={2000}
                />
                <p className="char-count">{feedbackText.length} / 2000</p>
              </div>
              <button
                type="submit"
                className="button button-primary"
                disabled={submittingFeedback || !feedbackText.trim()}
              >
                {submittingFeedback ? 'Saving…' : goal.mentorFeedback ? 'Update Feedback' : 'Save Feedback'}
              </button>
            </form>

            {goal.mentorFeedback && (
              <div className="saved-feedback">
                <p className="saved-feedback-text">{goal.mentorFeedback}</p>
                {goal.mentorFeedbackAt && (
                  <p className="saved-feedback-date">
                    Saved {new Date(goal.mentorFeedbackAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
          </div>
        </article>

        <aside className="goal-detail-sidebar">
          <div className="goal-progress-card">
            <h3>Progress Overview</h3>
            <div className="progress-ring-wrapper">
              <svg className="progress-ring" viewBox="0 0 120 120">
                <circle
                  className="progress-ring-background"
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="var(--line)"
                  strokeWidth="8"
                />
                <circle
                  className="progress-ring-foreground"
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="var(--pink)"
                  strokeWidth="8"
                  strokeDasharray="339.3"
                  strokeDashoffset={`calc(339.3 - (339.3 * ${goal.progress ?? 0} / 100))`}
                  strokeLinecap="round"
                  style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                />
              </svg>
              <span className="progress-ring-text">{goal.progress ?? 0}%</span>
            </div>
            <p className="progress-summary">
              {completedMilestones} of {totalMilestones} milestones completed
            </p>
          </div>

          <div className="goal-info-card">
            <h3>Goal Information</h3>
            <dl className="goal-info-list">
              <dt>Category</dt>
              <dd>{categoryLabels[goal.category] || goal.category}</dd>
              <dt>Priority</dt>
              <dd>{priorityLabels[goal.priority] || goal.priority}</dd>
              <dt>Status</dt>
              <dd><span className={`status-badge ${statusColors[status] || ''}`}>{statusLabels[status] || status}</span></dd>
              <dt>Target Date</dt>
              <dd>{goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'Not set'}</dd>
              <dt>Created</dt>
              <dd>{goal.createdAt ? new Date(goal.createdAt).toLocaleDateString() : '—'}</dd>
              <dt>Updated</dt>
              <dd>{goal.updatedAt ? new Date(goal.updatedAt).toLocaleDateString() : '—'}</dd>
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
}