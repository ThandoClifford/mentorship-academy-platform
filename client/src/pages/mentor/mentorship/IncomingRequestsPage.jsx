import { useState, useEffect } from 'react';
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

function RequestCard({ request, onAccept, onDecline, acceptingIds, decliningIds }) {
  const mentee = request.mentee;
  const isAccepting = acceptingIds.has(request.id);
  const isDeclining = decliningIds.has(request.id);
  const isProcessing = isAccepting || isDeclining;

  async function handleAccept() {
    if (isProcessing) return;
    await onAccept(request.id);
  }

  async function handleDecline() {
    if (isProcessing) return;
    if (!window.confirm('Are you sure you want to decline this request?')) return;
    await onDecline(request.id);
  }

  return (
    <article className="request-card">
      <div className="request-card-header">
        <div className="request-mentee-info">
          {mentee?.profilePhoto ? (
            <img
              className="request-avatar"
              src={mentee.profilePhoto}
              alt=""
              loading="lazy"
            />
          ) : (
            <div className="request-avatar placeholder" aria-hidden="true">
              {mentee?.firstName?.[0]}{mentee?.lastName?.[0]}
            </div>
          )}
          <div>
            <h3 className="request-mentee-name">
              {mentee?.firstName} {mentee?.lastName}
            </h3>
            <p className="request-mentee-email">{mentee?.email}</p>
            <p className="request-mentee-stage">
              {mentee?.careerStage ? `Career stage: ${mentee.careerStage}` : ''}
            </p>
          </div>
        </div>
        <span className="request-status status-pending">Pending</span>
      </div>

      {request.requestMessage && (
        <div className="request-message">
          <strong>Message:</strong>
          <p>{request.requestMessage}</p>
        </div>
      )}

      <div className="request-meta">
        <dl>
          <dt>Requested</dt>
          <dd>{new Date(request.requestedAt).toLocaleDateString()}</dd>
          {mentee?.institution && (
            <>
              <dt>Institution</dt>
              <dd>{mentee.institution}</dd>
            </>
          )}
          {mentee?.fieldOfStudy && (
            <>
              <dt>Field of Study</dt>
              <dd>{mentee.fieldOfStudy}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="request-actions">
        <button
          className="button button-primary"
          onClick={handleAccept}
          disabled={isProcessing}
        >
          {isAccepting ? 'Accepting…' : 'Accept'}
        </button>
        <button
          className="button button-secondary button-danger"
          onClick={handleDecline}
          disabled={isProcessing}
        >
          {isDeclining ? 'Declining…' : 'Decline'}
        </button>
      </div>
    </article>
  );
}

export default function IncomingRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acceptingIds, setAcceptingIds] = useState(new Set());
  const [decliningIds, setDecliningIds] = useState(new Set());

  useEffect(() => {
    let active = true;

    async function loadRequests() {
      try {
        const data = await mentorshipService.getMentorMentorshipRequests();
        if (active) setRequests(data.relationships || []);
      } catch (err) {
        if (active) setError('Could not load incoming requests.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRequests();
    return () => { active = false; };
  }, []);

  async function handleAccept(id) {
    setAcceptingIds((prev) => new Set(prev).add(id));
    setError('');
    try {
      await mentorshipService.acceptMentorshipRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(
        err.response?.data?.message || 'Could not accept request.'
      );
    } finally {
      setAcceptingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleDecline(id) {
    setDecliningIds((prev) => new Set(prev).add(id));
    setError('');
    try {
      await mentorshipService.declineMentorshipRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(
        err.response?.data?.message || 'Could not decline request.'
      );
    } finally {
      setDecliningIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <section className="mentorship-page" role="status">
        <p className="mentorship-loading">Loading requests…</p>
      </section>
    );
  }

  return (
    <section className="mentorship-page">
      <header className="mentorship-page-header">
        <div>
          <span className="eyebrow">The Mentorship Academy</span>
          <h1>Incoming Requests</h1>
          <p>Review and respond to mentorship requests from mentees.</p>
        </div>
      </header>

      {error && (
        <p className="mentorship-message mentorship-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !requests.length && (
        <div className="empty-state">
          <p>No pending mentorship requests.</p>
        </div>
      )}

      <div className="request-list" role="list">
        {requests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            onAccept={handleAccept}
            onDecline={handleDecline}
            acceptingIds={acceptingIds}
            decliningIds={decliningIds}
          />
        ))}
      </div>
    </section>
  );
}