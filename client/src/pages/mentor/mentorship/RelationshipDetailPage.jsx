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

export default function MentorRelationshipDetailPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [relationship, setRelationship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activating, setActivating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    async function loadRelationship() {
      try {
        const data = await mentorshipService.getMentorMentorshipRelationship(id);
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

  async function handleActivate() {
    if (!window.confirm('Are you sure you want to activate this relationship?')) return;
    setActivating(true);
    setError('');
    setSuccess('');
    try {
      await mentorshipService.activateMentorshipRelationship(id);
      setSuccess('Relationship activated.');
      const data = await mentorshipService.getMentorMentorshipRelationship(id);
      setRelationship(data.relationship);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not activate relationship.');
    } finally {
      setActivating(false);
    }
  }

  async function handleComplete() {
    if (!window.confirm('Are you sure you want to mark this relationship as completed?')) return;
    setCompleting(true);
    setError('');
    setSuccess('');
    try {
      await mentorshipService.mentorCompleteMentorshipRelationship(id);
      setSuccess('Relationship marked as completed.');
      const data = await mentorshipService.getMentorMentorshipRelationship(id);
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
      await mentorshipService.mentorArchiveMentorshipRelationship(id);
      setSuccess('Relationship archived.');
      const data = await mentorshipService.getMentorMentorshipRelationship(id);
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
        <Link className="button button-primary" to="/mentor/mentorship/relationships">
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
        <Link className="button button-primary" to="/mentor/mentorship/relationships">
          Back to Relationships
        </Link>
      </section>
    );
  }

  const status = relationship.status;
  const mentee = relationship.mentee;
  const isMentor = relationship.mentor?.id === String(user?._id);
  const canActivate = status === 'ACCEPTED' && isMentor;
  const canComplete = status === 'ACTIVE' && isMentor;
  const canArchive = status === 'COMPLETED' && isMentor;
  const canMessage = ['ACCEPTED', 'ACTIVE', 'COMPLETED'].includes(status) && isMentor;

  return (
    <section className="mentorship-page">
      <header className="mentorship-page-header">
        <div>
          <span className="eyebrow">The Mentorship Academy</span>
          <h1>Relationship Details</h1>
          <p>Mentorship relationship with {mentee?.firstName} {mentee?.lastName}</p>
        </div>
        <Link className="button button-secondary" to="/mentor/mentorship/relationships">
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
              {mentee?.profilePhoto ? (
                <img
                  className="relationship-detail-avatar"
                  src={mentee.profilePhoto}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <div className="relationship-detail-avatar placeholder" aria-hidden="true">
                  {mentee?.firstName?.[0]}{mentee?.lastName?.[0]}
                </div>
              )}
              <div>
                <h2 className="relationship-participant-name">
                  {mentee?.firstName} {mentee?.lastName}
                </h2>
                <p className="relationship-participant-role">Mentee</p>
                {mentee?.email && (
                  <p className="relationship-participant-email">{mentee.email}</p>
                )}
                {mentee?.institution && (
                  <p className="relationship-participant-institution">{mentee.institution}</p>
                )}
                {mentee?.fieldOfStudy && (
                  <p className="relationship-participant-field">{mentee.fieldOfStudy}</p>
                )}
                {mentee?.careerStage && (
                  <p className="relationship-participant-stage">Career stage: {mentee.careerStage}</p>
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
              <h3>Mentee's Request Message</h3>
              <p>{relationship.requestMessage}</p>
            </div>
          )}

          <div className="relationship-actions">
            {canMessage && (
              <Link className="button button-primary" to={`/mentor/mentorship/relationships/${relationship.id}/messages`}>
                Open Messages
              </Link>
            )}
            {canActivate && (
              <button
                className="button button-primary"
                type="button"
                onClick={handleActivate}
                disabled={activating || completing || archiving}
              >
                {activating ? 'Activatingâ€¦' : 'Activate Relationship'}
              </button>
            )}
            {canComplete && (
              <button
                className="button button-secondary"
                type="button"
                onClick={handleComplete}
                disabled={activating || completing || archiving}
              >
                {completing ? 'Completingâ€¦' : 'Complete Relationship'}
              </button>
            )}
            {canArchive && (
              <button
                className="button button-secondary"
                type="button"
                onClick={handleArchive}
                disabled={activating || completing || archiving}
              >
                {archiving ? 'Archivingâ€¦' : 'Archive Relationship'}
              </button>
            )}
          </div>
        </article>

        <aside className="relationship-status-guide">
          <h3>Status Guide</h3>
          <ul className="status-guide-list">
            <li>
              <span className="status-guide-dot status-pending"></span>
              <span>Pending — Awaiting your response</span>
            </li>
            <li>
              <span className="status-guide-dot status-accepted"></span>
              <span>Accepted — Ready to activate</span>
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
              <span>Declined — You declined this request</span>
            </li>
          </ul>
        </aside>
      </div>
    </section>
  );
}