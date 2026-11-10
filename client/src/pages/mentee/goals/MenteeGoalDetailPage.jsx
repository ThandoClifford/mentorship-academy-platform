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

const statusTransitions = {
  DRAFT: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['ON_HOLD', 'COMPLETED', 'ARCHIVED'],
  ON_HOLD: ['ACTIVE', 'ARCHIVED'],
  COMPLETED: ['ARCHIVED'],
  ARCHIVED: [],
};

function MilestoneItem({ milestone, onUpdate, updatingIds }) {
  const isUpdating = updatingIds.has(milestone.id);
  const [status, setStatus] = useState(milestone.status);

  async function handleStatusChange(newStatus) {
    if (isUpdating) return;
    setStatus(newStatus);
    try {
      await onUpdate(milestone.id, { status: newStatus });
    } catch (err) {
      setStatus(milestone.status);
      throw err;
    }
  }

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
      <div className="milestone-actions">
        <select
          className="milestone-status-select"
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={isUpdating}
        >
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
        {isUpdating && <span className="milestone-updating">Updating…</span>}
      </div>
    </div>
  );
}

function AddMilestoneForm({ onAdd, onCancel, adding }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
  });
  const [errors, setErrors] = useState({});

  function validate() {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Milestone title is required';
    if (formData.title.length > 200) newErrors.title = 'Title must be 200 characters or fewer';
    if (formData.description && formData.description.length > 2000) {
      newErrors.description = 'Description must be 2000 characters or fewer';
    }
    if (formData.dueDate && isNaN(Date.parse(formData.dueDate))) {
      newErrors.dueDate = 'Invalid date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (validate()) {
      onAdd(formData);
    }
  }

  return (
    <form className="milestone-form" onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor="milestone-title" className="form-label">Title <span className="required">*</span></label>
        <input
          id="milestone-title"
          type="text"
          className={`form-input ${errors.title ? 'error' : ''}`}
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Milestone title"
          maxLength={200}
          disabled={adding}
        />
        {errors.title && <span className="form-error">{errors.title}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="milestone-description" className="form-label">Description</label>
        <textarea
          id="milestone-description"
          className={`form-textarea ${errors.description ? 'error' : ''}`}
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Description (optional)"
          maxLength={2000}
          rows={3}
          disabled={adding}
        />
        {errors.description && <span className="form-error">{errors.description}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="milestone-dueDate" className="form-label">Due Date</label>
        <input
          id="milestone-dueDate"
          type="date"
          className={`form-input ${errors.dueDate ? 'error' : ''}`}
          value={formData.dueDate}
          onChange={(e) => handleChange('dueDate', e.target.value)}
          disabled={adding}
        />
        {errors.dueDate && <span className="form-error">{errors.dueDate}</span>}
      </div>

      <div className="form-actions">
        <button type="button" className="button button-secondary" onClick={onCancel} disabled={adding}>
          Cancel
        </button>
        <button type="submit" className="button button-primary" disabled={adding}>
          {adding ? 'Adding…' : 'Add Milestone'}
        </button>
      </div>
    </form>
  );
}

export default function MenteeGoalDetailPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { relationshipId, id } = useParams();
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updatingMilestones, setUpdatingMilestones] = useState(new Set());
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadGoal = useCallback(async () => {
    try {
      const data = await goalService.getMenteeGoal(relationshipId, id);
      setGoal(data.goal);
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

  async function handleUpdateGoal(field, value) {
    if (!goal || updating) return;
    setUpdating(true);
    setError('');
    setSuccess('');
    try {
      await goalService.updateGoal(relationshipId, id, { [field]: value });
      setSuccess('Goal updated.');
      setGoal((prev) => ({ ...prev, [field]: value }));
      if (field === 'status' && value === 'COMPLETED') {
        setGoal((prev) => ({ ...prev, completedAt: new Date().toISOString() }));
      } else if (field === 'status' && goal.status === 'COMPLETED') {
        setGoal((prev) => ({ ...prev, completedAt: null }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update goal.');
    } finally {
      setUpdating(false);
    }
  }

  async function handleAddMilestone(data) {
    setAddingMilestone(true);
    setError('');
    setSuccess('');
    try {
      await goalService.addMilestone(relationshipId, id, data);
      setSuccess('Milestone added.');
      setShowMilestoneForm(false);
      await loadGoal();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add milestone.');
    } finally {
      setAddingMilestone(false);
    }
  }

  async function handleUpdateMilestone(milestoneId, data) {
    setUpdatingMilestones((prev) => new Set(prev).add(milestoneId));
    setError('');
    setSuccess('');
    try {
      await goalService.updateMilestone(relationshipId, id, milestoneId, data);
      setSuccess('Milestone updated.');
      await loadGoal();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update milestone.');
    } finally {
      setUpdatingMilestones((prev) => {
        const next = new Set(prev);
        next.delete(milestoneId);
        return next;
      });
    }
  }

  async function handleStatusChange(newStatus) {
    if (!goal || updatingStatus) return;
    setUpdatingStatus(true);
    setError('');
    setSuccess('');
    try {
      await goalService.updateGoal(relationshipId, id, { status: newStatus });
      setSuccess(`Goal status changed to ${statusLabels[newStatus] || newStatus}.`);
      await loadGoal();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update goal status.');
    } finally {
      setUpdatingStatus(false);
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
        <Link className="button button-primary" to="/mentee/goals">
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
        <Link className="button button-primary" to="/mentee/goals">
          Back to Goals
        </Link>
      </section>
    );
  }

  const status = goal.status;
  const allowedTransitions = statusTransitions[status] || [];
  const canEdit = !['COMPLETED', 'ARCHIVED'].includes(status);
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
        <Link className="button button-secondary" to="/mentee/goals">
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

          {canEdit && (
            <div className="goal-detail-actions">
              <h3>Update Goal</h3>
              <div className="goal-edit-fields">
                <div className="form-field">
                  <label htmlFor="edit-title" className="form-label">Title</label>
                  <input
                    id="edit-title"
                    type="text"
                    className="form-input"
                    defaultValue={goal.title}
                    onBlur={(e) => handleUpdateGoal('title', e.target.value)}
                    disabled={updating}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="edit-description" className="form-label">Description</label>
                  <textarea
                    id="edit-description"
                    className="form-textarea"
                    defaultValue={goal.description}
                    onBlur={(e) => handleUpdateGoal('description', e.target.value)}
                    rows={3}
                    disabled={updating}
                  />
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="edit-category" className="form-label">Category</label>
                    <select
                      id="edit-category"
                      className="form-select"
                      defaultValue={goal.category}
                      onChange={(e) => handleUpdateGoal('category', e.target.value)}
                      disabled={updating}
                    >
                      <option value="SKILL">Skill</option>
                      <option value="CAREER">Career</option>
                      <option value="PERSONAL">Personal</option>
                      <option value="PROJECT">Project</option>
                      <option value="LEARNING">Learning</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label htmlFor="edit-priority" className="form-label">Priority</label>
                    <select
                      id="edit-priority"
                      className="form-select"
                      defaultValue={goal.priority}
                      onChange={(e) => handleUpdateGoal('priority', e.target.value)}
                      disabled={updating}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="edit-targetDate" className="form-label">Target Date</label>
                  <input
                    id="edit-targetDate"
                    type="date"
                    className="form-input"
                    defaultValue={goal.targetDate ? goal.targetDate.split('T')[0] : ''}
                    onBlur={(e) => handleUpdateGoal('targetDate', e.target.value || undefined)}
                    disabled={updating}
                  />
                </div>
              </div>

              {allowedTransitions.length > 0 && (
                <div className="goal-status-transition">
                  <h4>Change Status</h4>
                  <div className="status-buttons">
                    {allowedTransitions.map((nextStatus) => (
                      <button
                        key={nextStatus}
                        className={`button ${nextStatus === 'ARCHIVED' ? 'button-secondary' : 'button-primary'}`}
                        type="button"
                        onClick={() => handleStatusChange(nextStatus)}
                        disabled={updatingStatus}
                      >
                        {updatingStatus ? 'Updating…' : `Mark as ${statusLabels[nextStatus] || nextStatus}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="milestones-section">
            <div className="milestones-header">
              <h3>Milestones</h3>
              <button
                className="button button-primary"
                type="button"
                onClick={() => setShowMilestoneForm(true)}
                disabled={!canEdit || addingMilestone}
              >
                {addingMilestone ? 'Adding…' : 'Add Milestone'}
              </button>
            </div>

            {showMilestoneForm && (
              <div className="milestone-form-wrapper">
                <AddMilestoneForm
                  onAdd={handleAddMilestone}
                  onCancel={() => setShowMilestoneForm(false)}
                  adding={addingMilestone}
                />
              </div>
            )}

            {!goal.milestones?.length && !showMilestoneForm && (
              <p className="milestones-empty">No milestones yet. Add one to track progress.</p>
            )}

            <div className="milestones-list">
              {goal.milestones?.map((milestone) => (
                <MilestoneItem
                  key={milestone.id}
                  milestone={milestone}
                  onUpdate={handleUpdateMilestone}
                  updatingIds={updatingMilestones}
                />
              ))}
            </div>
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

          {goal.mentorFeedback && (
            <div className="mentor-feedback-card">
              <h3>Mentor Feedback</h3>
              <p className="mentor-feedback-text">{goal.mentorFeedback}</p>
              {goal.mentorFeedbackAt && (
                <p className="mentor-feedback-date">
                  {new Date(goal.mentorFeedbackAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}