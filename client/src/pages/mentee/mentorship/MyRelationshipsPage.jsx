import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import * as mentorshipService from '../../../services/mentorshipService.js';

const statusLabels = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

const statusColors = {
  PENDING: 'status-pending',
  ACCEPTED: 'status-accepted',
  DECLINED: 'status-declined',
  ACTIVE: 'status-active',
  COMPLETED: 'status-completed',
  ARCHIVED: 'status-archived',
};

function RelationshipCard({
  relationship,
  onComplete,
  onArchive,
  completingIds,
  archivingIds,
}) {
  const status = relationship.status;
  const mentor = relationship.mentor;
  const isCompleting = completingIds.has(relationship.id);
  const isArchiving = archivingIds.has(relationship.id);
  const isProcessing = isCompleting || isArchiving;

  async function handleComplete() {
    if (isProcessing) return;
    await onComplete(relationship.id);
  }

  async function handleArchive() {
    if (isProcessing) return;
    if (!window.confirm('Are you sure you want to archive this completed relationship?')) return;
    await onArchive(relationship.id);
  }

  return (
    <article className="relationship-card">
      <div className="relationship-card-header">
        <div className="relationship-mentor-info">
          {mentor?.profilePhoto ? (
            <img
              className="relationship-avatar"
              src={mentor.profilePhoto}
              alt=""
              loading="lazy"
            />
          ) : (
            <div className="relationship-avatar placeholder" aria-hidden="true">
              {mentor?.firstName?.[0]}{mentor?.lastName?.[0]}
            </div>
          )}
          <div>
            <h3 className="relationship-mentor-name">
              {mentor?.firstName} {mentor?.lastName}
            </h3>
            <p className="relationship-mentor-title">
              {mentor?.jobTitle || 'Mentor'}{' '}
              {mentor?.company ? `at ${mentor.company}` : ''}
            </p>
          </div>
        </div>
        <span className={`relationship-status ${statusColors[status] || ''}`}>
          {statusLabels[status] || status}
        </span>
      </div>

      <div className="relationship-details">
        <dl className="relationship-meta">
          <dt>Started</dt>
          <dd>
            {relationship.startedAt
              ? new Date(relationship.startedAt).toLocaleDateString()
              : relationship.requestedAt
              ? new Date(relationship.requestedAt).toLocaleDateString()
              : '—'}
          </dd>
          {relationship.completedAt && (
            <>
              <dt>Completed</dt>
              <dd>{new Date(relationship.completedAt).toLocaleDateString()}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="relationship-actions">
        <Link
          className="button button-primary"
          to={`/mentee/mentorship/relationships/${relationship.id}`}
        >
          View Relationship
        </Link>
        {status === 'ACTIVE' && (
          <button
            className="button button-secondary"
            type="button"
            onClick={handleComplete}
            disabled={isProcessing}
          >
            {isCompleting ? 'Completing…' : 'Complete'}
          </button>
        )}
        {status === 'COMPLETED' && (
          <button
            className="button button-secondary"
            type="button"
            onClick={handleArchive}
            disabled={isProcessing}
          >
            {isArchiving ? 'Archiving…' : 'Archive'}
          </button>
        )}
      </div>
    </article>
  );
}

export default function MyRelationshipsPage() {
  const { user } = useAuth();
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completingIds, setCompletingIds] = useState(new Set());
  const [archivingIds, setArchivingIds] = useState(new Set());

  const loadRelationships = useCallback(async () => {
    try {
      const data = await mentorshipService.getMyMentorshipRelationships();
      setRelationships(data.relationships || []);
    } catch (err) {
      setError('Could not load your relationships.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await mentorshipService.getMyMentorshipRelationships();
        if (active) setRelationships(data.relationships || []);
      } catch (err) {
        if (active) setError('Could not load your relationships.');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, []);

  async function handleComplete(id) {
    setCompletingIds((prev) => new Set(prev).add(id));
    setError('');
    try {
      await mentorshipService.completeMentorshipRelationship(id);
      // Refresh the list to get updated status
      await loadRelationships();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Could not complete relationship.'
      );
    } finally {
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleArchive(id) {
    setArchivingIds((prev) => new Set(prev).add(id));
    setError('');
    try {
      await mentorshipService.archiveMentorshipRelationship(id);
      await loadRelationships();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Could not archive relationship.'
      );
    } finally {
      setArchivingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  if (loading) {
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
          <h1>My Relationships</h1>
          <p>View and manage your active and past mentorship relationships.</p>
        </div>
      </header>

      {error && (
        <p className="mentorship-message mentorship-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !relationships.length && (
        <div className="empty-state">
          <p>You don't have any mentorship relationships yet.</p>
          <Link className="button button-primary" to="/mentee/mentorship/request">
            Find a Mentor
          </Link>
        </div>
      )}

      <div className="relationship-list" role="list">
        {relationships.map((relationship) => (
          <RelationshipCard
            key={relationship.id}
            relationship={relationship}
            onComplete={handleComplete}
            onArchive={handleArchive}
            completingIds={completingIds}
            archivingIds={archivingIds}
          />
        ))}
      </div>
    </section>
  );
}