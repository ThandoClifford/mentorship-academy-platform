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
  onActivate,
  onComplete,
  onArchive,
  activatingIds,
  completingIds,
  archivingIds,
}) {
  const status = relationship.status;
  const mentee = relationship.mentee;
  const isActivating = activatingIds.has(relationship.id);
  const isCompleting = completingIds.has(relationship.id);
  const isArchiving = archivingIds.has(relationship.id);
  const isProcessing = isActivating || isCompleting || isArchiving;

  async function handleActivate() {
    if (isProcessing) return;
    await onActivate(relationship.id);
  }

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
        <div className="relationship-mentee-info">
          {mentee?.profilePhoto ? (
            <img
              className="relationship-avatar"
              src={mentee.profilePhoto}
              alt=""
              loading="lazy"
            />
          ) : (
            <div className="relationship-avatar placeholder" aria-hidden="true">
              {mentee?.firstName?.[0]}{mentee?.lastName?.[0]}
            </div>
          )}
          <div>
            <h3 className="relationship-mentee-name">
              {mentee?.firstName} {mentee?.lastName}
            </h3>
            <p className="relationship-mentee-email">{mentee?.email}</p>
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
          to={`/mentor/mentorship/relationships/${relationship.id}`}
        >
          View Relationship
        </Link>
        {status === 'ACCEPTED' && (
          <button
            className="button button-secondary"
            type="button"
            onClick={handleActivate}
            disabled={isProcessing}
          >
            {isActivating ? 'Activating…' : 'Activate'}
          </button>
        )}
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

export default function MyRelationshipsPage({ pageTitle = 'My Relationships' }) {
  const { user } = useAuth();
  const [relationships, setRelationships] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestsLoading, setRequestsLoading] = useState(pageTitle === 'My Mentees');
  const [requestsError, setRequestsError] = useState('');
  const [activatingIds, setActivatingIds] = useState(new Set());
  const [completingIds, setCompletingIds] = useState(new Set());
  const [archivingIds, setArchivingIds] = useState(new Set());

  const loadRelationships = useCallback(async () => {
    try {
      const data = await mentorshipService.getMentorMentorshipRelationships();
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
        const data = await mentorshipService.getMentorMentorshipRelationships();
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

  useEffect(() => {
    if (pageTitle !== 'My Mentees') return undefined;
    let active = true;

    async function loadRequests() {
      try {
        const data = await mentorshipService.getMentorMentorshipRequests();
        if (active) {
          setPendingRequests(
            (data.relationships || []).filter((relationship) => relationship.status === 'PENDING'),
          );
        }
      } catch {
        if (active) setRequestsError('Could not load pending requests.');
      } finally {
        if (active) setRequestsLoading(false);
      }
    }

    loadRequests();
    return () => { active = false; };
  }, [pageTitle]);

  async function handleActivate(id) {
    setActivatingIds((prev) => new Set(prev).add(id));
    setError('');
    try {
      await mentorshipService.activateMentorshipRelationship(id);
      await loadRelationships();
    } catch (err) {
      setError(
        err.response?.data?.message || 'Could not activate relationship.'
      );
    } finally {
      setActivatingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleComplete(id) {
    setCompletingIds((prev) => new Set(prev).add(id));
    setError('');
    try {
      await mentorshipService.mentorCompleteMentorshipRelationship(id);
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
      await mentorshipService.mentorArchiveMentorshipRelationship(id);
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
          <h1>{pageTitle}</h1>
          <p>
            {pageTitle === 'My Mentees'
              ? 'View your active and past mentees and their mentorship status.'
              : 'View and manage your mentorship relationships with mentees.'}
          </p>
        </div>
        {pageTitle === 'My Mentees' && (
          <Link className="button button-secondary" to="/mentor/mentorship/requests">
            Review Requests{pendingRequests.length ? ` (${pendingRequests.length})` : ''}
          </Link>
        )}
      </header>

      {error && (
        <p className="mentorship-message mentorship-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !relationships.length && (
        <div className="empty-state">
          <p>There are currently no active mentees.</p>
          <Link className="button button-primary" to="/mentor/mentorship/requests">
            Review incoming requests
          </Link>
        </div>
      )}

      <div className="relationship-list" role="list">
        {relationships.map((relationship) => (
          <RelationshipCard
            key={relationship.id}
            relationship={relationship}
            onActivate={handleActivate}
            onComplete={handleComplete}
            onArchive={handleArchive}
            activatingIds={activatingIds}
            completingIds={completingIds}
            archivingIds={archivingIds}
          />
        ))}
      </div>

      {pageTitle === 'My Mentees' && (
        <section className="mentor-pending-mentees" aria-labelledby="mentor-pending-mentees-title">
          <header className="mentorship-page-header">
            <div>
              <span className="eyebrow">Needs your attention</span>
              <h2 id="mentor-pending-mentees-title">Pending requests</h2>
            </div>
            <Link className="button button-secondary" to="/mentor/mentorship/requests">
              Open request workflow
            </Link>
          </header>
          {requestsLoading ? (
            <p className="mentorship-loading" role="status">Loading pending requests…</p>
          ) : requestsError ? (
            <p className="mentorship-message mentorship-error" role="alert">{requestsError}</p>
          ) : pendingRequests.length ? (
            <div className="relationship-list" role="list">
              {pendingRequests.map((request) => (
                <article className="relationship-card" key={request.id}>
                  <div className="relationship-card-header">
                    <div className="relationship-mentee-info">
                      <div className="relationship-avatar placeholder" aria-hidden="true">
                        {request.mentee?.firstName?.[0]}{request.mentee?.lastName?.[0]}
                      </div>
                      <div>
                        <h3 className="relationship-mentee-name">
                          {request.mentee?.firstName} {request.mentee?.lastName}
                        </h3>
                        <p className="relationship-mentee-email">Incoming mentorship request</p>
                      </div>
                    </div>
                    <span className="relationship-status status-pending">Pending</span>
                  </div>
                  {request.requestMessage && (
                    <p className="mentor-pending-request-message">{request.requestMessage}</p>
                  )}
                  <div className="relationship-actions">
                    <Link className="button button-primary" to="/mentor/mentorship/requests">
                      Review Request
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No pending incoming requests.</p>
            </div>
          )}
        </section>
      )}
    </section>
  );
}