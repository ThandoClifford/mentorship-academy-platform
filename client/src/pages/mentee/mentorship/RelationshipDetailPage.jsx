import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
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

export default function MenteeRelationshipDetailPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [relationship, setRelationship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completing, setCompleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    async function loadRelationship() {
      try {
        const data = await mentorshipService.getMentorshipRelationship(id);
        if (active) setRelationship(data.relationship);
      } catch (err) {
        if (active) {
          if (err.response?.status === 404) {
            setError('Relationship not found.');
          } else if (err.response?.status === 403) {
            setError('You are not authorized to view this relationship.');
          } else {
            setError('Could not load relationship details.');
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRelationship();
    return () => { active = false; };
  }, [id]);

  async function handleComplete() {
    if (!window.confirm('Are you sure you want to mark this relationship as completed?')) return;
    setCompleting(true);
    setError('');
    setSuccess('');
    try {
      await mentorshipService.completeMentorshipRelationship(id);
      setSuccess('Relationship marked as completed.');
      const data = await mentorshipService.getMentorshipRelationship(id);
      setRelationship(data.relationship);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not complete relationship.');
    } finally {
      setCompleting(false);
    }
  }

  async function handleArchive() {
    if (!window.confirm('Are you sure you want to archive this completed relationship?')) return;
    setArchiving(true);
    setError('');
    setSuccess('');
    try {
      await mentorshipService.archiveMentorshipRelationship(id);
      setSuccess('Relationship archived.');
      const data = await mentorshipService.getMentorshipRelationship(id);
      setRelationship(data.relationship);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not archive relationship.');
    } finally {
      setArchiving(false);
    }
  }

  if (loading) {
    return (
      <section className="mentorship-page" role="status">
        <p className="mentorship-loading">Loading relationship…</p>
      </section>
    );
  }

  if (error && !relationship) {
    return (
      <section className="mentorship-page">
        <p className="mentorship-message mentorship-error" role="alert">
          {error}
        </p>
        <Link className="button button-primary" to="/mentee/mentorship/relationships">
          Back to Relationships
        </Link>
      </section>
    );
  }

  if (!relationship) {
    return (
      <section className="mentorship-page">
        <p className="mentorship-message mentorship-error" role="alert">
          Relationship not found.
        </p>
        <Link className="button button-primary" to="/mentee/mentorship/relationships">
          Back to Relationships
        </Link>
      </section>
    );
  }

  const status = relationship.status;
  const mentor = relationship.mentor;
  const isMentee = relationship.mentee?.id === String(user?._id);
  const canComplete = status === 'ACTIVE' && isMentee;
  const canArchive = status === 'COMPLETED' && isMentee;

  return (
    <section className="mentorship-page">
      <header className="mentorship-page-header">
        <div>
          <span className="eyebrow">The Mentorship Academy</span>
          <h1>Relationship Details</h1>
          <p>Mentorship relationship with {mentor?.firstName} {mentor?.lastName}</p>
        </div>
        <Link className="button button-secondary" to="/mentee/mentorship/relationships">
          ← Back to Relationships
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

      <div className="relationship-detail-grid">
        <article className="relationship-detail-card">
          <div className="relationship-detail-header">
            <div className="relationship-participant-info">
              {mentor?.profilePhoto ? (
                <img
                  className="relationship-detail-avatar"
                  src={mentor.profilePhoto}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <div className="relationship-detail-avatar placeholder" aria-hidden="true">
                  {mentor?.firstName?.[0]}{mentor?.lastName?.[0]}
                </div>
              )}
              <div>
                <h2 className="relationship-participant-name">
                  {mentor?.firstName} {mentor?.lastName}
                </h2>
                <p className="relationship-participant-role">Mentor</p>
                <p className="relationship-participant-title">
                  {mentor?.jobTitle || 'Mentor'}{' '}
                  {mentor?.company ? `at ${mentor.company}` : ''}
                </p>
                {mentor?.industry && (
                  <p className="relationship-participant-industry">{mentor.industry}</p>
                )}
                {mentor?.email && (
                  <p className="relationship-participant-email">{mentor.email}</p>
                )}
              </div>
            </div>
            <span className={`relationship-status ${statusColors[status] || ''}`}>
              {statusLabels[status] || status}
            </span>
          </div>

          <div className="relationship-timeline">
            <h3>Timeline</h3>
            <dl className="relationship-meta">
              <dt>Requested</dt>
              <dd>{relationship.requestedAt ? new Date(relationship.requestedAt).toLocaleDateString() : '—'}</dd>
              {relationship.respondedAt && (
                <>
                  <dt>Responded</dt>
                  <dd>{new Date(relationship.respondedAt).toLocaleDateString()}</dd>
                </>
              )}
              {relationship.startedAt && (
                <>
                  <dt>Activated</dt>
                  <dd>{new Date(relationship.startedAt).toLocaleDateString()}</dd>
                </>
              )}
              {relationship.completedAt && (
                <>
                  <dt>Completed</dt>
                  <dd>{new Date(relationship.completedAt).toLocaleDateString()}</dd>
                </>
              )}
              {relationship.archivedAt && (
                <>
                  <dt>Archived</dt>
                  <dd>{new Date(relationship.archivedAt).toLocaleDateString()}</dd>
                </>
              )}
            </dl>
          </div>

          {relationship.requestMessage && (
            <div className="relationship-message">
              <h3>Your Request Message</h3>
              <p>{relationship.requestMessage}</p>
            </div>
          )}

          <div className="relationship-actions">
            {canComplete && (
              <button
                className="button button-secondary"
                type="button"
                onClick={handleComplete}
                disabled={completing || archiving}
              >
                {completing ? 'Completing…' : 'Complete Relationship'}
              </button>
            )}
            {canArchive && (
              <button
                className="button button-secondary"
                type="button"
                onClick={handleArchive}
                disabled={completing || archiving}
              >
                {archiving ? 'Archiving…' : 'Archive Relationship'}
              </button>
            )}
          </div>
        </article>

        <aside className="relationship-status-guide">
          <h3>Status Guide</h3>
          <ul className="status-guide-list">
            <li>
              <span className="status-guide-dot status-pending"></span>
              <span>Pending — Awaiting mentor response</span>
            </li>
            <li>
              <span className="status-guide-dot status-accepted"></span>
              <span>Accepted — Mentor accepted, awaiting activation</span>
            </li>
            <li>
              <span className="status-guide-dot status-active"></span>
              <span>Active — Relationship is ongoing</span>
            </li>
            <li>
              <span className="status-guide-dot status-completed"></span>
              <span>Completed — Relationship concluded</span>
            </li>
            <li>
              <span className="status-guide-dot status-archived"></span>
              <span>Archived — Archived for records</span>
            </li>
            <li>
              <span className="status-guide-dot status-declined"></span>
              <span>Declined — Request was declined</span>
            </li>
          </ul>
        </aside>
      </div>
    </section>
  );
}