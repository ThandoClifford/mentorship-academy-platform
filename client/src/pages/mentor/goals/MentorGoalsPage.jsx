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

function MenteeGoalsGroup({ menteeGoals, mentee, relationshipId, relationshipStatus }) {
  if (!menteeGoals.length) {
    return (
      <div className="mentee-goals-empty">
        <p>No goals yet for this mentee.</p>
      </div>
    );
  }

  return (
    <div className="mentee-goals-group">
      <div className="mentee-goals-header">
        <div className="mentee-info">
          {mentee?.profilePhoto ? (
            <img
              className="mentee-avatar"
              src={mentee.profilePhoto}
              alt=""
              loading="lazy"
            />
          ) : (
            <div className="mentee-avatar placeholder" aria-hidden="true">
              {mentee?.firstName?.[0]}{mentee?.lastName?.[0]}
            </div>
          )}
          <div>
            <h4 className="mentee-name">{mentee?.firstName} {mentee?.lastName}</h4>
            <p className="mentee-email">{mentee?.email}</p>
          </div>
        </div>
        <span className={`relationship-status ${statusColors[relationshipStatus] || ''}`}>
          {statusLabels[relationshipStatus] || relationshipStatus}
        </span>
      </div>

      <div className="mentee-goals-list">
        {menteeGoals.map((goal) => (
          <Link
            key={goal.id}
            className="mentor-goal-card"
            to={`/mentor/goals/${relationshipId}/${goal.id}`}
          >
            <div className="mentor-goal-main">
              <h4 className="mentor-goal-title">{goal.title}</h4>
              <div className="mentor-goal-meta">
                <span className={`mentor-goal-status ${statusColors[goal.status] || ''}`}>
                  {statusLabels[goal.status] || goal.status}
                </span>
                <span className="mentor-goal-category">
                  {categoryLabels[goal.category] || goal.category}
                </span>
                <span className="mentor-goal-priority priority-{goal.priority.toLowerCase()}">
                  {priorityLabels[goal.priority] || goal.priority}
                </span>
              </div>
            </div>
            <div className="mentor-goal-progress">
              <div className="progress-track-small">
                <div
                  className="progress-track-fill"
                  style={{ width: `${goal.progress ?? 0}%` }}
                ></div>
              </div>
              <span className="mentor-goal-percentage">{goal.progress ?? 0}%</span>
            </div>
            <div className="mentor-goal-target">
              {goal.targetDate ? (
                <span>Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
              ) : (
                <span className="no-target">No target date</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function RelationshipSelector({ relationships, selectedId, onSelect, loading }) {
  if (!relationships.length) {
    return (
      <div className="empty-state">
        <p>You don't have any mentorship relationships yet.</p>
      </div>
    );
  }

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
        {relationships.map((rel) => (
          <option key={rel.id} value={rel.id}>
            {rel.mentee?.firstName} {rel.mentee?.lastName} ({rel.status})
          </option>
        ))}
      </select>
    </div>
  );
}

export default function MentorGoalsPage() {
  const { user } = useAuth();
  const [relationships, setRelationships] = useState([]);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [relationshipsLoading, setRelationshipsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRelationships = useCallback(async () => {
    try {
      const data = await mentorshipService.getMentorMentorshipRelationships();
      setRelationships(data.relationships || []);
      if (data.relationships?.length && !selectedRelationshipId) {
        setSelectedRelationshipId(data.relationships[0].id);
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
      const data = await goalService.getMentorGoals(relationshipId);
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

  if (relationshipsLoading) {
    return (
      <section className="mentorship-page" role="status">
        <p className="mentorship-loading">Loading your relationships…</p>
      </section>
    );
  }

  const selectedRelationship = relationships.find((r) => r.id === selectedRelationshipId);

  return (
    <section className="mentorship-page">
      <header className="mentorship-page-header">
        <div>
          <span className="eyebrow">The Mentorship Academy</span>
          <h1>Goals</h1>
          <p>Review and support goals across your mentorship relationships.</p>
        </div>
      </header>

      {error && (
        <p className="mentorship-message mentorship-error" role="alert">
          {error}
        </p>
      )}

      <RelationshipSelector
        relationships={relationships}
        selectedId={selectedRelationshipId}
        onSelect={setSelectedRelationshipId}
        loading={relationshipsLoading}
      />

      {selectedRelationship && (
        <div className="mentor-goals-section">
          <h2>Goals for {selectedRelationship.mentee?.firstName} {selectedRelationship.mentee?.lastName}</h2>
          {loading ? (
            <p className="mentorship-loading">Loading goals…</p>
          ) : !goals.length ? (
            <div className="empty-state">
              <p>This mentee hasn't created any goals yet.</p>
            </div>
          ) : (
            <MenteeGoalsGroup
              menteeGoals={goals}
              mentee={selectedRelationship.mentee}
              relationshipId={selectedRelationshipId}
              relationshipStatus={selectedRelationship.status}
            />
          )}
        </div>
      )}
    </section>
  );
}