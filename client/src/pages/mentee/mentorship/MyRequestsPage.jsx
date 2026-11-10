import { useState, useEffect } from 'react';
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

function RequestCard({ request }) {
  const status = request.status;
  const mentor = request.mentor;

  return (
    <article className="request-card">
      <div className="request-card-header">
        <div className="request-mentor-info">
          {mentor?.profilePhoto ? (
            <img
              className="request-avatar"
              src={mentor.profilePhoto}
              alt=""
              loading="lazy"
            />
          ) : (
            <div className="request-avatar placeholder" aria-hidden="true">
              {mentor?.firstName?.[0]}{mentor?.lastName?.[0]}
            </div>
          )}
          <div>
            <h3 className="request-mentor-name">
              {mentor?.firstName} {mentor?.lastName}
            </h3>
            <p className="request-mentor-title">
              {mentor?.jobTitle || 'Mentor'}{' '}
              {mentor?.company ? `at ${mentor.company}` : ''}
            </p>
          </div>
        </div>
        <span className={`request-status ${statusColors[status] || ''}`}>
          {statusLabels[status] || status}
        </span>
      </div>

      <div className="request-details">
        <dl className="request-meta">
          <dt>Requested</dt>
          <dd>{new Date(request.requestedAt).toLocaleDateString()}</dd>
          {request.respondedAt && (
            <>
              <dt>Responded</dt>
              <dd>{new Date(request.respondedAt).toLocaleDateString()}</dd>
            </>
          )}
        </dl>
        {request.requestMessage && (
          <div className="request-message">
            <strong>Your message:</strong>
            <p>{request.requestMessage}</p>
          </div>
        )}
      </div>

      <div className="request-actions">
        {status === 'PENDING' && (
          <span className="request-pending-note">
            Awaiting mentor response…
          </span>
        )}
        {status === 'ACCEPTED' && (
          <Link
            className="button button-primary"
            to={`/mentee/mentorship/relationships/${request.id}`}
          >
            View Relationship
          </Link>
        )}
        {status === 'DECLINED' && (
          <span className="request-declined-note">
            This request was declined.
          </span>
        )}
        {['ACTIVE', 'COMPLETED', 'ARCHIVED'].includes(status) && (
          <Link
            className="button button-primary"
            to={`/mentee/mentorship/relationships/${request.id}`}
          >
            View Relationship
          </Link>
        )}
      </div>
    </article>
  );
}

export default function MyRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadRequests() {
      try {
        const data = await mentorshipService.getMyMentorshipRequests();
        if (active) setRequests(data.relationships || []);
      } catch (err) {
        if (active) setError('Could not load your requests.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRequests();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <section className="mentorship-page" role="status">
        <p className="mentorship-loading">Loading your requests…</p>
      </section>
    );
  }

  return (
    <section className="mentorship-page">
      <header className="mentorship-page-header">
        <div>
          <span className="eyebrow">The Mentorship Academy</span>
          <h1>My Requests</h1>
          <p>Track the status of your mentorship requests.</p>
        </div>
        <Link className="button button-primary" to="/mentee/mentorship/request">
          Request a Mentor
        </Link>
      </header>

      {error && (
        <p className="mentorship-message mentorship-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !requests.length && (
        <div className="empty-state">
          <p>You haven't sent any mentorship requests yet.</p>
          <Link className="button button-primary" to="/mentee/mentorship/request">
            Find a Mentor
          </Link>
        </div>
      )}

      <div className="request-list" role="list">
        {requests.map((request) => (
          <RequestCard key={request.id} request={request} />
        ))}
      </div>
    </section>
  );
}