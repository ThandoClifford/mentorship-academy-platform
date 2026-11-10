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

const categoryLabels = {
  SKILL: 'Skill',
  CAREER: 'Career',
  PERSONAL: 'Personal',
  PROJECT: 'Project',
  LEARNING: 'Learning',
};

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString();
}

function isUpcoming(targetDate) {
  if (!targetDate) return false;
  const target = new Date(targetDate);
  const now = new Date();
  const diff = target - now;
  return diff > 0 && diff <= 30 * 24 * 60 * 60 * 1000; // within 30 days
}

function isOverdue(targetDate, status) {
  if (!targetDate) return false;
  if (status === 'COMPLETED' || status === 'ARCHIVED') return false;
  return new Date(targetDate) < new Date();
}

export default function MenteeProgressPage() {
  const { user } = useAuth();
  const [relationships, setRelationships] = useState([]);
  const [allGoals, setAllGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const relData = await mentorshipService.getMyMentorshipRelationships();
      const rels = relData.relationships || [];
      setRelationships(rels);

      const goalsPromises = rels
        .filter((r) => r.status === 'ACCEPTED' || r.status === 'ACTIVE' || r.status === 'COMPLETED' || r.status === 'ARCHIVED')
        .map((rel) => goalService.getMenteeGoals(rel.id).catch(() => ({ goals: [] })));

      const goalsResults = await Promise.all(goalsPromises);
      const flatGoals = goalsResults.flatMap((r) => (r.goals || []).map((g) => ({
        ...g,
        relationshipId: g.mentorshipRelationship,
        mentorName: rels.find((rel) => rel.id === g.mentorshipRelationship)?.mentor
          ? `${rels.find((rel) => rel.id === g.mentorshipRelationship).mentor.firstName} ${rels.find((rel) => rel.id === g.mentorshipRelationship).mentor.lastName}`
          : 'Unknown Mentor',
        relationshipStatus: rels.find((rel) => rel.id === g.mentorshipRelationship)?.status,
      })));
      setAllGoals(flatGoals);
    } catch (err) {
      setError('Could not load progress data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <section className="mentorship-page" role="status">
        <p className="mentorship-loading">Loading your progress…</p>
      </section>
    );
  }

  const activeGoals = allGoals.filter((g) => g.status === 'ACTIVE');
  const completedGoals = allGoals.filter((g) => g.status === 'COMPLETED');
  const draftGoals = allGoals.filter((g) => g.status === 'DRAFT');
  const onHoldGoals = allGoals.filter((g) => g.status === 'ON_HOLD');
  const archivedGoals = allGoals.filter((g) => g.status === 'ARCHIVED');

  const totalMilestones = allGoals.reduce((sum, g) => sum + (g.milestones?.length || 0), 0);
  const completedMilestones = allGoals.reduce(
    (sum, g) => sum + (g.milestones?.filter((m) => m.status === 'COMPLETED').length || 0),
    0
  );
  const overallProgress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  const upcomingGoals = allGoals.filter((g) => isUpcoming(g.targetDate) && g.status !== 'COMPLETED' && g.status !== 'ARCHIVED');
  const overdueGoals = allGoals.filter((g) => isOverdue(g.targetDate, g.status));

  const recentGoals = [...allGoals]
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
    .slice(0, 5);

  return (
    <section className="mentorship-page">
      <header className="mentorship-page-header">
        <div>
          <span className="eyebrow">The Mentorship Academy</span>
          <h1>My Progress</h1>
          <p>Track your growth across all mentorship relationships.</p>
        </div>
        <Link className="button button-secondary" to="/mentee/goals">
          Manage Goals
        </Link>
      </header>

      {error && (
        <p className="mentorship-message mentorship-error" role="alert">
          {error}
        </p>
      )}

      {!relationships.length && (
        <div className="empty-state">
          <p>You don't have any mentorship relationships yet.</p>
          <Link className="button button-primary" to="/mentee/mentorship/request">
            Find a Mentor
          </Link>
        </div>
      )}

      {relationships.length && !allGoals.length && (
        <div className="empty-state">
          <p>No goals created yet. Start tracking your progress by creating goals.</p>
          <Link className="button button-primary" to="/mentee/goals">
            Create Your First Goal
          </Link>
        </div>
      )}

      <div className="progress-stats-grid">
        <article className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <span className="stat-value">{allGoals.length}</span>
            <span className="stat-label">Total Goals</span>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon">▶️</div>
          <div className="stat-content">
            <span className="stat-value">{activeGoals.length}</span>
            <span className="stat-label">Active</span>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <span className="stat-value">{completedGoals.length}</span>
            <span className="stat-label">Completed</span>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <span className="stat-value">{overallProgress}%</span>
            <span className="stat-label">Milestone Progress</span>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon">📍</div>
          <div className="stat-content">
            <span className="stat-value">{upcomingGoals.length}</span>
            <span className="stat-label">Upcoming Targets</span>
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <span className="stat-value">{overdueGoals.length}</span>
            <span className="stat-label">Overdue</span>
          </div>
        </article>
      </div>

      <div className="progress-overall">
        <h2>Overall Milestone Progress</h2>
        <div className="progress-track-large">
          <div
            className="progress-track-fill"
            style={{ width: `${overallProgress}%` }}
          ></div>
        </div>
        <p className="progress-summary">
          {completedMilestones} of {totalMilestones} milestones completed across all relationships
        </p>
      </div>

      {(upcomingGoals.length || overdueGoals.length) && (
        <section className="progress-alerts">
          {upcomingGoals.length && (
            <div className="alert-section">
              <h3>Upcoming Target Dates (Next 30 Days)</h3>
              <div className="alert-goals-list">
                {upcomingGoals.map((goal) => (
                  <Link
                    key={goal.id}
                    className="alert-goal-item"
                    to={`/mentee/goals/${goal.relationshipId}/${goal.id}`}
                  >
                    <span className="alert-goal-title">{goal.title}</span>
                    <span className="alert-goal-date">Due: {formatDate(goal.targetDate)}</span>
                    <span className={`alert-goal-status ${statusColors[goal.status] || ''}`}>
                      {statusLabels[goal.status] || goal.status}
                    </span>
                    <span className="alert-goal-mentor">{goal.mentorName}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {overdueGoals.length && (
            <div className="alert-section alert-overdue">
              <h3>Overdue Goals</h3>
              <div className="alert-goals-list">
                {overdueGoals.map((goal) => (
                  <Link
                    key={goal.id}
                    className="alert-goal-item"
                    to={`/mentee/goals/${goal.relationshipId}/${goal.id}`}
                  >
                    <span className="alert-goal-title">{goal.title}</span>
                    <span className="alert-goal-date">Was due: {formatDate(goal.targetDate)}</span>
                    <span className={`alert-goal-status ${statusColors[goal.status] || ''}`}>
                      {statusLabels[goal.status] || goal.status}
                    </span>
                    <span className="alert-goal-mentor">{goal.mentorName}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="progress-recent">
        <div className="section-header">
          <h2>Recent Activity</h2>
          <Link className="text-link" to="/mentee/goals">
            View All Goals <span aria-hidden="true">→</span>
          </Link>
        </div>
        {!recentGoals.length ? (
          <p className="empty-state">No recent goal activity.</p>
        ) : (
          <div className="recent-goals-list">
            {recentGoals.map((goal) => (
              <Link
                key={goal.id}
                className="recent-goal-item"
                to={`/mentee/goals/${goal.relationshipId}/${goal.id}`}
              >
                <div className="recent-goal-info">
                  <h4 className="recent-goal-title">{goal.title}</h4>
                  <p className="recent-goal-meta">
                    <span className={`recent-goal-status ${statusColors[goal.status] || ''}`}>
                      {statusLabels[goal.status] || goal.status}
                    </span>
                    <span className="recent-goal-category">{categoryLabels[goal.category] || goal.category}</span>
                    <span className="recent-goal-mentor">{goal.mentorName}</span>
                  </p>
                </div>
                <div className="recent-goal-progress">
                  <div className="progress-track-small">
                    <div
                      className="progress-track-fill"
                      style={{ width: `${goal.progress ?? 0}%` }}
                    ></div>
                  </div>
                  <span className="recent-goal-percentage">{goal.progress ?? 0}%</span>
                </div>
                <p className="recent-goal-updated">
                  Updated {formatDate(goal.updatedAt)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="progress-by-category">
        <h2>Goals by Category</h2>
        <div className="category-breakdown">
          {Object.entries(categoryLabels).map(([key, label]) => {
            const categoryGoals = allGoals.filter((g) => g.category === key);
            if (!categoryGoals.length) return null;
            const catCompleted = categoryGoals.filter((g) => g.status === 'COMPLETED').length;
            const catActive = categoryGoals.filter((g) => g.status === 'ACTIVE').length;
            const catProgress = categoryGoals.length > 0
              ? Math.round(
                  categoryGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / categoryGoals.length
                )
              : 0;
            return (
              <article key={key} className="category-card">
                <h3 className="category-title">{label}</h3>
                <div className="category-stats">
                  <span className="category-total">{categoryGoals.length} goals</span>
                  <div className="category-breakdown-row">
                    <span className="category-active">Active: {catActive}</span>
                    <span className="category-completed">Completed: {catCompleted}</span>
                  </div>
                  <div className="category-progress">
                    <div className="progress-track-small">
                      <div
                        className="progress-track-fill"
                        style={{ width: `${catProgress}%` }}
                      ></div>
                    </div>
                    <span>{catProgress}% avg progress</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}