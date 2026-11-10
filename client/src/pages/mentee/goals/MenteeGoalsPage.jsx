import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import * as mentorshipService from '../../../services/mentorshipService.js';
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

function GoalCard({ goal, onView }) {
  const status = goal.status;
  const progress = goal.progress ?? 0;
  const totalMilestones = goal.milestones?.length ?? 0;
  const completedMilestones = goal.milestones?.filter((m) => m.status === 'COMPLETED').length ?? 0;

  return (
    <article className="goal-card">
      <div className="goal-card-header">
        <div>
          <h3 className="goal-title">{goal.title}</h3>
          <p className="goal-category">{categoryLabels[goal.category] || goal.category}</p>
        </div>
        <span className={`goal-status ${statusColors[status] || ''}`}>
          {statusLabels[status] || status}
        </span>
      </div>

      <div className="goal-meta">
        <div className="goal-meta-item">
          <span className="goal-meta-label">Priority</span>
          <span className="goal-meta-value">{priorityLabels[goal.priority] || goal.priority}</span>
        </div>
        <div className="goal-meta-item">
          <span className="goal-meta-label">Target Date</span>
          <span className="goal-meta-value">
            {goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : '—'}
          </span>
        </div>
        <div className="goal-meta-item">
          <span className="goal-meta-label">Progress</span>
          <span className="goal-meta-value">{progress}%</span>
        </div>
      </div>

      {totalMilestones > 0 && (
        <div className="goal-milestones-summary">
          <div className="progress-track">
            <div
              className="progress-track-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="milestones-count">
            {completedMilestones} of {totalMilestones} milestones completed
          </span>
        </div>
      )}

      <div className="goal-actions">
        <Link
          className="button button-primary"
          to={`/mentee/goals/${goal.mentorshipRelationship}/${goal.id}`}
          onClick={(e) => {
            e.preventDefault();
            onView(goal);
          }}
        >
          View Goal
        </Link>
      </div>
    </article>
  );
}

function RelationshipSelector({ relationships, selectedId, onSelect, loading }) {
  if (!relationships.length) {
    return (
      <div className="empty-state">
        <p>You don't have any active mentorship relationships yet.</p>
        <Link className="button button-primary" to="/mentee/mentorship/request">
          Find a Mentor
        </Link>
      </div>
    );
  }

  const eligibleRelationships = relationships.filter(
    (r) => r.status === 'ACCEPTED' || r.status === 'ACTIVE'
  );

  return (
    <div className="relationship-selector">
      <label className="relationship-selector-label" htmlFor="relationship-select">
        Select Relationship
      </label>
      <select
        id="relationship-select"
        className="relationship-selector-select"
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value || null)}
        disabled={loading}
      >
        <option value="">Choose a mentorship relationship…</option>
        {eligibleRelationships.map((rel) => (
          <option key={rel.id} value={rel.id}>
            {rel.mentor?.firstName} {rel.mentor?.lastName} ({rel.status})
          </option>
        ))}
      </select>
      {eligibleRelationships.length === 0 && (
        <p className="relationship-selector-note">
          You need an ACCEPTED or ACTIVE relationship to manage goals.
        </p>
      )}
    </div>
  );
}

function GoalForm({ relationshipId, onSubmit, onCancel, submitting }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'SKILL',
    priority: 'MEDIUM',
    targetDate: '',
  });
  const [errors, setErrors] = useState({});

  function validate() {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (formData.title.length > 200) newErrors.title = 'Title must be 200 characters or fewer';
    if (formData.description && formData.description.length > 2000) {
      newErrors.description = 'Description must be 2000 characters or fewer';
    }
    if (formData.targetDate && isNaN(Date.parse(formData.targetDate))) {
      newErrors.targetDate = 'Invalid date';
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
      onSubmit(formData);
    }
  }

  return (
    <form className="goal-form" onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor="goal-title" className="form-label">Title <span className="required">*</span></label>
        <input
          id="goal-title"
          type="text"
          className={`form-input ${errors.title ? 'error' : ''}`}
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Enter goal title"
          maxLength={200}
          disabled={submitting}
        />
        {errors.title && <span className="form-error">{errors.title}</span>}
      </div>

      <div className="form-field">
        <label htmlFor="goal-description" className="form-label">Description</label>
        <textarea
          id="goal-description"
          className={`form-textarea ${errors.description ? 'error' : ''}`}
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Describe your goal (optional)"
          maxLength={2000}
          rows={4}
          disabled={submitting}
        />
        {errors.description && <span className="form-error">{errors.description}</span>}
      </div>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="goal-category" className="form-label">Category <span className="required">*</span></label>
          <select
            id="goal-category"
            className="form-select"
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            disabled={submitting}
          >
            <option value="SKILL">Skill</option>
            <option value="CAREER">Career</option>
            <option value="PERSONAL">Personal</option>
            <option value="PROJECT">Project</option>
            <option value="LEARNING">Learning</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="goal-priority" className="form-label">Priority</label>
          <select
            id="goal-priority"
            className="form-select"
            value={formData.priority}
            onChange={(e) => handleChange('priority', e.target.value)}
            disabled={submitting}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="goal-targetDate" className="form-label">Target Date</label>
        <input
          id="goal-targetDate"
          type="date"
          className={`form-input ${errors.targetDate ? 'error' : ''}`}
          value={formData.targetDate}
          onChange={(e) => handleChange('targetDate', e.target.value)}
          disabled={submitting}
        />
        {errors.targetDate && <span className="form-error">{errors.targetDate}</span>}
      </div>

      <div className="form-actions">
        <button type="button" className="button button-secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="button button-primary" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create Goal'}
        </button>
      </div>
    </form>
  );
}

export default function MenteeGoalsPage() {
  const { user } = useAuth();
  const [relationships, setRelationships] = useState([]);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [relationshipsLoading, setRelationshipsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  const loadRelationships = useCallback(async () => {
    try {
      const data = await mentorshipService.getMyMentorshipRelationships();
      setRelationships(data.relationships || []);
      if (data.relationships?.length && !selectedRelationshipId) {
        const eligible = data.relationships.find((r) => r.status === 'ACCEPTED' || r.status === 'ACTIVE');
        if (eligible) setSelectedRelationshipId(eligible.id);
      }
    } catch (err) {
      setError('Could not load relationships.');
    } finally {
      setRelationshipsLoading(false);
    }
  }, [selectedRelationshipId]);

  const loadGoals = useCallback(async (relationshipId) => {
    if (!relationshipId) return;
    setLoading(true);
    setError('');
    try {
      const data = await goalService.getMenteeGoals(relationshipId);
      setGoals(data.goals || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load goals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRelationships();
  }, [loadRelationships]);

  useEffect(() => {
    if (selectedRelationshipId) {
      loadGoals(selectedRelationshipId);
    } else {
      setGoals([]);
      setLoading(false);
    }
  }, [selectedRelationshipId, loadGoals]);

  async function handleCreateGoal(data) {
    if (!selectedRelationshipId) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await goalService.createGoal(selectedRelationshipId, data);
      setSuccess('Goal created successfully.');
      setShowCreateForm(false);
      await loadGoals(selectedRelationshipId);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create goal.');
    } finally {
      setSubmitting(false);
    }
  }

  if (relationshipsLoading) {
    return (
      <section className="mentorship-page" role="status">
        <p className="mentorship-loading">Loading your relationships…</p>
      </section>
    );
  }

  return (
    <section className="mentorship-page">
      <header className="mentorship-page-header">
        <div>
          <span className="eyebrow">The Mentorship Academy</span>
          <h1>My Goals</h1>
          <p>Set and track goals within your mentorship relationships.</p>
        </div>
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

      <RelationshipSelector
        relationships={relationships}
        selectedId={selectedRelationshipId}
        onSelect={setSelectedRelationshipId}
        loading={relationshipsLoading}
      />

      {selectedRelationshipId && (
        <div className="goals-section">
          <div className="goals-section-header">
            <h2>Goals</h2>
            <button
              className="button button-primary"
              type="button"
              onClick={() => setShowCreateForm(true)}
            >
              Create Goal
            </button>
          </div>

          {showCreateForm && (
            <div className="goal-form-wrapper">
              <GoalForm
                relationshipId={selectedRelationshipId}
                onSubmit={handleCreateGoal}
                onCancel={() => setShowCreateForm(false)}
                submitting={submitting}
              />
            </div>
          )}

          {loading ? (
            <p className="mentorship-loading">Loading goals…</p>
          ) : !goals.length ? (
            <div className="empty-state">
              <p>No goals yet for this relationship.</p>
              <button
                className="button button-primary"
                type="button"
                onClick={() => setShowCreateForm(true)}
              >
                Create Your First Goal
              </button>
            </div>
          ) : (
            <div className="goals-list" role="list">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onView={() => {}}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}